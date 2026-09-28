// All SQL lives here. Every function takes plain values and returns plain rows.
export function createRepo(db) {
  const elders = {
    async create(fields) {
      return db.one(
        `insert into elders (slug, ref_code, display_name, relation, town_slug, town_other, birth_year,
                             family_id, on_map, pin_hash, referred_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning *`,
        [
          fields.slug, fields.refCode, fields.displayName, fields.relation, fields.townSlug, fields.townOther,
          fields.birthYear, fields.familyId, fields.onMap, fields.pinHash, fields.referredBy,
        ],
      );
    },

    bySlug: (slug) => db.one('select * from elders where slug = $1', [slug]),
    byRefCode: (code) => db.one('select id from elders where ref_code = $1', [code]),

    async update(id, fields) {
      const columns = {
        displayName: 'display_name',
        relation: 'relation',
        townSlug: 'town_slug',
        townOther: 'town_other',
        birthYear: 'birth_year',
        onMap: 'on_map',
        pinHash: 'pin_hash',
      };
      const sets = [];
      const values = [];
      for (const [key, column] of Object.entries(columns)) {
        if (fields[key] === undefined) continue;
        values.push(fields[key]);
        sets.push(`${column} = $${values.length}`);
      }
      if (fields.pinHash) sets.push('pin_failures = 0', 'pin_locked_until = null');
      if (!sets.length) return db.one('select * from elders where id = $1', [id]);
      values.push(id);
      return db.one(`update elders set ${sets.join(', ')}, updated_at = now() where id = $${values.length} returning *`, values);
    },

    remove: (id) => db.query('delete from elders where id = $1', [id]),

    async recordPinFailure(id, lockMinutesFor) {
      const row = await db.one('update elders set pin_failures = pin_failures + 1 where id = $1 returning pin_failures', [id]);
      const minutes = lockMinutesFor(row.pin_failures);
      if (minutes) {
        await db.query('update elders set pin_locked_until = now() + make_interval(mins => $2) where id = $1', [id, minutes]);
      }
      return { failures: row.pin_failures, lockedMinutes: minutes };
    },

    resetPinFailures: (id) => db.query('update elders set pin_failures = 0, pin_locked_until = null where id = $1', [id]),
  };

  const clips = {
    forElder: (elderId) => db.many('select * from clips where elder_id = $1 order by created_at, id', [elderId]),
    forPrompt: (elderId, promptId) =>
      db.many('select * from clips where elder_id = $1 and prompt_id = $2 order by created_at, id', [elderId, promptId]),
    byPublicId: (publicId) => db.one('select * from clips where public_id = $1', [publicId]),
    async countForElder(elderId) {
      return (await db.one('select count(*)::int as n from clips where elder_id = $1', [elderId])).n;
    },

    insert(fields) {
      return db.one(
        `insert into clips (public_id, elder_id, prompt_id, storage_key, mime, bytes,
                            original_key, original_mime, original_bytes, duration_ms, source)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning *`,
        [
          fields.publicId, fields.elderId, fields.promptId, fields.storageKey, fields.mime, fields.bytes,
          fields.originalKey, fields.originalMime, fields.originalBytes, fields.durationMs, fields.source,
        ],
      );
    },

    remove: (id) => db.query('delete from clips where id = $1', [id]),
  };

  const views = {
    record: (elderId, visitor) =>
      db.query('insert into page_views (elder_id, visitor) values ($1, $2) on conflict do nothing', [elderId, visitor]),
    async devices(elderId) {
      return (await db.one('select count(*)::int as n from page_views where elder_id = $1', [elderId])).n;
    },
  };

  const community = {
    // Families (not elders) per town, counting only pages that opted in to the map.
    async familiesByTown() {
      const rows = await db.many(
        `select town_slug, count(distinct family_id)::int as families
         from elders where on_map and town_slug is not null group by town_slug`,
      );
      return new Map(rows.map((r) => [r.town_slug, r.families]));
    },

    async familiesInTown(townSlug) {
      return (
        await db.one('select count(distinct family_id)::int as n from elders where on_map and town_slug = $1', [townSlug])
      ).n;
    },

    totals() {
      return db.one(
        `select (select count(*)::int from elders) as elders,
                (select count(*)::int from clips) as clips,
                (select coalesce(sum(duration_ms), 0)::bigint from clips) as duration_ms`,
      );
    },
  };

  const dedications = {
    create(fields) {
      return db.one(
        `insert into dedications (town_slug, tier, in_memory_of, from_line, amount_paise)
         values ($1, $2, $3, $4, $5) returning *`,
        [fields.townSlug, fields.tier, fields.inMemoryOf, fields.fromLine, fields.amountPaise],
      );
    },

    attachOrder: (id, orderId) => db.query('update dedications set razorpay_order_id = $2 where id = $1', [id, orderId]),

    // Idempotent: the Checkout callback and the webhook may both arrive; only the first publishes.
    async publish(orderId, paymentId, days) {
      const published = await db.one(
        `update dedications
         set status = 'paid', razorpay_payment_id = $2, starts_at = now(), ends_at = now() + make_interval(days => $3)
         where razorpay_order_id = $1 and status = 'created'
         returning *`,
        [orderId, paymentId, days],
      );
      return published || db.one('select * from dedications where razorpay_order_id = $1', [orderId]);
    },

    activeForTown: (townSlug) =>
      db.many(
        `select * from dedications
         where status = 'paid' and starts_at <= now() and ends_at > now() and town_slug = $1
         order by tier = 'featured' desc, starts_at desc`,
        [townSlug],
      ),

    activeFeatured: () =>
      db.many(
        `select * from dedications
         where status = 'paid' and tier = 'featured' and starts_at <= now() and ends_at > now()
         order by starts_at desc limit 6`,
      ),

    recent: (limit = 50) =>
      db.many(`select * from dedications where status <> 'created' order by created_at desc limit $1`, [limit]),

    setHidden: (id, hidden) =>
      db.query(
        `update dedications set status = $2 where id = $1 and status in ('paid', 'hidden')`,
        [id, hidden ? 'hidden' : 'paid'],
      ),
  };

  const admin = {
    // The week-one validation table: are relatives opening and forwarding the pages?
    pages: (limit = 200) =>
      db.many(
        `select e.slug, e.display_name, e.relation, e.town_slug, e.town_other, e.on_map, e.created_at,
                (select count(*)::int from clips c where c.elder_id = e.id) as clips,
                (select coalesce(sum(duration_ms), 0)::int from clips c where c.elder_id = e.id) as duration_ms,
                (select count(*)::int from page_views v where v.elder_id = e.id) as devices,
                (select count(*)::int from elders r where r.referred_by = e.id) as referrals
         from elders e order by e.created_at desc limit $1`,
        [limit],
      ),

    totals: () =>
      db.one(
        `select (select count(*)::int from elders) as elders,
                (select count(distinct family_id)::int from elders) as families,
                (select count(*)::int from elders where referred_by is not null) as referred,
                (select count(*)::int from clips) as clips,
                (select coalesce(sum(duration_ms), 0)::bigint from clips) as duration_ms,
                (select coalesce(sum(bytes + coalesce(original_bytes, 0)), 0)::bigint from clips) as bytes,
                (select count(*)::int from page_views) as devices,
                (select coalesce(sum(amount_paise), 0)::bigint from dedications where status in ('paid', 'hidden')) as dedication_paise`,
      ),
  };

  return { elders, clips, views, community, dedications, admin };
}

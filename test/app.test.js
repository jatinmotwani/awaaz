import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createElder, databaseAvailable, fakeOgg, signPayment, signWebhook, startApp, uploadClip } from './helpers.js';
import { todayAt, ymdString } from '../src/lib/panchang.js';
import { ordinal } from '../src/lib/family-dates.js';

const skip = (await databaseAvailable()) ? false : 'Postgres not reachable (set TEST_DATABASE_URL)';

describe('Awaaz app', { skip }, () => {
  let app;
  before(async () => {
    app = await startApp();
  });
  after(async () => {
    await app?.close();
  });

  const text = async (path, init) => {
    const res = await app.request(path, init);
    return { res, body: await res.text() };
  };

  describe('public pages', () => {
    it('serves the home page with the create form and security headers', async () => {
      const { res, body } = await text('/');
      assert.equal(res.status, 200);
      assert.match(body, /id="create-form"/);
      assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
      assert.equal(res.headers.get('referrer-policy'), 'same-origin');
    });

    it('pre-selects a town from ?town=', async () => {
      const { body } = await text('/?town=larkana');
      assert.match(body, /<option value="larkana" selected>/);
    });

    it('serves an indexable page per town, and a sitemap listing them', async () => {
      const { res, body } = await text('/sindh/shikarpur');
      assert.equal(res.status, 200);
      assert.match(body, /<h1>Shikarpur<\/h1>/);
      assert.match(body, /rel="canonical" href="http:\/\/awaaz\.test\/sindh\/shikarpur"/);
      assert.doesNotMatch(body, /noindex/);
      assert.match(body, /Towns near Shikarpur/);

      const sitemap = await text('/sitemap.xml');
      assert.match(sitemap.body, /<loc>http:\/\/awaaz\.test\/sindh\/hyderabad<\/loc>/);
      assert.doesNotMatch(sitemap.body, /\/e\//);
      assert.equal((await app.request('/sindh/atlantis')).status, 404);
    });

    it('serves PWA essentials', async () => {
      const manifest = await (await app.request('/manifest.webmanifest')).json();
      assert.equal(manifest.display, 'standalone');
      assert.ok(manifest.icons.some((i) => i.sizes === '512x512'));
      const sw = await text('/sw.js');
      assert.match(sw.body, /const CACHE = 'awaaz-[0-9a-f]{10}'/);
      assert.equal((await app.request('/offline')).status, 200);
      assert.equal((await app.request('/icons/icon-192.png')).status, 200);
    });
  });

  describe('elder pages', () => {
    it('creates an unlisted page and unlocks it on the creating phone', async () => {
      const elder = await createElder(app);
      assert.match(elder.slug, /^[a-z2-9]{12}$/);
      assert.equal(elder.url, `http://awaaz.test/e/${elder.slug}`);
      assert.ok(elder.editToken);

      const { res, body } = await text(`/e/${elder.slug}`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-robots-tag'), 'noindex');
      assert.match(body, /<meta name="robots" content="noindex, nofollow">/);
      assert.match(body, /Dadi Kamla/);
      assert.match(body, /Shikarpur, Sindh/);
      assert.match(body, /तव्हांजो जनमु किथे थियो/);
      assert.match(body, /Record your Nani too/);
      assert.match(body, /https:\/\/wa\.me\/\?text=/);
    });

    it('validates new pages', async () => {
      const bad = async (json, pattern) => {
        const res = await app.request('/api/elders', { method: 'POST', json });
        assert.equal(res.status, 400);
        assert.match((await res.json()).error, pattern);
      };
      const ok = { relation: 'nani', displayName: 'Nani Sita', pin: '1234', consent: true };
      await bad({ ...ok, pin: '12' }, /PIN/);
      await bad({ ...ok, consent: false }, /happy to be recorded/);
      await bad({ ...ok, relation: 'cousin' }, /who this page is for/);
      await bad({ ...ok, displayName: ' ' }, /name/);
      await bad({ ...ok, townSlug: 'atlantis' }, /town/);
      await bad({ ...ok, birthYear: '1700' }, /year/);
    });

    it('keeps free-text towns off the map', async () => {
      const elder = await createElder(app, { townSlug: 'other', townOther: 'Tando Soomro', displayName: 'Dada Hiro' });
      const { body } = await text(`/e/${elder.slug}`);
      assert.match(body, /Tando Soomro, Sindh/);
      assert.match(body, /Record your Nani too/);
    });

    it('returns 404 for unknown or malformed links', async () => {
      assert.equal((await app.request('/e/doesnotexist1')).status, 404);
      assert.equal((await app.request('/e/..%2f..%2fetc')).status, 404);
    });

    it('counts one device per browser and ignores link-preview bots', async () => {
      const elder = await createElder(app);
      const first = await app.request(`/e/${elder.slug}`, { headers: { 'user-agent': 'Mozilla/5.0 Chrome' } });
      const cookie = first.headers.get('set-cookie').split(';')[0];
      await app.request(`/e/${elder.slug}`, { headers: { 'user-agent': 'Mozilla/5.0 Chrome', cookie } });
      await app.request(`/e/${elder.slug}`, { headers: { 'user-agent': 'WhatsApp/2.24' } });
      await app.request(`/e/${elder.slug}`, { headers: { 'user-agent': 'Mozilla/5.0 Safari' } });
      await new Promise((r) => setTimeout(r, 50));

      const stats = await app.request(`/api/elders/${elder.slug}/stats`, { headers: { 'x-edit-token': elder.editToken } });
      assert.deepEqual(await stats.json(), { devices: 2 });
    });
  });

  describe('PIN', () => {
    it('unlocks with the right PIN and locks out guessing', async () => {
      const elder = await createElder(app, { pin: '2468' });
      const unlock = (pin) => app.request(`/api/elders/${elder.slug}/unlock`, { method: 'POST', json: { pin } });

      const good = await unlock('2468');
      assert.equal(good.status, 200);
      assert.equal((await good.json()).editToken, elder.editToken);

      for (let i = 0; i < 4; i += 1) assert.equal((await unlock('0000')).status, 401);
      const fifth = await unlock('0000');
      assert.equal(fifth.status, 401);
      assert.match((await fifth.json()).error, /locked for 15 minutes/);

      const locked = await unlock('2468');
      assert.equal(locked.status, 429);
      assert.match((await locked.json()).error, /Too many wrong PINs/);
    });

    it('requires the edit token to record, edit or delete', async () => {
      const elder = await createElder(app);
      assert.equal((await uploadClip(app, elder, 'vatan-born', { token: 'nope' })).status, 401);
      const patch = await app.request(`/api/elders/${elder.slug}`, { method: 'PATCH', json: { displayName: 'Hacked' } });
      assert.equal(patch.status, 401);
    });

    it('changing the PIN signs out other phones', async () => {
      const elder = await createElder(app);
      const res = await app.request(`/api/elders/${elder.slug}`, {
        method: 'PATCH',
        json: { newPin: '97531' },
        headers: { 'x-edit-token': elder.editToken },
      });
      const { editToken } = await res.json();
      assert.ok(editToken && editToken !== elder.editToken);
      assert.equal((await uploadClip(app, elder, 'vatan-born')).status, 401);
      assert.equal((await uploadClip(app, elder, 'vatan-born', { token: editToken })).status, 201);
    });
  });

  describe('recordings', () => {
    it('stores a clip, shows it on the page and serves the audio', async () => {
      const elder = await createElder(app);
      const bytes = fakeOgg();
      const res = await uploadClip(app, elder, 'safar-journey', { bytes });
      assert.equal(res.status, 201);
      const { clip } = await res.json();
      assert.equal(clip.promptId, 'safar-journey');
      assert.equal(clip.durationMs, 4200);
      assert.match(clip.url, /^\/a\/[a-z2-9]{20}$/);

      const page = await text(`/e/${elder.slug}`);
      assert.match(page.body, new RegExp(`src="${clip.url}"`));
      assert.match(page.body, /<strong data-recorded>1<\/strong> of 72 recorded/);

      const audio = await app.request(clip.url);
      assert.equal(audio.status, 200);
      assert.equal(audio.headers.get('content-type'), 'audio/ogg');
      assert.equal(audio.headers.get('x-robots-tag'), 'noindex');
      assert.deepEqual(Buffer.from(await audio.arrayBuffer()), bytes);

      const ranged = await app.request(clip.url, { headers: { range: 'bytes=0-3' } });
      assert.equal(ranged.status, 206);
      assert.equal(await ranged.text(), 'OggS');
    });

    it('rejects things that are not audio, and unknown prompts', async () => {
      const elder = await createElder(app);
      const html = Buffer.from(`<html><script>alert(1)</script>${'x'.repeat(200)}</html>`);
      const notAudio = await uploadClip(app, elder, 'vatan-born', { bytes: html });
      assert.equal(notAudio.status, 415);
      assert.equal((await uploadClip(app, elder, 'not-a-prompt')).status, 400);
      assert.equal((await uploadClip(app, elder, 'vatan-born', { bytes: Buffer.from('OggS') })).status, 400);
    });

    it('rejects files over the size limit', async () => {
      const elder = await createElder(app);
      const huge = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(app.config.audio.maxUploadBytes + 10)]);
      const res = await uploadClip(app, elder, 'vatan-born', { bytes: huge });
      assert.equal(res.status, 413);
      assert.match((await res.json()).error, /too big/);
    });

    it('keeps several takes for stories but one per word', async () => {
      const elder = await createElder(app);
      await uploadClip(app, elder, 'lolee-song');
      await uploadClip(app, elder, 'lolee-song');
      const first = await (await uploadClip(app, elder, 'lafz-paani')).json();
      const second = await (await uploadClip(app, elder, 'lafz-paani', { query: '&source=uploaded' })).json();
      assert.equal(second.clip.source, 'uploaded');

      const rows = await app.db.many(
        'select prompt_id, count(*)::int as n from clips join elders e on e.id = elder_id where e.slug = $1 group by prompt_id order by prompt_id',
        [elder.slug],
      );
      assert.deepEqual(rows, [
        { prompt_id: 'lafz-paani', n: 1 },
        { prompt_id: 'lolee-song', n: 2 },
      ]);
      assert.equal((await app.request(first.clip.url)).status, 404);

      const learn = await text(`/e/${elder.slug}/learn`);
      assert.match(learn.body, new RegExp(`data-src="${second.clip.url}"`));
      assert.match(learn.body, /1 of 50 words so far/);
    });

    it('deletes a clip and its file', async () => {
      const elder = await createElder(app);
      const { clip } = await (await uploadClip(app, elder, 'vatan-house')).json();
      const other = await createElder(app);
      const wrongPage = await app.request(`/api/elders/${other.slug}/clips/${clip.id}`, {
        method: 'DELETE',
        headers: { 'x-edit-token': other.editToken },
      });
      assert.equal(wrongPage.status, 404);

      const res = await app.request(`/api/elders/${elder.slug}/clips/${clip.id}`, {
        method: 'DELETE',
        headers: { 'x-edit-token': elder.editToken },
      });
      assert.equal(res.status, 204);
      assert.equal((await app.request(clip.url)).status, 404);
    });

    it('downloads everything as a zip with an index', async () => {
      const elder = await createElder(app, { displayName: 'Nana Gobind' });
      await uploadClip(app, elder, 'vatan-born');
      await uploadClip(app, elder, 'lafz-chaanhi');
      const res = await app.request(`/e/${elder.slug}/download.zip`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/zip');
      assert.match(res.headers.get('content-disposition'), /nana-gobind-recordings\.zip/);
      const zip = Buffer.from(await res.arrayBuffer());
      assert.equal(zip.readUInt32LE(0), 0x04034b50);
      const listing = zip.toString('latin1');
      assert.ok(listing.includes('01-vatan-born.ogg'));
      assert.ok(listing.includes('lafz-chaanhi.ogg'));
      assert.ok(listing.includes('index.txt'));
    });

    it('deletes a whole page only with the PIN', async () => {
      const elder = await createElder(app, { pin: '1357' });
      const { clip } = await (await uploadClip(app, elder, 'vatan-born')).json();
      const del = (pin) =>
        app.request(`/api/elders/${elder.slug}`, { method: 'DELETE', json: { pin }, headers: { 'x-edit-token': elder.editToken } });
      assert.equal((await del('0000')).status, 401);
      assert.equal((await app.request(`/e/${elder.slug}`)).status, 200);
      assert.equal((await del('1357')).status, 204);
      assert.equal((await app.request(`/e/${elder.slug}`)).status, 404);
      assert.equal((await app.request(clip.url)).status, 404);
    });
  });

  describe('family dates', () => {
    const addDate = (elder, json, token = elder.editToken) =>
      app.request(`/api/elders/${elder.slug}/dates`, { method: 'POST', json, headers: { 'x-edit-token': token } });

    it('works out a barsi tithi from the date of passing and shows it on the page', async () => {
      const elder = await createElder(app, { displayName: 'Dadi Kamla' });
      assert.equal((await addDate(elder, { kind: 'barsi', calendar: 'tithi', date: '2024-04-17' }, 'nope')).status, 401);

      const res = await addDate(elder, { kind: 'barsi', calendar: 'tithi', date: '2024-04-17', person: 'Dada Mohan' });
      assert.equal(res.status, 201);
      const { date } = await res.json();
      assert.equal(date.rule, 'Chaitra (Chet) Shukla Navami');
      assert.match(date.title, /^Dada Mohan’s \d+(st|nd|rd|th) barsi$/);
      assert.match(date.next, /^\d{4}-\d{2}-\d{2}$/);

      const { body } = await text(`/e/${elder.slug}`);
      assert.match(body, /id="s-yaad"/);
      assert.match(body, /Chaitra \(Chet\) Shukla Navami/);
      assert.match(body, new RegExp(`href="webcal://awaaz\\.test/e/${elder.slug}/dates\\.ics"`));
      assert.match(body, /calendar\.google\.com\/calendar\/render\?cid=webcal%3A%2F%2Fawaaz\.test/);
    });

    it('serves five years of events as a calendar feed', async () => {
      const elder = await createElder(app, { displayName: 'Nani Sita' });
      await addDate(elder, { kind: 'birthday', calendar: 'gregorian', date: '1940-03-05' });
      const res = await app.request(`/e/${elder.slug}/dates.ics`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /^text\/calendar/);
      const ics = (await res.text()).replace(/\r\n /g, '');
      assert.equal(ics.match(/BEGIN:VEVENT/g).length, 5);
      const year = todayAt().y;
      assert.ok(ics.includes(`DTSTART;VALUE=DATE:${year}0305`));
      assert.ok(ics.includes(`SUMMARY:🎂 Nani Sita’s ${ordinal(year - 1940)} birthday`));
      assert.ok(ics.includes(`URL:http://awaaz.test/e/${elder.slug}`));
      assert.equal((await app.request('/e/nosuchpage12/dates.ics')).status, 404);
    });

    it('puts a “today is…” banner with a WhatsApp share on the day', async () => {
      const elder = await createElder(app, { displayName: 'Dada Hiro' });
      const today = todayAt();
      await addDate(elder, { kind: 'birthday', calendar: 'gregorian', date: `1935-${ymdString(today).slice(5)}` });
      const { body } = await text(`/e/${elder.slug}`);
      assert.match(body, /class="date-banner is-today"/);
      assert.match(body, /Today is Dada Hiro’s \d+(st|nd|rd|th) birthday/);
      assert.match(body, /wa\.me\/\?text=[^"]*Today%20is%20Dada%20Hiro/);
    });

    it('answers “what tithi was that day?” for the form', async () => {
      const res = await app.request('/api/panchang/tithi?date=2024-08-26');
      const t = await res.json();
      assert.equal(t.label, 'Shravana (Sanwan) Krishna Ashtami');
      assert.equal(t.note, 'Bhadrapada Krishna in North Indian calendars');
      assert.equal((await app.request('/api/panchang/tithi?date=yesterday')).status, 400);
    });

    it('removes a date, only from its own page, and caps the list', async () => {
      const elder = await createElder(app);
      const other = await createElder(app);
      const { date } = await (await addDate(elder, { kind: 'anniversary', calendar: 'gregorian', date: '1960-02-14' })).json();
      const del = (target, id) =>
        app.request(`/api/elders/${target.slug}/dates/${id}`, { method: 'DELETE', headers: { 'x-edit-token': target.editToken } });
      assert.equal((await del(other, date.id)).status, 404);
      assert.equal((await del(elder, date.id)).status, 204);
      assert.equal((await del(elder, date.id)).status, 404);

      for (let i = 0; i < 12; i += 1) {
        assert.equal((await addDate(elder, { kind: 'birthday', calendar: 'gregorian', date: '1950-01-01' })).status, 201);
      }
      assert.equal((await addDate(elder, { kind: 'birthday', calendar: 'gregorian', date: '1950-01-01' })).status, 409);
    });
  });

  describe('community map', () => {
    it('counts families (not elders), and only pages that opted in', async () => {
      const town = 'rohri';
      const a = await createElder(app, { townSlug: town, displayName: 'Dada One' });
      await createElder(app, { townSlug: town, displayName: 'Dadi One', familyId: a.familyId });
      await createElder(app, { townSlug: town, displayName: 'Nana Two' });
      await createElder(app, { townSlug: town, displayName: 'Nani Private', onMap: false });

      const { body } = await text(`/sindh/${town}`);
      assert.match(body, /<strong>2 families<\/strong> keep their elders’ voices from Rohri/);
      assert.doesNotMatch(body, /Dada One|Nani Private/);

      const map = await text('/sindh');
      assert.match(map.body, /Rohri: 2 families/);
    });

    it('credits new pages to the page whose "Record your Nani too" link was used', async () => {
      const source = await createElder(app);
      const page = await text(`/e/${source.slug}`);
      const ref = page.body.match(/href="\/\?ref=([a-z2-9]+)#start"/)[1];
      assert.ok(!page.body.includes(`ref=${source.slug}`), 'the ref code must not reveal the secret slug');
      await createElder(app, { ref, displayName: 'Nani Referred' });
      const row = await app.db.one(
        'select count(*)::int as n from elders r join elders s on s.id = r.referred_by where s.slug = $1',
        [source.slug],
      );
      assert.equal(row.n, 1);
    });
  });

  describe('dedications', () => {
    const order = async (json) => {
      const res = await app.request('/api/dedications', { method: 'POST', json });
      return { status: res.status, body: await res.json() };
    };

    it('creates a Razorpay order and publishes after a verified payment', async () => {
      const { status, body } = await order({
        townSlug: 'hyderabad',
        tier: 'town',
        inMemoryOf: 'Late Shri Mohandas Motwani',
        fromLine: 'The Motwani family, Pune',
      });
      assert.equal(status, 201);
      assert.equal(body.amountPaise, 110100);
      assert.equal(body.keyId, 'rzp_test_key');
      assert.equal(app.orders.at(-1).amount, 110100);

      let page = await text('/sindh/hyderabad');
      assert.doesNotMatch(page.body, /In loving memory of <strong>Late Shri Mohandas/, 'unpaid dedications stay hidden');

      const bad = await app.request('/api/dedications/verify', {
        method: 'POST',
        json: { orderId: body.orderId, paymentId: 'pay_1', signature: 'deadbeef' },
      });
      assert.equal(bad.status, 400);

      const good = await app.request('/api/dedications/verify', {
        method: 'POST',
        json: { orderId: body.orderId, paymentId: 'pay_1', signature: signPayment(body.orderId, 'pay_1') },
      });
      assert.equal(good.status, 200);

      page = await text('/sindh/hyderabad');
      assert.match(page.body, /In loving memory of <strong>Late Shri Mohandas Motwani<\/strong>/);
      assert.match(page.body, /The Motwani family, Pune/);
      assert.doesNotMatch((await text('/')).body, /Mohandas/, 'town tier stays off the home page');
    });

    it('publishes from the webhook too, once, and features the ₹5,100 tier', async () => {
      const { body } = await order({ townSlug: 'sukkur', tier: 'featured', inMemoryOf: 'Smt. Parvati Devi' });
      assert.equal(body.amountPaise, 510000);
      const event = Buffer.from(
        JSON.stringify({
          event: 'order.paid',
          payload: { order: { entity: { id: body.orderId } }, payment: { entity: { id: 'pay_9', order_id: body.orderId } } },
        }),
      );
      const forged = await app.request('/api/razorpay/webhook', {
        method: 'POST',
        body: event,
        headers: { 'content-type': 'application/json', 'x-razorpay-signature': 'abc' },
      });
      assert.equal(forged.status, 400);

      for (let i = 0; i < 2; i += 1) {
        const res = await app.request('/api/razorpay/webhook', {
          method: 'POST',
          body: event,
          headers: { 'content-type': 'application/json', 'x-razorpay-signature': signWebhook(event) },
        });
        assert.equal(res.status, 200);
      }
      const rows = await app.db.many("select status, ends_at - starts_at as length from dedications where razorpay_order_id = $1", [body.orderId]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].status, 'paid');
      assert.equal(rows[0].length.days, 7);

      assert.match((await text('/')).body, /Parvati Devi/);
      assert.match((await text('/sindh')).body, /Parvati Devi/);
      assert.match((await text('/sindh/sukkur')).body, /Parvati Devi/);
    });

    it('refuses links, phone numbers and unknown tiers', async () => {
      assert.match((await order({ townSlug: 'dadu', tier: 'town', inMemoryOf: 'Visit www.spam.com' })).body.error, /links/);
      assert.match((await order({ townSlug: 'dadu', tier: 'town', inMemoryOf: 'Ram, call 9820012345' })).body.error, /phone/);
      assert.equal((await order({ townSlug: 'dadu', tier: 'platinum', inMemoryOf: 'Ram' })).status, 400);
      assert.equal((await order({ townSlug: 'atlantis', tier: 'town', inMemoryOf: 'Ram' })).status, 400);
    });
  });

  describe('admin', () => {
    it('needs the token, then shows validation numbers and can hide a dedication', async () => {
      const login = await text('/admin');
      assert.match(login.body, /Admin token/);

      const wrong = await app.request('/admin/login', {
        method: 'POST',
        body: 'token=nope',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      assert.equal(wrong.status, 401);

      const ok = await app.request('/admin/login', {
        method: 'POST',
        body: 'token=admin-test-token',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      assert.equal(ok.status, 303);
      const cookie = ok.headers.get('set-cookie').split(';')[0];

      const dash = await text('/admin', { headers: { cookie } });
      assert.match(dash.body, /elder pages/);
      assert.match(dash.body, /Devices/);

      const { id } = await app.db.one("select id from dedications where status = 'paid' order by id limit 1");
      const hide = await app.request(`/admin/dedications/${id}/hide`, { method: 'POST', headers: { cookie } });
      assert.equal(hide.status, 303);
      assert.equal((await app.db.one('select status from dedications where id = $1', [id])).status, 'hidden');

      const noCookie = await app.request(`/admin/dedications/${id}/show`, { method: 'POST' });
      assert.equal(noCookie.status, 303);
      assert.equal((await app.db.one('select status from dedications where id = $1', [id])).status, 'hidden');
    });

    it('resets a forgotten PIN from a pasted page link', async () => {
      const elder = await createElder(app, { pin: '1111' });
      const login = await app.request('/admin/login', {
        method: 'POST',
        body: 'token=admin-test-token',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      const cookie = login.headers.get('set-cookie').split(';')[0];
      await app.request('/admin/reset-pin', {
        method: 'POST',
        body: `slug=${encodeURIComponent(elder.url)}&pin=8642`,
        headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
      });
      const unlock = await app.request(`/api/elders/${elder.slug}/unlock`, { method: 'POST', json: { pin: '8642' } });
      assert.equal(unlock.status, 200);
    });
  });
});

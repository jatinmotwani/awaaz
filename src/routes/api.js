import crypto from 'node:crypto';
import express from 'express';
import { isId, isUuid, newClipId, newRefCode, newSlug } from '../lib/ids.js';
import { checkEditToken, editToken, hashPin, isValidPin, lockMinutes, verifyPin } from '../lib/pin.js';
import { sniffAudio } from '../lib/audio.js';
import { cleanLine } from '../lib/text.js';
import { rateLimit } from '../lib/rate-limit.js';
import { isWordPrompt, promptById, relations } from '../content/prompts.js';
import { townBySlug } from '../content/towns.js';

export function clipJson(clip) {
  return {
    id: clip.public_id,
    promptId: clip.prompt_id,
    durationMs: clip.duration_ms,
    source: clip.source,
    url: `/a/${clip.public_id}`,
    createdAt: clip.created_at,
  };
}

// Validates the editable fields of a page. With partial=true, absent fields are left alone.
export function parseElderFields(body, { partial = false } = {}) {
  const fields = {};
  const errors = [];
  const has = (key) => !partial || body[key] !== undefined;

  if (has('displayName')) {
    fields.displayName = cleanLine(body.displayName, 60);
    if (fields.displayName.length < 2) errors.push('Please add a name for the page.');
  }
  if (has('relation')) {
    fields.relation = body.relation;
    if (!Object.hasOwn(relations, body.relation)) errors.push('Choose who this page is for.');
  }
  if (has('townSlug') || (partial && body.townOther !== undefined)) {
    const slug = body.townSlug && body.townSlug !== 'other' ? body.townSlug : null;
    if (slug && !townBySlug.has(slug)) errors.push('Choose a town from the list, or “Other”.');
    fields.townSlug = slug;
    fields.townOther = slug ? null : cleanLine(body.townOther, 60) || null;
  }
  if (has('birthYear')) {
    if (body.birthYear === '' || body.birthYear === null || body.birthYear === undefined) {
      fields.birthYear = null;
    } else {
      const year = Number(body.birthYear);
      if (!Number.isInteger(year) || year < 1890 || year > new Date().getFullYear()) errors.push('The year of birth looks wrong.');
      fields.birthYear = year;
    }
  }
  if (has('onMap')) fields.onMap = body.onMap === true;
  return { fields, errors };
}

export function apiRouter({ config, repo, storage, transcoder }) {
  const router = express.Router();
  const json = express.json({ limit: '20kb' });
  const noStore = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  };
  router.use('/api', noStore);

  const createLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: config.createPagesPerHour,
    message: 'Too many new pages from here. Please try again in an hour.',
  });
  const unlockLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
  // Per page, not per IP: a whole panchayat may record over one Wi-Fi connection.
  const uploadLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 150,
    key: (req) => `${req.params.slug}`,
    message: 'That’s a lot of recordings in one hour — please take a short break and try again.',
  });

  async function loadElder(req, res) {
    const elder = isId(req.params.slug) ? await repo.elders.bySlug(req.params.slug) : null;
    if (!elder) res.status(404).json({ error: 'This page doesn’t exist any more.' });
    return elder;
  }

  async function requireEditor(req, res, next) {
    const elder = await loadElder(req, res);
    if (!elder) return;
    if (!checkEditToken(config.secret, elder, req.get('x-edit-token'))) {
      return res.status(401).json({ error: 'Enter the family PIN to record on this page.', locked: true });
    }
    req.elder = elder;
    return next();
  }

  async function removeClipFiles(clip) {
    for (const key of [clip.storage_key, clip.original_key].filter(Boolean)) {
      try {
        await storage.delete(key);
      } catch (err) {
        console.error(`could not delete ${key}`, err);
      }
    }
  }

  async function removeClip(clip) {
    await removeClipFiles(clip);
    await repo.clips.remove(clip.id);
  }

  router.post('/api/elders', createLimit, json, async (req, res) => {
    const body = req.body || {};
    const { fields, errors } = parseElderFields(body);
    if (!isValidPin(body.pin)) errors.push('The PIN should be 4 to 8 digits.');
    if (body.consent !== true) errors.push('Please confirm they’re happy to be recorded.');
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    const familyId = isUuid(body.familyId) ? body.familyId : crypto.randomUUID();
    const referrer = isId(body.ref) ? await repo.elders.byRefCode(body.ref) : null;
    const pinHash = await hashPin(body.pin);

    let elder;
    for (let attempt = 0; !elder; attempt += 1) {
      try {
        elder = await repo.elders.create({
          ...fields,
          slug: newSlug(),
          refCode: newRefCode(),
          familyId,
          pinHash,
          referredBy: referrer?.id ?? null,
        });
      } catch (err) {
        if (err.code !== '23505' || attempt >= 3) throw err; // slug collision: astronomically rare, just retry
      }
    }

    return res.status(201).json({
      slug: elder.slug,
      url: `${config.publicUrl}/e/${elder.slug}`,
      editToken: editToken(config.secret, elder),
      familyId,
    });
  });

  router.post('/api/elders/:slug/unlock', unlockLimit, json, async (req, res) => {
    const elder = await loadElder(req, res);
    if (!elder) return;

    if (elder.pin_locked_until && new Date(elder.pin_locked_until) > new Date()) {
      const minutes = Math.ceil((new Date(elder.pin_locked_until) - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many wrong PINs. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
    }

    const pin = String(req.body?.pin ?? '');
    if (!isValidPin(pin) || !(await verifyPin(pin, elder.pin_hash))) {
      const { lockedMinutes } = await repo.elders.recordPinFailure(elder.id, lockMinutes);
      return res.status(401).json({
        error: lockedMinutes
          ? `That PIN didn’t match. Recording is locked for ${lockedMinutes} minutes.`
          : 'That PIN didn’t match. Please check with the family.',
      });
    }

    if (elder.pin_failures) await repo.elders.resetPinFailures(elder.id);
    return res.json({ editToken: editToken(config.secret, elder) });
  });

  router.get('/api/elders/:slug/stats', requireEditor, async (req, res) => {
    res.json({ devices: await repo.views.devices(req.elder.id) });
  });

  router.patch('/api/elders/:slug', json, requireEditor, async (req, res) => {
    const body = req.body || {};
    const { fields, errors } = parseElderFields(body, { partial: true });
    if (body.newPin !== undefined && !isValidPin(body.newPin)) errors.push('The new PIN should be 4 to 8 digits.');
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    if (body.newPin !== undefined) fields.pinHash = await hashPin(body.newPin);
    const elder = await repo.elders.update(req.elder.id, fields);
    return res.json({
      ok: true,
      editToken: fields.pinHash ? editToken(config.secret, elder) : undefined,
    });
  });

  router.delete('/api/elders/:slug', json, requireEditor, async (req, res) => {
    const pin = String(req.body?.pin ?? '');
    if (!isValidPin(pin) || !(await verifyPin(pin, req.elder.pin_hash))) {
      await repo.elders.recordPinFailure(req.elder.id, lockMinutes);
      return res.status(401).json({ error: 'That PIN didn’t match, so nothing was deleted.' });
    }
    for (const clip of await repo.clips.forElder(req.elder.id)) await removeClipFiles(clip);
    await repo.elders.remove(req.elder.id);
    return res.status(204).end();
  });

  router.post(
    '/api/elders/:slug/clips',
    uploadLimit,
    requireEditor, // before reading the body, so strangers can't make us buffer uploads
    express.raw({ type: () => true, limit: config.audio.maxUploadBytes }),
    async (req, res) => {
      const { elder } = req;
      const prompt = promptById.get(req.query.prompt);
      if (!prompt) return res.status(400).json({ error: 'Unknown prompt.' });

      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length < 64) return res.status(400).json({ error: 'The recording was empty. Please try again.' });

      const kind = sniffAudio(body);
      if (!kind) {
        return res.status(415).json({ error: 'That file doesn’t look like a voice recording. Try a WhatsApp voice note, .m4a or .mp3.' });
      }
      if ((await repo.clips.countForElder(elder.id)) >= config.audio.maxClipsPerElder) {
        return res.status(409).json({ error: 'This page has reached its recording limit. Delete a few old takes to add more.' });
      }

      const reported = Number.parseInt(req.query.durationMs, 10);
      const clientDurationMs = reported > 0 && reported < 60 * 60 * 1000 ? reported : null;

      let play = { buffer: body, mime: kind.mime, ext: kind.ext, durationMs: null };
      let original = null;
      if (transcoder.available) {
        try {
          play = await transcoder.toM4a(body, kind.ext);
          original = kind;
        } catch (err) {
          console.error('transcode failed', err.message);
          return res.status(422).json({ error: 'We couldn’t read that audio file. Try recording it again, or a different file.' });
        }
      }

      const publicId = newClipId();
      const base = `elders/${elder.id}/${publicId}`;
      const storageKey = `${base}.${play.ext}`;
      const originalKey = original ? `${base}.orig.${original.ext}` : null;

      await storage.put(storageKey, play.buffer, play.mime);
      if (originalKey) await storage.put(originalKey, body, original.mime);

      let clip;
      try {
        clip = await repo.clips.insert({
          publicId,
          elderId: elder.id,
          promptId: prompt.id,
          storageKey,
          mime: play.mime,
          bytes: play.buffer.length,
          originalKey,
          originalMime: original?.mime ?? null,
          originalBytes: original ? body.length : null,
          durationMs: play.durationMs ?? clientDurationMs,
          source: req.query.source === 'uploaded' ? 'uploaded' : 'recorded',
        });
      } catch (err) {
        await removeClipFiles({ storage_key: storageKey, original_key: originalKey });
        throw err;
      }

      // A word has one clip: a new take replaces the old one.
      if (isWordPrompt(prompt.id)) {
        for (const old of await repo.clips.forPrompt(elder.id, prompt.id)) {
          if (old.id !== clip.id) await removeClip(old);
        }
      }

      return res.status(201).json({ clip: clipJson(clip) });
    },
  );

  router.delete('/api/elders/:slug/clips/:clipId', requireEditor, async (req, res) => {
    const clip = isId(req.params.clipId) ? await repo.clips.byPublicId(req.params.clipId) : null;
    if (!clip || clip.elder_id !== req.elder.id) return res.status(404).json({ error: 'That recording is already gone.' });
    await removeClip(clip);
    return res.status(204).end();
  });

  return router;
}

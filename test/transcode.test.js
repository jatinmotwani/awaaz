import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createTranscoder, sniffAudio } from '../src/lib/audio.js';
import { createElder, databaseAvailable, startApp, uploadClip } from './helpers.js';

const transcoder = await createTranscoder({ mode: 'auto' });
const skip = !transcoder.available ? 'ffmpeg not installed' : !(await databaseAvailable()) ? 'Postgres not reachable' : false;

// A 3-second Opus voice note, like the ones WhatsApp sends.
function voiceNote() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vn-')), 'note.ogg');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=3', '-c:a', 'libopus', '-b:a', '24k', file]);
  return fs.readFileSync(file);
}

describe('transcoding with ffmpeg', { skip }, () => {
  let app;
  before(async () => {
    app = await startApp({ transcoder });
  });
  after(async () => {
    await app?.close();
  });

  it('turns a WhatsApp voice note into a small m4a that every phone plays, keeping the original', async () => {
    const elder = await createElder(app);
    const original = voiceNote();
    const res = await uploadClip(app, elder, 'lolee-sleep', { bytes: original });
    assert.equal(res.status, 201);
    const { clip } = await res.json();
    assert.ok(Math.abs(clip.durationMs - 3000) < 150, `duration ${clip.durationMs}`);

    const audio = await app.request(clip.url);
    assert.equal(audio.headers.get('content-type'), 'audio/mp4');
    const played = Buffer.from(await audio.arrayBuffer());
    assert.equal(sniffAudio(played).mime, 'audio/mp4');
    assert.ok(played.length < 20_000, `m4a is ${played.length} bytes`);

    const row = await app.db.one('select original_key, original_mime, original_bytes from clips where public_id = $1', [clip.id]);
    assert.equal(row.original_mime, 'audio/ogg');
    assert.equal(row.original_bytes, original.length);
    assert.deepEqual(fs.readFileSync(path.join(app.dir, row.original_key)), original);
  });

  it('rejects files that only look like audio', async () => {
    const elder = await createElder(app);
    const fake = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(500, 7)]);
    const res = await uploadClip(app, elder, 'vatan-born', { bytes: fake });
    assert.equal(res.status, 422);
  });
});

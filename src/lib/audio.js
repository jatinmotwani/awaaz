import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Identify audio by its magic bytes, never by the Content-Type the browser sent:
// the stored file is served back from our own origin.
export function sniffAudio(buf) {
  if (!buf || buf.length < 12) return null;
  const ascii = (start, end) => buf.toString('latin1', start, end);

  if (ascii(0, 4) === 'OggS') return { mime: 'audio/ogg', ext: 'ogg' }; // WhatsApp voice notes, Firefox
  if (buf.readUInt32BE(0) === 0x1a45dfa3) return { mime: 'audio/webm', ext: 'webm' }; // Chrome/Android MediaRecorder
  if (ascii(4, 8) === 'ftyp') return { mime: 'audio/mp4', ext: 'm4a' }; // Safari/iPhone, .m4a files
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return { mime: 'audio/wav', ext: 'wav' };
  if (ascii(0, 4) === 'fLaC') return { mime: 'audio/flac', ext: 'flac' };
  if (ascii(0, 3) === 'ID3') return { mime: 'audio/mpeg', ext: 'mp3' };
  if (buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) return { mime: 'audio/aac', ext: 'aac' }; // ADTS
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && (buf[1] & 0x06) !== 0) return { mime: 'audio/mpeg', ext: 'mp3' };
  return null;
}

function run(cmd, args, { timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(cmd)} exited with ${code}: ${stderr.trim().slice(-500)}`));
    });
  });
}

// Re-encodes any upload to mono AAC in .m4a (~32 kbps, ≈14 MB per hour of speech), which plays
// on every phone and browser — including old iPhones that can't play WebM or Ogg voice notes.
export async function createTranscoder({ mode = 'auto', ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe' } = {}) {
  let available = false;
  if (mode !== 'off') {
    try {
      await run(ffmpegPath, ['-hide_banner', '-version'], { timeoutMs: 10_000 });
      available = true;
    } catch (err) {
      if (mode === 'on') throw new Error(`TRANSCODE=on but ffmpeg is not usable: ${err.message}`);
    }
  }

  async function probeDurationMs(file) {
    try {
      const { stdout } = await run(
        ffprobePath,
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
        { timeoutMs: 15_000 },
      );
      const seconds = Number.parseFloat(stdout);
      return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
    } catch {
      return null;
    }
  }

  return {
    available,
    async toM4a(buffer, inputExt) {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'awaaz-'));
      const input = path.join(dir, `in.${inputExt}`);
      const output = path.join(dir, `${crypto.randomUUID()}.m4a`);
      try {
        await fs.writeFile(input, buffer);
        await run(ffmpegPath, [
          '-hide_banner', '-loglevel', 'error', '-y',
          '-i', input,
          '-vn', '-map_metadata', '-1',
          '-t', '1800', // nothing we accept should be longer than half an hour
          '-ac', '1', '-ar', '24000',
          '-c:a', 'aac', '-b:a', '32k',
          '-movflags', '+faststart',
          output,
        ]);
        const out = await fs.readFile(output);
        return { buffer: out, mime: 'audio/mp4', ext: 'm4a', durationMs: await probeDurationMs(output) };
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    },
  };
}

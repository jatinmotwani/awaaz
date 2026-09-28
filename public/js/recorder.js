// Mono speech at ~24 kbps: a minute is ~180 KB, an hour ~11 MB.
const BITRATE = 24000;
const TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm'];

export const canRecord = () => Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

function pickType() {
  if (!MediaRecorder.isTypeSupported) return '';
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export function micErrorMessage(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'The microphone is blocked. Allow it for this site in your browser settings (tap the lock icon next to the address), then try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError') return 'Another app is using the microphone. Close it and try again.';
  return 'We couldn’t start the microphone on this browser. You can record a WhatsApp voice note and upload it instead.';
}

/**
 * Starts recording immediately. Returns { stop, cancel, done } where `done` resolves to
 * { blob, durationMs, type } after stop() or when maxMs is reached.
 */
export async function startRecording({ maxMs, onTick, onLevel }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const type = pickType();
  const recorder = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: BITRATE });
  const chunks = [];
  let startedAt = 0;
  let cancelled = false;
  let timer;
  let raf;
  let wakeLock;
  let audioCtx;

  // Keep the screen awake and show a live level so the family can see it's hearing Dadi.
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    /* optional */
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      onLevel?.(Math.min(1, Math.sqrt(sum / data.length) * 4));
      raf = requestAnimationFrame(loop);
    };
    loop();
  } catch {
    /* level meter is optional */
  }

  const cleanup = () => {
    clearInterval(timer);
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    audioCtx?.close().catch(() => {});
    wakeLock?.release().catch(() => {});
  };

  const done = new Promise((resolve, reject) => {
    recorder.addEventListener('dataavailable', (e) => e.data.size && chunks.push(e.data));
    recorder.addEventListener('error', (e) => {
      cleanup();
      reject(e.error || new Error('Recording failed'));
    });
    recorder.addEventListener('stop', () => {
      cleanup();
      if (cancelled) return resolve(null);
      const blobType = (recorder.mimeType || type || 'audio/webm').split(';')[0];
      return resolve({ blob: new Blob(chunks, { type: blobType }), durationMs: Date.now() - startedAt, type: blobType });
    });
  });

  const stop = () => recorder.state !== 'inactive' && recorder.stop();
  recorder.start(1000);
  startedAt = Date.now();
  timer = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    onTick?.(elapsed);
    if (elapsed >= maxMs) stop();
  }, 250);

  return {
    stop,
    cancel() {
      cancelled = true;
      stop();
    },
    done,
  };
}

// Reads a file's duration in the browser (best effort; WebM/Ogg may report none).
export function fileDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    const finish = (ms) => {
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => finish(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : null));
    audio.addEventListener('error', () => finish(null));
    setTimeout(() => finish(null), 4000);
    audio.src = url;
  });
}

const EXT_TYPES = { opus: 'audio/ogg', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4', mp4: 'audio/mp4', mp3: 'audio/mpeg', aac: 'audio/aac', wav: 'audio/wav', webm: 'audio/webm', flac: 'audio/flac' };

// Android often gives WhatsApp .opus files an empty type; the server sniffs bytes anyway.
export function typedFile(file) {
  if (file.type) return file;
  const ext = file.name.split('.').pop().toLowerCase();
  return new Blob([file], { type: EXT_TYPES[ext] || 'application/octet-stream' });
}

import { $, $$, api, copyText, editTokenKey, formatDuration, playOnce, readJson, showError, store, toast, wireTownSelect } from './common.js';
import { canRecord, fileDuration, micErrorMessage, startRecording, typedFile } from './recorder.js';

const page = readJson('page-data');
const { slug } = page;
const RING = 2 * Math.PI * 54;

const getToken = () => store.get(editTokenKey(slug));
const setToken = (token) => store.set(editTokenKey(slug), token);

// ---- Editing state -------------------------------------------------------

function setEditing(on) {
  document.body.classList.toggle('is-editor', on);
  if (on) refreshStats();
}

async function refreshStats() {
  try {
    const { devices } = await api(`/api/elders/${slug}/stats`, { token: getToken() });
    const el = $('[data-devices]');
    if (el) el.textContent = `Opened on ${devices} phone${devices === 1 ? '' : 's'} so far.`;
  } catch (err) {
    if (err.status === 401) signOut();
  }
}

function signOut(message) {
  store.remove(editTokenKey(slug));
  setEditing(false);
  if (message) toast(message, { error: true });
}

// A private recorder link carries the token in the #fragment, which never reaches the server logs.
if (location.hash.startsWith('#k=')) {
  setToken(decodeURIComponent(location.hash.slice(3)));
  history.replaceState(null, '', location.pathname);
  toast('Recording is unlocked on this phone.');
}
setEditing(Boolean(getToken()));

$('#unlock-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const error = form.parentElement.querySelector('.form-error');
  const wasOpen = form.closest('details');
  showError(error, '');
  try {
    const { editToken } = await api(`/api/elders/${slug}/unlock`, { method: 'POST', body: { pin: form.pin.value.trim() } });
    setToken(editToken);
    form.reset();
    if (wasOpen) wasOpen.open = false;
    setEditing(true);
    toast('Unlocked — tap Record on any prompt.');
  } catch (err) {
    showError(error, err.message);
  }
});

$('[data-lock]')?.addEventListener('click', () => {
  signOut();
  toast('Locked. Listening still works for everyone with the link.');
});

// ---- Clips in the page ---------------------------------------------------

function clipElement(clip) {
  const li = document.createElement('li');
  li.className = 'clip is-new';
  li.dataset.clip = clip.id;
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'none';
  audio.src = clip.url;
  const meta = document.createElement('span');
  meta.className = 'clip-meta';
  meta.textContent = `${formatDuration(clip.durationMs)}${clip.source === 'uploaded' ? ' · voice note' : ''}`;
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'icon-btn editor-only';
  del.dataset.delete = '';
  del.setAttribute('aria-label', 'Delete this recording');
  del.innerHTML = TRASH_ICON;
  li.append(audio, meta, del);
  return li;
}

const TRASH_ICON =
  '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

function addClip(clip) {
  const card = document.getElementById(`p-${clip.promptId}`);
  if (!card) return;
  card.classList.add('has-clips');
  if (card.classList.contains('word')) {
    card.dataset.clip = clip.id;
    $('[data-play]', card).disabled = false;
    $('[data-delete]', card).hidden = false;
  } else {
    $('.clip-list', card).append(clipElement(clip));
  }
  updateProgress();
}

function removeClip(card, clipId) {
  if (card.classList.contains('word')) {
    card.dataset.clip = '';
    card.classList.remove('has-clips');
    $('[data-play]', card).disabled = true;
    $('[data-delete]', card).hidden = true;
  } else {
    card.querySelector(`[data-clip="${clipId}"]`)?.remove();
    card.classList.toggle('has-clips', Boolean($('.clip', card)));
  }
  updateProgress();
}

function updateProgress() {
  const done = $$('[data-prompt].has-clips').length;
  $('[data-recorded]').textContent = done;
  $('[data-progress-bar]').style.width = `${Math.round((done / page.totalPrompts) * 100)}%`;
  $('.progress')?.setAttribute('aria-valuenow', done);
  for (const counter of $$('[data-section-done]')) {
    const section = document.getElementById(`s-${counter.dataset.sectionDone}`);
    counter.textContent = $$('[data-prompt].has-clips', section).length;
  }
}

async function uploadClip(promptId, blob, { durationMs, source }) {
  const params = new URLSearchParams({ prompt: promptId, source });
  if (durationMs) params.set('durationMs', String(durationMs));
  try {
    const { clip } = await api(`/api/elders/${slug}/clips?${params}`, { method: 'POST', body: blob, token: getToken() });
    addClip(clip);
    return clip;
  } catch (err) {
    if (err.status === 401) signOut();
    throw err;
  }
}

// ---- Delegated clicks: record, delete, play ---------------------------------

document.addEventListener('click', async (e) => {
  const record = e.target.closest('[data-record]');
  if (record) return openRecorder(record.closest('[data-prompt]').dataset.prompt);

  const play = e.target.closest('[data-play]');
  if (play) {
    const card = play.closest('[data-prompt]');
    if (!card.dataset.clip) return undefined;
    playOnce(`/a/${card.dataset.clip}`, {
      onStart: () => card.classList.add('is-playing'),
      onEnd: () => card.classList.remove('is-playing'),
    });
    return undefined;
  }

  const del = e.target.closest('[data-delete]');
  if (del) {
    const card = del.closest('[data-prompt]');
    const clipId = del.closest('[data-clip]')?.dataset.clip;
    if (!clipId || !window.confirm('Delete this recording? This can’t be undone.')) return undefined;
    try {
      await api(`/api/elders/${slug}/clips/${clipId}`, { method: 'DELETE', token: getToken() });
      removeClip(card, clipId);
      toast('Recording deleted.');
    } catch (err) {
      if (err.status === 401) signOut();
      toast(err.message, { error: true });
    }
  }
  return undefined;
});

document.addEventListener('change', async (e) => {
  const input = e.target.closest('[data-upload]');
  if (!input?.files?.length) return;
  const file = input.files[0];
  input.value = '';
  const promptId = input.closest('[data-prompt]').dataset.prompt;
  if (file.size > page.maxUploadBytes) {
    toast(`That file is too big — the limit is ${Math.round(page.maxUploadBytes / 1048576)} MB.`, { error: true });
    return;
  }
  toast('Uploading voice note…', { ms: 60000 });
  try {
    const durationMs = await fileDuration(file);
    await uploadClip(promptId, typedFile(file), { durationMs, source: 'uploaded' });
    toast('Voice note added ✓');
  } catch (err) {
    toast(err.message, { error: true, ms: 6000 });
  }
});

// ---- Recorder sheet --------------------------------------------------------

const dialog = $('#recorder');
const stage = $('.rec-stage', dialog);
const ring = $('.ring', dialog);
const preview = $('[data-preview]', dialog);
const saveLocal = $('[data-save-local]', dialog);
const field = (name) => $(`[data-f="${name}"]`, dialog);
let session = null;

function setState(state) {
  stage.dataset.state = state;
  const focusTarget = { ready: '[data-start]', live: '[data-stop]', review: '[data-save]', error: '[data-retry]' }[state];
  if (focusTarget) $(focusTarget, stage)?.focus();
}

function showRecError(message, retry, { canSaveLocal = false } = {}) {
  field('error').textContent = message;
  session.retry = retry;
  $('[data-retry]', stage).hidden = !retry;
  saveLocal.hidden = !canSaveLocal;
  setState('error');
}

function openRecorder(promptId) {
  const prompt = page.prompts[promptId];
  if (!prompt) return;
  session = { promptId, maxMs: prompt.maxSeconds * 1000 };
  field('emoji').textContent = prompt.emoji || '';
  field('roman').textContent = prompt.roman;
  field('deva').textContent = prompt.deva;
  field('en').textContent = prompt.en;
  field('max').textContent = prompt.maxSeconds;
  setState('ready');
  dialog.showModal();
  if (!canRecord()) {
    showRecError('This browser can’t record audio. Record a WhatsApp voice note instead and use “Upload voice note”.', null);
  }
}

async function startLive() {
  const current = session;
  if (!current) return;
  if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
  current.result = null;
  const updateRing = (elapsed) => {
    const left = Math.max(0, Math.ceil((current.maxMs - elapsed) / 1000));
    field('left').textContent = left;
    $('.ring-bar', ring).style.strokeDashoffset = String(RING * Math.min(1, elapsed / current.maxMs));
    ring.classList.toggle('is-ending', left <= 10);
  };
  updateRing(0);

  try {
    current.recording = await startRecording({
      maxMs: current.maxMs,
      onTick: updateRing,
      onLevel: (level) => ring.style.setProperty('--level', level.toFixed(2)),
    });
  } catch (err) {
    if (session === current) showRecError(micErrorMessage(err), startLive);
    return;
  }
  if (session !== current) {
    current.recording.cancel(); // the sheet was closed while the mic permission prompt was up
    return;
  }
  setState('live');

  try {
    const result = await current.recording.done;
    if (!result || session !== current) return;
    if (result.durationMs < 800 || result.blob.size < 500) {
      showRecError('That was too short — tap Try again and hold on a moment longer.', startLive);
      return;
    }
    current.result = result;
    current.previewUrl = URL.createObjectURL(result.blob);
    preview.src = current.previewUrl;
    saveLocal.href = current.previewUrl;
    saveLocal.download = `${current.promptId}.${result.type.includes('mp4') ? 'm4a' : result.type.split('/')[1]}`;
    setState('review');
  } catch {
    if (session === current) showRecError('Recording stopped unexpectedly. Please try again.', startLive);
  }
}

async function saveTake() {
  const current = session;
  preview.pause();
  setState('saving');
  try {
    await uploadClip(current.promptId, current.result.blob, { durationMs: current.result.durationMs, source: 'recorded' });
    if (session === current) {
      dialog.close();
      toast('Saved ✓ The family can listen now.');
    }
  } catch (err) {
    if (session !== current) return;
    const message = err.status === 401 ? 'This phone was locked (the PIN may have changed). Save the recording to your phone, unlock again, then upload it.' : err.message;
    showRecError(message, err.status === 401 ? null : saveTake, { canSaveLocal: true });
  }
}

$('[data-start]', dialog).addEventListener('click', startLive);
$('[data-stop]', dialog).addEventListener('click', () => session?.recording?.stop());
$('[data-again]', dialog).addEventListener('click', startLive);
$('[data-save]', dialog).addEventListener('click', saveTake);
$('[data-retry]', dialog).addEventListener('click', () => session?.retry?.());
$('[data-close]', dialog).addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (!session) return;
  session.recording?.cancel();
  preview.pause();
  preview.removeAttribute('src');
  // Keep the blob URL alive only if the user might still "Save to phone".
  if (session.previewUrl && stage.dataset.state !== 'error') URL.revokeObjectURL(session.previewUrl);
  session = null;
});

// ---- Family settings -------------------------------------------------------

const settings = $('#settings');
$('[data-open-settings]')?.addEventListener('click', () => settings.showModal());
$('[data-close]', settings).addEventListener('click', () => settings.close());
wireTownSelect($('#settings-form'));

$('#settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const error = $('.form-error', form);
  showError(error, '');
  try {
    await api(`/api/elders/${slug}`, {
      method: 'PATCH',
      token: getToken(),
      body: {
        displayName: form.displayName.value,
        relation: form.relation.value,
        townSlug: form.townSlug.value,
        townOther: form.townOther.value,
        birthYear: form.birthYear.value.trim(),
        onMap: form.onMap.checked,
      },
    });
    location.reload();
  } catch (err) {
    showError(error, err.message);
  }
});

$('#pin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  try {
    const { editToken } = await api(`/api/elders/${slug}`, { method: 'PATCH', token: getToken(), body: { newPin: form.newPin.value.trim() } });
    setToken(editToken);
    form.reset();
    toast('PIN changed. Tell the family members who record.');
  } catch (err) {
    toast(err.message, { error: true });
  }
});

$('[data-copy-editor-link]').addEventListener('click', async () => {
  const link = `${location.origin}/e/${slug}#k=${encodeURIComponent(getToken() || '')}`;
  toast((await copyText(link)) ? 'Recorder link copied. Send it privately.' : link, { ms: 5000 });
});

$('#delete-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pin = e.currentTarget.pin.value.trim();
  if (!window.confirm(`Delete ${page.name}’s page and every recording, forever?`)) return;
  try {
    await api(`/api/elders/${slug}`, { method: 'DELETE', token: getToken(), body: { pin } });
    store.remove(editTokenKey(slug));
    location.replace('/');
  } catch (err) {
    toast(err.message, { error: true });
  }
});

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function readJson(id) {
  const el = document.getElementById(id);
  return el ? JSON.parse(el.textContent) : null;
}

// localStorage can throw (private mode, blocked storage): never let that break the page.
export const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const editTokenKey = (slug) => `awaaz:edit:${slug}`;
export const FAMILY_KEY = 'awaaz:family';

export async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (token) init.headers['X-Edit-Token'] = token;
  if (body instanceof Blob) {
    init.body = body;
    init.headers['Content-Type'] = body.type || 'application/octet-stream';
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(path, init);
  } catch {
    throw Object.assign(new Error('No internet connection. Please check your connection and try again.'), { offline: true });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Something went wrong (${res.status}).`), { status: res.status, data });
  return data;
}

let toastTimer;
export function toast(message, { error = false, ms = 3200 } = {}) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = `toast${error ? ' is-error' : ''}`;
  el.setAttribute('role', error ? 'alert' : 'status');
  el.textContent = message;
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), ms);
}

export function formatDuration(ms) {
  if (!ms && ms !== 0) return '';
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export const whatsappUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

// Shows the "Other town" input only when "Other" is picked in a town <select>.
export function wireTownSelect(form) {
  const select = form.querySelector('select[name="townSlug"]');
  const other = form.querySelector('[data-town-other]');
  if (!select || !other) return;
  const sync = () => {
    other.hidden = select.value !== 'other';
    if (!other.hidden) other.querySelector('input')?.focus();
  };
  select.addEventListener('change', sync);
}

export function showError(el, message) {
  if (!el) return;
  el.textContent = message || '';
  el.hidden = !message;
}

// Plays one clip at a time across the page.
let current;
export function playOnce(src, { onStart, onEnd } = {}) {
  if (current) {
    current.audio.pause();
    current.onEnd?.();
  }
  const audio = new Audio(src);
  current = { audio, onEnd };
  const finish = () => {
    if (current?.audio === audio) current = null;
    onEnd?.();
  };
  audio.addEventListener('ended', finish);
  audio.addEventListener('error', finish);
  onStart?.();
  audio.play().catch(finish);
  return audio;
}

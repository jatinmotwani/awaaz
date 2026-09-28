import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 32;

export const isValidPin = (pin) => typeof pin === 'string' && /^\d{4,8}$/.test(pin);

export async function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pin, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPin(pin, stored) {
  const [alg, salt, expected] = String(stored).split('$');
  if (alg !== 'scrypt' || !salt || !expected || typeof pin !== 'string') return false;
  const key = await scrypt(pin, Buffer.from(salt, 'base64url'), KEY_LENGTH);
  return safeEqual(key, Buffer.from(expected, 'base64url'));
}

// A device that entered the right PIN keeps this token. It is derived from the PIN hash,
// so changing the PIN signs every device out without storing any sessions.
export function editToken(secret, elder) {
  return crypto.createHmac('sha256', secret).update(`edit:${elder.id}:${elder.pin_hash}`).digest('base64url');
}

export function checkEditToken(secret, elder, token) {
  if (typeof token !== 'string' || !token) return false;
  return safeEqual(Buffer.from(token), Buffer.from(editToken(secret, elder)));
}

// Five wrong PINs lock the page for 15 minutes; every further five doubles it, up to a day.
export function lockMinutes(failures) {
  if (failures < 5 || failures % 5 !== 0) return 0;
  return Math.min(15 * 2 ** (failures / 5 - 1), 24 * 60);
}

export function safeEqual(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

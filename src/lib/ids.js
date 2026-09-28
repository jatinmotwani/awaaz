import crypto from 'node:crypto';

// 32 symbols (no 0/o/1/l) so every byte maps uniformly with `& 31`, 5 bits per char.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function randomId(length) {
  let out = '';
  for (const byte of crypto.randomBytes(length)) out += ALPHABET[byte & 31];
  return out;
}

export const newSlug = () => randomId(12); // 60 bits: the secret in a share link
export const newRefCode = () => randomId(8); // not secret: attributes "Record your Nani too" signups
export const newClipId = () => randomId(20); // 100 bits: the secret in an audio URL

export const isId = (value) => typeof value === 'string' && /^[a-z2-9]{6,32}$/.test(value);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (value) => typeof value === 'string' && UUID.test(value);

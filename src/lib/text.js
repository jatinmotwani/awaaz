// Single-line user text: NFC, no control characters or angle brackets, collapsed spaces.
export function cleanLine(value, max) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const LINK = /(https?:|www\.|\.(com|in|net|org|co|io|me|app|xyz|pk|info|biz|link)\b|@[a-z0-9-]+\.)/i;
const PHONE = /\d[\d\s().-]{6,}\d/;

// Dedications publish without review, so keep them to names and places.
export function dedicationProblem(text) {
  if (LINK.test(text)) return 'Please leave out links and email addresses.';
  if (PHONE.test(text)) return 'Please leave out phone numbers.';
  return null;
}

export function kebab(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDuration(ms) {
  if (!ms && ms !== 0) return '';
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatRupees(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

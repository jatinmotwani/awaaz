import { cleanLine } from './text.js';
import { MONTHS, nextTithiDate, parseYmd, purnimantaNote, tithiLabel, tithiOnDate, todayAt, datesForTithi, ymdString } from './panchang.js';

export const KINDS = {
  barsi: { label: 'Barsi', emoji: '🪔', noun: 'barsi' },
  birthday: { label: 'Birthday', emoji: '🎂', noun: 'birthday' },
  anniversary: { label: 'Anniversary', emoji: '💐', noun: 'anniversary' },
  other: { label: 'Other', emoji: '✨', noun: '' },
};

export const MAX_DATES_PER_ELDER = 12;

const GREGORIAN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = GREGORIAN_MONTHS.map((m) => m.slice(0, 3));

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function ordinal(n) {
  const rem100 = n % 100;
  const suffix = rem100 >= 11 && rem100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${suffix}`;
}

export function formatDay({ y, m, d }) {
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

export function daysBetween(from, to) {
  return Math.round((Date.UTC(to.y, to.m - 1, to.d) - Date.UTC(from.y, from.m - 1, from.d)) / 86400000);
}

// Validates the add-a-date form. `date` is the English date it happened; for tithi dates it
// is converted, otherwise the tithi can be given directly (month 0–11, paksha, tithi 1–15).
export function parseFamilyDate(body, { defaultPerson }) {
  const errors = [];
  const kind = Object.hasOwn(KINDS, body.kind) ? body.kind : null;
  if (!kind) errors.push('Choose what kind of date this is.');
  const person = cleanLine(body.person, 60) || defaultPerson;
  const label = kind === 'other' ? cleanLine(body.label, 60) : null;
  if (kind === 'other' && !label) errors.push('Say what the date is, e.g. “Wedding anniversary”.');

  const calendar = body.calendar === 'gregorian' ? 'gregorian' : 'tithi';
  const thisYear = new Date().getUTCFullYear();
  const date = body.date ? parseYmd(body.date) : null;
  if (body.date && (!date || date.y < 1890 || date.y > thisYear + 1)) errors.push('That date doesn’t look right.');

  const fields = { kind, person, label, calendar, year: null, paksha: null };
  if (calendar === 'gregorian') {
    if (!date) errors.push('Pick the date.');
    else Object.assign(fields, { month: date.m, day: date.d, year: date.y });
  } else if (date) {
    const t = tithiOnDate(date);
    Object.assign(fields, { month: t.month, day: t.tithi, paksha: t.paksha, year: date.y });
  } else {
    const month = Number(body.month);
    const tithi = Number(body.tithi);
    const year = body.year === '' || body.year === undefined || body.year === null ? null : Number(body.year);
    if (!Number.isInteger(month) || month < 0 || month > 11) errors.push('Pick the month.');
    if (!['shukla', 'krishna'].includes(body.paksha)) errors.push('Pick shukla or krishna paksha.');
    if (!Number.isInteger(tithi) || tithi < 1 || tithi > 15) errors.push('Pick the tithi.');
    if (year !== null && (!Number.isInteger(year) || year < 1890 || year > thisYear)) errors.push('The year looks wrong.');
    Object.assign(fields, { month, day: tithi, paksha: body.paksha, year });
  }
  return { fields, errors };
}

const tithiSpec = (row) => ({ month: row.month, paksha: row.paksha, tithi: row.day });

// When the date falls in a given year (tithi dates: usually once, occasionally zero or twice).
export function occurrencesIn(row, year) {
  if (row.calendar === 'tithi') return datesForTithi(tithiSpec(row), year);
  const d = row.month === 2 && row.day === 29 && !isLeap(year) ? 28 : row.day;
  return [{ y: year, m: row.month, d }];
}

export function nextOccurrence(row, today = todayAt()) {
  if (row.calendar === 'tithi') return nextTithiDate(tithiSpec(row), today);
  for (let year = today.y; year <= today.y + 1; year += 1) {
    const [date] = occurrencesIn(row, year);
    if (ymdString(date) >= ymdString(today)) return date;
  }
  return null;
}

// "Kartik (Kati) Krishna Ashtami" or "12 November".
export function describeRule(row) {
  if (row.calendar === 'tithi') return tithiLabel(tithiSpec(row));
  return `${row.day} ${GREGORIAN_MONTHS[row.month - 1]}`;
}

export const ruleNote = (row) => (row.calendar === 'tithi' ? purnimantaNote(tithiSpec(row)) : '');

// "Dada Mohan’s 12th barsi" / "Dadi’s birthday" / "Wedding anniversary — Dada & Dadi".
export function occasionTitle(row, year) {
  if (row.kind === 'other') return `${row.label} — ${row.person}`;
  const count = row.year && year > row.year ? `${ordinal(year - row.year)} ` : '';
  return `${row.person}’s ${count}${KINDS[row.kind].noun}`;
}

export function presentDate(row, today = todayAt()) {
  const next = nextOccurrence(row, today);
  return {
    id: row.id,
    kind: row.kind,
    emoji: KINDS[row.kind].emoji,
    byTithi: row.calendar === 'tithi',
    title: next ? occasionTitle(row, next.y) : occasionTitle(row, today.y),
    rule: describeRule(row),
    note: ruleNote(row),
    next: next ? ymdString(next) : null,
    nextLabel: next ? formatDay(next) : 'Not in the next two years',
    inDays: next ? daysBetween(today, next) : null,
  };
}

export const monthOptions = MONTHS.map((m, i) => ({ value: i, label: `${m.name} (${m.sindhi})` }));

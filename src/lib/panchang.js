// A small panchang: tithi and lunar month for barsi and birthday reminders.
//
// Sun and Moon positions follow Jean Meeus, "Astronomical Algorithms" (ch. 25 and 47,
// main terms), which is accurate to a few minutes of tithi time: plenty for
// finding the day. Conventions, matching most Sindhi panchangs:
//   - amanta months (a month runs new moon to new moon, as in Gujarati/Marathi calendars),
//     named after the sidereal (Lahiri) sign the Sun is in at the new moon that starts it;
//   - a month with no sankranti is adhik (leap) and is skipped for observances;
//   - the tithi of a day is the one prevailing at sunrise in Mumbai. A tithi that
//     begins and ends between two sunrises (kshaya) is observed on the day it falls in.
// Families abroad, or following a local pandit, may observe a day earlier or later.

const RAD = Math.PI / 180;
const sin = (deg) => Math.sin(deg * RAD);
const cos = (deg) => Math.cos(deg * RAD);
const norm = (deg) => ((deg % 360) + 360) % 360;

export const MUMBAI = { lat: 19.076, lon: 72.8777, utcOffsetMinutes: 330 };

export const MONTHS = [
  { name: 'Chaitra', sindhi: 'Chet' },
  { name: 'Vaishakha', sindhi: 'Visakh' },
  { name: 'Jyeshtha', sindhi: 'Jeth' },
  { name: 'Ashadha', sindhi: 'Akhar' },
  { name: 'Shravana', sindhi: 'Sanwan' },
  { name: 'Bhadrapada', sindhi: 'Badro' },
  { name: 'Ashvin', sindhi: 'Asu' },
  { name: 'Kartik', sindhi: 'Kati' },
  { name: 'Margashirsha', sindhi: 'Nahri' },
  { name: 'Pausha', sindhi: 'Poh' },
  { name: 'Magha', sindhi: 'Mangh' },
  { name: 'Phalguna', sindhi: 'Phagun' },
];

export const TITHIS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
  'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
];

// ---- Time ------------------------------------------------------------------

export const dateToJd = (date) => date.getTime() / 86400000 + 2440587.5;
export const jdToDate = (jd) => new Date(Math.round((jd - 2440587.5) * 86400000));

// ΔT (TT − UT) in days: NASA's polynomial for 2005–2050, fine a few decades either side.
function deltaT(jd) {
  const y = 2000 + (jd - 2451545) / 365.25;
  const t = y - 2000;
  return (62.92 + 0.32217 * t + 0.005589 * t * t) / 86400;
}

const centuries = (jdUt) => (jdUt + deltaT(jdUt) - 2451545) / 36525;

// ---- Sun and Moon -------------------------------------------------------------

// Apparent geocentric longitude of the Sun (Meeus ch. 25, ~0.01°).
export function sunLongitude(jdUt) {
  const T = centuries(jdUt);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const omega = 125.04 - 1934.136 * T;
  return norm(L0 + C - 0.00569 - 0.00478 * sin(omega));
}

// Meeus table 47.A, longitude terms: [D, M, M', F, coefficient in 1e-6 degrees].
const MOON_TERMS = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691], [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399], [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330], [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294],
];

// Apparent geocentric longitude of the Moon (Meeus ch. 47, ~0.003°).
export function moonLongitude(jdUt) {
  const T = centuries(jdUt);
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  let sum = 0;
  for (const [d, m, mp, f, coeff] of MOON_TERMS) {
    const e = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sum += coeff * e * sin(d * D + m * M + mp * Mp + f * F);
  }
  sum += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  const omega = 125.04452 - 1934.136261 * T;
  const nutation = -0.004778 * sin(omega) - 0.000367 * sin(2 * (280.4665 + 36000.7698 * T)); // main Δψ terms
  return norm(Lp + sum / 1e6 + nutation);
}

// Moon − Sun, 0–360°. Each tithi is 12°.
export const elongation = (jdUt) => norm(moonLongitude(jdUt) - sunLongitude(jdUt));

const MEAN_ELONGATION_RATE = 360 / 29.530588853; // degrees per day

// The moment after `fromJd` when the elongation reaches `target` degrees (Newton's method).
export function nextElongation(fromJd, target) {
  let t = fromJd + norm(target - elongation(fromJd)) / MEAN_ELONGATION_RATE;
  for (let i = 0; i < 8; i += 1) {
    const diff = ((elongation(t) - target + 540) % 360) - 180; // signed, −180..180
    t -= diff / MEAN_ELONGATION_RATE;
    if (Math.abs(diff) < 1e-6) break;
  }
  return t;
}

// The last new moon at or before `jd` (one always falls in any 30-day window).
export function previousNewMoon(jd) {
  let t = nextElongation(jd - 31, 0);
  for (let next = nextElongation(t + 1, 0); next <= jd; next = nextElongation(t + 1, 0)) t = next;
  return t;
}

// Lahiri (Chitrapaksha) ayanamsa, degrees.
const ayanamsa = (jdUt) => {
  const T = (jdUt - 2451545) / 36525;
  return 23.85306 + 1.39722 * T + 0.00018 * T * T;
};

export const siderealSign = (jdUt) => Math.floor(norm(sunLongitude(jdUt) - ayanamsa(jdUt)) / 30); // 0 = Mesha

// ---- Sunrise ------------------------------------------------------------------

const daysSince2000 = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000);

// Sunrise (JD, UT) on a civil date at a place — the standard sunrise equation, ~1 minute.
export function sunrise({ y, m, d }, place = MUMBAI) {
  const n = daysSince2000(y, m, d);
  const jStar = n - place.lon / 360;
  const M = norm(357.5291 + 0.98560028 * jStar);
  const C = 1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M);
  const lambda = norm(M + C + 180 + 102.9372);
  const transit = 2451545 + jStar + 0.0053 * sin(M) - 0.0069 * sin(2 * lambda);
  const sinDec = sin(lambda) * sin(23.4397);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (sin(-0.833) - sin(place.lat) * sinDec) / (cos(place.lat) * cosDec);
  return transit - Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD / 360;
}

// ---- Civil dates ------------------------------------------------------------------

export function parseYmd(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? { y, m, d } : null;
}

export const ymdString = ({ y, m, d }) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function addDays({ y, m, d }, days) {
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

// The civil date at `place` for a moment.
function civilDate(jd, place = MUMBAI) {
  const date = new Date(jdToDate(jd).getTime() + place.utcOffsetMinutes * 60000);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

export function todayAt(place = MUMBAI, now = new Date()) {
  return civilDate(dateToJd(now), place);
}

// ---- Lunar month and tithi ------------------------------------------------------------

// The amanta month containing a moment: index 0 = Chaitra, plus whether it is adhik.
export function lunarMonth(jd) {
  const start = previousNewMoon(jd);
  const end = nextElongation(start + 1, 0);
  const signAtStart = siderealSign(start);
  return { month: (signAtStart + 1) % 12, adhik: signAtStart === siderealSign(end), start, end };
}

// Index 1–30: 1–15 shukla (15 = Purnima), 16–30 krishna (30 = Amavasya).
export const tithiIndexAt = (jd) => Math.floor(elongation(jd) / 12) + 1;

export function toTithi(index) {
  return index <= 15 ? { paksha: 'shukla', tithi: index } : { paksha: 'krishna', tithi: index - 15 };
}

export const fromTithi = (paksha, tithi) => (paksha === 'krishna' ? 15 + tithi : tithi);

// The tithi a civil date is observed as. Dates in an adhik month count as the regular month.
export function tithiOnDate(ymd, place = MUMBAI) {
  const rise = sunrise(ymd, place);
  const { month, adhik } = lunarMonth(rise);
  return { month, adhik, ...toTithi(tithiIndexAt(rise)) };
}

// Civil dates in year `year` when (month, paksha, tithi) is observed. Usually one; rarely
// zero or two (a Pausha or Magha tithi can fall in early January and again in late December).
export function datesForTithi({ month, paksha, tithi }, year, place = MUMBAI) {
  const index = fromTithi(paksha, tithi);
  const results = [];
  const from = dateToJd(new Date(Date.UTC(year - 1, 10, 1)));
  const to = dateToJd(new Date(Date.UTC(year + 1, 1, 1)));

  for (let newMoon = nextElongation(from, 0); newMoon < to; newMoon = nextElongation(newMoon + 1, 0)) {
    const lunar = lunarMonth(newMoon + 1);
    if (lunar.month !== month || lunar.adhik) continue;

    const begins = index === 1 ? newMoon : nextElongation(newMoon, (index - 1) * 12);
    const ends = index === 30 ? lunar.end : nextElongation(begins + 0.01, index * 12);
    // The first sunrise inside [begins, ends); if there is none (kshaya), the day it falls in.
    let day = civilDate(begins, place);
    if (sunrise(day, place) < begins) day = addDays(day, 1);
    if (sunrise(day, place) >= ends) day = civilDate(begins, place);
    if (day.y === year) results.push(day);
  }
  return results;
}

// Next civil date on or after `from` for a tithi.
export function nextTithiDate(spec, from, place = MUMBAI) {
  for (let year = from.y; year <= from.y + 2; year += 1) {
    const found = datesForTithi(spec, year, place).find((d) => ymdString(d) >= ymdString(from));
    if (found) return found;
  }
  return null;
}

export function tithiLabel({ month, paksha, tithi }) {
  const name = MONTHS[month];
  const day = paksha === 'krishna' && tithi === 15 ? 'Amavasya' : TITHIS[tithi - 1];
  const half = paksha === 'shukla' ? 'Shukla' : 'Krishna';
  return `${name.name} (${name.sindhi}) ${half} ${day}`;
}

// North Indian (purnimanta) calendars name krishna-paksha days after the following month.
export function purnimantaNote({ month, paksha }) {
  if (paksha !== 'krishna') return '';
  return `${MONTHS[(month + 1) % 12].name} Krishna in North Indian calendars`;
}

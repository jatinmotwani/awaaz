import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  datesForTithi,
  dateToJd,
  jdToDate,
  lunarMonth,
  moonLongitude,
  nextTithiDate,
  previousNewMoon,
  sunLongitude,
  sunrise,
  tithiLabel,
  tithiOnDate,
  ymdString,
} from '../src/lib/panchang.js';

const close = (actual, expected, tolerance, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

describe('panchang: astronomy', () => {
  // Worked examples from Meeus, Astronomical Algorithms (TT given; our functions take UT).
  it('matches Meeus example 47.a for the Moon', () => {
    close(moonLongitude(2448724.5 - 60 / 86400), 133.167265, 0.001, 'moon longitude');
  });

  it('matches Meeus example 25.a for the Sun', () => {
    close(sunLongitude(2448908.5 - 60 / 86400), 199.90895, 0.001, 'sun longitude');
  });

  it('finds new moons to within two minutes of published times', () => {
    for (const iso of ['2024-04-08T18:21Z', '2023-07-17T18:32Z', '2023-08-16T09:38Z', '2025-03-29T10:58Z']) {
      const expected = Date.parse(iso);
      const found = jdToDate(previousNewMoon(dateToJd(new Date(expected + 6 * 3600e3)))).getTime();
      assert.ok(Math.abs(found - expected) < 2 * 60e3, `${iso}: ${new Date(found).toISOString()}`);
    }
  });

  it('computes Mumbai sunrise to within a few minutes', () => {
    const ist = (jd) => new Date(jdToDate(jd).getTime() + 330 * 60e3).toISOString().slice(11, 16);
    assert.ok(['06:00', '06:01', '06:02', '06:03'].includes(ist(sunrise({ y: 2024, m: 6, d: 21 }))));
    assert.ok(['07:06', '07:07', '07:08', '07:09'].includes(ist(sunrise({ y: 2024, m: 12, d: 21 }))));
  });
});

describe('panchang: festival dates (tithi at sunrise, amanta months)', () => {
  const cases = [
    ['Gudi Padwa', 0, 'shukla', 1, ['2023-03-22', '2024-04-09', '2025-03-30']],
    ['Ram Navami', 0, 'shukla', 9, ['2023-03-30', '2024-04-17', '2025-04-06']],
    ['Akshaya Tritiya', 1, 'shukla', 3, ['2024-05-10', '2025-04-30']],
    ['Guru Purnima', 3, 'shukla', 15, ['2024-07-21', '2025-07-10']],
    ['Nag Panchami (2023 had an adhik Shravan)', 4, 'shukla', 5, ['2023-08-21', '2024-08-09']],
    ['Raksha Bandhan', 4, 'shukla', 15, ['2024-08-19', '2025-08-09']],
    ['Janmashtami', 4, 'krishna', 8, ['2024-08-26', '2025-08-16']],
    ['Ganesh Chaturthi', 5, 'shukla', 4, ['2023-09-19', '2024-09-07', '2025-08-27']],
  ];
  for (const [name, month, paksha, tithi, expected] of cases) {
    it(name, () => {
      for (const date of expected) {
        const found = datesForTithi({ month, paksha, tithi }, Number(date.slice(0, 4))).map(ymdString);
        assert.deepEqual(found, [date]);
      }
    });
  }
});

describe('panchang: months and tithis', () => {
  it('spots the adhik (leap) Shravan of 2023', () => {
    const adhik = lunarMonth(dateToJd(new Date('2023-08-01T06:00Z')));
    assert.equal(adhik.month, 4);
    assert.equal(adhik.adhik, true);
    const nija = lunarMonth(dateToJd(new Date('2023-09-01T06:00Z')));
    assert.equal(nija.month, 4);
    assert.equal(nija.adhik, false);
  });

  it('reads the tithi of a date', () => {
    assert.deepEqual(tithiOnDate({ y: 2024, m: 4, d: 17 }), { month: 0, adhik: false, paksha: 'shukla', tithi: 9 });
    assert.equal(tithiLabel(tithiOnDate({ y: 2024, m: 8, d: 26 })), 'Shravana (Sanwan) Krishna Ashtami');
  });

  it('round-trips: a date’s tithi comes back on that date', () => {
    for (const ymd of [{ y: 2024, m: 4, d: 17 }, { y: 2025, m: 8, d: 27 }, { y: 2024, m: 11, d: 20 }, { y: 2025, m: 1, d: 29 }]) {
      const t = tithiOnDate(ymd);
      assert.ok(datesForTithi(t, ymd.y).map(ymdString).includes(ymdString(ymd)), ymdString(ymd));
    }
  });

  it('walks a whole lunar year in order, skipping 2026’s adhik Jyeshtha', () => {
    const days = [];
    let previous = '2026-03-19';
    for (let month = 0; month < 12; month += 1) {
      for (const paksha of ['shukla', 'krishna']) {
        for (let tithi = 1; tithi <= 15; tithi += 1) {
          const [date] = [...datesForTithi({ month, paksha, tithi }, 2026), ...datesForTithi({ month, paksha, tithi }, 2027)]
            .map(ymdString)
            .filter((d) => d >= previous);
          days.push(date);
          previous = date;
        }
      }
    }
    assert.equal(days.length, 360);
    const leaps = [];
    for (let i = 1; i < days.length; i += 1) {
      const gap = (Date.parse(days[i]) - Date.parse(days[i - 1])) / 86400e3;
      if (gap > 2) leaps.push(`${days[i - 1]} → ${days[i]}`);
      else assert.ok(gap >= 0, `${days[i - 1]} → ${days[i]}`);
    }
    // Vaishakha Amavasya, then a skipped month of adhik Jyeshtha, then nija Jyeshtha.
    assert.deepEqual(leaps, ['2026-05-16 → 2026-06-15']);
    assert.equal(lunarMonth(dateToJd(new Date('2026-06-01T06:00Z'))).adhik, true);
    // Chaitra Shukla Pratipada 2026 (Gudi Padwa / the day before Cheti Chand).
    assert.equal(days[0], '2026-03-19');
  });

  it('finds the next occurrence, rolling into the next year', () => {
    const spec = { month: 0, paksha: 'shukla', tithi: 9 };
    assert.equal(ymdString(nextTithiDate(spec, { y: 2024, m: 1, d: 1 })), '2024-04-17');
    assert.equal(ymdString(nextTithiDate(spec, { y: 2024, m: 4, d: 18 })), '2025-04-06');
  });
});

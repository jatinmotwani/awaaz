import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeRule, nextOccurrence, occasionTitle, occurrencesIn, ordinal, parseFamilyDate, presentDate, ruleNote } from '../src/lib/family-dates.js';
import { buildCalendar } from '../src/lib/ics.js';
import { ymdString } from '../src/lib/panchang.js';

const parse = (body) => parseFamilyDate(body, { defaultPerson: 'Dada Mohan' });

describe('family dates', () => {
  it('turns the date of passing into a tithi barsi', () => {
    const { fields, errors } = parse({ kind: 'barsi', calendar: 'tithi', date: '2024-04-17' });
    assert.deepEqual(errors, []);
    assert.deepEqual(fields, { kind: 'barsi', person: 'Dada Mohan', label: null, calendar: 'tithi', month: 0, day: 9, paksha: 'shukla', year: 2024 });
    assert.equal(describeRule(fields), 'Chaitra (Chet) Shukla Navami');
  });

  it('accepts a tithi picked directly', () => {
    const { fields, errors } = parse({ kind: 'barsi', calendar: 'tithi', month: '7', paksha: 'krishna', tithi: '8', year: '' });
    assert.deepEqual(errors, []);
    assert.equal(describeRule(fields), 'Kartik (Kati) Krishna Ashtami');
    assert.equal(ruleNote(fields), 'Margashirsha Krishna in North Indian calendars');
    assert.equal(fields.year, null);
  });

  it('keeps English-date birthdays', () => {
    const { fields } = parse({ kind: 'birthday', calendar: 'gregorian', date: '1938-11-12', person: 'Dadi Kamla' });
    assert.deepEqual([fields.month, fields.day, fields.year, fields.person], [11, 12, 1938, 'Dadi Kamla']);
    assert.equal(describeRule(fields), '12 November');
  });

  it('rejects incomplete or odd input', () => {
    assert.match(parse({ kind: 'party', calendar: 'tithi', date: '2024-04-17' }).errors[0], /kind of date/);
    assert.match(parse({ kind: 'other', calendar: 'tithi', date: '2024-04-17' }).errors[0], /Wedding anniversary/);
    assert.match(parse({ kind: 'birthday', calendar: 'gregorian' }).errors[0], /Pick the date/);
    assert.match(parse({ kind: 'birthday', calendar: 'gregorian', date: '2024-02-30' }).errors[0], /doesn’t look right/);
    assert.match(parse({ kind: 'barsi', calendar: 'tithi', month: '13', paksha: 'krishna', tithi: '8' }).errors[0], /month/);
    assert.match(parse({ kind: 'barsi', calendar: 'tithi', month: '2', paksha: 'dark', tithi: '8' }).errors[0], /paksha/);
  });

  it('names the occasion with an ordinal when the year is known', () => {
    assert.equal(ordinal(1), '1st');
    assert.equal(ordinal(12), '12th');
    assert.equal(ordinal(22), '22nd');
    assert.equal(ordinal(113), '113th');
    const barsi = { kind: 'barsi', person: 'Dada Mohan', year: 2014 };
    assert.equal(occasionTitle(barsi, 2026), 'Dada Mohan’s 12th barsi');
    assert.equal(occasionTitle({ ...barsi, year: null }, 2026), 'Dada Mohan’s barsi');
    assert.equal(occasionTitle({ kind: 'birthday', person: 'Dadi Kamla', year: 1938 }, 2026), 'Dadi Kamla’s 88th birthday');
    assert.equal(occasionTitle({ kind: 'other', label: 'Wedding anniversary', person: 'Dada & Dadi' }, 2026), 'Wedding anniversary — Dada & Dadi');
  });

  it('finds the next occurrence of English and tithi dates', () => {
    const birthday = { calendar: 'gregorian', month: 11, day: 12 };
    assert.equal(ymdString(nextOccurrence(birthday, { y: 2026, m: 9, d: 28 })), '2026-11-12');
    assert.equal(ymdString(nextOccurrence(birthday, { y: 2026, m: 11, d: 13 })), '2027-11-12');
    const leapling = { calendar: 'gregorian', month: 2, day: 29 };
    assert.deepEqual(occurrencesIn(leapling, 2027).map(ymdString), ['2027-02-28']);
    assert.deepEqual(occurrencesIn(leapling, 2028).map(ymdString), ['2028-02-29']);

    const ramNavami = { calendar: 'tithi', month: 0, paksha: 'shukla', day: 9 };
    assert.equal(ymdString(nextOccurrence(ramNavami, { y: 2024, m: 1, d: 1 })), '2024-04-17');
    const shown = presentDate({ id: 1, kind: 'barsi', person: 'Dada', year: 2020, ...ramNavami }, { y: 2024, m: 4, d: 10 });
    assert.deepEqual(
      { title: shown.title, next: shown.next, inDays: shown.inDays, nextLabel: shown.nextLabel },
      { title: 'Dada’s 4th barsi', next: '2024-04-17', inDays: 7, nextLabel: 'Wed 17 Apr 2024' },
    );
  });
});

describe('ics', () => {
  it('writes all-day events with reminders, escaping and folded lines', () => {
    const ics = buildCalendar({
      name: 'Dadi Kamla, family dates',
      now: new Date('2026-09-28T10:00:00Z'),
      events: [
        {
          uid: 'date-1-2026-11-12@awaaz.test',
          date: { y: 2026, m: 11, d: 12 },
          summary: '🪔 Dada Mohan’s 12th barsi; remember',
          description: `Kartik (Kati) Krishna Ashtami.\nHear the voice: https://awaaz.test/e/abc — ${'long '.repeat(20)}`,
          url: 'https://awaaz.test/e/abc',
        },
      ],
    });
    const lines = ics.split('\r\n');
    assert.equal(lines[0], 'BEGIN:VCALENDAR');
    assert.ok(lines.includes('X-WR-CALNAME:Dadi Kamla\\, family dates'));
    assert.ok(lines.includes('DTSTART;VALUE=DATE:20261112'));
    assert.ok(lines.includes('DTEND;VALUE=DATE:20261113'));
    assert.ok(lines.includes('DTSTAMP:20260928T100000Z'));
    assert.ok(lines.includes('SUMMARY:🪔 Dada Mohan’s 12th barsi\\; remember'));
    assert.ok(lines.includes('TRIGGER:-PT6H') && lines.includes('TRIGGER:PT8H'));
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
    for (const line of lines) assert.ok(Buffer.byteLength(line) <= 75, `line too long: ${line}`);
    const unfolded = ics.replace(/\r\n /g, '');
    assert.match(unfolded, /DESCRIPTION:Kartik \(Kati\) Krishna Ashtami\.\\nHear the voice: https:\/\/awaaz\.test\/e\/abc/);
  });
});

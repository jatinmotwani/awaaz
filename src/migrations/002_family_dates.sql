-- Barsi, birthdays and other family dates, remembered by English date or by tithi.
create table family_dates (
  id integer generated always as identity primary key,
  elder_id integer not null references elders (id) on delete cascade,
  kind text not null check (kind in ('birthday', 'barsi', 'anniversary', 'other')),
  person text not null,
  label text,
  calendar text not null check (calendar in ('gregorian', 'tithi')),
  -- gregorian: month 1–12 and day of month; tithi: month 0–11 (0 = Chaitra, amanta) and tithi 1–15
  month integer not null check (month between 0 and 12),
  day integer not null check (day between 1 and 31),
  paksha text check (paksha in ('shukla', 'krishna')),
  -- The year it happened, if known: turns "barsi" into "12th barsi".
  year integer,
  created_at timestamptz not null default now(),
  check ((calendar = 'tithi') = (paksha is not null))
);

create index family_dates_elder_idx on family_dates (elder_id);

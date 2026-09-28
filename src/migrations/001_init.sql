-- One row per elder (Dada, Dadi, Nana, Nani…). The page is unlisted: the random
-- slug in the share link is the only way to reach it. Recording needs the PIN.
create table elders (
  id integer generated always as identity primary key,
  slug text not null unique,
  ref_code text not null unique,
  display_name text not null,
  relation text not null check (relation in ('dada', 'dadi', 'nana', 'nani', 'other')),
  town_slug text,
  town_other text,
  birth_year integer,
  -- Pages started from the same phone share a family_id, so the map counts families, not elders.
  family_id uuid not null,
  on_map boolean not null default false,
  pin_hash text not null,
  pin_failures integer not null default 0,
  pin_locked_until timestamptz,
  referred_by integer references elders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index elders_map_idx on elders (town_slug) where on_map;
create index elders_referred_by_idx on elders (referred_by);

create table clips (
  id integer generated always as identity primary key,
  public_id text not null unique,
  elder_id integer not null references elders (id) on delete cascade,
  prompt_id text not null,
  -- The file we play back. When ffmpeg is available this is a small AAC .m4a that
  -- every phone can play, and the untouched upload is kept alongside as original_*.
  storage_key text not null,
  mime text not null,
  bytes integer not null,
  original_key text,
  original_mime text,
  original_bytes integer,
  duration_ms integer,
  source text not null default 'recorded' check (source in ('recorded', 'uploaded')),
  created_at timestamptz not null default now()
);

create index clips_elder_idx on clips (elder_id, prompt_id, created_at);

-- One row per device that opened a page: the "are relatives forwarding it?" signal.
create table page_views (
  elder_id integer not null references elders (id) on delete cascade,
  visitor text not null,
  first_seen timestamptz not null default now(),
  primary key (elder_id, visitor)
);

-- Paid "in loving memory of" lines on a town page.
create table dedications (
  id integer generated always as identity primary key,
  town_slug text not null,
  tier text not null check (tier in ('town', 'featured')),
  in_memory_of text not null,
  from_line text,
  amount_paise integer not null,
  status text not null default 'created' check (status in ('created', 'paid', 'hidden')),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index dedications_active_idx on dedications (town_slug, ends_at) where status = 'paid';

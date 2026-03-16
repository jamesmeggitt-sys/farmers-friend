import { createClient } from '@supabase/supabase-js'

// ─── Replace these with your actual Supabase project values ───────────────────
// 1. Go to https://supabase.com and create a free project
// 2. In your project: Settings → API → copy Project URL and anon/public key
// 3. Paste them below
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Run this SQL once in your Supabase SQL editor to set up the schema ───────
export const SETUP_SQL = `
-- Enable RLS (Row Level Security) — each farm only sees its own data
-- ─────────────────────────────────────────────────────────────────────

-- Farms (organisations)
create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Farm members (link users to farms with a role)
create table if not exists farm_members (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  role text default 'worker', -- 'owner' | 'manager' | 'worker'
  created_at timestamptz default now(),
  unique(farm_id, user_id)
);

-- Equipment / item catalogue per farm
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade,
  name text not null,
  category text,
  serial_number text,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- The core checkout/checkin log
create table if not exists shed_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade,
  item_name text not null,
  item_id uuid references equipment(id) on delete set null,
  category text,
  quantity int default 1,
  destination text,
  checkout_notes text,
  checkout_by uuid references farm_members(id) on delete set null,
  checkout_by_name text not null,
  checkout_at timestamptz default now(),
  expected_return_at timestamptz,
  photo_out_url text,
  status text default 'out', -- 'out' | 'returned'
  return_by uuid references farm_members(id) on delete set null,
  return_by_name text,
  return_at timestamptz,
  return_notes text,
  condition_on_return text,
  photo_in_url text,
  created_at timestamptz default now()
);

-- Storage bucket for photos (run separately in Supabase dashboard)
-- Storage → New bucket → name: "shed-photos" → Public: false

-- RLS Policies
alter table farms enable row level security;
alter table farm_members enable row level security;
alter table equipment enable row level security;
alter table shed_records enable row level security;

-- Farms: owner can do anything
create policy "Farm owner full access" on farms
  for all using (owner_id = auth.uid());

-- Farm members: see your own farm's members
create policy "Members see their farm" on farm_members
  for all using (
    farm_id in (select farm_id from farm_members where user_id = auth.uid())
  );

-- Equipment: see/edit your farm's equipment
create policy "Farm equipment access" on equipment
  for all using (
    farm_id in (select farm_id from farm_members where user_id = auth.uid())
  );

-- Records: see/edit your farm's records
create policy "Farm records access" on shed_records
  for all using (
    farm_id in (select farm_id from farm_members where user_id = auth.uid())
  );
`

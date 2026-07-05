-- =========================================================
-- DeliverConnect / "Local Sends" schema for Supabase
-- Hyperlocal parcel + surprise-delivery network built on top
-- of delivery people who already work for Daraz, CarryBee,
-- Paperfly, Steadfast, etc.
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- AREAS  (residential zones / neighbourhoods)
-- ---------------------------------------------------------
create table if not exists areas (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text not null default 'Dhaka',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- PROFILES  (extends auth.users — every signed-up person)
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer','delivery_person')),
  area_id uuid references areas(id),
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- DELIVERY PERSONS  (extra info for role = delivery_person)
-- ---------------------------------------------------------
create table if not exists delivery_persons (
  id uuid primary key references profiles(id) on delete cascade,
  platforms text[] default '{}',           -- e.g. {'Daraz','CarryBee','Paperfly','Steadfast'}
  vehicle_type text,                       -- bike / cycle / on foot
  nid_number text,                         -- for verification, optional
  is_verified boolean default false,
  is_active boolean default true,
  rating_avg numeric(2,1) default 0,
  total_deliveries int default 0,
  area_id uuid references areas(id),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- SHOPS  (supershops / local stores usable as pickup points)
-- ---------------------------------------------------------
create table if not exists shops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  area_id uuid references areas(id),
  address text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- DELIVERY REQUESTS  (parcels & surprise sends)
-- ---------------------------------------------------------
create table if not exists delivery_requests (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references profiles(id) not null,
  delivery_person_id uuid references delivery_persons(id),
  area_id uuid references areas(id) not null,

  pickup_type text not null default 'from_sender'
    check (pickup_type in ('from_sender','from_shop')),
  shop_id uuid references shops(id),
  pickup_address text,

  receiver_name text not null,
  receiver_phone text not null,
  receiver_address text not null,

  item_description text,
  is_surprise boolean default false,
  surprise_note text,                      -- e.g. "Happy Birthday! From Rafi"

  status text not null default 'pending'
    check (status in ('pending','accepted','picked_up','delivered','cancelled')),

  price numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_requests_area_status on delivery_requests(area_id, status);
create index if not exists idx_requests_sender on delivery_requests(sender_id);
create index if not exists idx_requests_delivery_person on delivery_requests(delivery_person_id);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_requests on delivery_requests;
create trigger trg_touch_requests
  before update on delivery_requests
  for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------
-- RATINGS
-- ---------------------------------------------------------
create table if not exists ratings (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references delivery_requests(id) not null,
  rated_by uuid references profiles(id) not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (request_id, rated_by)
);

-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table profiles enable row level security;
alter table delivery_persons enable row level security;
alter table delivery_requests enable row level security;
alter table ratings enable row level security;
alter table notifications enable row level security;
alter table areas enable row level security;
alter table shops enable row level security;

-- Areas & shops: public read
create policy "areas are readable by everyone" on areas for select using (true);
create policy "shops are readable by everyone" on shops for select using (true);

-- Profiles: everyone can read basic profiles (needed to show sender/courier names),
-- but only the owner can update their own row.
create policy "profiles are readable by everyone" on profiles for select using (true);
create policy "users can update own profile" on profiles for update using (auth.uid() = id);

-- Delivery persons: readable by everyone (so customers can browse couriers in their area),
-- only the owner can insert/update their own courier record.
create policy "delivery persons readable by everyone" on delivery_persons for select using (true);
create policy "courier can upsert own record" on delivery_persons
  for insert with check (auth.uid() = id);
create policy "courier can update own record" on delivery_persons
  for update using (auth.uid() = id);

-- Delivery requests:
--   * sender can see their own requests
--   * assigned courier can see requests assigned to them
--   * ANY active courier can see 'pending' requests in their own area (to accept jobs)
create policy "sender sees own requests" on delivery_requests
  for select using (auth.uid() = sender_id);

create policy "courier sees assigned requests" on delivery_requests
  for select using (auth.uid() = delivery_person_id);

create policy "couriers see pending requests in their area" on delivery_requests
  for select using (
    status = 'pending'
    and area_id in (
      select area_id from delivery_persons where id = auth.uid()
    )
  );

create policy "sender can create requests" on delivery_requests
  for insert with check (auth.uid() = sender_id);

create policy "sender can cancel own pending request" on delivery_requests
  for update using (auth.uid() = sender_id and status = 'pending');

create policy "courier can accept or update assigned request" on delivery_requests
  for update using (
    (status = 'pending' and area_id in (select area_id from delivery_persons where id = auth.uid()))
    or auth.uid() = delivery_person_id
  );

-- Ratings: sender or courier involved in the request can insert/read
create policy "ratings readable by everyone" on ratings for select using (true);
create policy "involved parties can rate" on ratings
  for insert with check (
    auth.uid() = rated_by and exists (
      select 1 from delivery_requests r
      where r.id = request_id
        and (r.sender_id = auth.uid() or r.delivery_person_id = auth.uid())
    )
  );

-- Notifications: only the owner can see/update their own
create policy "user reads own notifications" on notifications
  for select using (auth.uid() = profile_id);
create policy "user updates own notifications" on notifications
  for update using (auth.uid() = profile_id);

-- =========================================================
-- SEED DATA (sample areas, shops, platforms) — optional
-- =========================================================
insert into areas (name, city) values
  ('Mirpur DOHS', 'Dhaka'),
  ('Bashundhara R/A', 'Dhaka'),
  ('Uttara Sector 4', 'Dhaka'),
  ('Dhanmondi', 'Dhaka')
on conflict do nothing;

-- TrailMate Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  avatar_url text,
  push_token text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trips
create table public.trips (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  destination text not null,
  emoji text default '🌍',
  start_date date,
  end_date date,
  cover_image text,
  phase text check (phase in ('planning', 'live', 'review')) default 'planning',
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null
);

alter table public.trips enable row level security;
create policy "Trip members can view trips" on public.trips for select
  using (id in (select trip_id from public.trip_members where user_id = auth.uid()));
create policy "Authenticated users can create trips" on public.trips for insert
  with check (auth.uid() = created_by);
create policy "Trip owners can update" on public.trips for update
  using (created_by = auth.uid());

-- Trip Members
create table public.trip_members (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('organizer', 'co-organizer', 'member', 'viewer')) default 'member',
  invited_by uuid,
  joined_at timestamptz default now() not null,
  unique(trip_id, user_id)
);

alter table public.trip_members enable row level security;
create policy "Trip members can view members" on public.trip_members for select
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));
create policy "Trip owners can add members" on public.trip_members for insert
  with check (trip_id in (select trip_id from public.trip_members where user_id = auth.uid() and role in ('organizer', 'co-organizer')));

-- Trip Invitations
create table public.trip_invitations (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  invite_code text not null unique,
  inviter_id uuid not null,
  invited_email text,
  invited_phone text,
  role text check (role in ('organizer', 'co-organizer', 'member', 'viewer')) default 'member',
  status text check (status in ('pending', 'accepted', 'declined', 'expired')) default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.trip_invitations enable row level security;
create policy "Anyone can view invitations by code" on public.trip_invitations for select using (true);
create policy "Trip members can create invitations" on public.trip_invitations for insert with check (true);
create policy "Invitations can be updated" on public.trip_invitations for update using (true);

alter publication supabase_realtime add table public.trip_invitations;

-- Chat Messages (group chat per trip)
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid not null,
  user_name text not null default 'Traveler',
  text text not null,
  created_at timestamptz default now() not null
);

alter table public.chat_messages enable row level security;
create policy "Trip members can view chat" on public.chat_messages for select using (true);
create policy "Anyone can send chat" on public.chat_messages for insert with check (true);

alter publication supabase_realtime add table public.chat_messages;

-- Activity Log (timeline of trip events)
create table public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid not null,
  user_name text not null default 'Traveler',
  action_type text not null,
  details text not null default '',
  emoji text default '📝',
  created_at timestamptz default now() not null
);

alter table public.activity_log enable row level security;
create policy "Trip members can view activity" on public.activity_log for select using (true);
create policy "Anyone can log activity" on public.activity_log for insert with check (true);

alter publication supabase_realtime add table public.activity_log;

-- Itinerary Items
create table public.itinerary_items (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day integer not null,
  time text not null,
  title text not null,
  emoji text default '📍',
  type text check (type in ('accommodation', 'activity', 'food', 'transport')) default 'activity',
  notes text,
  created_at timestamptz default now() not null
);

alter table public.itinerary_items enable row level security;
create policy "Trip members can view itinerary" on public.itinerary_items for select
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));
create policy "Trip members can manage itinerary" on public.itinerary_items for all
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));

-- Expenses
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  title text not null,
  amount numeric(10,2) not null,
  currency text default 'USD',
  category text not null,
  emoji text default '💰',
  paid_by uuid references public.profiles(id) not null,
  split_with uuid[] not null,
  receipt_url text,
  created_at timestamptz default now() not null
);

alter table public.expenses enable row level security;
create policy "Trip members can view expenses" on public.expenses for select
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));
create policy "Trip members can add expenses" on public.expenses for insert
  with check (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));

-- Polls
create table public.polls (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  question text not null,
  emoji text default '📊',
  is_active boolean default true,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null
);

create table public.poll_options (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now() not null
);

create table public.poll_votes (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(poll_id, user_id)
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy "Trip members can view polls" on public.polls for select
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));
create policy "Trip members can create polls" on public.polls for insert
  with check (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));
create policy "View poll options" on public.poll_options for select using (true);
create policy "View poll votes" on public.poll_votes for select using (true);
create policy "Users can vote" on public.poll_votes for insert with check (auth.uid() = user_id);

-- Packing Items
create table public.packing_items (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  emoji text default '📦',
  category text not null,
  packed boolean default false,
  created_at timestamptz default now() not null
);

alter table public.packing_items enable row level security;
create policy "Users can view own packing" on public.packing_items for select
  using (auth.uid() = user_id);
create policy "Users can manage own packing" on public.packing_items for all
  using (auth.uid() = user_id);

-- Notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  trip_id uuid references public.trips(id) on delete set null,
  type text check (type in ('trip_invite', 'expense_added', 'poll_created', 'itinerary_update', 'member_joined', 'reminder')) not null,
  title text not null,
  body text not null,
  emoji text default '🔔',
  read boolean default false,
  created_at timestamptz default now() not null
);

alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select
  using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update
  using (auth.uid() = user_id);

-- Enable realtime for key tables
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.itinerary_items;
alter publication supabase_realtime add table public.trip_members;

-- Journal Entries
create table public.journal_entries (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day integer not null,
  text text not null default '',
  mood text,
  photos text[] default '{}',
  created_by uuid,
  created_at timestamptz default now() not null,
  unique(trip_id, day)
);

alter table public.journal_entries enable row level security;
create policy "Trip members can view journal" on public.journal_entries for select
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));
create policy "Trip members can manage journal" on public.journal_entries for all
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));

-- Bookings
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  type text not null default 'hotel',
  title text not null,
  confirmation_code text,
  start_date date,
  end_date date,
  amount numeric(10,2),
  currency text default 'USD',
  notes text,
  created_at timestamptz default now() not null
);

alter table public.bookings enable row level security;
create policy "Trip members can view bookings" on public.bookings for select
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));
create policy "Trip members can manage bookings" on public.bookings for all
  using (trip_id in (select trip_id from public.trip_members where user_id = auth.uid()));

alter publication supabase_realtime add table public.journal_entries;
alter publication supabase_realtime add table public.bookings;

-- ═══════════════════════════════════════════════════════════════════════════
-- GUEST MODE MIGRATION (run these when using device-UUID-based guest mode)
-- This disables RLS and drops FK constraints so device UUIDs work
-- instead of requiring auth.users references.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- -- Disable RLS on all tables:
-- alter table public.trips disable row level security;
-- alter table public.trip_members disable row level security;
-- alter table public.itinerary_items disable row level security;
-- alter table public.expenses disable row level security;
-- alter table public.polls disable row level security;
-- alter table public.poll_options disable row level security;
-- alter table public.poll_votes disable row level security;
-- alter table public.packing_items disable row level security;
-- alter table public.notifications disable row level security;
-- alter table public.journal_entries disable row level security;
-- alter table public.bookings disable row level security;
--
-- -- Drop FK constraints on user-referencing columns:
-- alter table public.trips alter column created_by type uuid using created_by::uuid;
-- alter table public.trips drop constraint if exists trips_created_by_fkey;
-- alter table public.expenses alter column paid_by type uuid using paid_by::uuid;
-- alter table public.expenses drop constraint if exists expenses_paid_by_fkey;
-- alter table public.packing_items drop constraint if exists packing_items_user_id_fkey;
-- alter table public.poll_votes drop constraint if exists poll_votes_user_id_fkey;
-- alter table public.polls drop constraint if exists polls_created_by_fkey;
-- alter table public.trip_members drop constraint if exists trip_members_user_id_fkey;
-- alter table public.notifications drop constraint if exists notifications_user_id_fkey;
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-create profile on signup (trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Traveler'), new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

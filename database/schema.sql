-- ============================================================================
-- Multi-Gym Management SaaS — Database Schema
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Safe to re-run: uses IF NOT EXISTS / DROP ... IF EXISTS guards where useful.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type gym_status as enum ('active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status_type as enum ('trial', 'active', 'past_due', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('super_admin', 'gym_admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status as enum ('active', 'expired', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sub_status as enum ('active', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'zaad', 'edahab', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type announcement_status as enum ('published', 'draft');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- gyms
-- ----------------------------------------------------------------------------
create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  status gym_status not null default 'active',
  subscription_status subscription_status_type not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_gyms_updated_at on gyms;
create trigger trg_gyms_updated_at before update on gyms
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- users (super_admin / gym_admin / staff)
-- ----------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  title text,
  permissions jsonb not null default '{}'::jsonb,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_gym_id_required_unless_super check (
    (role = 'super_admin' and gym_id is null) or
    (role <> 'super_admin' and gym_id is not null)
  )
);

create index if not exists idx_users_gym_id on users(gym_id);
create index if not exists idx_users_email on users(email);

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- membership_plans
-- ----------------------------------------------------------------------------
create table if not exists membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price numeric(10,2) not null check (price >= 0),
  status plan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plans_gym_id on membership_plans(gym_id);

drop trigger if exists trg_plans_updated_at on membership_plans;
create trigger trg_plans_updated_at before update on membership_plans
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- members (gym members, have their own login)
--
-- member_code (e.g. "M001") IS the login identifier — there is no separate
-- username. Each gym has its own independent sequence starting at M001, so
-- the same code intentionally exists in more than one gym; login resolves
-- identity by matching the code against every gym that has it and checking
-- the password (see backend/src/controllers/auth.controller.js), not by a
-- single global unique lookup.
-- ----------------------------------------------------------------------------
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_code text not null,
  full_name text not null,
  phone text,
  gender text,
  join_date date not null default current_date,
  membership_plan_id uuid references membership_plans(id) on delete set null,
  start_date date,
  expiry_date date,
  status member_status not null default 'active',
  photo_url text,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, member_code)
);

create index if not exists idx_members_gym_id on members(gym_id);
create index if not exists idx_members_code on members(member_code);
create index if not exists idx_members_expiry on members(expiry_date);

drop trigger if exists trg_members_updated_at on members;
create trigger trg_members_updated_at before update on members
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- subscriptions (membership purchase/renewal history)
-- ----------------------------------------------------------------------------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  plan_id uuid not null references membership_plans(id),
  start_date date not null,
  end_date date not null,
  -- Snapshot of the plan's price when this subscription was created, so a
  -- later price change on the plan never rewrites what a past cycle owed.
  amount_due numeric(10,2) not null default 0,
  status sub_status not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_gym_id on subscriptions(gym_id);
create index if not exists idx_subscriptions_member_id on subscriptions(member_id);

-- ----------------------------------------------------------------------------
-- payments
-- ----------------------------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  payment_date date not null default current_date,
  method payment_method not null default 'cash',
  received_by uuid references users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_gym_id on payments(gym_id);
create index if not exists idx_payments_member_id on payments(member_id);
create index if not exists idx_payments_date on payments(payment_date);

-- ----------------------------------------------------------------------------
-- attendance
-- ----------------------------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  check_in_date date not null default current_date,
  check_in_time time not null default current_time,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_gym_id on attendance(gym_id);
create index if not exists idx_attendance_member_id on attendance(member_id);
create index if not exists idx_attendance_date on attendance(check_in_date);

-- ----------------------------------------------------------------------------
-- announcements
-- ----------------------------------------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  title text not null,
  message text not null,
  status announcement_status not null default 'published',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_gym_id on announcements(gym_id);

drop trigger if exists trg_announcements_updated_at on announcements;
create trigger trg_announcements_updated_at before update on announcements
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- activity_logs
-- ----------------------------------------------------------------------------
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action text not null,
  related_table text,
  related_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_gym_id on activity_logs(gym_id);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at desc);

-- ============================================================================
-- Row Level Security
--
-- This application does NOT use Supabase Auth. All data access goes through
-- the Express API, which connects with the Supabase SERVICE ROLE key (server
-- side only, bypasses RLS by design). RLS is still enabled on every tenant
-- table below as defense-in-depth: it blocks the `anon` and `authenticated`
-- Postgres roles from reading/writing ANYTHING through Supabase's
-- auto-generated REST/Realtime API, even if the public anon key ever leaked.
-- The only way into this data is the backend API.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'gyms','users','membership_plans','members','subscriptions',
    'payments','attendance','announcements','activity_logs'
  ]) loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists deny_all_anon on %I', t);
    execute format(
      'create policy deny_all_anon on %I for all to anon, authenticated using (false) with check (false)',
      t
    );
  end loop;
end $$;

-- ============================================================================
-- Migration: short per-gym Member IDs (M001, M002, ...) + drop username
--
-- Run this ONCE in the Supabase SQL Editor against the existing database
-- (the one already set up from schema.sql + seed.sql). It is NOT needed for
-- a brand new database — schema.sql / seed.sql already reflect this format.
--
-- What it does:
--   1. Renumbers every gym's members as M001, M002, M003... in the order
--      they were created (each gym starts its own sequence at M001).
--   2. Drops the now-redundant `username` column — member_code IS the
--      login identifier from here on (existing passwords are untouched).
-- ============================================================================

with numbered as (
  select id, gym_id,
         row_number() over (partition by gym_id order by created_at) as rn
  from members
)
update members m
set member_code = 'M' || lpad(numbered.rn::text, 3, '0')
from numbered
where m.id = numbered.id;

drop index if exists idx_members_username;
alter table members drop column if exists username;

create index if not exists idx_members_code on members(member_code);

# Gym SaaS — Multi-Gym Management System

A clean, small-to-medium commercial SaaS for managing multiple gyms from one
platform. Four access levels — **Super Admin**, **Gym Admin**, **Staff**,
and **Member** — each see only what they're supposed to, and every gym's
data is fully isolated by `gym_id`.

**Live:** https://gym-system-beta.vercel.app/ (demo accounts below)

## Features

- **Super Admin** — create gyms and their first Gym Admin, view every gym,
  activate/suspend gyms, edit basic gym info, reset a Gym Admin's password.
- **Gym Admin** — full control of their own gym: members, membership plans,
  subscriptions, payments, attendance, staff accounts + permissions, staff
  activity logs, announcements, basic reports.
- **Staff** — receptionists, cashiers, trainers, managers — each with a
  simple, per-module permission set (Members / Attendance / Payments /
  Plans / Announcements / Reports) chosen by the Gym Admin.
- **Members** — get their own login (from the member's phone or computer)
  showing membership status, expiry date, payment history, attendance
  history, and gym announcements. Nothing from other members is ever
  visible.
- **Attendance** — check in by search or by scanning a member's QR code;
  warns staff if a membership has expired.
- **Payments** — cash / ZAAD / eDahab / other, with a simple printable
  receipt.
- **Reports** — total/active/expired members, today's attendance, daily &
  monthly income, staff activity summary. Intentionally simple — this is
  not an accounting system.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Node.js + Express, deployed as Vercel Serverless Functions |
| Database | PostgreSQL via Supabase |
| Auth | Custom JWT auth (bcrypt password hashes), issued by the Express API |
| Hosting | Vercel (frontend + backend together, one project) |

**Why not Supabase Auth?** This app has four role levels plus per-staff
module permissions. A small Express-issued JWT keeps that logic in one
place instead of split across Supabase Auth claims and Postgres RLS. See
"Security model" below for how tenant isolation is still enforced.

## Database

Schema lives in [`database/schema.sql`](database/schema.sql), demo data in
[`database/seed.sql`](database/seed.sql). Core tables:

`gyms`, `users` (super_admin / gym_admin / staff), `members` (have their own
login), `membership_plans`, `subscriptions`, `payments`, `attendance`,
`announcements`, `activity_logs`.

Every tenant table has an indexed `gym_id` foreign key, `created_at` /
`updated_at` timestamps (auto-maintained by a trigger), and Row Level
Security **enabled with a deny-all policy** for the `anon`/`authenticated`
Postgres roles.

### Security model (read this before deploying)

The backend talks to Postgres using Supabase's **service role key**, which
bypasses RLS by design — that's expected: it is a private server-side key
that never reaches the browser. All tenant isolation (a Gym Admin can only
ever see their own gym's rows) is enforced in the Express middleware
(`requireGym`, `requireRole`, `requireStaffPermission` in
`backend/src/middleware/auth.js`) on every request. RLS is still enabled on
every table as defense-in-depth: even if the public anon key ever leaked,
Supabase's auto-generated REST API would refuse to return any row, because
the only path into this data is the Express API.

## Local Setup

Prerequisites: Node.js 20+, a free Supabase account, `git`.

```bash
git clone <your-repo-url>
cd GYM.System

# Backend
cd backend
npm install
cp .env.example .env      # then fill in real values, see "Environment Variables"
npm run dev                # http://localhost:4000

# Frontend (in a second terminal)
cd frontend
npm install
cp .env.example .env.local # VITE_API_URL=http://localhost:4000/api for local dev
npm run dev                # http://localhost:5173
```

Set up the database once, in the Supabase Dashboard → SQL Editor:
1. Paste and run all of `database/schema.sql`.
2. Paste and run all of `database/seed.sql` (creates demo accounts below).

## Environment Variables

**`backend/.env`** (never commit this file):

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` secret key |
| `JWT_SECRET` | Any long random string, used to sign this app's login tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `12h` |
| `CORS_ORIGIN` | Comma-separated allowed frontend origin(s) |
| `PORT` | Local dev port (unused on Vercel) |

**`frontend/.env.local`** (local dev) / Vercel env vars (production):

| Variable | Description |
|---|---|
| `VITE_API_URL` | `http://localhost:4000/api` locally; `/api` in production (same Vercel project, same origin) |

## Running

- Backend dev server: `npm run dev` inside `backend/` (auto-restarts on change).
- Frontend dev server: `npm run dev` inside `frontend/`.
- Backend smoke test (exercises login + tenant isolation for every demo
  role): `BASE_URL=http://localhost:4000 npm run smoke-test` inside
  `backend/`.

## Deployment

This repo deploys as **one Vercel project**: the React app builds to static
files (`frontend/dist`, via `buildCommand`/`outputDirectory` in
`vercel.json`), and the Express app is wrapped (`api/[...path].mjs` at the
repo root, via `serverless-http`) as a single catch-all Vercel Serverless
Function — Vercel's built-in `/api` convention automatically routes every
`/api/*` request to it, and a SPA rewrite sends everything else to
`index.html` so client-side routing works. Set the backend env vars above
directly in the Vercel Project Settings — there is nothing to run manually
after a `git push`.

## User Roles

| Role | Scope |
|---|---|
| Super Admin | The whole platform: create/suspend gyms, create each gym's first Gym Admin |
| Gym Admin | Everything within their own gym only |
| Staff | Only the modules a Gym Admin has granted them |
| Member | Only their own membership, payments, attendance, and their gym's announcements |

## Demo Accounts

Created by `database/seed.sql`. **Change these before using this in
production.**

| Role | Login | Password |
|---|---|---|
| Super Admin | `superadmin@gymsaas.demo` | `SuperAdmin@123` |
| Gym Admin — Iron Peak Fitness | `admin@ironpeak.demo` | `Admin@123` |
| Staff (Receptionist) — Iron Peak | `ahmed@ironpeak.demo` | `Staff@123` |
| Staff (Cashier) — Iron Peak | `ayaan@ironpeak.demo` | `Staff@123` |
| Member — Iron Peak | `farah.hassan` | `Member@123` |
| Gym Admin — Coastal Strength Club | `admin@coastalstrength.demo` | `Admin@123` |
| Staff (Manager) — Coastal Strength | `ifrah@coastalstrength.demo` | `Staff@123` |
| Member — Coastal Strength | `nasra.ali` | `Member@123` |

For the full beginner-friendly walkthrough (including where the live site
is, how to open Supabase, back up the database, and push updates), see
[`OWNER_GUIDE.md`](OWNER_GUIDE.md).

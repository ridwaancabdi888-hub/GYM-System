# Owner's Guide — Gym SaaS

This is a plain-language guide for you, the owner, written assuming you are
**not** a developer. Keep this file somewhere safe — it has the links and
steps you'll need to run the system day-to-day.

---

## 1. Final live system URL

**https://gym-system-beta.vercel.app/**

This is the one address everyone uses — Super Admin, every Gym Admin,
every staff member, and every member. The system shows each person only
what they're allowed to see based on who they log in as.

## 2. Super Admin login

This is **your** login — the one that controls the whole platform.

- Website: the URL from #1 above
- Email: `superadmin@gymsaas.demo`
- Password: `SuperAdmin@123`

**Change this password after your first login.** (Demo credentials from the
seed data — see README.md "Demo Accounts" for every test account.)

## 3. How I log in from my laptop

1. Open any web browser (Chrome, Edge, Safari).
2. Go to your website address (#1).
3. Enter your Super Admin email and password.
4. You'll land on the **Gyms** page — this is your control room.

## 4. How I log in from my phone

The system is fully responsive — no app to install.

1. Open your phone's browser (Chrome/Safari).
2. Go to the same website address (#1).
3. Log in the same way as on your laptop.
4. Optional: tap your browser's "Add to Home Screen" so it behaves like an app icon.

## 5. How another gym uses the system

Each gym gets its own private space:

1. You create the gym and its first Gym Admin (see #6–7).
2. You give that Gym Admin their login email + temporary password.
3. They log in at the same website address — they'll land on **their own**
   dashboard, and can never see another gym's members, staff, or money.
4. The Gym Admin then creates their own staff (#8), who log in the same way.
5. Members get their own login too (#9), separate from staff/admin logins.

Everyone uses the exact same website address — the system automatically
shows each person only their own gym's data based on who they are.

## 6. How I create a new gym

1. Log in as Super Admin.
2. On the **Gyms** page, click **+ New Gym**.
3. Fill in the gym's name, address, phone, email.
4. Fill in the first Gym Admin's full name and email.
5. Click **Create gym**.
6. A one-time screen shows the Gym Admin's **temporary password** — copy it
   now, it will not be shown again. Send it to them privately (WhatsApp,
   SMS, or in person — not email, in case their email isn't secure).

## 7. How I create a Gym Admin

This normally happens automatically when you create a gym (#6). If you ever
need to reset a Gym Admin's password instead (e.g. they forgot it):

1. Go to **Gyms** → click the gym's name.
2. Under "Gym Admin", click **Reset Password**.
3. A new temporary password appears once — copy and send it to them.

## 8. How Gym Admin creates staff

(This is done by each Gym Admin, from their own dashboard — not by you.)

1. Gym Admin logs in, opens **Staff** in the sidebar.
2. Clicks **+ Add Staff**, fills in name, email, and a role title
   (Receptionist / Cashier / Trainer / Manager / Other).
3. Ticks which sections that staff member can access (Members, Attendance,
   Payments, Membership Plans, Announcements, Reports).
4. Clicks **Add staff** — a one-time temporary password appears to share
   with the new staff member.

## 9. How members receive accounts

Whenever a Gym Admin or permitted staff member adds a new member (**Members
→ + Add Member**), the system automatically creates that member's own
login (a username and a one-time temporary password), shown once on
screen. Staff hand this to the member so they can log in from their own
phone and see their own membership status, expiry date, payments, and
attendance.

## 10. How to suspend a gym

1. Log in as Super Admin.
2. Go to **Gyms** → click the gym's name.
3. Click **Suspend Gym** (top right).

A suspended gym's staff/admin cannot use the system until you reactivate it
from the same screen (**Activate Gym**).

## 11. Where the online database is hosted

Your data lives in **Supabase** (a hosted PostgreSQL database). Open
[supabase.com](https://supabase.com), log in, and select your `gym-system`
project — its Project URL is visible under Project Settings → API (see #12
below for how to get there).

## 12. How I open Supabase

1. Go to [supabase.com](https://supabase.com) and log in with the account
   used to create this project.
2. Click on your project (e.g. "gym-saas").
3. You'll see a left-hand menu: **Table Editor**, **SQL Editor**,
   **Authentication**, **Project Settings**, etc.

## 13. How I view database tables

1. In Supabase, click **Table Editor** in the left menu.
2. Click any table name (e.g. `members`, `payments`, `gyms`) to see its rows
   in a spreadsheet-like view.
3. You can scroll, sort by column, and use the filter button — but avoid
   editing rows directly here unless you know what you're doing; normal
   changes should go through the website itself.

## 14. How I search for a member directly in the database

1. In Supabase → **Table Editor** → click the `members` table.
2. Click the **Filter** button above the table.
3. Choose a column (e.g. `full_name` or `member_code`), pick "contains",
   and type the name or ID you're looking for.

Or, faster: **SQL Editor** → New query → run:
```sql
select * from members where full_name ilike '%partial name%';
```

## 15. How I see payments in the database

1. In Supabase → **Table Editor** → click the `payments` table.
2. Or, in **SQL Editor**, run:
```sql
select p.payment_date, p.amount, p.method, m.full_name
from payments p
join members m on m.id = p.member_id
order by p.payment_date desc
limit 50;
```

## 16. How I backup the database

Supabase takes automatic daily backups on paid plans; on the free plan, do
manual backups periodically:

1. In Supabase, go to **Project Settings → Database**.
2. Under "Connection string", copy the URI (you'll need the DB password
   from when you created the project).
3. From a computer with `pg_dump` installed (or ask a developer to help),
   run:
```bash
pg_dump "<connection-string>" -f gym_saas_backup.sql
```
Keep that `.sql` file somewhere safe (e.g. a private cloud drive).

## 17. How I restore data

If you have a `.sql` backup file from #16:
1. Open **Supabase → SQL Editor**.
2. Open the backup file in a text editor, copy its contents.
3. Paste into a New Query and run it.

**Be careful** — restoring can overwrite current data. If unsure, ask a
developer for help, or restore into a fresh Supabase project first to check
it looks right.

## 18. How I change environment variables

Environment variables are the secret settings (like your database key) that
the live website uses. To change them:

1. Go to [vercel.com](https://vercel.com) and open your project.
2. Click **Settings → Environment Variables**.
3. Edit or add a variable, then click **Save**.
4. Go to the **Deployments** tab and click **Redeploy** on the latest
   deployment so the change takes effect.

Never share these values (especially `SUPABASE_SERVICE_ROLE_KEY` and
`JWT_SECRET`) with anyone, and never paste them into chat messages, emails,
or public places.

## 19. How I push updates to GitHub

If a developer hands you updated code, or you're told to save your work:

```bash
git add .
git commit -m "Describe what changed"
git push
```

If you're not comfortable with these commands, ask whoever is helping you
maintain the site to run them — this step is usually done by a developer,
not day-to-day by you.

## 20. How deployment updates after GitHub changes

Vercel is connected directly to your GitHub repository. Every time new code
is pushed to the `main` branch, Vercel **automatically** rebuilds and
redeploys the live website within a minute or two — no manual step needed.
You can watch progress at vercel.com under your project's **Deployments**
tab.

## 21. Which services may become paid later

| Service | Free tier limit | When you'd need to pay |
|---|---|---|
| **Supabase** | 500MB database, project pauses after 1 week idle (free tier) | Once you have real gyms with ongoing traffic, or need the project to never pause |
| **Vercel** | Generous free tier for personal/small projects | High traffic, custom domains at scale, or team features |
| **GitHub** | Free for private repos | Only if you need advanced team/organization features |

For a small number of gyms, you can likely run this entirely on free tiers
for a while. Budget for Supabase's paid plan (~$25/month) first, as that
removes the "pauses when idle" limitation.

## 22. How to troubleshoot common problems

**"Invalid email/username or password" when I know it's correct**
The account may be disabled, or you're mixing up email (staff/admin) vs.
username (members). Check with a Gym Admin, or look the account up in
Supabase's `users` or `members` table (#13).

**A staff member can't see a section they should have access to**
Ask the Gym Admin to check that staff member's permissions: **Staff → click
their name → tick the missing permission → Save**.

**The website looks broken or shows an error after a code update**
Check **Vercel → Deployments** — if the latest deployment shows "Failed",
click it to see the error log, or ask your developer to check it.

**A member's status still shows "Active" after their expiry date**
This updates automatically the next time anyone opens the Members list or
Reports page for that gym — it's not instant, but happens on the very next
visit, no action needed.

**I forgot my Super Admin password**
Ask a developer to reset it directly in Supabase (Table Editor → `users` →
find your row), since there's no self-service "forgot password" flow in
this version of the system.

**Payments/receipt totals look wrong**
Reports are simple sums of the `payments` table for the selected period —
double check no test/demo payments were left in by mistake (see #15 to look
them up directly).

**The site suddenly shows a "Vercel Security Checkpoint" page instead of
your app**
This is Vercel's automatic protection against unusual traffic spikes (e.g.
a burst of automated requests, or an actual attack) — it's not something
you turn on, and it isn't a bug in the app. It normally clears itself
after a short time. You can check its status any time at **Vercel →
your project → Firewall → Traffic**, where "System Mitigations" will show
as Active/Inactive. There's nothing to fix in the code when this happens —
just wait a few minutes and try again.

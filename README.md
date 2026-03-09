# Vocabilly

## Overview
Vocabilly is a lightweight Progressive Web App (PWA) for vocabulary training.

The project started as a local JSON import trainer and now continues with a centralized Supabase-backed session source. Users can sign in, see all available sessions, and load one session for practice.

## Features
- Interactive vocabulary training sessions
- Per-card answer reveal and self-rating (`Correct` / `Wrong`)
- Progress tracking during a session
- Centralized session storage in Supabase (`public.sessions`)
- Login-based access via Supabase Auth
- Admin editor for creating/updating sessions by pasting JSON
- Client-side persistence of connection/login fields in `localStorage`
- Offline assets via service worker (for static app files)

## Security Notes (Public GitHub Repository)
- No password is hardcoded in source files.
- Supabase URL, anon key, email, and password are entered in the app UI.
- These values are stored in browser `localStorage` (as requested).
- Because `localStorage` is readable by scripts in the same origin, only use this on trusted devices.

## Supabase Setup
Run this in the Supabase SQL Editor:

```sql
create table if not exists public.sessions (
  name text primary key,
  words jsonb not null
);

create table if not exists public.app_admins (
  email text primary key
);

alter table public.sessions enable row level security;
alter table public.app_admins enable row level security;

create policy "sessions_select_authenticated"
on public.sessions
for select
to authenticated
using (true);

create policy "sessions_insert_admin"
on public.sessions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_admins a
    where a.email = auth.jwt() ->> 'email'
  )
);

create policy "sessions_update_admin"
on public.sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.app_admins a
    where a.email = auth.jwt() ->> 'email'
  )
)
with check (
  exists (
    select 1
    from public.app_admins a
    where a.email = auth.jwt() ->> 'email'
  )
);

create policy "sessions_delete_admin"
on public.sessions
for delete
to authenticated
using (
  exists (
    select 1
    from public.app_admins a
    where a.email = auth.jwt() ->> 'email'
  )
);

create policy "app_admins_select_own_row"
on public.app_admins
for select
to authenticated
using (email = auth.jwt() ->> 'email');
```

Example seed data:

```sql
insert into public.sessions (name, words) values
('U1-IN', '[{"lesson":"U1","section":"IN","de":"unterwegs","en":"on the move"},{"lesson":"U1","section":"IN","de":"das Reisen","en":"travelling (no pl)"}]'::jsonb),
('Travel', '[{"lesson":"U2","section":"TR","de":"Flughafen","en":"airport"},{"lesson":"U2","section":"TR","de":"Koffer","en":"suitcase"}]'::jsonb)
on conflict (name) do nothing;

insert into public.app_admins (email) values
('admin@example.com')
on conflict (email) do nothing;
```

## Authentication Setup
1. In Supabase, enable `Email` under `Authentication -> Providers`.
2. Create at least one user in `Authentication -> Users`.
3. In the app, enter:
- Supabase URL
- Supabase anon key
- Email
- Password

## Project Structure
```text
vocabilly
├── index.html         # Main HTML document
├── app.js             # Frontend logic (Supabase login + training flow)
├── style.css          # Styling
├── service-worker.js  # Service worker for PWA behavior
├── manifest.json      # PWA metadata
└── README.md          # Project documentation
```

## Run Locally
Because this is a static frontend, run it with any static file server.

PowerShell example:

```powershell
python -m http.server 8080
```

Then open:
- `http://localhost:8080`

## Usage
1. Open the app in a browser.
2. Enter Supabase URL, anon key, email, and password.
3. Click `Sign in` / `Anmelden`.
4. Load sessions and start one.
5. Practice until all cards are marked correct.

## Admin Usage (Session Maintenance)
1. Add your email to `public.app_admins`.
2. Sign in with that user.
3. Open `Admin: Session pflegen`.
4. Paste JSON in this format:

```json
[
  {
    "lesson": "U1",
    "section": "IN",
    "de": "unterwegs",
    "en": "on the move"
  },
  {
    "lesson": "U1",
    "section": "IN",
    "de": "das Reisen",
    "en": "travelling (no pl)"
  }
]
```

5. Enter a session name and click `Session speichern/aktualisieren`.
6. To edit an existing session, select it, click `In Editor laden`, edit JSON, and save again.
7. To delete an existing session, select it and click `Ausgewaehlte Session loeschen`.
8. To auto-create multiple sessions, paste mixed JSON and click `Aus JSON nach lesson-section gruppieren und speichern`.
9. Grouping rules:
- `lesson + section` -> session name `LESSON-SECTION` (example: `U1-IN`)
- only `lesson` -> session name `LESSON`
- only `section` -> session name `SECTION`
- neither present -> session name `Ungrouped`

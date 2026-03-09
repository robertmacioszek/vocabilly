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

alter table public.sessions enable row level security;

create policy "sessions_select_authenticated"
on public.sessions
for select
to authenticated
using (true);
```

Example seed data:

```sql
insert into public.sessions (name, words) values
('Basic A1', '[{"de":"Haus","en":"house"},{"de":"Baum","en":"tree"}]'::jsonb),
('Travel', '[{"de":"Flughafen","en":"airport"},{"de":"Koffer","en":"suitcase"}]'::jsonb)
on conflict (name) do nothing;
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

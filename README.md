# DeliverConnect — hyperlocal "surprise & pickup" network

Riders already run daily routes through every neighbourhood for Daraz, CarryBee,
Paperfly, Steadfast and dozens of other platforms. **DeliverConnect** lets residents
of that same area piggyback on those trusted, already-moving couriers for local
sends that don't need a full platform shipment:

- 🎁 Send a **surprise** (gift, card, cake) to a friend nearby, with a private note
  the courier passes on without revealing it's an "app delivery."
- 🛒 Have a courier **grab something from a local supershop** on their route and
  drop it at your door.
- 📦 Just move a **box between two people in the same area** — same-day, cheap,
  because the courier was going that way anyway.

Couriers keep doing their normal Daraz/CarryBee/Paperfly/Steadfast runs and simply
pick up nearby local jobs (`/requests/available`) in the gaps.

## Architecture

```
┌─────────────┐      HTTPS + JWT       ┌──────────────────┐      service-role      ┌───────────┐
│  React (SPA)│ ─────────────────────▶ │  FastAPI backend  │ ─────────────────────▶ │ Supabase  │
│  Vite +      │ ◀───────────────────── │  (Python)         │ ◀───────────────────── │ Postgres  │
│  supabase-js │   JSON                 │  business logic,  │   REST via supabase-py │ + Auth    │
└─────────────┘   (auth token only)     │  authorization     │                        │ + RLS     │
                                        └──────────────────┘                        └───────────┘
```

- **Auth**: Supabase Auth (email/password) issues JWTs. The frontend signs users
  in directly with `supabase-js` and attaches the access token to every API call.
- **Backend (Python/FastAPI)**: verifies the JWT, loads the caller's `profiles`
  row, and enforces who can create requests, accept jobs, or change status. It
  talks to Postgres through the Supabase **service role** key so it can perform
  cross-user actions (e.g. notifying the sender when a courier accepts).
- **Database (Supabase/Postgres)**: schema + Row Level Security policies live in
  `supabase/schema.sql`. RLS is defined so that even direct client-side queries
  (bypassing the backend) stay safe — a courier can only see `pending` jobs in
  their own area, a sender can only see their own sends, etc.

## Data model

| Table | Purpose |
|---|---|
| `areas` | Residential neighbourhoods/zones |
| `profiles` | Every user (customer and/or courier); auto-created on signup |
| `delivery_persons` | Courier-specific info: which platforms they already work for, area, rating |
| `shops` | Local supershops usable as a pickup point |
| `delivery_requests` | The actual sends — parcel or surprise, pickup/dropoff, status |
| `ratings` | Post-delivery ratings between sender and courier |
| `notifications` | In-app status updates ("courier accepted", "delivered", ...) |

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql`.
3. Go to Project Settings → API and copy: `Project URL`, `anon public key`,
   `service_role key`, and (Settings → API → JWT Settings) the `JWT Secret`.

### 2. Backend (Python)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your Supabase values
uvicorn app.main:app --reload --port 8000
```
API docs: `http://localhost:8000/docs`

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```
App: `http://localhost:5173`

## Core flows

1. **Sender** signs up → picks their area → creates a request (`from_sender` or
   `from_shop` pickup, optional surprise note) → job appears as `pending`.
2. **Courier** (already delivering for Daraz/CarryBee/etc.) registers their area
   and platforms once → sees all `pending` jobs in that area → accepts one →
   status flows `accepted → picked_up → delivered`.
3. Both sides get **notifications** at each step and can **rate** each other
   once delivered.

## Notes / next steps
- Payments aren't wired up — `price` is currently just a displayed offer amount.
  Add a payments provider (e.g. bKash/Nagad API or Stripe) before going live.
- Add geolocation (lat/lng + PostGIS) if you want "nearest courier" instead of
  area-based matching.
- Add push notifications (e.g. via a service worker or FCM) instead of polling
  `/notifications`.

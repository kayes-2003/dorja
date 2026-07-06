# DeliverConnect — hyperlocal "surprise & pickup" network


# DeliverConnect

**Live app:** [dorja-9n53.vercel.app](https://dorja-9n53.vercel.app/)

A hyperlocal delivery network that connects residents of a neighbourhood with the delivery people already working their streets for Daraz, CarryBee, Paperfly, Steadfast, and dozens of other platforms — so a courier already on their regular route can also carry a surprise gift, a supershop pickup, or a parcel between two neighbours in the same area.
<img width="1350" height="607" alt="image" src="https://github.com/user-attachments/assets/12abd7d9-5ff9-465d-ac23-2a1d0b0317aa" />

---

## The idea

Every residential area already has dedicated delivery people moving through it daily on behalf of major platforms. DeliverConnect turns that existing presence into a shared local resource:

- 🎁 **Send a surprise** — a birthday gift or card to a friend nearby, delivered with a private note the courier passes along without it feeling like "an app delivery"
- 🛒 **Supershop pickups** — ask a courier to grab something from a local shop on their route and drop it at your door
- 📦 **Neighbour-to-neighbour parcels** — move something across the same area, same day, without waiting on a full platform shipment

---

## How it works

1. A resident posts a send — what it is, where it's going, and whether it's a surprise
2. A courier already working that area (or any area, ranked by proximity) accepts the job
3. Both sides get status updates as it moves through **accepted → picked up → delivered**, then rate the delivery

---

## Roles

| Role | What they can do |
|---|---|
| **Customer** | Create sends, track their own deliveries, rate couriers once delivered |
| **Delivery person** | Register with the platforms/area they already work, browse and accept pending jobs, move jobs through pickup → delivery |
| **Admin** | Full oversight — view every send network-wide, manually assign or reassign a courier, force-correct any status, manage user roles, verify couriers |

---

## Tech stack

- **Frontend:** React (Vite), plain CSS with a custom design system, `react-router-dom`
- **Backend:** Python, FastAPI
- **Database & Auth:** Supabase (Postgres, Row Level Security, Auth)
- **Deployment:** Vercel (Services — frontend and backend deployed together from one repo)



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
####for windows 10
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
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


## Roadmap

- Payment integration (bKash/Nagad) — `price` is currently a displayed offer amount only
- Geolocation-based matching instead of area-based
- Push notifications instead of dashboard polling

---

## License

This project is provided as-is for demonstration purposes.


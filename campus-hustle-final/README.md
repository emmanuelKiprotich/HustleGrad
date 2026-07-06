# HustleGrad

HustleGrad is a campus student marketplace web application for buying, selling, booking, delivery, payment, and messaging around student-run products and services. It is designed for a polished campus demo with localized pickup zones, seller metrics, profile pictures, M-PESA Daraja checkout, and an AI marketplace helper.

## Features

- Student registration with unique 6 to 8 digit school-issued admission numbers and flexible personal or Strathmore email OTP login
- Persistent sessions with server-side token revalidation
- Protected student, admin, messaging, and seller dashboard routes
- Marketplace search and category filtering
- Campus Zone tagging for listings:
  - Student Centre (STC)
  - Phase 2
  - The Library Gates
  - The Cafeteria/Gazebos
- Profile picture upload with public image URL persistence
- Listing creation with photo URL or file-browse image upload
- Seller delivery options with delivery fees
- Seller dashboard metrics and active order completion flow
- Buyer/seller messaging
- Booking requests, buyer receipt confirmation, and reviews
- M-PESA Daraja STK Push checkout with explicit credential/config validation
- Floating AI assistant for buyer, seller, delivery, and payment guidance
- Admin overview for users and listings

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, React Router, Axios, CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | JWT, bcrypt, admission-number login, email OTP |
| Email | Nodemailer |
| Security | Helmet, CORS, rate limiting |

## Project Structure

```text
campus-hustle-final/
  backend/
    config/
    controllers/
    middleware/
    routes/
    services/
    utils/
    schema.sql
    server.js
  frontend/
    public/
    src/
      api/
      components/
      context/
      hooks/
      styles/
  ARCHITECTURE.md
  README.md
```

## Prerequisites

- Node.js 18 or newer
- npm
- PostgreSQL
- A Gmail app password or SMTP credentials for 2FA emails

## Environment Variables

Create `backend/.env` with:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/campus_marketplace
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PUBLIC_BASE_URL=http://localhost:5000
```

Optional storage settings:

```env
UPLOAD_DIR=public/uploads
PROFILE_PICTURE_BUCKET=profile-pictures
```

Optional M-PESA Daraja settings:

```env
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_daraja_consumer_key
MPESA_CONSUMER_SECRET=your_daraja_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_daraja_passkey
MPESA_CALLBACK_URL=https://your-public-url.example.com/api/payments/mpesa/callback
```

For sandbox, `MPESA_SHORTCODE=174379` uses the standard Daraja test passkey automatically. To force your own sandbox passkey, set `MPESA_USE_CUSTOM_PASSKEY=true`. Production always requires the real Lipa Na M-PESA Online passkey issued for your shortcode. If these M-PESA values do not match the selected sandbox/production environment, checkout fails with a clear backend error.

## Setup

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

Initialize the database from the backend folder:

```bash
npm run db:init
```

Warning: `schema.sql` drops and recreates the demo tables. Only run it when you are ready to reset the local database.

## Running Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm start
```

Open:

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:5000/health`
- Presentation guide: `http://localhost:3000/presentation`

## Presentation Runbook

Before presenting:

- Run `npm run db:init` from `backend` if you want a fresh seeded demo database.
- Start the backend with `npm run dev`.
- Start the frontend with `npm start`.
- Sign in with a prepared demo account and keep the email inbox open for OTP.
- Open `/presentation` and use it as the clickable runbook.

Suggested demo path:

1. Open Marketplace and show category, campus zone, delivery, and listing cards.
2. Open a listing, choose delivery if available, and start M-PESA checkout.
3. Create a booking and mark the order received as the buyer.
4. Open Dashboard and show the vendor marking the received order done.
5. Create a new listing with Browse photo upload and delivery fee.
6. Open the AI assistant and ask about delivery or safe buying.


## Build and Verification

Build the frontend:

```bash
cd frontend
npm run build
```

Check backend JavaScript syntax:

```bash
cd backend
Get-ChildItem -Recurse -Filter *.js -File | Where-Object { $_.FullName -notlike '*node_modules*' } | ForEach-Object { node --check $_.FullName }
```

## Launch Notes

- Rotate any local secrets before deploying.
- Keep `.env` files out of version control.
- Set `REACT_APP_API_URL` in hosted frontend environments so the React app points at the correct backend.
- For production storage, replace local profile image storage with Supabase Storage or S3 using the same service boundary.
- For production M-PESA, add callback handling, transaction persistence, and reconciliation before moving real money.
- For production auth, prefer short-lived access tokens plus refresh tokens.
- Add pagination before high-traffic marketplace use.
- See `ARCHITECTURE.md` for the Clean Architecture diagnosis and refactoring roadmap.

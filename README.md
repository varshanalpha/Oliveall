# 🎮 Oliveal Gaming Zone

> A modern, mobile-first gaming lounge management and slot-booking ecosystem built with **React 18**, **Vite**, **Tailwind CSS**, **Supabase**, **Razorpay**, and **Capacitor 8 (Android)** with in-app Over-The-Air (OTA) updates.

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%7C%20Auth%20%7C%20Storage%20%7C%20Edge%20Functions-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment%20Gateway-0C2340?logo=razorpay&logoColor=white)](https://razorpay.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.6%20Android-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Capgo](https://img.shields.io/badge/Capgo-OTA%20Updates%20v8-9333EA)](https://capgo.app/)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Customer Portal](#customer-portal)
  - [Admin Dashboard](#admin-dashboard)
  - [Native Android & In-App OTA Updates](#native-android--in-app-ota-updates)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Database Setup & Migrations](#-database-setup--migrations)
- [Supabase Edge Functions (Razorpay)](#-supabase-edge-functions-razorpay)
- [Running Locally](#-running-locally)
- [Android Native Build](#-android-native-build)
- [In-App OTA Updates Guide](#-in-app-ota-updates-guide)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security & Architecture](#-security--architecture)

---

## 🚀 Overview

**Oliveal Gaming Zone** is designed for modern gaming lounges featuring high-end gaming consoles (PlayStation 5) and racing simulators. It provides:

1. **Customers**: A sleek, dark-purple cyberpunk web and mobile experience to browse available gaming stations, select custom time slots and player counts, pay securely via Razorpay, generate kiosk check-in QR passes, and view booking history.
2. **Admins & Staff**: A dedicated operational suite to monitor real-time revenue (spot walk-ins + online Razorpay payments), manage station availability, create counter spot bookings with cash tracking, scan customer QR passes via live camera, and toggle global lounge booking controls.
3. **Cross-Platform**: Operates as both a responsive PWA/web app deployed to Vercel and a native Android APK packaged via Capacitor 8 with in-app Over-The-Air (OTA) updates powered by `@capgo/capacitor-updater`.

---

## ✨ Key Features

### Customer Portal
- **Gaming Station Catalog**: Browse PS5 consoles and Racing Simulators with real-time active/maintenance status badges.
- **Dynamic Slot Booking**:
  - Flexible duration options (30 min, 60 min, 90 min, 120 min, etc.).
  - Player capacity configuration (1 to 4 players, dynamically restricted based on station hardware).
  - Conflict detection preventing double bookings and adjacent slot overlaps.
  - Passed-time cutoff logic restricting bookings in the past (with same-day vs. advance booking support).
- **Secure Razorpay Checkout**:
  - Edge Function-orchestrated order creation with temporary slot reservation holds.
  - Razorpay payment modal with test/live card, UPI, netbanking, and wallet support.
  - Server-side cryptographic HMAC SHA-256 signature verification.
  - Immediate hold release if the payment modal is dismissed or cancelled.
- **My Bookings & Digital Pass**:
  - Filter by Upcoming, In Use, and Completed reservations.
  - Real-time booking countdown and passcodes.
  - High-contrast QR code generation (`qrcode.react`) for seamless front-desk scanning.
- **Customer Settings**:
  - View authenticated profile details (name, email, role, avatar).
  - Secure full-name editing protected by PostgreSQL Row Level Security.
  - Native in-app update checker (in Android APK only; hidden on Web).

### Admin Dashboard
- **Real-Time Revenue & Metrics**:
  - Combined Today's Revenue combining online Razorpay payments and counter Spot Bookings.
  - Live KPIs: Active Stations count, Today's Bookings count, and pending Check-In Queue.
- **Walk-in Spot Booking**:
  - Instant walk-in reservation system for on-premise customers paying cash or UPI at the counter.
  - Automated collision detection and dynamic end-time calculation.
  - Optional customer profile link by email or guest checkout.
- **QR Scanner & Check-In Hub**:
  - Live camera scanner powered by `jsqr` with WebRTC camera feed.
  - Instant booking pass lookup and verification with station & player details.
  - Manual booking code search fallback.
  - One-tap check-in marking reservations as active.
- **Station Management**:
  - Instant active/disabled toggle for maintenance or hardware repairs.
  - Emergency slot closing / reservation release for unexpected station downtime.
- **Global Lounge Controls**:
  - **Disable All Bookings**: Emergency pause on all new bookings across both customer and admin portals.
  - **Disable Advance Bookings**: Restricts bookings to same-day only.

### Native Android & In-App OTA Updates
- Built with **Capacitor 8** targeting modern Android devices.
- Immersive edge-to-edge dark theme (`#080510`) with matching Android StatusBar styling.
- **Option 1 In-App OTA Updates** (`@capgo/capacitor-updater`):
  - Deterministic 8-character content-hash fingerprinting (`<version>+<contentHash>`).
  - Automatic `dist/ota/bundle.zip` and `dist/ota/updates.json` generation during Vercel deployment.
  - When the user pushes changes to GitHub, users inside the Android app can tap **Check for Updates ➔ Update Now** in Settings to instantly apply UI/React updates without downloading new APKs.
  - Rollback protection: native app automatically reverts if a bundle fails to boot within 15 seconds.

---

## 🛠 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | React 18.3 | Single-page application with React Router v6 |
| **Build Tool** | Vite 6.0 | Fast HMR, Rollup production bundling |
| **Styling** | Tailwind CSS 3.4 | Dark purple cyberpunk glassmorphism theme |
| **Icons** | Lucide React | Modern, lightweight icon system |
| **Database & Auth** | Supabase | PostgreSQL, Auth (Email/OAuth), Storage, RLS |
| **Serverless Functions** | Supabase Edge Functions | Deno / TypeScript for Razorpay order creation & signature verification |
| **Payment Gateway** | Razorpay | Checkout SDK with server-side webhook and HMAC verification |
| **QR Engine & Scanner** | `qrcode.react` & `jsqr` | Client-side QR generation and camera-stream decoding |
| **Mobile Runtime** | Capacitor 8 | Native Android bridge, Status Bar, App Lifecycle |
| **OTA Updates** | `@capgo/capacitor-updater` | Over-the-air updates hosted on Vercel |
| **Deployment** | Vercel | Static hosting with custom cache headers & SPA routing |

---

## 📂 Project Structure

```plaintext
Oliveal APP/
├── android/                         # Capacitor Android native project & Gradle wrapper
├── public/                          # Public static assets & station banners
├── scripts/
│   ├── otaHashUtils.mjs             # Deterministic source content fingerprinting
│   └── generate-ota-bundle.mjs      # OTA bundle zip & updates.json manifest generator
├── src/
│   ├── components/
│   │   ├── admin/                   # Admin layout, KPIs, Spot Booking, QR Scanner, Stations
│   │   ├── auth/                    # Auth layout, inputs, OTP modal, social login
│   │   ├── common/                  # Shared components (AppUpdateCard)
│   │   └── customer/                # Customer headers, slot picker, booking cards, modals
│   ├── context/
│   │   └── AuthContext.jsx          # Supabase auth session provider & role router
│   ├── hooks/                       # Custom React hooks (useAuth, useStations, etc.)
│   ├── lib/
│   │   └── supabase.js              # Supabase JS client configuration
│   ├── pages/
│   │   ├── admin/                   # Admin Dashboard, CheckIn, SpotBooking, Stations, Settings
│   │   ├── auth/                    # Login, Signup, ForgotPassword, ResetPassword
│   │   └── customer/                # Home, BookSlot, ConfirmBooking, MyBookings, Settings
│   ├── routes/
│   │   ├── AppRoutes.jsx            # Application route definitions
│   │   ├── ProtectedRoute.jsx       # Authenticated route guard
│   │   └── AdminRoute.jsx           # Admin role-enforced guard
│   ├── services/                    # API services (booking, payments, updates, stations)
│   └── utils/                       # Timezone formatting, pricing, validation, native setup
├── supabase/
│   ├── functions/                   # Supabase Edge Functions (Deno / TypeScript)
│   │   ├── _shared/                 # Shared CORS & Razorpay HMAC utilities
│   │   ├── create-razorpay-order/   # Creates Razorpay order & pending booking hold
│   │   ├── verify-razorpay-payment/ # Validates HMAC signature & confirms booking
│   │   └── razorpay-webhook/        # Handles async Razorpay payment events
│   └── migrations/                  # Sequential PostgreSQL SQL migrations
│       ├── 01_auth_schema.sql
│       ├── 02_stations_and_bookings.sql
│       ├── 03_spot_bookings.sql
│       ├── 04_stations_management.sql
│       ├── 05_app_settings_and_profiles.sql
│       ├── 06_registered_email_check.sql
│       ├── 07_razorpay_payments.sql
│       └── 08_customer_profile_rls.sql
├── capacitor.config.json            # Capacitor native configuration
├── vercel.json                      # Vercel deployment, cache control & OTA routes
└── vite.config.js                   # Vite configuration with embedded version metadata
```

---

## 🏁 Getting Started

### Prerequisites

- **Node.js**: v18.x or v20.x (LTS recommended)
- **npm**: v9+ or v10+
- **Supabase Account & Project**: [supabase.com](https://supabase.com)
- **Razorpay Account**: Test or Live API keys from [dashboard.razorpay.com](https://dashboard.razorpay.com)
- **Android Studio** *(for Android builds)*: Android SDK 34+, JDK 17 or JDK 21

### Installation

Clone the repository and install dependencies:

```bash
cd "Oliveal APP"
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Razorpay Client Configuration
RAZORPAY_TEST_API_KEY=rzp_test_<your_key_id>
RAZORPAY_TEST_SECRET_KEY=<your_key_secret>

# Optional: Custom OTA manifest URL override (defaults to Vercel production URL)
# VITE_UPDATE_MANIFEST_URL=https://oliveal-gaming-zone.vercel.app/ota/updates.json
```

---

## 🗄 Database Setup & Migrations

The database runs on PostgreSQL via Supabase. Apply the migrations in numerical order using the **Supabase Dashboard ➔ SQL Editor** or via the Supabase CLI:

1. [`supabase/migrations/01_auth_schema.sql`](file:///Users/varshan/Desktop/Oliveal%20APP/supabase/migrations/01_auth_schema.sql): Sets up `profiles`, roles (`admin` / `customer`), triggers on auth signup, and RLS.
2. [`supabase/migrations/02_stations_and_bookings.sql`](file:///Users/varshan/Desktop/Oliveal%20APP/supabase/migrations/02_stations_and_bookings.sql): Sets up `stations` (ALPHA, BETA, etc.) and customer `bookings`.
3. [`supabase/migrations/03_spot_bookings.sql`](file:///Users/varshan/Desktop/Oliveal%20APP/supabase/migrations/03_spot_bookings.sql): Extends schema for counter walk-ins (`is_spot_booking`, `payment_method`, `booking_number`).
4. [`supabase/migrations/04_stations_management.sql`](file:///Users/varshan/Desktop/Oliveal%20APP/supabase/migrations/04_stations_management.sql): Adds station active/disabled flags and emergency slot release functions.
5. [`supabase/migrations/05_app_settings_and_profiles.sql`](file:///Users/varshan/Desktop/Oliveal%20APP/supabase/migrations/05_app_settings_and_profiles.sql): Adds `app_settings` for global booking controls and admin profile management.
6. [`supabase/migrations/06_registered_email_check.sql`](file:///Users/varshan/Desktop/Oliveal%20APP/supabase/migrations/06_registered_email_check.sql): Adds registered email lookup for spot bookings.
7. [`supabase/migrations/07_razorpay_payments.sql`](file:///Users/varshan/Desktop/Oliveal%20APP/supabase/migrations/07_razorpay_payments.sql): Adds `payments` table, atomic hold release RPC (`release_pending_booking_hold`), and combined revenue aggregation.
8. [`supabase/migrations/08_customer_profile_rls.sql`](file:///Users/varshan/Desktop/Oliveal%20APP/supabase/migrations/08_customer_profile_rls.sql): Secures customer profile updates so users can modify their `full_name` while keeping `email`, `role`, and `id` immutable.

---

## ⚡ Supabase Edge Functions (Razorpay)

Server-side payments are executed securely via Supabase Edge Functions.

### Configure Function Secrets

In the Supabase Dashboard under **Project Settings ➔ Edge Functions Secrets** (or via `supabase secrets set`):

```bash
supabase secrets set RAZORPAY_KEY_ID="rzp_test_..."
supabase secrets set RAZORPAY_KEY_SECRET="..."
supabase secrets set RAZORPAY_WEBHOOK_SECRET="..."
```

### Deploy the Functions

Deploy each function to your active Supabase project:

```bash
supabase functions deploy create-razorpay-order --no-verify-jwt
supabase functions deploy verify-razorpay-payment --no-verify-jwt
supabase functions deploy razorpay-webhook --no-verify-jwt
```

---

## 💻 Running Locally

### Development Server

Start the Vite development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Preview

Build and preview the production bundle locally:

```bash
npm run build
npm run preview
```

---

## 📱 Android Native Build

The Android project is managed using **Capacitor 8** in the `android/` directory.

### Build Debug APK

Compile a debug APK with the bundled web assets:

```bash
npm run android:apk:debug
```

The output APK will be generated at:
```plaintext
android/app/build/outputs/apk/debug/app-debug.apk
```

### Open in Android Studio

To run on a connected physical device or emulator:

```bash
npm run android:open
```

### Build Release APK / AAB

```bash
# Generate Release APK
npm run android:apk:release

# Generate Android App Bundle for Google Play
npm run android:aab
```

---

## 🔄 In-App OTA Updates Guide

This project includes **Option 1 In-App OTA Updates** using `@capgo/capacitor-updater`:

### How It Works

1. **Vercel Build Hook**: When code is pushed to GitHub, Vercel executes `npm run build:ota` (defined in [`vercel.json`](file:///Users/varshan/Desktop/Oliveal%20APP/vercel.json)).
2. **Deterministic Fingerprinting**: [`scripts/otaHashUtils.mjs`](file:///Users/varshan/Desktop/Oliveal%20APP/scripts/otaHashUtils.mjs) hashes `src/`, `public/`, `index.html`, and `package.json` to produce an 8-character hash (e.g. `1.0.0+983a9bfa`).
3. **Artifact Generation**: [`scripts/generate-ota-bundle.mjs`](file:///Users/varshan/Desktop/Oliveal%20APP/scripts/generate-ota-bundle.mjs) compresses `dist/` into `dist/ota/bundle.zip` and creates `dist/ota/updates.json` with an exact SHA-256 checksum.
4. **App Update Check**:
   - In the Android app, users navigate to **Settings ➔ Check for Updates**.
   - If a new version exists, the app displays the version diff and download size.
   - Tapping **Update Now** downloads the zip, verifies the SHA-256 checksum, and reloads the WebView seamlessly.
5. **Zero Web Impact**: On the Vercel website, `Capacitor.isNativePlatform()` evaluates to `false`, completely hiding the update card.

---

## 🧪 Testing & Quality Assurance

The project includes an end-to-end verification suite testing edge cases, timezone handling, payment flows, and responsive layouts:

```bash
# Verify Customer Settings & Profile RLS
node .gemini/antigravity/brain/.../scratch/verify_customer_settings.mjs

# Verify Admin Settings & Global Controls
node .gemini/antigravity/brain/.../scratch/verify_admin_settings.mjs

# Verify Razorpay Checkout & Revenue Calculation
node .gemini/antigravity/brain/.../scratch/verify_razorpay_payments.mjs

# Verify Admin Dashboard Metrics & Viewports
node .gemini/antigravity/brain/.../scratch/verify_admin_dashboard.mjs

# Verify Walk-in Spot Bookings
node .gemini/antigravity/brain/.../scratch/verify_spot_booking.mjs

# Verify QR Scanner & Camera Check-In
node .gemini/antigravity/brain/.../scratch/verify_checkin_qr.mjs

# Verify Station Availability & Disabled States
node .gemini/antigravity/brain/.../scratch/verify_stations_management.mjs

# Verify Past-Time Slot Cutoff Guards
node .gemini/antigravity/brain/.../scratch/verify_slot_past_time.mjs
```

---

## 🔒 Security & Architecture

- **PostgreSQL Row Level Security (RLS)**:
  - Customers can read and write only their own bookings and profile name.
  - Role escalation is blocked at the database level via immutable column triggers.
  - Admins are verified using a secure `is_admin()` SQL function.
- **Payment Verification**:
  - Razorpay order secrets and webhook secrets are kept exclusively in Supabase Edge Functions. The frontend never accesses or stores secret keys.
  - Payment signatures are verified using `crypto.subtle` HMAC SHA-256 before marking bookings as confirmed.
- **Rollback Protection**:
  - The Android app invokes `CapacitorUpdater.notifyAppReady()` on successful launch. If a corrupted OTA update crashes or fails to boot within 15 seconds, Capacitor automatically rolls back to the previous stable bundle.

---

## 📄 License

Private & Proprietary — Built for **Oliveal Gaming Zone**. All rights reserved.


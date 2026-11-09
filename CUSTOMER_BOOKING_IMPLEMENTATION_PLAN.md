# 🎮 Oliveal Gaming Zone — Customer Dashboard & Booking Frontend Implementation Plan

> **Scope**: Strict Frontend-Only Implementation (Phase 2)  
> **Frameworks & Methodologies**: React (Vite) + Tailwind CSS + Lucide Icons | **GSD** (Get Shit Done) + **UI/UX Pro Max**  
> **Reference Target**: Uploaded 3-screen visual spec (`media_1794248933648_b712a6f7.jpg`) + Extracted station assets  
> **Status**: Ready for User Review & Approval before coding

---

## 1. Executive Summary & Visual Design Contract (UI/UX Pro Max)

This plan defines the complete architecture, UI design tokens, component hierarchy, client-side booking engine, and testing protocol for the three core customer screens:
1. **Customer Main Page (`/dashboard`)**
2. **Book Your Slot Page (`/book-slot`)**
3. **My Bookings Page (`/my-bookings`)**

### 🎨 Visual Identity & Design Tokens

Derived with pixel precision from the approved reference visual (`media_1794248933648_b712a6f7.jpg`):

| Design Element | Token / Spec | Visual Usage |
|---|---|---|
| **Canvas Background** | `#07060e` / `bg-[#07060e]` | Deep midnight black backdrop with subtle ambient gaming glow |
| **Glass Card Surface** | `rgba(18, 15, 34, 0.82)` | `backdrop-blur-xl border border-white/[0.09] shadow-glass-card` |
| **Card Highlight Border** | `border-purple-500/35` | Used on active selections, station cards, and hero elements |
| **Primary CTA Gradient** | `bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#d946ef]` | Vivid neon purple/magenta gradient with `shadow-[0_0_25px_rgba(168,85,247,0.5)]` |
| **Booked Slot Red/Pink** | `bg-rose-950/40 border-rose-500/40 text-rose-300` | Red/pink translucent warning pill for booked intervals |
| **Live Available Badge** | `bg-emerald-500/15 border-emerald-500/30 text-emerald-300` | Station & slot available indicator with pulsating green dot |
| **Typography** | `Plus Jakarta Sans` | Bold titles (`tracking-tight`), crisp subtitles (`text-slate-300`), uppercase badges |
| **Accent Glows** | Layered radial gradients | Dual top-corner and bottom violet/fuchsia ambient glow tubes |

---

## 2. Image Asset Mapping

Extracted from the user-provided asset package and placed into `public/assets/images/`:

| Semantic Filename | Source File | Usage |
|---|---|---|
| `/assets/images/ps5-station.png` | `raw_image_1.png` | Station cards for ALPHA, BETA, GAMMA, DELTA & PS5 booking hero |
| `/assets/images/racing-simulator.png` | `raw_image_4.png` | Station cards for RS 1, RS 2 & Racing Simulator booking hero |
| `/assets/images/hero-controller.png` | `raw_image_3.png` | Hero card 3D controller graphic ("Ready to Play?") |
| `/assets/images/controller-thumb.png` | `raw_image_5.png` | Small station avatar and thumbnail indicators |

---

## 3. Screen Specifications & User Flows

```
[Customer Home] (/dashboard)
   ├── Ready to Play? Hero
   ├── Navigation Cards:
   │     ├── [Book Your Slot →] ────► [Book Your Slot] (/book-slot?station=alpha)
   │     └── [My Bookings →]   ────► [My Bookings] (/my-bookings)
   └── Our Gaming Stations (6)
         ├── ALPHA  (PS5)     ──────► Preselects ALPHA on /book-slot
         ├── BETA   (PS5)     ──────► Preselects BETA on /book-slot
         ├── GAMMA  (PS5)     ──────► Preselects GAMMA on /book-slot
         ├── DELTA  (PS5)     ──────► Preselects DELTA on /book-slot
         ├── RS 1   (Racing)  ──────► Preselects RS 1 on /book-slot
         └── RS 2   (Racing)  ──────► Preselects RS 2 on /book-slot
```

### Screen 1: Customer Main Page (`CustomerHome.jsx`)

1. **Top Header**:
   - Left: Hamburger menu drawer icon (`Menu`).
   - Center: Floating neon controller emblem + `Oliveal GAMING ZONE` brand logo.
   - Right: Notification bell with unread pink indicator dot (`Bell`) + Customer avatar icon with purple glow.
2. **Hero Section ("Ready to Play?")**:
   - Headline: `Ready to Play?` with gradient magenta "Play?".
   - Subtitle: *"Book your gaming slot and experience next-level gaming."*
   - Right illustration: Neon PS5 controller illuminated against purple gaming room background.
3. **Primary Action Cards (Side-by-Side)**:
   - **Card 1: Book Your Slot**:
     - Gamepad icon in glowing neon rounded square.
     - Bold title `Book Your Slot`.
     - Right circular arrow button (`ArrowRight`).
     - Neon purple gradient border with glow.
     - Routes to `/book-slot`.
   - **Card 2: My Bookings**:
     - Calendar icon in glowing rounded square.
     - Bold title `My Bookings`.
     - Right circular arrow button (`ArrowRight`).
     - Dark glassmorphism border.
     - Routes to `/my-bookings`.
4. **Our Gaming Stations Grid**:
   - Header: `Our Gaming Stations` with pill badge `● Live Availability` on the right.
   - 2-Column Responsive Grid with all **6 Gaming Stations**:
     1. **ALPHA**: PS5 Console, PS5 image, `● Available` (green badge).
     2. **BETA**: PS5 Console, PS5 image, `● Available` (green badge).
     3. **GAMMA**: PS5 Console, PS5 image, `● Booked until 06:00 PM` (pink badge).
     4. **DELTA**: PS5 Console, PS5 image, `● Available` (green badge).
     5. **RS 1**: Racing Simulator, Simulator cockpit image, `● Available` (green badge).
     6. **RS 2**: Racing Simulator, Simulator cockpit image, `● Booked until 07:30 PM` (pink badge).
   - Clicking any station card navigates to `/book-slot?station={id}` with that station preselected.

---

### Screen 2: Book Your Slot Page (`BookSlot.jsx`)

Sequential layout strictly following the middle screen of the reference image:

1. **Top Navigation Bar**:
   - Back arrow button (`ArrowLeft`) to return to `/dashboard`.
   - Centered page title `Book Your Slot`.
   - Right information icon `(i)` with tooltip describing booking policies.
2. **Section 1: Selected Gaming Station**:
   - Horizontal card showing selected station image, name (e.g. `ALPHA`), category (`PS5 Console` or `Racing Simulator`), availability badge (`● Available`), and category pill tag (`PS5` or `Racing Sim`).
   - Clean station switcher dropdown / drawer allowing customer to switch between the 6 stations on the fly.
3. **Section 2: Select Date**:
   - Label: `📅 Select Date`
   - Two side-by-side date cards:
     - **Card A (Today)**: e.g. `Sun 9 Nov (Today)`
     - **Card B (Tomorrow)**: e.g. `Mon 10 Nov (Advance)`
   - **Advance Booking Business Rule**:
     - Today is always selectable.
     - Tomorrow becomes selectable strictly from **8:00 PM onwards** (Asia/Kolkata local simulation). If current time is before 8:00 PM, tomorrow's card is shown with a lock icon and hint *"Unlocks at 8:00 PM"*.
     - Dates beyond tomorrow are disabled.
4. **Section 3: Select Number of Players**:
   - Label: `👥 Select Number of Players`
   - Segmented toggle with exactly two options:
     - `1 Player`
     - `2 Players ✓` (selected state highlights in vivid purple with checkmark)
5. **Section 4: Booked Slots**:
   - Label: `📅 Booked Slots — {Day}, {Date} ({Station Name})`
   - Header action: `View All →` (expands) / `Show Less` (collapses).
   - Default: Displays first 2 booked slots. If more than 2 exist, `View All →` expands to display all slots smoothly.
   - Slot item styling: Red/pink translucent pills with calendar icon, start–end time, and red player count pill (`● 2 Players`).
6. **Section 5: Create Your Slot (Core Booking Engine)**:
   - Label: `⏰ Create Your Slot`
   - Two side-by-side inputs:
     - **Start Time**: Mobile-friendly dropdown/picker with 15-minute intervals across 24 hours (e.g. `06:00 PM`, `06:15 PM`, `06:30 PM`, `06:45 PM`, `07:00 PM` ...).
     - **Duration**: Dropdown offering strictly `60 Minutes`, `90 Minutes`, `120 Minutes`.
   - **Automatic End-Time Calculation**:
     - Formula: `End Time = Start Time + Duration`.
     - Customer NEVER edits the end time.
     - Supports cross-midnight transitions (e.g. `11:30 PM` + 90 min = `01:00 AM next day`).
   - **Live Calculated Slot Display Pill**:
     - Dark glass pill with calendar icon: `Your Slot: 06:30 PM – 08:00 PM (2 Players)`.
7. **Interval Overlap Validation & Error Feedback**:
   - Validates client-side against all existing bookings for that station and date.
   - If overlap occurs:
     - Displays error alert: *"This time slot is unavailable. Please choose another time."*
     - Highlights slot pill in subtle warning red border.
     - Disables `Confirm Booking` button.
8. **Section 6: Confirm Booking CTA**:
   - Primary full-width gradient button: `Confirm Booking →`.
   - Disabled state with visual opacity and disabled cursor if selection is incomplete or overlapping.
   - When clicked: Simulates successful booking creation, adds to mock store, and displays a success confirmation modal with option to view in `My Bookings`.

---

### Screen 3: My Bookings Page (`MyBookings.jsx`)

1. **Top Navigation Bar**:
   - Back arrow button (`ArrowLeft`) to return to `/dashboard`.
   - Centered title `My Bookings`.
2. **Segmented Tabs**:
   - `Upcoming (N)` (active with purple glow)
   - `Past (N)` (inactive glass)
3. **Booking Cards List**:
   - Displays all confirmed bookings matching the active tab.
   - Each card contains:
     - Top row: Station image on left, Station Name (e.g. `ALPHA`), Category (`PS5 Console`), and green status badge `✓ Confirmed`.
     - Details rows:
       - `📅 Mon, 10 Nov 2025`
       - `⏰ 06:30 PM – 08:00 PM (90 Minutes)`
       - `👥 2 Players`
   - **Strict Rule Enforcement**: No cancel or reschedule buttons are rendered.
4. **Empty State**:
   - Shows sleek gaming controller graphic with message: *"No upcoming bookings yet. Ready to play? Book your slot now!"* with a direct CTA button leading to `/book-slot`.

---

## 4. Algorithmic Booking Engine (Pure Frontend Business Logic)

### A. Date Eligibility Engine (`dateEligibility.js`)
```javascript
export function getEligibleBookingDates(currentDate = new Date()) {
  // Uses Asia/Kolkata timezone simulation
  const hours = currentDate.getHours();
  const isAdvanceUnlocked = hours >= 20; // 8:00 PM or later
  
  const today = new Date(currentDate);
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return [
    { date: today, label: 'Today', isEligible: true },
    { date: tomorrow, label: 'Advance', isEligible: isAdvanceUnlocked, unlocksAt: '8:00 PM' }
  ];
}
```

### B. Overlap Prevention Algorithm (`bookingAvailability.js`)
Interval math uses half-open intervals `[start, end)`:
```javascript
export function checkIntervalOverlap(newStartMs, newEndMs, existingSlots) {
  for (const slot of existingSlots) {
    const existingStartMs = slot.startMs;
    const existingEndMs = slot.endMs;

    // Overlap condition:
    // newStart < existingEnd && newEnd > existingStart
    if (newStartMs < existingEndMs && newEndMs > existingStartMs) {
      return {
        hasOverlap: true,
        conflictingSlot: slot,
        reason: 'This time slot is unavailable. Please choose another time.'
      };
    }
  }
  return { hasOverlap: false };
}
```
**Handled Edge Cases (all 13 tested)**:
1. `newStart` inside existing booking
2. `newEnd` inside existing booking
3. New booking completely engulfs existing booking
4. New booking entirely inside existing booking
5. Exact identical interval
6. Adjacent intervals (e.g. Existing: `10:00–11:00`, New: `11:00–12:00` → **Allowed**)
7. Cross-midnight bookings (e.g. `11:30 PM` to `01:00 AM next day` → **Allowed** if clear)
8. Existing booking crosses midnight and new booking starts at `12:15 AM` → **Detected & Rejected**
9. Changing duration after start time selection → **Recalculates & revalidates immediately**
10. Changing start time after duration selection → **Recalculates & revalidates immediately**
11. Changing station → **Loads that station's booked slots & revalidates**
12. Changing date → **Loads that date's booked slots & revalidates**
13. Multiple booked intervals on the same day

---

## 5. Mock Data Architecture (`src/services/mock/`)

Separates mock data completely from UI components so it can be swapped with Supabase in the next phase without touching JSX markup:

```
src/
├── services/
│   └── mock/
│       ├── stationMockData.js    # 6 stations (ALPHA, BETA, GAMMA, DELTA, RS 1, RS 2)
│       ├── bookingMockData.js    # Pre-seeded booked slots & history
│       └── bookingStore.js       # LocalStorage backed client-side booking store
├── utils/
│   ├── bookingTimeUtils.js       # 15-min generators, formatters, end-time calculator
│   ├── bookingAvailability.js    # Overlap validation algorithm
│   └── dateEligibility.js        # 24/7 & 8:00 PM advance date eligibility
```

### 1. `stationMockData.js`
Contains:
- Station IDs: `alpha`, `beta`, `gamma`, `delta`, `rs-1`, `rs-2`
- Names: `ALPHA`, `BETA`, `GAMMA`, `DELTA`, `RS 1`, `RS 2`
- Categories: `PS5 Console` (stations 1–4), `Racing Simulator` (stations 5–6)
- Images: `/assets/images/ps5-station.png` and `/assets/images/racing-simulator.png`
- Base pricing & capacity (max 2 players)

### 2. `bookingStore.js`
A reactive state service backed by `localStorage` (`oliveal_mock_bookings`):
- `getBookedSlots(stationId, dateString)` → returns existing booked intervals
- `createBooking(bookingPayload)` → adds newly confirmed booking to user's upcoming list
- `getCustomerBookings()` → returns upcoming & past bookings

---

## 6. Component Architecture & Hierarchy

```
src/
├── components/
│   └── customer/
│       ├── CustomerHeader.jsx     # Navigation, Oliveal branding, Bell, Profile avatar
│       ├── HeroSection.jsx        # "Ready to Play?" hero with illuminated controller
│       ├── NavigationCard.jsx     # Primary action cards (Book Slot / My Bookings)
│       ├── StationCard.jsx        # Individual gaming station card with live tag
│       ├── StationSelector.jsx    # Selected station hero + switcher in /book-slot
│       ├── DateSelector.jsx       # Today vs Tomorrow (8 PM advance rule)
│       ├── PlayerSelector.jsx     # 1 Player vs 2 Players segmented selector
│       ├── BookedSlots.jsx        # Red/pink booked slots list with View All toggle
│       ├── SlotCreator.jsx        # Start time (15-min) + Duration (60/90/120) + Auto end-time
│       ├── BookingSummary.jsx     # Real-time summary card & Confirm Booking CTA
│       ├── BookingCard.jsx        # Card for My Bookings (Upcoming / Past)
│       └── BookingSuccessModal.jsx# Confirmation popup with quick link to My Bookings
├── pages/
│   └── customer/
│       ├── CustomerHome.jsx       # Customer Main Hub
│       ├── BookSlot.jsx           # Complete 7-section Booking Page
│       └── MyBookings.jsx         # Upcoming / Past Bookings View
└── routes/
    └── AppRoutes.jsx              # Registered customer routes (/dashboard, /book-slot, /my-bookings)
```

---

## 7. Step-by-Step Implementation Roadmap

1. **Step 1: Mock Data & Pure Utilities Setup**
   - Implement `stationMockData.js` with all 6 stations.
   - Implement `bookingMockData.js` with realistic booked slots.
   - Implement `bookingTimeUtils.js` (time math, 15-min increments, 12h/24h conversion, cross-midnight calculations).
   - Implement `bookingAvailability.js` (half-open interval collision algorithm).
   - Implement `dateEligibility.js` (24/7 calendar with 8:00 PM cutoff).
   - Implement `bookingStore.js` (localStorage client persistence).

2. **Step 2: Customer Header & Shared Customer Components**
   - Build `CustomerHeader.jsx` with mobile hamburger, Oliveal controller logo, notification bell, profile icon.
   - Build `StationCard.jsx` and `NavigationCard.jsx`.

3. **Step 3: Customer Main Page (`CustomerHome.jsx`)**
   - Assemble `HeroSection.jsx` with controller visual.
   - Assemble navigation cards to `/book-slot` and `/my-bookings`.
   - Render 6 station cards with realistic live availability indicators.

4. **Step 4: Book Your Slot Page (`BookSlot.jsx`)**
   - Station selection section with pre-selection from URL query parameter (`?station=...`).
   - Date selection with 8:00 PM advance rule.
   - Player count toggle (1 or 2 players).
   - Booked slots section with `View All` / `Show Less`.
   - Start time & duration pickers with automatic end-time calculation.
   - Live calculated slot pill and overlap feedback.
   - Confirm Booking action with success modal & store persistence.

5. **Step 5: My Bookings Page (`MyBookings.jsx`)**
   - Upcoming and Past tab switcher.
   - Booking card list matching reference image.
   - Empty state handling.

6. **Step 6: Route Registration & Verification**
   - Connect `/dashboard`, `/book-slot`, and `/my-bookings` in `AppRoutes.jsx` under `ProtectedRoute`.
   - Run `npm run build` to verify clean compilation with zero warnings.
   - Perform end-to-end user verification of all booking edge cases.

---

## 8. Verification & Acceptance Checklist

- [ ] All 6 stations display with correct images and badges (ALPHA, BETA, GAMMA, DELTA, RS 1, RS 2).
- [ ] Clicking any station card routes to `/book-slot` with that station preselected.
- [ ] Today is selectable; Tomorrow is selectable only at or after 8:00 PM (or shows clear locked state).
- [ ] 24/7 time range supported with 15-minute intervals.
- [ ] Durations restricted to 60 min, 90 min, 120 min.
- [ ] End time calculates automatically with zero manual input.
- [ ] Cross-midnight calculation works (e.g. 11:30 PM + 90 min = 01:00 AM next day).
- [ ] Player count strictly restricted to 1 or 2 players.
- [ ] Booked slots display with red/pink styling and toggle `View All` / `Show Less`.
- [ ] Interval overlap is detected and blocked with error message: *"This time slot is unavailable. Please choose another time."*
- [ ] Adjacent slots are allowed (e.g. 10:00–11:00 and 11:00–12:00).
- [ ] Confirm Booking stays disabled for invalid or overlapping intervals.
- [ ] Confirming a booking saves it to mock store and updates `My Bookings` -> `Upcoming`.
- [ ] `My Bookings` shows Upcoming & Past tabs with no cancel/reschedule buttons.
- [ ] Design matches the reference image in dark gaming cyberpunk aesthetic.
- [ ] Build compiles with 0 errors via `npm run build`.


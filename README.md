# DailyDrobe

> **Your Style. Smarter. Everyday.**

DailyDrobe is a personal wardrobe and outfit-rotation Progressive Web App (PWA) designed to answer one simple question:

**What should I wear today?**

It combines a user-curated wardrobe, approved outfit combinations, a continuous four-week rotation, actual wear tracking, and lightweight usage insights in a mobile-first fashion-tech experience.

---

## What DailyDrobe Does

DailyDrobe is **not designed to randomly generate outfits** in Version 1.

The user's personally researched outfit combinations are treated as the authoritative source. DailyDrobe manages those combinations, plans them across office days, handles real-life exceptions, records what was actually worn, and provides insights into clothing usage.

### Core goals

- Reduce daily outfit decision-making.
- Preserve personally curated outfit combinations.
- Automatically plan future office days.
- Handle laundry, no-office days, manual changes, and missed records.
- Track actual clothing wear.
- Surface useful wardrobe insights.
- Provide a premium futuristic fashion experience.
- Work primarily on mobile as a free installable PWA.

---

# Product Structure

DailyDrobe has six main sections:

| Section | Purpose |
|---|---|
| **Today** | See today's planned Look and record what was actually worn. |
| **Wardrobe** | Manage shirts, pants and shoes. |
| **Looks** | Manage approved Shirt + Pants + Shoes combinations. |
| **Rotation** | See what is planned next in chronological order. |
| **Insights** | Understand actual clothing usage and underused items. |
| **Settings** | Manage office days, rotation rules, reset, import and other controls. |

The Calendar is intentionally **not** a top-level feature. Useful day/history functionality is handled inside Rotation.

---

# Core Concepts

### Clothing Item
A single shirt, pants or shoe in the wardrobe.

### Look
An approved combination containing:

**1 Shirt + 1 Pants + 1 Shoes**

### Rotation
The ordered sequence of approved Looks used to plan office days.

### Daily Plan
The Look intended for a specific office date.

### Actual Wear
What the user explicitly confirms they actually wore.

### Wear History
Historical information about actual clothing usage.

### No Office
A day where the user does not attend the office. The planned Look carries forward to the next office day.

### Skipped
A planned Look was not worn. For example, an item was unavailable or the user selected something else.

### Unrecorded
An office day where actual wear has not yet been confirmed.

---

# How the Rotation Works

DailyDrobe uses a **continuous four-week rotation**.

The original Excel:

**Week → Day → Look**

structure is authoritative.

The system does **not** automatically reorder the curated rotation based on wear frequency.

## Normal office day

The next approved Look in the sequence is planned.

## No Office

If there is no office:

- Nothing is marked as worn.
- Rotation does not receive wear credit.
- The planned Look carries forward to the next office day.
- The original Excel sequence remains intact.

## Look unavailable

If any component of a Look is unavailable, for example because a shirt is in laundry:

- The entire Look is skipped temporarily.
- The system moves to the next available Look.
- The skipped Look remains in its original rotation position.
- It can return when the required clothing becomes available.

## Try Another

**Try Another**:

- Shows the next approved Look in the existing sequence.
- Works as a one-day override.
- Does not permanently change the rotation.
- Avoids cycling back through Looks already shown that day.

## Choose Myself

Allows the user to manually select another approved Look for that day.

---

# Today

Today is the primary daily experience.

It shows:

- Today's approved Look
- Shirt
- Pants
- Shoes
- **Wore this**
- **Try Another**
- **Choose Myself**

Once an approved Look is displayed or selected, it automatically becomes the planned outfit for that day.

There is no separate "Plan" confirmation step.

---

# Recording What Was Actually Worn

DailyDrobe never assumes that a planned outfit was worn.

The user explicitly confirms actual wear.

### Wore this

The planned Look is recorded as the actual outfit.

The individual clothing items receive wear credit immediately.

### Wore something else

The planned Look becomes **Skipped**.

The user can then:

- Choose another approved Look, or
- Pick Clothes manually.

### Pick Clothes

Manual selection follows:

**Shirt → Pants → Shoes**

Only the clothing items actually selected receive wear credit.

---

# Missed Wear Records

If a previous office day has not been recorded:

- DailyDrobe prompts the user when the app is opened again.
- Today's outfit is still shown immediately.
- The user is never blocked from accessing today's outfit.
- Unrecorded days remain unrecorded until corrected.

---

# Historical Records

DailyDrobe separates current configuration from historical actual wear.

If a Look is edited after being worn:

- The current Look can show the updated combination.
- Historical wear records preserve the combination that was actually worn.

If a historical day is manually corrected:

- The calendar/day record changes.
- Wear counts and historical wear calculations are **not automatically recalculated**.

This prevents historical data from silently changing because of later edits.

---

# Wardrobe Management

Clothing items have:

- Name
- Category
- Status

Categories:

- Shirts
- Pants
- Shoes

Statuses:

- **Available**
- **In Laundry**
- **Retired**

Retired clothing is removed from active use but preserved for historical context.

## New clothing

A newly added item:

1. Appears in the Wardrobe.
2. Does not automatically become recommendation-eligible.
3. Must first be included in an approved Look.

---

# Approved Looks

Looks are the approved outfit library.

A Look contains:

- Shirt
- Pants
- Shoes

A newly created Look:

- Is saved to Approved Looks.
- Does **not** automatically enter the rotation.
- Must be explicitly added to the rotation.

Looks can be edited directly.

If a clothing item is retired, a Look containing that item is **not automatically retired**. It can instead require attention until the user decides what to do.

---

# Adding a Look to Rotation

Rotation management supports explicit user control.

A Look can be added using:

- **Replace**
- **Insert**

When inserting or replacing a Look, the user controls how displaced Looks are handled, including shifting or retiring them from rotation.

The four-week Excel structure remains the foundation, but explicit user changes are allowed.

---

# Rotation vs. Looks

These sections intentionally answer different questions:

### Looks
**"What outfits do I have?"**

### Rotation
**"What am I wearing next?"**

### Settings → Rotation Management
**"How do I change the system?"**

The normal Rotation screen is intentionally simple and chronological rather than a spreadsheet-like editor.

---

# Insights

Insights are based on **actual wear**, not just planned outfits.

The main focus is individual clothing usage.

Insights can show:

- Most worn items
- Least worn items
- Items not worn recently
- Look usage
- Usage numbers
- Short natural-language observations

Underused clothing is surfaced as an insight only.

DailyDrobe does **not** automatically create new Looks or change the rotation simply because an item is underused.

---

# Excel Import

The original Excel workbook is the initial seed for DailyDrobe.

It contains:

- The curated outfit combinations.
- The four-week Week → Day → Look structure.
- The clothing inventory.

## First launch

The Excel data is automatically imported during initial setup.

## After import

DailyDrobe becomes the operational source of truth.

Excel is **not a live database**.

## Manual Re-import

A manual Excel re-import is available in Settings as a recovery/admin feature.

The user can choose:

- **Merge**
- **Replace**

Replace restores:

- Wardrobe
- Approved Looks
- Rotation

Existing wear history is preserved.

---

# Data Architecture

DailyDrobe separates several concepts to prevent data corruption:

```text
Clothing Item
      ↓
    Look
      ↓
 Daily Plan
      ↓
 Actual Wear
      ↓
 Wear History
```

The UI, storage and rotation logic are kept conceptually separate.

The application uses IDs and relationships rather than relying on clothing names as permanent identifiers.

---

# Local-First Storage

DailyDrobe is designed as a personal local-first application.

Current approach:

- Data is stored locally in the browser.
- IndexedDB is used through `idb-keyval`.
- No login is required for the application architecture.
- No cloud database is required for the current version.
- Mobile and PC can intentionally have separate local data.
- Cross-device synchronization is not currently part of V1.

A backup/export-import mechanism can be used for recovery.

---

# Technology Stack

| Technology | Purpose |
|---|---|
| **React 18** | Application UI |
| **Vite** | Development and production build tooling |
| **IndexedDB / idb-keyval** | Local persistence |
| **XLSX** | Excel import |
| **Lucide React** | UI icons |
| **vite-plugin-pwa** | Progressive Web App functionality |
| **GitHub** | Source-code repository |
| **Vercel** | Web hosting/deployment |

---

# Project Structure

```text
dailydrobe/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── lib/
│       └── storage.js
│
├── public/
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── icon-maskable-192.png
│       └── icon-maskable-512.png
│
├── index.html
├── vite.config.js
├── vercel.json
├── package.json
├── package-lock.json
└── README.md
```

---

# Visual Design

DailyDrobe was intentionally designed to feel like a:

> **Premium futuristic personal fashion operating system**

The visual system uses:

- Black / deep charcoal base
- Neon lime/green primary accent
- Neon/pastel pink secondary accent
- Dark glassmorphism
- Modern futuristic typography
- Editorial fashion influence
- Subtle ambient glow
- Fine technical/HUD-inspired details
- Restrained animations
- Strategic use of neon rather than excessive glow

The goal is to avoid a generic dashboard or spreadsheet appearance.

---

# Clothing Visual System

Instead of requiring the user to photograph every clothing item, DailyDrobe uses reusable premium garment illustrations.

The `ClothingImage` concept supports:

- Detailed SVG garment illustrations by default.
- Optional personal image override.
- Multiple visual variants.
- Selection saved against the Clothing Item ID.

Different visual templates can represent:

### Shirts
- Button-up
- Full sleeve
- Half sleeve
- Oversized
- Polo
- Patterned shirts

### Pants
- Denim
- Trousers
- Corduroy
- Cargo
- Chinos
- Other material-specific styles

### Shoes
Shoes use a more realistic product-style silhouette with:

- Toe box
- Heel
- Midsole/outsole
- Laces
- Tongue
- Side panels
- Stitching
- Material details

SVG layers provide:

- Base shape
- Shading
- Construction details
- Fabric details
- Highlights
- Ground shadow

---

# Landing Experience

The application includes a short premium entry experience before the main app.

Concept:

**DAILYDROBE**

**YOUR STYLE. SMARTER. EVERYDAY.**

The intended experience uses:

- Fashion visual
- Ambient glow
- Subtle logo animation
- Neon line/detail
- Enter DailyDrobe CTA

The animation is intentionally short and premium rather than a long loading screen.

Optional interaction sound effects are designed to:

- Be off by default.
- Never autoplay.
- Trigger only after user interaction.
- Use subtle hardware-like tones.
- Respect reduced-motion/accessibility preferences.

---

# PWA / Mobile Usage

DailyDrobe is configured as a Progressive Web App.

It is designed primarily for mobile but remains usable on PC.

### Android

Open DailyDrobe in Chrome and use:

**Menu → Add to Home screen / Install app**

### iPhone

Open DailyDrobe in Safari and use:

**Share → Add to Home Screen**

The PWA configuration includes:

- Standalone app display
- Portrait-first orientation
- App icons
- Web manifest
- Cached production assets
- Mobile-friendly viewport configuration

---

# Deployment

DailyDrobe is deployed using:

```text
GitHub
   ↓
Vercel
   ↓
Production Web App
   ↓
Mobile / PC PWA
```

## Deployment process

1. Build the React/Vite project.
2. Store the source in GitHub.
3. Connect the repository to Vercel.
4. Vercel runs `npm install`.
5. Vercel runs `npm run build`.
6. Vercel publishes the generated `dist` folder.
7. The resulting website can be opened from mobile or PC.
8. The PWA can be installed on supported devices.

---

# Deployment Issue That Was Resolved

The first Vercel build failed with:

```text
Rollup failed to resolve import "/src/main.jsx"
from "/vercel/path0/index.html".
```

The issue was not with the React code or Vercel configuration.

The GitHub repository had accidentally been uploaded with source files flattened into the repository root instead of preserving:

```text
src/
public/
```

The local project was inspected through GitHub Desktop.

The correct structure was restored:

```text
src/App.jsx
src/main.jsx
src/lib/storage.js

public/favicon.svg
public/apple-touch-icon.png
public/icons/*
```

The corrected structure was committed and pushed to GitHub, allowing Vercel to build the project correctly.

---

# Current Deployment Access Note

The production deployment exists, but if the website displays a **Vercel login page** instead of DailyDrobe, Vercel Deployment Protection / Vercel Authentication may be enabled.

For a publicly accessible personal app:

1. Open the DailyDrobe project in Vercel.
2. Go to **Settings**.
3. Open **Deployment Protection**.
4. Disable the protection/authentication requiring Vercel login, if appropriate.
5. Save the setting.
6. Test the site from a private/incognito mobile browser.

---

# Important Product Rules

These rules are fundamental to DailyDrobe V1:

- Do **not** automatically invent or remix outfits.
- Do **not** automatically reorder the curated Excel rotation based on wear frequency.
- Do **not** count an outfit as worn without explicit user confirmation.
- Do **not** give planned items wear credit when the user records a different actual outfit.
- Do **not** let No Office days consume rotation slots.
- Do **not** automatically retire a Look because one of its clothing items was retired.
- Do **not** make newly added clothing recommendation-eligible before it belongs to an approved Look.
- Do **not** automatically add newly created Looks to rotation.
- Do **not** rewrite historical actual-wear combinations when a current Look is edited.
- Do **not** automatically recalculate historical wear counts after a manual historical correction.
- Do **not** turn the product back into a spreadsheet-style dashboard.

---

# Production Testing Checklist

Before considering a deployment complete, verify:

- [ ] Landing page opens without unwanted Vercel authentication.
- [ ] Today shows the correct planned Look.
- [ ] Wore this records actual wear.
- [ ] Wore something else supports Choose a Look and Pick Clothes.
- [ ] Pick Clothes works in Shirt → Pants → Shoes order.
- [ ] Try Another does not permanently change the curated rotation.
- [ ] No Office carries the planned Look forward.
- [ ] Unavailable Looks are skipped correctly.
- [ ] Wardrobe status changes persist after refresh.
- [ ] Looks persist after refresh.
- [ ] Rotation persists after refresh.
- [ ] Wear history persists after reopening.
- [ ] Settings changes affect future planning only.
- [ ] Reset preserves wear history.
- [ ] PWA can be installed on mobile.
- [ ] Mobile layout works correctly.
- [ ] PC layout remains usable.
- [ ] Reduced-motion behavior works.
- [ ] Sound is off by default.

---

# Future Enhancements

The following are intentionally outside the core V1 scope:

- Cloud accounts
- Cross-device synchronization
- Advanced analytics
- Weather-aware recommendations
- Calendar integrations
- Cloud image storage
- More advanced AI-assisted Look creation
- Advanced cost-per-wear analytics

These can be added later without changing the core principle that the user's approved outfit combinations remain under their control.

---

# Product Philosophy

DailyDrobe is intentionally a **curated wardrobe operating system**, not a generic AI outfit generator.

The user owns the style decisions.

DailyDrobe handles:

**Organization → Planning → Rotation → Exceptions → Actual Wear → History → Insights**

The result is a personal, mobile-first fashion system that preserves the user's style while removing the repetitive work of deciding what to wear every day.

---

## License

This project is a personal application. Add a license here if the repository is intended to be shared, reused, or open-sourced.

---

**DailyDrobe — Your Style. Smarter. Everyday.**

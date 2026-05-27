# ICP Generator

AI-powered Ideal Customer Profile generation for your business.

## Deploying to Vercel

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **SPA routing:** `vercel.json` rewrites all routes to `/` so React Router deep links work.

**Frontend environment variables (Vite):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PRICE_MONTHLY`
- `VITE_STRIPE_PRICE_ANNUAL`
- `VITE_TURNSTILE_SITE_KEY` (if used)
- `VITE_AI_MOCK` (if used)
- `VITE_BYPASS_PAYWALL` (if used)
- `VITE_OPENAI_API_KEY` (note: should not be exposed client-side; planned to move server-side later)

**Supabase Auth:** set **Site URL** to `https://icpgenerator.io` and allow redirect URL `https://icpgenerator.io/auth/callback` (and optionally `https://icpgenerator.io/*` during development).


## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **React Router DOM** (routing)
- **Tailwind CSS v4.0** (styling)
- **Lucide React** (icons)
- **shadcn/ui** component pattern

## Project Structure

```
src/
├── App.tsx                 # Main router with all routes
├── main.tsx                # Entry point
├── components/
│   ├── ui/                 # Base UI components (button, input, card, etc.)
│   ├── Header.tsx          # Header with dark mode toggle
│   └── Footer.tsx          # Footer component
├── pages/                  # All page components
│   ├── Home.tsx
│   ├── Pricing.tsx
│   ├── OnboardingBuild.tsx
│   ├── Dashboard.tsx
│   └── ... (other pages)
├── styles/
│   └── globals.css         # Design system, tokens, animations
└── imports/                # SVG files (to be added)
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Design System

### Colors

- `--button-green`: #B0ED9D (Primary CTA)
- `--accent-grey`: #E5E5E5 (Borders)
- `--text-dark`: #000000 (Text)
- `--neutral-light`: #FFFFFB (Background)

### Typography

- **Headings**: Fraunces Bold
- **Body**: Inter Regular
- **h3**: Inter Bold

### Key Features

- ✅ Dark mode support with localStorage persistence
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Custom animations (fade-in-up, float, scale-in, bounce-subtle)
- ✅ 10px border radius throughout
- ✅ 1px black borders on buttons

## Routes

- `/` - Homepage
- `/pricing` - Pricing page
- `/onboarding-build` - ICP generation flow (10 steps)
- `/guest-dashboard` - Results display
- `/dashboard` - Main dashboard
- `/dashboard/icp/:id` - ICP editor
- `/collections` - Collections grid
- `/collections/:id` - Collection view
- `/account` - Account settings
- `/team` - Team settings
- `/paywall-demo` - Paywall demo
- `/payment-success` - Payment confirmation

## Current Status

### ✅ Completed

- [x] Vite + React + TypeScript setup
- [x] Comprehensive globals.css with design tokens
- [x] Core UI components (Button, Input, Card)
- [x] App.tsx with React Router
- [x] Header with dark mode toggle
- [x] Footer component
- [x] Basic page structure for all routes
- [x] Pricing page with Monthly/Yearly and USD/GBP toggles
- [x] OnboardingBuild page with progress bar

### 🚧 In Progress

- [ ] Complete homepage sections (Hero, Stats, Features, etc.)
- [ ] All 10 onboarding screens
- [ ] Dashboard with ICP cards
- [ ] Collections management
- [ ] Account and Team pages

## Next Steps

1. Complete all 10 onboarding screen components
2. Build out homepage sections
3. Implement dashboard with ICP cards
4. Add collections functionality
5. Complete account and team management

## Notes

- All "Generate Free Now" buttons link to `/onboarding-build`
- Dark mode persists across page refreshes
- Header and Footer only show on `/` and `/pricing` routes

## Local Git Hook: Block `dist/` Commits

This repo uses a local Git pre-commit hook at `.git/hooks/pre-commit` to prevent committing build output.

Hook check:

```sh
git diff --cached --name-only | rg '^dist/'
```

If any staged path is under `dist/`, commit is blocked with:

`Build output (dist/) must not be committed.`

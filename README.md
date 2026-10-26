# SnowFlakes – Franchise Partner Acquisition, Geo-Selection & Onboarding Engine

Ops Hackathon, Case 1. Candidates apply at `/apply`; the franchise team reviews at `/dashboard`.
**The AI only suggests. A human reviewer records every final decision.**

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run test:engine      # rules engine (uses scripts/fixtures, mock data kept out of the app)
npm run test:parser      # messy-workbook layouts
npm run test:guardrails  # chatbot attack / false-positive checks
npm run build
```

Copy `.env.example` to `.env.local` and fill what you need (all optional).

## How judges test it

1. Open **Admin login** (demo login is prefilled: admin / admin123, or set `ADMIN_AUTH=open` to remove it).
2. **Upload workbook**: drop an Excel/CSV file with Applications and Territories on any sheet(s); tables are recognised by their column headings. Sheet 3 (existing stores ST-01…ST-10) is built in. The app ships with no applicants or territories; a blank template is available on that screen. A sanitisation report lists every correction and every incomplete or unidentifiable field. Nothing is guessed.
3. **Pipeline**: each applicant gets an AI suggestion (green / orange / red) with exact rubric reasons, strong and weak points. Open one and record the human decision (Accepted / On hold / Waitlisted / Rejected).
4. **Expansion Copilot**: ask "Why is APP-007 on hold?" or give new facts such as "APP-012 has now found a ground-floor space". The score, suggestion and slot cascade update, and any recorded human decision is flagged for re-review.
5. **View Excel view** shows and downloads the 14 Sheet 1 columns plus Score, Status, Payback Period, Bottlenecks, AI Rating and Human Decision.

## Rules enforced

- Never two stores in one pin code (existing stores and one winner per pin; a human cannot accept a second one either).
- Pin prefix decides city and tier; out-of-scope pins are put on hold.
- Four 25-point pillars: launch speed, capital depth, retail experience, real-estate quality.
- Tie-break ladder: score, faster launch, higher capital, more experience, better floor, lower application ID.
- Colours: green = every gate passed and score 75+; orange = borderline (50–74) or cannot be rated yet; red = fails a gate or scores under 50.
- The approval details, next steps, congratulations email unlock only after a human accepts.

## Stack

Next.js 14 (App Router, TypeScript, Tailwind), zustand, SheetJS, Leaflet + Geoapify, Resend, Gemini (provider-agnostic wrapper in `lib/llm`).

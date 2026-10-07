# 🌍 Meeting Planner

[![Test and deploy](https://github.com/mchamow/meeting-planner/actions/workflows/deploy.yml/badge.svg)](https://github.com/mchamow/meeting-planner/actions/workflows/deploy.yml)

**Day 20 of [100 Days of React](https://github.com/mchamow?tab=repositories)**: Line up time zones and find a meeting time that works for everyone.

**Live demo:** https://mchamow.github.io/meeting-planner/

## Features

- **One timeline, every city**: each city gets a 24-hour strip lined up under the home city's day, coloured by working hours, awake (7–22) and night, with day labels where a city crosses midnight
- **Searchable city list**: about 80 well-known cities plus every IANA time zone your browser knows, searchable by city, country, zone or UTC offset. Up to 12 cities
- **Pick a time** by clicking an hour, dragging the slider (15-minute steps) or with the keyboard. Every city shows the selected time, its offset from home and a live clock
- **Overlap finder**: a bar marks the hours when everyone is inside working hours, and **Best time** jumps to the overlap, or to the hour with the most people working and the fewest asleep when there's none
- **Adjustable working hours** with a two-thumb slider
- **Any date, DST-aware**: offsets come from `Intl`, so they're right for the chosen day (try a date in late March or late October). Half-hour and 45-minute zones (Mumbai, Kathmandu) stay on the half hour
- **Make any city home** and the timeline follows its day, keeping the moment you picked
- **Copy times**: puts the meeting time in every city on the clipboard, ready for a chat or invite
- 12- or 24-hour clock
- **Keyboard shortcuts**: <kbd>←</kbd>/<kbd>→</kbd> move 15 minutes (<kbd>Shift</kbd> for an hour, rolling into the next or previous day), <kbd>[</kbd>/<kbd>]</kbd> change the day, <kbd>N</kbd> now, <kbd>B</kbd> best time, <kbd>C</kbd> copy, <kbd>A</kbd> add a city
- Cities, working hours and clock format are saved to `localStorage`; corrupt or invalid saved data falls back to the defaults (your own zone plus London, New York and Tokyo)
- Light and dark themes that follow the system, and a layout that works on a 360px phone (the day scrolls sideways and keeps the selected hour in view)

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI, cmdk) · lucide icons · Vitest + Testing Library · deployed to GitHub Pages with GitHub Actions.

No date library: [`src/time.ts`](src/time.ts) reads wall-clock times from `Intl.DateTimeFormat` and turns a wall time back into an instant, including the skipped and repeated hours of DST changes. [`src/planner.ts`](src/planner.ts) builds the day's hourly slots, overlap runs and best slot as pure functions, and [`src/state.ts`](src/state.ts) is the reducer behind the UI.

## Run locally

```bash
pnpm install
pnpm dev
pnpm test   # 41 unit and component tests (Vitest)
```

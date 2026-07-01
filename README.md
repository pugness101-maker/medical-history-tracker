# Medical History Tracker

A local-first personal medical tracking app with a clean, Apple Health–inspired UI.

**Stack:** React + Vite + TypeScript + Tailwind CSS  
**Storage:** Browser localStorage (`medical-history-tracker-v1`) — no server

## Navigation (5 tabs)

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Overview cards, quick actions, health summary |
| **Appointments** | Upcoming/past, calendar/list, details, attached records |
| **Health** | Collapsible sections: providers, meds, conditions, preventive care, vaccines, labs, insurance |
| **Records** | Upload PDFs/images/text, extract & review, create appointments or records |
| **Settings** | Backup, theme, privacy, sample data |

## Global search

Search bar in the header finds providers, appointments, medications, conditions, labs, vaccines, insurance, documents, and notes — click any result to jump directly to it.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Privacy

All data stays on your device unless you export a JSON backup. Do not store passwords or full insurance IDs.

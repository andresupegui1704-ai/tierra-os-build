# CleanMate - Product Requirements Document

## Overview
CleanMate is an Expo React Native iOS-native style app that helps users free up space on their iPhone and declutter their Gmail inbox using AI.

## Problem
Users accumulate duplicate/useless photos and spam/promotional emails, wasting device storage and mental bandwidth.

## Solution
A single premium app with 3 tools:
1. **Photo Cleaner** – AI-powered duplicate + similar photo detection (exact SHA256 + Gemini feature-based grouping).
2. **Smart Albums** – AI content categorization (screenshot, selfie, document, food, pet, landscape, etc.).
3. **Email Cleaner** – Realistic demo inbox (18 seeded emails across Spam / Promotions / Newsletters / Social / Useful) with bulk-delete; Gmail OAuth ready to plug in.

## Tech Stack
- Frontend: Expo SDK 54, expo-router file-based routing, lucide-react-native icons, expo-image-picker
- Backend: FastAPI + Motor (MongoDB), emergentintegrations (Gemini 2.5 Flash vision)
- LLM Key: Emergent Universal Key (budget may need top-up in Profile → Universal Key)

## Screens
- Splash → Onboarding (3 slides) → Bottom Tabs: Home, Photos, Albums, Emails, Settings

## Core API Routes (prefix /api)
- `GET /stats` + `POST /stats/record-photo-cleanup` + `POST /stats/reset`
- `POST /photos/analyze`, `POST /photos/batch-analyze` (max 10), `POST /photos/find-duplicates`, `GET /photos/albums`
- `GET /emails/scan`, `POST /emails/delete`, `POST /emails/reset`
- `GET /gmail/status`

## Known Limitations / MOCKED
- **Gmail: MOCKED** — `/api/emails/*` work on a seeded demo inbox stored in MongoDB. Real Gmail OAuth requires Google Cloud `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` which user has not provided yet. UI has a "Connect Gmail" row in Settings explaining this.
- **Device photo deletion**: Expo Go cannot delete from real iOS Photos library; the app removes duplicates from the working set and tracks space saved. Full deletion requires a dev build with expo-media-library.
- **AI budget**: Emergent LLM key has a spend cap; when exceeded, photo analysis falls back to generic category. User can top up at Profile → Universal Key.

## Business Enhancement Idea
Freemium upgrade: free tier = 50 photos/month AI scan + demo inbox; Pro (€4.99/mo) = unlimited scans, real Gmail connect, weekly auto-clean reminders, iCloud Photos deep scan.

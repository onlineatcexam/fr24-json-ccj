# fr24-json-ccj
# FR24 JSON Archival System for Google Apps Script

A lightweight automated system to archive Flightradar24 airport schedule and track playback data into GitHub JSON files for use with Google Apps Script and other non-commercial aviation projects.

---

# Overview

This project was created after direct access to Flightradar24 API endpoints began returning Cloudflare 403 protection pages when accessed from Google Apps Script.

The system works by:

```text
FR24 → Puppeteer (GitHub Actions) → GitHub JSON Archive → Google Apps Script
```

Instead of directly querying FR24 from Apps Script, GitHub Actions periodically fetches and archives the data using a real Chromium browser session.

---

# Features

## Airport Schedule Archival

Archives:
- Arrivals
- Departures
- Ground aircraft (optional/premium)

into JSON files.

---

## Flight Track Playback Archival

Automatically archives track playback JSON for:
- Landed arrivals
- Airborne departures

Each flight track is downloaded only once.

---

## Google Apps Script Compatible

Apps Script reads static GitHub raw JSON instead of FR24 APIs.

This avoids:
- Cloudflare 403 blocks
- token issues
- Apps Script fetch restrictions

---

## Optimized Workflow

The workflow:
- skips already archived tracks
- minimizes FR24 requests
- reduces GitHub Actions runtime

---

# Repository Structure

```text
.github/
└── workflows/
    └── fr24.yml

arrivals/
├── page1.json
└── page2.json

departures/
├── page1.json
└── page2.json

tracks/
├── 3f9b4937.json
├── 4ab1cdef.json
└── ...

ground.json

fetch.js
package.json
README.md
```

---

# Requirements

- GitHub account
- Public GitHub repository
- Node.js
- Puppeteer
- Google Apps Script (optional)
- FastCron account (recommended)

---

# Installation

## 1. Create GitHub Repository

Create a public repository.

Example:

```text
fr24-json-ccj
```

---

## 2. Add Workflow File

Create:

```text
.github/workflows/fr24.yml
```

---

## 3. Install Dependencies

Local setup:

```bash
npm install puppeteer
```

---

## 4. Create fetch.js

This script:
- launches Chromium
- fetches FR24 JSON
- downloads track playback
- writes JSON files into repository

---

# GitHub Actions Workflow

Example:

```yaml
name: FR24 Fetch

on:
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: fr24-fetch
  cancel-in-progress: true

jobs:
  fetch:
    runs-on: ubuntu-latest

    steps:

      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: |
          npm install
          npx puppeteer browsers install chrome

      - name: Run fetch
        run: node fetch.js

      - name: Commit and Push
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@github.com"

          git add .

          git diff --cached --quiet || git commit -m "Update FR24 data"

          git push
```

---

# Why External Cron Was Used

GitHub native scheduled workflows were found unreliable for continuous 15-minute execution.

Observed issues:
- missed runs
- multi-hour delays
- scheduler drift
- throttling of self-committing workflows

The project now uses FastCron to trigger workflow dispatches reliably.

---

# FastCron Setup

## URL

```text
https://api.github.com/repos/onlineatcexam/fr24-json-ccj/actions/workflows/fr24.yml/dispatches
```

---

## Method

```text
POST
```

---

## Schedule

```text
Every 15 minutes
```

---

## Headers

```text
Authorization: Bearer YOUR_GITHUB_TOKEN
Accept: application/vnd.github+json
```

---

## Body

```json
{"ref":"main"}
```

---

# Google Apps Script Integration

Instead of direct FR24 API calls:

```javascript
UrlFetchApp.fetch("https://api.flightradar24.com/...")
```

use GitHub raw JSON:

```javascript
const url =
  "https://raw.githubusercontent.com/onlineatcexam/fr24-json-ccj/refs/heads/main/arrivals/page1.json";
```

---

# Track Playback Access

Track files are archived as:

```text
tracks/<flightId>.json
```

Example:

```text
tracks/3f9b4937.json
```

Raw URL:

```text
https://raw.githubusercontent.com/onlineatcexam/fr24-json-ccj/refs/heads/main/tracks/3f9b4937.json
```

---

# Ground Aircraft Notes

Ground aircraft data requires:
- authenticated FR24 premium session
- access token
- browser session context

Standard airport schedule endpoints may return empty arrays for ground data.

---

# Runtime Performance

Typical stabilized workflow runtime:

```text
~30 sec to ~1.5 min
```

depending on:
- new tracks detected
- Chromium startup time
- network latency

---

# Optimization Notes

Implemented:
- skip existing track downloads
- shared track folder
- conditional git commits
- Puppeteer browser reuse

Planned:
- automatic track cleanup after 15 days
- daily merged archives
- compressed storage

---

# Important Notes

## Public Repository

This project currently uses a public repository because:
- GitHub Actions limits are more relaxed
- easier archival access from Apps Script

Do not store sensitive credentials in repository files.

---

## Tokens

Never hardcode:
- personal access tokens
- FR24 premium tokens

Use:
- GitHub Secrets
- environment variables

for production setups.

---

# Disclaimer

This project is intended strictly for:
- educational use
- non-commercial use
- aviation hobby/research purposes

Flightradar24 data remains property of Flightradar24 AB.

Users are responsible for complying with applicable terms of service and usage policies.

---

# Credits

Built using:
- GitHub Actions
- Puppeteer
- Google Apps Script
- FastCron
- Chromium

---

# Author

Shahab Mohamed  
Instructor, NIATAM Gondia  
India


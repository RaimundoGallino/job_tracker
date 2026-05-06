# Job Tracker

Web app for tracking job applications. Node.js + Express backend, React frontend (loaded via CDN, no build step). The database is a single JSON file on disk — no setup required.

## Features

- Dashboard with stats (applications, interviews, offers, response rate)
- Visual pipeline with bar charts and donut chart
- Searchable, filterable, sortable table
- Statuses: `Planned`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Withdrawn`
- Per-job priority (high / medium / low)
- Detail modal with LinkedIn recruiter search shortcuts
- CSV export
- Automatic backups on every write
- Auto-save: any change is persisted immediately

## Requirements

- Node.js >= 20

That's it. The only runtime dependency is `express`, declared in `package.json`.

## Installation

```bash
git clone https://github.com/RaimundoGallino/job_tracker.git
cd job_tracker
npm install
```

## Usage

```bash
npm start
```

Open [http://localhost:8001](http://localhost:8001) in your browser.

The server listens on `0.0.0.0:8001`, so you can also access it from other devices on the same local network.

## Database format

Data lives in `job-tracker-data.json` at the project root. The file has this shape:

```json
{
  "version": "server-1",
  "exported_at": "2026-05-06",
  "total": 2,
  "jobs": [
    {
      "id": 1,
      "company": "Acme Studios",
      "role": "Technical Artist",
      "status": "Applied",
      "date": "2026-05-06",
      "interviewDate": "",
      "contact": "Jane Doe",
      "contactTitle": "Senior Recruiter",
      "nextAction": "Wait for reply",
      "notes": "Applied via LinkedIn",
      "location": "Barcelona (Hybrid)",
      "url": "https://example.com/jobs/123",
      "priority": "high",
      "description": "Full job description..."
    },
    {
      "id": 2,
      "company": "Pixel Forge",
      "role": "Senior Technical Artist",
      "status": "Planned",
      "date": "2026-05-06",
      "interviewDate": "",
      "contact": "",
      "contactTitle": "",
      "nextAction": "Review posting",
      "notes": "",
      "location": "Remote",
      "url": "https://example.com/jobs/456",
      "priority": "medium",
      "description": ""
    }
  ]
}
```

### Job fields

| Field | Type | Notes |
|---|---|---|
| `id` | number | Unique. For manual entries you can use `Date.now()` or any integer. |
| `company` | string | **Required.** Company name. |
| `role` | string | **Required.** Job title. |
| `status` | string | One of: `Planned`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Withdrawn`. |
| `date` | string | Application date, `YYYY-MM-DD` format. |
| `interviewDate` | string | Interview date, `YYYY-MM-DD` or empty. |
| `contact` | string | Recruiter / contact name. |
| `contactTitle` | string | Contact's job title (optional). |
| `nextAction` | string | Next thing to do. |
| `notes` | string | Free-form notes. |
| `location` | string | Location / work mode. |
| `url` | string | Posting URL. Used for deduplication on import. |
| `priority` | string | `high`, `medium`, or `low`. |
| `description` | string | Full job description (multi-line allowed). |

## API

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/` | — | Serves `job-tracker.html` |
| `GET` | `/api/jobs` | — | Array of jobs |
| `PUT` | `/api/jobs` | Array of jobs | `{ ok: true, total: N }` |

`PUT` replaces the entire array (it's not per-job). Before each write, the server creates an automatic backup in `backups/`.

## Importing data manually

### Option 1: edit the JSON directly

Stop the server, edit `job-tracker-data.json`, restart. The app will pick up the new data on browser refresh.

### Option 2: via API (recommended for batch imports)

If you want to add a batch of jobs without overwriting what you already have, use a Node script like this:

```javascript
// import.mjs
const NEW_JOBS = [
  {
    id: Date.now(),
    company: "Studio X",
    role: "Technical Artist",
    status: "Planned",
    date: "2026-05-06",
    interviewDate: "",
    contact: "",
    contactTitle: "",
    nextAction: "Review posting",
    notes: "",
    location: "Remote",
    url: "https://example.com/jobs/789",
    priority: "medium",
    description: ""
  }
  // ... more jobs
];

const API = 'http://localhost:8001/api/jobs';
const current = await (await fetch(API)).json();

// Deduplicate by URL
const existingUrls = new Set(current.map(j => (j.url || '').trim()).filter(Boolean));
const toAdd = NEW_JOBS.filter(j => !existingUrls.has((j.url || '').trim()));

if (toAdd.length === 0) {
  console.log('Nothing new to add.');
  process.exit(0);
}

const merged = [...toAdd, ...current];
const r = await fetch(API, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(merged)
});

console.log(`Added ${toAdd.length} jobs. Total: ${merged.length}`);
console.log(await r.json());
```

Run it with `node import.mjs` while the server is running. **Match by URL, not by ID** — IDs can collide between different sources.

## Project structure

```
job_tracker/
├── server.js                  # Express server, port 8001
├── job-tracker.html           # React SPA (CDN, no build)
├── job-tracker-data.json      # Database
├── package.json
├── backups/                   # Auto-generated (gitignored)
└── node_modules/              # npm install (gitignored)
```

## Backups

Every time `PUT /api/jobs` is called, the server copies the current JSON to `backups/job-tracker-data.<ISO timestamp>.json` before overwriting. If something breaks, you can restore one of those files by copying it over `job-tracker-data.json`.

The `backups/` folder is in `.gitignore` and not versioned.

## License

Personal use.

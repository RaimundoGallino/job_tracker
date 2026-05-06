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

## Loading data into the tracker

There are two practical ways to populate the database.

### A) Manually

The simplest path:

- Click **+ Nuevo** in the app and fill in the form.
- Or, with the server stopped, open `job-tracker-data.json` and add an entry to the `jobs` array following the format from the [Database format](#database-format) section. Restart the server and refresh the browser.

For one or two jobs at a time, this is the way.

### B) Scraping job postings from LinkedIn with an AI browser agent

If you've already saved a long list of jobs on LinkedIn, doing them by hand is slow. The workflow used to bootstrap this tracker was:

1. **Save jobs** on LinkedIn (`linkedin.com/my-items/saved-jobs/`).
2. **Drive a browser-controlling AI agent** (e.g. *Claude in Chrome*, or any tool that can navigate pages and extract text) over each saved job. The flow that works on LinkedIn:
   - Navigate to the job URL.
   - Scroll the page down a few times to trigger lazy-load.
   - **Click the job title** — this is what fully expands the description on LinkedIn (without the click, the description often stays collapsed).
   - Wait a few seconds, then read the full page text.
3. **Parse the extracted text.** A few markers help:
   - Description starts at `Acerca del empleo` (Spanish) or `About the job` (English) and ends before `Establecer una alerta` / `Set alert`.
   - Recruiter name and title sit under `Conoce al equipo de contratación` / `Meet the hiring team`.
   - Title, company and location are in the header above the description.
4. **Build the JSON object** for each job (matching the format in this README) and append it to the `jobs` array — or PUT the merged array to `/api/jobs` if the server is running.

Things to watch:

- **Match by URL, not by ID, when deduplicating.** LinkedIn job IDs and locally generated IDs (e.g. `Date.now()`) collide easily across different scraping sessions. Two records with different IDs but the same URL are the same posting.
- **External-apply jobs** (LinkedIn shows "Solicitud gestionada fuera de LinkedIn" / "Apply on company site") often don't expose the full description on LinkedIn. Skip them, or scrape the company's careers page directly.
- **LinkedIn rate-limits aggressive scraping** and prohibits automated extraction in its ToS. Keep volume reasonable, throttle between requests, and treat this as a personal-use workflow.

The output of all this is a JSON file in the format above, which you can drop into `job-tracker-data.json` (replacing it) or merge with the existing data.

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

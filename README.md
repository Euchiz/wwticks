# Achievement Checklist

Static React + TypeScript app for tracking game achievements by list version. Built for GitHub Pages with local-only persistence.

## Features

- Version picker powered by `public/data/index.json`
- Checklist grouped by collapsible categories
- Progress summary overall + per category
- Search, status filter, category filter, and optional completed-first ordering
- Local persistence in `localStorage` using key format `achv_progress:{version}`
- JSON export/import for backup and transfer
- Reset progress per version
- About/Data info panel

## Data files

- `public/data/index.json`:

```json
{ "latest": "1.2.3", "versions": ["1.0.0", "1.2.3"] }
```

- `public/data/achievements_v{version}.json` stores achievement lists.

## Progress JSON schema

```json
{
  "schema_version": 1,
  "list_version": "1.2.3",
  "updated_at": "2026-02-21T22:00:00-05:00",
  "completed": {
    "achv_001": true
  },
  "notes": {
    "achv_001": "optional user note"
  }
}
```

## Local development

```bash
npm install
npm run dev
```

## Build / preview

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

This repository includes `.github/workflows/deploy-pages.yml`.

1. In GitHub repo settings, enable **Pages** and set source to **GitHub Actions**.
2. Push to `main` to trigger deployment.
3. `vite.config.ts` sets `base` automatically from `GITHUB_REPOSITORY` in CI.

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


## Sync data from official Kuro Wiki

Use the built-in sync module to fetch the full achievement list and generate the GitHub Pages JSON format:

```bash
npm run sync:achievements -- --version 1.3.0
```

Optional flags:

- `--source <url>`: override source page URL
- `--output <path>`: override output file (default `public/data/achievements_v{version}.json`)
- `--index <path>`: override version index file (default `public/data/index.json`)
- `--input <html file>`: parse from a saved HTML file (useful when remote access is blocked)

The script updates both the version data file and `public/data/index.json` so the new list is selectable in the app.

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

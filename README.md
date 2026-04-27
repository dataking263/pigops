# PigOps · Makina Family Piggery

Web app for managing a 7-pen pig farm in Zimbabwe — herd, pens, medication protocols, lineage with breeding-pair check, and a budget module with payroll.

## Stack
Express + Vite + React + Tailwind + shadcn/ui + Drizzle + better-sqlite3.

## Deploy to Render (one click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

The included `render.yaml` provisions:
- Web service running `npm start`
- 1 GB persistent disk mounted at `/var/data` (so `data.db` survives redeploys)
- `NODE_ENV=production`, `DATA_DIR=/var/data`

## Local dev

```bash
npm install
npm run dev   # http://localhost:5000
```

## Production build

```bash
npm run build
npm start
```

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `PORT` | `5000` | Render injects this automatically |
| `DATA_DIR` | `.` | Set to a persistent path (e.g. `/var/data`) in production |
| `NODE_ENV` | — | Set to `production` to serve built assets from `dist/` |

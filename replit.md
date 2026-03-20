# MovieBox Stream Player

## Overview

A movie stream scraper and web video player. Extracts signed MP4 stream URLs from themoviebox.org and plays them in the browser, bypassing the CDN's Referer check via a backend proxy.

**Stack**: pnpm workspace monorepo · TypeScript · React + Vite (frontend) · Express 5 (backend API) · Vercel (deployment target)

---

## Project Structure

```
├── api/
│   └── index.ts             # Vercel serverless function — exports Express app
├── artifacts/
│   ├── movie-player/        # React + Vite frontend (dark cinematic UI)
│   └── api-server/          # Express 5 API server
├── lib/
│   ├── api-client-react/    # React Query hooks + fetch client (manually maintained)
│   ├── api-spec/            # OpenAPI 3.1 spec (source of truth)
│   ├── api-zod/             # Zod validators generated from OpenAPI spec
│   └── db/                  # Drizzle ORM schema (unused by current routes)
├── scripts/                 # Dev utility scripts
├── vercel.json              # Vercel build + routing config
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## API Endpoints (`/api/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/healthz` | Health check |
| GET | `/api/streams?url=<moviebox_url>` | Extract signed MP4 stream URLs |
| GET | `/api/proxy?url=<cdn_url>` | Video proxy — injects Referer header so CDN allows the request |
| GET | `/api/search?q=<title>&perPage=10&playerBase=<url>` | Search movies/TV shows by title, returns `iframeUrl` |

### Critical Implementation Notes

- **CDN Referer requirement**: `bcdnxw.hakunaymatata.com` returns 403 without `Referer: https://themoviebox.org/`. ALL video playback goes through `/api/proxy`.
- **Signed URLs expire**: `Cache-Control: no-store` on `/api/streams`; React Query `staleTime: 0`.
- **Real subjectId extraction**: The `id=` URL param on MovieBox can be a stream resource ID — always extract the real `subjectId` from `__NUXT_DATA__` in the page HTML.
- **Search is POST**: MovieBox search API is `POST /wefeed-h5api-bff/subject/search` with JSON body (requires `lang: "en"` param to get results).
- **Player auto-load**: The frontend reads `?url=<movieboxUrl>` from the browser URL on load — embed as `<iframe src="https://yourapp.vercel.app/?url=<encodedMovieboxUrl>">`.

---

## Vercel Deployment

The app is configured to deploy to Vercel as a single project:

- **Frontend**: Vite builds static files → served from `artifacts/movie-player/dist/public`
- **API**: Express app runs as a single Vercel serverless function at `api/index.ts`
- **Routing**: `vercel.json` routes `/api/*` → serverless function, everything else → static SPA

### Deploy Steps

1. Push this repo to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Vercel auto-detects settings from `vercel.json` — no manual config needed
4. Deploy ✓

### Environment Variables (Vercel)

No environment variables are required for basic operation. The app uses only external HTTP APIs (themoviebox.org / hakunaymatata.com CDN).

---

## Local Development (Replit)

Two workflows must be running:
- `artifacts/api-server: API Server` — `pnpm --filter @workspace/api-server run dev`
- `artifacts/movie-player: web` — `pnpm --filter @workspace/movie-player run dev`

Vite dev server proxies `/api/*` to the Express server automatically.

---

## Packages

### `artifacts/movie-player` (`@workspace/movie-player`)
React + Vite SPA. Dark cinematic theme. Features:
- URL input → fetches streams → auto-selects best quality
- Video player with `<video>` tag, routed through proxy
- Stream list with quality selector, copy URL button, download button
- `?url=<movieboxUrl>` query param → auto-loads that movie on open

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API. Key files:
- `src/app.ts` — mounts CORS, JSON parsing, all routes at `/api`
- `src/lib/moviebox.ts` — scrapes `__NUXT_DATA__` from MovieBox page HTML, calls play API
- `src/routes/streams.ts` — `/api/streams` handler
- `src/routes/proxy.ts` — `/api/proxy` streaming handler (Range-aware)
- `src/routes/search.ts` — `/api/search` handler (calls MovieBox search POST API)

### `lib/api-client-react` (`@workspace/api-client-react`)
React Query hooks (`useGetStreams`, `useSearchTitles`) and the `customFetch` client. Manually maintained in `src/generated/`.

### `lib/api-zod` (`@workspace/api-zod`)
Zod schemas generated from `lib/api-spec/openapi.yaml`. Used by `api-server` for request validation.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec (`openapi.yaml`) — source of truth for all API types and routes.

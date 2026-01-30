# trainETA.com

Real-time NYC subway times powered by MTA GTFS-RT feeds. View live train positions across all lines and in single line station boards.

## Demo

- **Live site:** [traineta.com](https://traineta.com)
- **Video walkthrough:** Coming soon

## Features

- Live map showing all subway lines with real-time train positions
- Per-line station boards with arrival countdowns
- Real-time updates 5s polling with intelligent caching
- LIRR support with separate map view
- Service alerts and outage tracking
- Public API with rate limiting for developers
- Admin dashboard for API key management

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS + CSS Modules
- **Data:** MTA GTFS-RT feeds (real-time transit data)
- **Parsing:** gtfs-realtime-bindings (Protocol Buffers)
- **Testing:** Vitest (unit) + Playwright (E2E)

## Architecture

```
GTFS-RT Feeds → /api/transit/mta → cache + dedup → UI (map + line boards)
                                   ↘ /api/status → public health info
                                   ↘ /api/metrics → (auth) detailed stats
```

### Security

- Timing-safe token comparison
- Session-based admin auth
- Rate limiting with TTL cleanup
- Tiered API access

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MTA_GTFS_RT_URLS` | Yes | Comma-separated MTA GTFS-RT feed URLs |
| `LIRR_GTFS_RT_URLS` | No | LIRR GTFS-RT feed URL |
| `ADMIN_API_TOKEN` | No | Token for protected admin endpoints |
| `NEXT_PUBLIC_SITE_URL` | No | Site URL for SEO/sitemap |

See `.env.example` for full list with default values.

## API Endpoints

### Public (rate limited: 60 req/min)

| Endpoint | Description |
|----------|-------------|
| `GET /api/transit/mta` | Live subway train positions |
| `GET /api/transit/lirr` | Live LIRR train positions |
| `GET /api/alerts` | Service alerts from MTA |
| `GET /api/outages` | Elevator/escalator outages |
| `GET /api/status` | System health and feed status |

### Protected (requires API key: 600 req/min)

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Detailed health check |
| `GET /api/metrics` | Detailed feed metrics |

**Authentication:** Pass API key via `x-client-key` header or `Authorization: Bearer <key>`.

## Routes

| Path | Description |
|------|-------------|
| `/` | Live subway map (all lines) |
| `/subway-map/[line]` | Single line station board |
| `/lirr-map` | Live LIRR map |
| `/outages` | Elevator/escalator status |
| `/status` | Public system status |
| `/about` | Project info |
| `/docs` | API documentation |
| `/admin` | Admin dashboard (auth required) |

## Testing

### Unit Tests (Vitest)

```bash
# Run tests in watch mode
npm run test

# Run tests once (CI)
npm run test:run
```

**Test Coverage:**

| Suite | Tests | Coverage |
|-------|-------|----------|
| `gtfs-utils.test.ts` | 18 | GTFS-RT parsing, stop normalization |
| `rate-limiting.test.ts` | 15 | Rate limits, IP extraction, key validation |
| `api-keys.test.ts` | 5 | Key generation, format |
| `api-status.test.ts` | 5 | Status API responses |
| `metrics.test.ts` | 5 | Metrics store/retrieve |
| `line-colors.test.ts` | 2 | Line color lookups |
| `line-stops.test.ts` | 2 | Line stops validation |

### E2E Tests (Playwright)

```bash
# Install Playwright (one-time)
npm install -D @playwright/test
npx playwright install

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui
```

E2E tests cover:
- Page navigation
- Map loading
- API responses
- Rate limiting behavior
- Accessibility checks

## Development

```bash
# Run tests
npm run test

# Run linter
npm run lint

# Build for production
npm run build
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
docker build -t traineta .
docker run -p 3000:3000 --env-file .env.local traineta
```

### Manual

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── transit/       # Train position endpoints
│   │   ├── admin/         # Admin API (key management)
│   │   └── status/        # Health/status endpoints
│   ├── subway-map/        # Map UI
│   └── admin/             # Admin dashboard
├── lib/
│   ├── transit/           # Core transit logic
│   │   ├── gtfs-utils.ts  # Shared GTFS-RT utilities
│   │   ├── access.ts      # Rate limiting & auth
│   │   ├── api-keys.ts    # Key management
│   │   └── metrics.ts     # Metrics tracking
│   └── data/              # Static stop/route data
├── components/            # Shared UI components
└── __tests__/             # Unit tests
e2e/                       # Playwright E2E tests
```

## Data Files

Static data for mapping stop IDs to names/coordinates:

- `src/lib/data/mta-stops.json` - MTA subway stops
- `src/lib/data/mta-line-stops.json` - Stops per subway line
- `src/lib/data/lirr-stops.json` - LIRR stations
- `src/lib/data/lirr-routes.json` - LIRR route metadata

### Updating LIRR Data

```bash
python3 scripts/build-lirr-data.py --zip /path/to/google_transit.zip
```

## Notes

- Metrics are in-memory and reset on cold start (serverless-compatible)
- Rate limiting uses in-memory buckets with automatic cleanup (5min interval)
- API keys are stored in `data/api-keys.json`
- Admin tokens use session storage (clears on tab close)

## License

**Proprietary** - See [LICENSE](LICENSE) for terms.

This code is shared for portfolio/evaluation purposes only. Commercial use, redistribution, or derivative works require written permission.

## Author

**David Aharoni** - [davidaharoni.com](https://davidaharoni.com)

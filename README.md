# SaaS Booking Backend

NestJS API for the provider dashboard, tenant salon workspace, and public customer booking app.

## Setup

```bash
cp .env.example .env
docker compose up -d
npm run prisma:generate
npm run db:migrate -- --name init
npm run start:dev
```

The REST API is served at `http://localhost:4010/api`, Swagger UI at
`http://localhost:4010/docs`, and health status at `http://localhost:4010/api/health`.

## Structure

```text
src/
├── booking/
│   ├── booking.module.ts
│   └── modules/public-booking/
├── platform/
│   ├── platform.module.ts
│   └── modules/administration/
├── tenants/
│   ├── tenants.module.ts
│   └── modules/
│       ├── appointments/
│       ├── customers/
│       ├── rewards/
│       ├── services/
│       ├── staff/
│       └── workspace/
├── database/prisma/
└── health/
```

Each top-level bounded context owns its feature modules. `app.module.ts` imports
only the context aggregators; it does not reach into their internal modules.

## Main routes

- `GET/PUT /api/tenants/:slug/workspace` — tenant dashboard data
- `GET /api/public/salons/:slug` — public salon page
- `GET /api/public/salons/:slug/availability` — bookable time slots
- `POST /api/public/salons/:slug/bookings` — customer booking
- `/api/platform/*` — tenants, plans, invoices, tickets, settings, and metrics

Authentication and authorization are intentionally left as the next integration boundary. Before production, protect tenant routes with JWT/session authentication and derive tenant identity from the authenticated principal rather than trusting a URL slug.

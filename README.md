# EduVerse TeleHealth

Visit documentation for **Von & Bick Healthcare Associates, LLC** d/b/a EduVerse TeleHealth. Remote clinical staff in Georgia document medical (SOAP), behavioral-health progress, and DSP/CLS shift notes here.

Zoom Healthcare is **video + BAA only**. It is not the chart. Documentation, signature/lock, PDF export, and the audit trail live in this application.

This is a production Next.js app with Auth.js, Postgres, and Prisma. It replaces the previous localStorage demo. There is **no Vercel dependency**.

## Practice

- 2133 Lawrenceville-Suwanee Rd, Suwanee, GA 30024
- 470-256-3897
- info.officeadmin@vbhealthcare.org

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Auth.js (NextAuth v5) — email/password + optional email magic link
- Postgres via Prisma
- Roles: `ADMIN`, `CLINICIAN` (RN / LPN / MA / BH), `DSP` (DSP/CLS), `AUDITOR` (read-only)

## Local development

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Start Postgres (Docker Compose database only, or any Postgres 16):

   ```bash
   docker compose up db -d
   ```

3. Install, migrate, seed, run:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   npm run dev
   ```

   App: [http://localhost:8080](http://localhost:8080)

   Full stack (app + database) on port 3000:

   ```bash
   docker compose up --build
   ```

## Seed staff (change these passwords)

All seed passwords are `ChangeMe!2026`. Rotate before any production use.

| Email | Role | Purpose |
| --- | --- | --- |
| `admin@vbhealthcare.local` | Administrator | Full access, audit |
| `rn.demo@vbhealthcare.local` | Clinician · RN | SOAP / medical visits |
| `bh.demo@vbhealthcare.local` | Clinician · BH | BH progress notes |
| `dsp.demo@vbhealthcare.local` | DSP / CLS | Shift notes |
| `auditor.demo@vbhealthcare.local` | Read-only auditor | Chart + audit, no writes |

Seed individuals are **SYNTHETIC**: Jane Demo, John Demo, Alex Demo. The database includes one locked SOAP note and two drafts so QA can lock, export PDF, and inspect the audit trail immediately.

## Staff flow

See [STAFF-RUNBOOK.md](./STAFF-RUNBOOK.md). Short version: sign in → dashboard → create or open a visit → write the note → **Sign and lock** → confirm the event on **Audit** (admin/auditor).

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness + database check (Miss Sparkles) |
| GET | `/api/version` | App version / commit |
| GET/POST | `/api/auth/*` | Auth.js |
| POST | `/api/auth/magic-link` | Request email (or local QA) sign-in link |
| GET | `/api/caseload` | Assigned individuals |
| GET/POST | `/api/visits` | List / create visits |
| GET/PATCH | `/api/visits/:id` | Visit CRUD |
| GET/POST | `/api/notes` | List / create notes |
| GET/PATCH | `/api/notes/:id` | Read / update draft |
| POST | `/api/notes/:id/lock` | Sign and lock |
| GET | `/api/notes/:id/pdf` | PDF export |
| GET | `/api/search?q=` | Caseload search |
| GET | `/api/audit` | Audit trail (admin/auditor) |
| POST | `/api/attachments` | Attachment metadata + file store |

## Security baseline (HIPAA-minded — not a legal claim)

- Sessions are JWT cookies: `httpOnly`, `SameSite=lax`, `Secure` when `AUTH_URL` is HTTPS, 8-hour max age.
- Application logs accept operational fields only (event, ids, counts). Note text, names, emails, and tokens are rejected.
- Create / update / lock / view of notes and visits writes an audit row (ids and action names only).
- Secrets come from environment variables. See `.env.example`.
- Banner in the UI: production PHI only after BAAs and infrastructure controls are approved by the practice.

## Monitoring (Miss Sparkles)

- Health: `GET /api/health` — `{ ok, version, db, time }`
- Version: `GET /api/version` — `{ name, version, commit }`
- Fly HTTP check and AWS App Runner health path should both use `/api/health`.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Fly.io (preferred) and AWS App Runner.

## Scripts

- `npm run dev` — Next.js on `0.0.0.0:8080`
- `npm run build` — `prisma generate` + Next.js production build
- `npm test` — unit tests for logging, audit sanitization, roles, validators
- `npm run typecheck`

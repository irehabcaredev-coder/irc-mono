# Migration + Production Infra Plan — ecareplus

## Context

Two separate repos exist today: `ecareplus-fe` (Next.js 14 App Router — landing page, patient flows under `app/patients`, doctor portal under `app/dashboard`, doctor auth in `app/auth`) and `ecareplus-be` (Express + TypeScript + Prisma/Postgres, split into `*-service` folders: doctor, patient, appointment, payment, lead, google-auth). Development is expected to be mostly done by next week; the goal now is to consolidate into one repo and stand up permanent production infrastructure so it can run unattended for a long stretch afterward.

Decisions locked in during discussion:
- **Monorepo**: `apps/web` + `apps/api` via pnpm workspaces, one repo, solo-dev friendly.
- **Frontend host**: Cloudflare Pages (free, edge-served, good India latency already).
- **Backend + video host**: a single **GCP Compute Engine VM in `asia-south1` (Mumbai)** — chosen over Contabo/Hetzner/DigitalOcean because the team is committing to GCP and will fund it initially via the $300/90-day trial credit (usable in any region, unlike the Always-Free tier which is US-only), then move to normal paid GCP billing on the same project/VM once the credit runs out. Audience is mostly India-based, so Mumbai region matters for latency.
- **Database**: Supabase, Mumbai region (co-located with the VM) — managed, so no self-hosted backup/HA burden.
- **Video calling**: swap Agora for **self-hosted LiveKit** (open source WebRTC SFU) running as a container on the same VM — eliminates per-minute billing, fits the "spend budget on AI, not infra" priority. This requires real code changes: replacing `AgoraVideoCall` client usage and the backend's Agora token issuance with LiveKit's equivalents.
- **AI**: OpenRouter as the single provider integration point, with a hardcoded task→model map (cheap/fast model for lead qualification & extraction; stronger model for the doctor AI chat), plus prompt caching on the chat system prompt.
- **Domains**: `irehabcare.com` (+ `www`) → landing/patient app; `doctors.irehabcare.com` → doctor portal, both served from the same Next.js deployment via host-based middleware routing; `api.irehabcare.com` → backend VM; a media/TURN subdomain for LiveKit.

## Phase 1 — Monorepo migration

1. Create new repo `ecareplus` (or repurpose `ecareplus-fe` as the root — confirm naming when executing).
2. `git subtree add` both existing repos in as `apps/web` and `apps/api`, preserving commit history rather than a single squashed import.
3. Add root `pnpm-workspace.yaml` (`packages: ["apps/*", "packages/*"]`) and root `package.json` with workspace scripts (`dev`, `build` delegating to each app via `pnpm --filter`).
4. Keep each app's existing `package.json`, `tsconfig.json`, `.env`/`.env.local` as-is — no internal code changes in this phase.
5. Add `.github/workflows/` with path-filtered CI: lint/build `apps/web` only on `apps/web/**` changes, same for `apps/api`.
6. Archive (don't delete) the two old GitHub repos once the new one builds and runs both apps locally.

No `Dockerfile`/CI/env files currently exist in either repo, confirming this is a clean starting point for phases 2–4.

## Phase 2 — GCP production infra

1. Activate the GCP $300/90-day trial (start this close to when the VM will actually go live, to maximize usable runway into production).
2. Create a GCP project, enable Compute Engine + reserve a static external IP, region `asia-south1` (Mumbai).
3. Provision a Compute Engine VM — start at `e2-small` (2 vCPU burstable, 2GB RAM); resize later without rebuild if the API + LiveKit + Caddy footprint needs more headroom.
4. Firewall rules: 80/443 (HTTP/HTTPS via Caddy), LiveKit's signaling port (7881/TCP) and RTC media range (UDP 50000–60000, or TCP-fallback port per LiveKit's default config).
5. DNS: point `api.irehabcare.com` and the LiveKit media subdomain at the VM's static IP; `irehabcare.com`/`doctors.irehabcare.com` stay on Cloudflare Pages.
6. Document the "credit runs out" transition point up front: convert the same GCP billing account to paid (no VM migration needed, just accept billing) once the $300 is exhausted or 90 days pass — flag this as a calendar reminder, not a re-architecture.

## Phase 3 — Dockerize & deploy backend + LiveKit

1. Add `apps/api/Dockerfile` (multi-stage: `pnpm install` → `tsc build` → slim runtime image running `dist/index.js`).
2. Add root-level `docker-compose.yml` (or under `infra/`) with three services: `api` (built from `apps/api/Dockerfile`), `livekit` (official `livekit/livekit-server` image with a config file for keys/ports), and `caddy` (reverse proxy + automatic TLS for `api.irehabcare.com` and the LiveKit domain).
3. Point `DATABASE_URL` at the Supabase Mumbai connection string; keep secrets in a `.env` on the VM (not committed).
4. Deploy mechanism: GitHub Actions builds the API image on push to `prod` (path-filtered to `apps/api/**` or shared packages), pushes to Google Artifact Registry, then SSHes into the VM to `docker compose pull && docker compose up -d`. Simple, no Kubernetes.

## Phase 4 — Frontend deploy + subdomain routing

1. Deploy `apps/web` to Cloudflare Pages via the `@cloudflare/next-on-pages` adapter (or plain Next-on-Cloudflare if the adapter has issues with this Next 14 version — verify during execution).
2. Extend `middleware.js` (currently only a slash-cleanup pass) to branch on `request.headers.get('host')`: if host is `doctors.irehabcare.com`, rewrite `/` and bare paths into the existing `/dashboard`, `/onboarding`, and doctor-mode `/auth` routes so doctors get a clean URL space without `/dashboard` showing in the address bar; otherwise serve the existing landing/patient routes unchanged.
3. Add both custom domains (`irehabcare.com`, `doctors.irehabcare.com`) to the same Cloudflare Pages project.

## Phase 5 — Database migration to Supabase

1. Create a Supabase project in the Mumbai region.
2. Point Prisma's `DATABASE_URL` at Supabase; run existing migrations (`prisma/migrations/*`) against it — no schema changes needed, this is a host swap only.
3. One-time data migration if there's existing data to carry over (`pg_dump`/`pg_restore` from wherever the DB currently lives, if anywhere real yet).

## Phase 6 — AI service module (OpenRouter)

1. New `apps/api/src/ai-service/` following the existing `*-service` folder convention (`ai.routes.ts`, `ai.service.ts`, `ai.schema.ts` with Zod, matching `doctor-service`'s pattern).
2. `MODEL_MAP` config: e.g. `{ leadQualification: '<cheap-model-id>', doctorChat: '<stronger-model-id>' }`, calls routed through a single OpenRouter client wrapper.
3. Wire `lead-service` (`src/lead-service/lead.service.ts`) to optionally call the cheap-tier model for qualification/scoring on new leads.
4. Backend endpoint for the existing `DoctorChatInterface` component (`app/dashboard/ai-chat`, currently UI-only) to call the stronger-tier model, with prompt caching applied to the repeated system prompt/doctor-context prefix.

## Phase 7 — Agora → LiveKit swap

1. Backend: replace whatever currently issues Agora app credentials (check `meeting`-related routes) with a LiveKit token-generation endpoint (`livekit-server-sdk`, issuing JWTs scoped to a room per appointment/meeting ID).
2. Frontend: replace `components/video/AgoraVideoCall` usage in `app/meeting/[meetingId]/page.jsx` with LiveKit's React client SDK (`livekit-client` / `@livekit/components-react`), connecting to `wss://<livekit-domain>` with the token from the new backend endpoint.
3. Remove `agora-rtc-react`/`agora-rtc-sdk-ng` dependencies and `NEXT_PUBLIC_AGORA_APP_ID` env var once the swap is verified working end-to-end.
4. This is real feature-level rework (different SDK, different connection/room model) — budget it as its own testable unit, not a drop-in config change.

## Verification

- Phase 1: `pnpm install` at root, `pnpm --filter web dev` and `pnpm --filter api dev` both boot clean; existing tests/build (`pnpm build` per app) pass unchanged.
- Phase 2–3: SSH to the VM, `docker compose ps` shows `api`, `livekit`, `caddy` healthy; `curl https://api.irehabcare.com/health` (or nearest existing health route) returns 200 over HTTPS.
- Phase 4: visiting `doctors.irehabcare.com` in a browser lands on the doctor dashboard experience without `/dashboard` in the URL; `irehabcare.com` still serves the landing/patient app unchanged.
- Phase 5: existing Prisma queries against Supabase return expected data; run `npx prisma migrate status` against the new `DATABASE_URL` to confirm all migrations are applied.
- Phase 6: hit the new AI endpoints directly (curl/Postman) and from the `DoctorChatInterface` UI, confirm responses and that OpenRouter's dashboard shows the expected model being billed per task type.
- Phase 7: complete a real two-party video call end-to-end through `app/meeting/[meetingId]` on the new LiveKit stack before removing any Agora code/dependencies.

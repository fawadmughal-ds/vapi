# VoxaAI — Architecture & System Overview

> A white-label, multi-tenant SaaS platform for building and running AI voice agents.
> Internally powered by **Vapi** (voice infrastructure), **OpenAI** (LLM), **Deepgram**
> (speech-to-text), **Twilio / Vonage / Telnyx** (telephony), and **Stripe** (billing).
> Vapi is treated as an internal implementation detail and is **never** exposed to end
> customers — all customer-facing terminology is neutral and white-labeled.

---

## 1. What this software does

VoxaAI lets a business (the **platform owner** / super admin) resell AI voice agents to
their own customers (**tenants**). Each tenant can:

- Create AI voice **agents** (prompt, voice, language, model, first message).
- Attach a **knowledge base** (uploaded documents) to ground agent answers.
- Provision **phone numbers** (free provider numbers, or imported Twilio/Vonage/Telnyx/SIP).
- Make and receive **calls**; every call is logged with transcript, recording, cost, and outcome.
- Define **tools/functions** the agent can call mid-conversation (e.g. place an order).
- View **analytics** (call volume, minutes, success rate, cost) and manage **billing**.

The **platform owner** operates a control plane (the Admin Console) to manage tenants,
pricing, credits, provider integrations, phone-number provisioning, and platform-wide
visibility (all calls, all agents, audit logs, analytics).

---

## 2. High-level topology

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Browser (SPA)                                 │
│  Next.js 15 App Router  ·  React  ·  Tailwind  ·  Recharts  ·  Sonner      │
│  frontend/src/app/(auth)      → login / register / verify / reset          │
│  frontend/src/app/(dashboard) → tenant app + admin console                 │
│  frontend/src/app/page.tsx    → public marketing / pricing landing         │
└───────────────┬──────────────────────────────────────────────────────────┘
                │  HTTPS  (JWT Bearer access token, auto-refresh)
                │  lib/api.ts  →  ${NEXT_PUBLIC_API_URL}/api/v1/*
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          FastAPI backend (app/)                            │
│  main.py → CORS · rate limit · exception handlers · /api/v1 router         │
│  api/routes/*  → HTTP endpoints        core/  → config, db, security, deps │
│  services/*    → business logic        models/ → SQLAlchemy ORM            │
│  schemas/*     → Pydantic I/O                                              │
└───┬───────────────┬───────────────┬───────────────┬──────────────────────┘
    │               │               │               │
    ▼               ▼               ▼               ▼
┌────────┐   ┌────────────┐   ┌───────────┐   ┌──────────────┐
│Postgres│   │ Vapi API   │   │ Stripe API│   │ SMTP / Local │
│  (DB)  │   │ (voice)    │   │ (billing) │   │ storage      │
└────────┘   └─────┬──────┘   └─────┬─────┘   └──────────────┘
                   │ webhooks       │ webhooks
                   └────────────────┴──────────►  /api/v1/webhooks/{vapi,stripe}
```

Everything runs via **docker-compose** (`docker-compose.yml`): `db` (Postgres 16),
`backend` (uvicorn, hot reload, runs `app.seed` on boot), `frontend` (Next dev server).

---

## 3. Backend structure & responsibilities

### 3.1 Entry & cross-cutting (`app/main.py`, `app/core/`)

| File | Responsibility |
|------|----------------|
| `main.py` | Creates the FastAPI app, mounts CORS + SlowAPI rate-limit middleware, registers global exception handlers (rate limit → 429, `VapiError` → 502 with CORS, validation → 422 with logged field errors), and on startup runs `create_all` + `ensure_runtime_schema()`. |
| `core/config.py` | `Settings` (pydantic-settings) loaded from `.env`. Holds all secrets/URLs: DB, JWT, Vapi, OpenAI, Deepgram, Twilio, Stripe, SMTP, storage, super-admin bootstrap. |
| `core/database.py` | SQLAlchemy engine, `SessionLocal`, `Base`, `get_db()` dependency, and `ensure_runtime_schema()` (idempotent `ALTER TABLE` for columns added after initial release). |
| `core/security.py` | Password hashing (bcrypt/passlib) and JWT create/decode (access + refresh, with optional `impersonated_by`). |
| `core/deps.py` | Auth dependencies & RBAC: `get_current_user`, `get_verified_user`, `require_super_admin`, and `tenant_id(user)` (returns `parent_id or id` — the tenant scope). |
| `core/rate_limit.py` | SlowAPI limiter (per-IP default limits). |

### 3.2 API routes (`app/api/routes/`) — mounted under `/api/v1`

| Router | Prefix | Purpose |
|--------|--------|---------|
| `auth.py` | `/auth` | Register, login, refresh, email verification, password reset. |
| `agents.py` | `/agents` | CRUD agents; publish (→ create/update Vapi assistant); voice list + TTS preview. |
| `tools.py` | `/agents/.../tools` | Per-agent function/tool definitions for function calling. |
| `knowledge_base.py` | `/knowledge-base` | Upload/list/delete documents (text extraction + optional Vapi file upload). |
| `phone_numbers.py` | `/phone-numbers` | Provision/import numbers, assign to agents, release. |
| `calls.py` | `/calls` | List calls, start outbound calls (quota-checked). |
| `analytics.py` | `/analytics` | Tenant-scoped analytics (uses shared `services/analytics.py`). |
| `billing.py` | `/billing` | Plans (public published list), Stripe checkout + billing portal, subscription state. |
| `integrations.py` | `/integrations` | Tenant read-only view of **integrations available to them**. |
| `orders.py` | `/orders` | Orders captured by agents via function calling. |
| `settings.py` | `/settings` | Profile / account settings. |
| `admin.py` | `/admin` | **Super-admin control plane** (see §6). |
| `webhooks.py` | `/webhooks` | Inbound Vapi + Stripe webhooks (secret-verified, no JWT). |

### 3.3 Services (`app/services/`) — the business logic

| Service | What it does | Talks to |
|---------|--------------|----------|
| `voice/` | **Voice provider abstraction.** `base.py` defines the vendor-neutral `VoiceProvider` interface; `vapi_provider.py` is the Vapi implementation; `__init__.py` exposes the `voice_provider` singleton selected by `VOICE_PROVIDER`. **All business logic depends on this**, so Vapi can be swapped for Retell/Bland/etc. without touching routes. | `vapi.py` |
| `vapi.py` | Low-level HTTP client for Vapi (the only module that calls Vapi directly). Assistants, phone numbers, outbound calls, provider credentials, file upload. Degrades gracefully to mock IDs when no `VAPI_API_KEY`. Raises `VapiError` (subclass of `VoiceProviderError`). | Vapi API |
| `phone_numbers.py` | Shared provisioning helper (`build_provider_body`, `provision_phone_number`) used by both tenant and admin routes. | `vapi.py` |
| `plans.py` | Plan catalog (`PLAN_CATALOG`) merged with DB `PlanOverride`s → effective/published plans; Stripe price↔plan mapping. | DB, config |
| `billing.py` | Subscription lifecycle, `activate_plan`, `record_usage`, quota checks (credits + platform pool). | DB, `credits.py`, Stripe |
| `credits.py` | Platform credit pool + per-tenant credit wallets (allowance, top-ups, minutes↔credits, enforcement). | DB |
| `stripe_service.py` | Stripe checkout sessions, billing portal, webhook signature verification. | Stripe API |
| `analytics.py` | Reusable aggregation (`aggregate_analytics(db, scope, days)`); `scope=None` = platform-wide. | DB |
| `integrations.py` | `PROVIDER_CATALOG` (voice/model/transcriber/tools/storage providers) + per-tenant entitlement policy. | DB |
| `functions.py` | Executes agent tool/function calls during a live call (e.g. create order). | DB |
| `documents.py` | Text extraction from uploaded files for the knowledge base. | storage |
| `storage.py` | File storage abstraction (local filesystem by default). | disk |
| `tts.py` | Voice preview audio via OpenAI TTS (cached). | OpenAI |
| `voices.py` | Catalog of selectable voices. | — |
| `email.py` | Transactional email (verification, reset) via SMTP. | SMTP |
| `audit.py` | `record_audit(...)` writes to the audit log. | DB |

### 3.4 Data models (`app/models/`)

`User` is the **tenant root**. Team members reference an owner via `parent_id`; tenant
scoping everywhere uses `tenant_id(user) = parent_id or id`.

```
User (tenant root)
 ├─ 1─* Agent ──────── 1─* AgentTool          (function-calling tools)
 │        └─ vapi_assistant_id → Vapi assistant
 ├─ 1─* Call ───────── belongs to Agent       (transcript, recording, cost, status)
 │        └─ vapi_call_id → Vapi call
 ├─ 1─* KnowledgeBaseDocument
 ├─ 1─* PhoneNumber ── optionally assigned to an Agent
 │        └─ vapi_phone_number_id → Vapi number
 ├─ 1─* Order                                  (captured during calls)
 └─ 1─1 Subscription                           (plan, credit wallet, Stripe ids)

Platform-level (not tenant-scoped):
  PlatformSettings                 credit pool + policy (singleton)
  PlanOverride                     admin edits to plan pricing/features (PK = tier)
  Integration                      connected provider (platform), holds vapi_credential_id
  TenantIntegrationEntitlement     which tenant may use which integration
  AuditLog                         who did what, when (admin + tenant actions)
  EmailToken                       email verification / password reset tokens
```

Key enums (`models/enums.py`): `UserRole` (super_admin/customer), `AccountStatus`,
`AgentStatus` (draft/published/disabled), `CallStatus`, `CallDirection`,
`DocumentStatus`, `PlanTier` (starter/growth/pro), `SubscriptionStatus`,
`OrderStatus`, `PhoneNumberStatus`.

---

## 4. Frontend structure (`frontend/src/`)

| Area | Files | Purpose |
|------|-------|---------|
| Public | `app/page.tsx`, `components/marketing/public-pricing.tsx` | Landing + pricing (reads published plans from `/billing/plans`). |
| Auth | `app/(auth)/*` | Login, register, verify-email, forgot/reset password. |
| Tenant app | `app/(dashboard)/{dashboard,agents,knowledge-base,phone-numbers,calls,orders,analytics,billing,integrations,settings}` | The customer-facing product. |
| Admin console | `app/(dashboard)/admin/{page,integrations,pricing}` | Super-admin control plane (see §6). |
| Shared libs | `lib/api.ts`, `lib/auth.tsx`, `lib/types.ts`, `lib/use-api.ts`, `lib/utils.ts`, `lib/voice-preview.ts` | API client (JWT + refresh + blob fetch), auth context (+ impersonation), TS types, data hook, formatters, voice preview. |
| Components | `components/dashboard/*`, `components/shared/*`, `components/ui/*` | Sidebar, topnav, tables, stat cards, charts, and shadcn-style primitives. |

**API client (`lib/api.ts`)** attaches the JWT access token, transparently refreshes on
401, parses FastAPI error detail (including 422 field errors), and exposes
`get/post/put/patch/delete/getBlob`. **Auth context (`lib/auth.tsx`)** stores tokens,
exposes the current user, and supports **impersonation** ("enter account").

---

## 5. Core end-to-end flows (which thing connects to which)

### 5.1 Authentication
`register/login` → `auth.py` issues JWT **access** (short-lived) + **refresh** tokens →
frontend stores them → every request sends `Authorization: Bearer <access>` →
`deps.get_current_user` decodes & loads the `User` → `require_super_admin` / `tenant_id`
enforce RBAC and tenant scoping.

### 5.2 Creating & publishing an agent
Tenant fills the wizard → `POST /agents` saves an `Agent` (status `draft`) →
on publish, `agents.py` calls `vapi_client.create_assistant(agent)` which maps the agent
to a Vapi assistant payload (OpenAI model + Deepgram transcriber + chosen voice) and
stores `vapi_assistant_id`.

### 5.3 Provisioning a phone number
Tenant picks a method (free Vapi number by area code, free SIP, or import
Twilio/Vonage/Telnyx/BYO-SIP) → `phone_numbers.py` builds the provider body via
`services/phone_numbers.build_provider_body` → `vapi_client.create_phone_number(body)` →
stores a `PhoneNumber` with `vapi_phone_number_id`. Numbers can be **assigned to an agent**.
The **admin** can also provision a number and assign it to any tenant (`POST /admin/phone-numbers`),
after which the tenant simply sees it (numbers are listed by `user_id`).

### 5.4 A live call (the webhook loop)
1. Inbound call hits the Vapi number, or tenant starts an outbound call via
   `POST /calls` → `vapi_client.create_outbound_call(...)` (quota-checked first).
2. Vapi drives the conversation and POSTs events to **`/api/v1/webhooks/vapi`**
   (secret-verified with `VAPI_WEBHOOK_SECRET`):
   - `status-update` / `transcript` → create/update the `Call` row.
   - `function-call` / `tool-calls` → `services/functions.execute_function` runs the
     agent's tool (e.g. create an `Order`) and returns a result to the caller.
   - `end-of-call-report` → finalize the `Call` (recording, summary, cost, duration),
     then `billing.record_usage` deducts minutes→credits from the tenant's wallet.

### 5.5 Billing
Tenant picks a plan → `billing.py` creates a **Stripe checkout session** → on payment,
Stripe POSTs **`/api/v1/webhooks/stripe`** → signature verified → `activate_plan`
sets the tenant's `Subscription` (plan, credit allowance, Stripe ids).
Usage is metered per call (§5.4). Plans shown publicly come from `plans.py`
(catalog + admin `PlanOverride`s). Note: admin price edits affect **display/MRR**;
actual charge amounts still come from Stripe price IDs (`STRIPE_PRICE_*`).

### 5.6 Credits & quota
`PlatformSettings` holds the platform credit **pool** ("we bought N minutes/credits").
Each `Subscription` has a credit wallet (monthly allowance + non-expiring top-ups).
`billing.has_available_quota` checks both the tenant wallet **and** the platform pool
before a call is allowed; `credits.consume_credits` deducts on usage.

---

## 6. The Admin Console (platform control plane)

Route `app/(dashboard)/admin/page.tsx` (tabs) + `/admin/integrations` + `/admin/pricing`,
all guarded by `require_super_admin`. Backed by `api/routes/admin.py`.

| Capability | Endpoint(s) | UI |
|------------|-------------|-----|
| Platform stats (customers, agents, calls, MRR, provider cost) | `GET /admin/stats` | Stat cards |
| Customers (search, suspend/activate, set plan, impersonate) | `GET /admin/customers`, `.../suspend`, `.../activate`, `.../plan/{plan}`, `.../impersonate` | Customers tab |
| Per-tenant credits (allowance + top-ups) | `POST /admin/customers/{id}/credits` | Credits dialog |
| Per-tenant integration entitlements | `GET/PUT /admin/customers/{id}/integrations` | Integrations action |
| All agents (cross-tenant) | `GET /admin/agents` | Agents tab |
| All calls (cross-tenant, with detail: transcript/recording/cost) | `GET /admin/calls` | Calls tab |
| Global phone-number inventory + provision/assign/reassign | `GET/POST/PATCH/DELETE /admin/phone-numbers` | Phone Numbers tab |
| Platform-wide analytics | `GET /admin/analytics` | Analytics tab |
| System + per-tenant audit logs | `GET /admin/audit-logs`, `GET /admin/customers/{id}/activity` | System Logs tab / Activity dialog |
| Provider integrations (connect/disconnect keys → Vapi credentials) | `GET/PUT/DELETE /admin/integrations` | Integrations page |
| Platform credit pool (purchase, settings) | `GET /admin/platform/credits`, `POST .../purchase`, `PATCH .../settings` | Platform Credits panel |
| Editable pricing plans | `GET /admin/plans`, `PUT /admin/plans/{tier}` | Pricing page |

**Integration entitlement policy:** if a tenant has no entitlement rows, they get all
platform-connected providers; once the admin saves any entitlement, only the enabled
providers apply. Only providers connected at the platform level are assignable.

---

## 7. External services & how they connect

| Service | Used for | Where | Config |
|---------|----------|-------|--------|
| **Vapi** | Voice infra: assistants, numbers, calls, provider credentials, files | `services/vapi.py`; inbound `/webhooks/vapi` | `VAPI_API_KEY`, `VAPI_BASE_URL`, `VAPI_WEBHOOK_SECRET` |
| **OpenAI** | Agent LLM + TTS voice preview | via Vapi assistant model; `services/tts.py` | `OPENAI_API_KEY` |
| **Deepgram** | Speech-to-text transcriber | via Vapi assistant transcriber | `DEEPGRAM_API_KEY` |
| **Twilio / Vonage / Telnyx / SIP** | Telephony numbers (import/BYO) | `services/phone_numbers.py` → Vapi | `TWILIO_ACCOUNT_SID/AUTH_TOKEN`, else per-tenant credential IDs |
| **Stripe** | Subscriptions & payments | `services/stripe_service.py`; `/webhooks/stripe` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` |
| **SMTP** | Transactional email | `services/email.py` | `SMTP_*`, `EMAIL_FROM*` |
| **Postgres** | Primary datastore | `core/database.py` | `DATABASE_URL` |
| **Local storage** | Uploaded documents | `services/storage.py` | `STORAGE_BACKEND`, `STORAGE_LOCAL_DIR` |

---

## 8. Security & multi-tenancy notes

- **RBAC:** two roles — `super_admin` (platform owner) and `customer` (tenant).
  Admin endpoints require `require_super_admin`.
- **Tenant isolation:** every tenant query is scoped by `tenant_id(user)`
  (`parent_id or id`), so team members share one tenant scope.
- **Impersonation:** super admins can "enter" a tenant account; the access token carries
  `impersonated_by`, and the action is audit-logged.
- **Webhooks** are unauthenticated by JWT but verified by shared secret (Vapi) or
  signature (Stripe).
- **Rate limiting** is applied per-IP globally via SlowAPI middleware.
- **White-labeling:** Vapi is isolated behind the `services/voice/` abstraction
  (`services/vapi.py` is the only module that calls Vapi directly); nothing Vapi-branded
  reaches API responses or the UI.
- **Swappable provider:** business logic calls `voice_provider` (the `VoiceProvider`
  interface). To add a vendor, implement `VoiceProvider`, register it in
  `services/voice/__init__.py`, and set `VOICE_PROVIDER` — no route/service changes needed.
- **Graceful degradation:** without a `VAPI_API_KEY` the Vapi client returns mock IDs so
  the whole app remains usable in local development.

---

## 9. Running locally

```bash
cp .env.example .env      # fill in secrets (or leave blank for mock/degraded mode)
docker compose up --build # db + backend (seeds super admin) + frontend
```

- Frontend: http://localhost:3000
- Backend API + docs: http://localhost:8000  ·  http://localhost:8000/docs
- Default super admin comes from `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` (seeded on boot).
- Postgres host port is `${POSTGRES_HOST_PORT:-5433}` (to avoid clashing with a local Postgres);
  containers reach it internally at `db:5432`.
- For local webhooks, expose the backend with a tunnel (e.g. ngrok) and set the public URL
  as the Vapi server URL / Stripe webhook endpoint.

---

## 10. File map (quick reference)

```
backend/app/
  main.py                 app entry, middleware, exception handlers
  api/router.py           mounts all routers under /api/v1
  api/routes/             HTTP endpoints (auth, agents, calls, billing, admin, webhooks, …)
  core/                   config, database, security, deps (RBAC), rate_limit
  models/                 SQLAlchemy ORM (User, Agent, Call, Subscription, …)
  schemas/                Pydantic request/response models
  services/               business logic (billing, credits, plans, analytics, …)
    voice/                VoiceProvider abstraction (base + vapi_provider + factory)
    vapi.py               low-level Vapi HTTP client (only module calling Vapi)
  seed.py                 seeds the super admin on startup

frontend/src/
  app/(auth)/             login / register / verify / reset
  app/(dashboard)/        tenant app + admin console
  app/page.tsx            public landing + pricing
  components/             dashboard, marketing, shared, ui
  lib/                    api client, auth context, types, hooks, utils
```

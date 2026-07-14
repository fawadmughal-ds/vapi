# NextCall — White-Label AI Voice Agent SaaS

A production-ready, multi-tenant SaaS platform for building, deploying, and managing
AI voice agents. Powered internally by [Vapi](https://vapi.ai), OpenAI, Deepgram,
Twilio and Stripe — fully white-labeled so your customers only ever see **your** brand.

> **Important:** End users never see Vapi. Vapi is strictly an internal infrastructure
> provider. All credentials live in the backend and are never exposed to clients.

## Architecture

```
VApi/
├── backend/          FastAPI + SQLAlchemy + PostgreSQL (the brain)
│   └── app/
│       ├── core/         config, db, security, deps, rate limiting
│       ├── models/       SQLAlchemy ORM models
│       ├── schemas/      Pydantic request/response models
│       ├── services/     Vapi, Stripe, email, storage integrations
│       └── api/routes/   REST endpoints (auth, agents, calls, billing, …)
├── frontend/         Next.js 15 + TypeScript + Tailwind + shadcn/ui
│   └── src/
│       ├── app/          App Router pages (auth + dashboard + admin)
│       ├── components/    UI + feature components
│       └── lib/          API client, auth, types
├── docker-compose.yml
└── .env.example
```

## Tech Stack

| Layer          | Technology                                            |
| -------------- | ----------------------------------------------------- |
| Frontend       | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui       |
| Backend        | FastAPI, SQLAlchemy 2.0, Pydantic v2                   |
| Database       | PostgreSQL                                             |
| Voice infra    | Vapi (internal), OpenAI, Deepgram                      |
| Telephony      | Twilio / SIP                                           |
| Payments       | Stripe                                                 |
| Auth           | JWT (access + refresh), RBAC, email verification       |

## Quick Start

### 1. Environment

```bash
cp .env.example .env
# Fill in your secrets (Vapi key, Stripe keys, DB url, etc.)
```

### 2. Run with Docker (recommended)

```bash
docker compose up --build
```

- API:      http://localhost:8000  (docs at `/docs`)
- Frontend: http://localhost:3000

### 3. Run locally (dev)

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed          # create tables + super admin + plans
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

## Default Super Admin

After running the seed script (or first boot), a super admin is created from
`.env` values `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`.

## Key Concepts

- **Multi-tenant**: every resource is scoped by `user_id`. Customers only see their
  own data; super admins see everything.
- **White-label**: the `services/vapi.py` layer is the only place Vapi is referenced.
  All public-facing API responses use neutral terminology ("assistant", "agent").
- **Quota enforcement**: outbound/inbound calls are blocked when a tenant's monthly
  minute quota is exhausted (`services/billing` + middleware checks).
- **Webhooks**: Vapi posts call lifecycle events to `/api/v1/webhooks/vapi`, which
  persist calls, transcripts, cost and trigger function-calling tools.

See `backend/README.md` and `frontend/README.md` for module-level details.

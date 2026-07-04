# VoxaAI Backend (FastAPI)

The control plane for the white-label voice platform. All Vapi communication is
isolated in `app/services/vapi.py` — nothing else in the codebase (and certainly
no API response) references Vapi directly.

## Run

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # configure secrets
python -m app.seed          # tables + super admin
uvicorn app.main:app --reload
```

Interactive docs: http://localhost:8000/docs

## Layout

| Path                | Responsibility                                         |
| ------------------- | ------------------------------------------------------ |
| `app/core/`         | Config, DB, JWT security, DI deps, rate limiting       |
| `app/models/`       | SQLAlchemy ORM models (the database schema)            |
| `app/schemas/`      | Pydantic request/response models                       |
| `app/services/`     | Vapi, Stripe, email, storage, billing, functions       |
| `app/api/routes/`   | REST endpoints grouped per module                      |

## Key endpoints (prefix `/api/v1`)

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/verify-email`,
  `/auth/forgot-password`, `/auth/reset-password`
- `GET/POST /agents`, `POST /agents/{id}/publish` (provisions the assistant)
- `POST /knowledge-base` (PDF/DOCX/TXT upload)
- `GET/POST /phone-numbers`, `POST /phone-numbers/{id}/assign`
- `GET /calls` (search/filter/paginate), `POST /calls/outbound`
- `GET /analytics`
- `GET /billing/plans`, `GET /billing/subscription`, `POST /billing/checkout`
- `GET/POST/PATCH /orders`
- `POST /webhooks/vapi`, `POST /webhooks/stripe`
- `GET /admin/*` (super admin only)

## Quota enforcement

Outbound calls are blocked (`HTTP 402`) when a tenant's monthly minutes are
exhausted. Usage is incremented from the `end-of-call-report` webhook.

# Database migrations (Alembic)

Migrations are the source of truth for the schema. `Base.metadata.create_all()`
in `app/main.py` remains for zero-config local/dev bootstrap, but any schema
change that must reach an existing database has to ship as a migration.

## First-time setup against an existing database

The database was previously created by `create_all()` + `ensure_runtime_schema()`.
To adopt Alembic without recreating tables, generate an initial revision and
stamp it:

```bash
cd backend
alembic revision --autogenerate -m "baseline schema"
alembic stamp head        # mark the existing DB as up-to-date
```

## Day-to-day

```bash
cd backend
alembic revision --autogenerate -m "add X to Y"   # after editing models
alembic upgrade head                               # apply
alembic downgrade -1                               # roll back one revision
```

`env.py` reads `DATABASE_URL` from application settings, so it always targets the
same database as the app.

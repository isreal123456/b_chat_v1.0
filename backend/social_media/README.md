# Social Media Backend

FastAPI backend scaffold for the social media application.

## Run locally

```powershell
cd backend/social_media
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The API health check is available at `http://127.0.0.1:8000/` and its OpenAPI docs at `/docs`.

For an existing database, run `alembic upgrade head` from this directory before starting the API so legacy notification tables are migrated to the current schema.

Feed responses can use Redis when `REDIS_URL` points to a running Redis instance. Personalized feed entries use user-specific keys, are cached for `FEED_CACHE_TTL_SECONDS` (30 seconds by default), and are invalidated after the current user creates, Ticks, saves, or comments on a post. Tick endpoints also enforce one Tick per user and expose the count and users who Ticked a post.

The domain models, routers, services, and tests are organized by responsibility and ready for feature implementation. Database access is async SQLAlchemy, configured through `.env`.

## Use Neon PostgreSQL

Copy the Neon connection string into `backend/social_media/.env` as
`DATABASE_URL`. The standard Neon URL (`postgresql://...?...sslmode=require`)
is normalized automatically for the async PostgreSQL driver:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Keep the connection string private and do not commit `.env`. Apply the schema
to the Neon database before starting the API:

```powershell
cd backend/social_media
alembic upgrade head
uvicorn app.main:app --reload
```

## Admin console

Administrative routes live under `/admin` and are guarded by the role matrix in `app/core/permissions.py`:

- **Super Admin** — full access, including role changes, account deletion, and platform settings.
- **Admin** — members, content, projects, reports, analytics, and activity.
- **Moderator** — reports and content moderation.

The React console is served at `/admin` in the frontend and only appears in navigation for accounts with an `admin_role`.

To create the first administrator, register an account normally and restart the API with `BOOTSTRAP_ADMIN_EMAIL` set to that account's email. Promotion happens once, only while no Super Admin exists. Afterwards, roles can be managed from **Admin → Members → role**.

## Legal acceptance

Registration requires `terms_accepted: true`, and the API stamps `terms_accepted_at`, `terms_version`, and `privacy_version` on the new account. The current document version lives in `app/core/legal.py` and is shown on the public `/terms` and `/privacy` pages. Bump `LEGAL_VERSION` there and in `frontend/src/lib/legal.js` whenever the documents change.

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

Feed responses can use Redis when `REDIS_URL` points to a running Redis instance. Personalized feed entries use user-specific keys, are cached for `FEED_CACHE_TTL_SECONDS` (30 seconds by default), and are invalidated after the current user creates, likes, saves, or comments on a post. If Redis is not configured or is unavailable, feed requests continue to use the database.

The domain models, routers, services, and tests are organized by responsibility and ready for feature implementation. Database access is async SQLAlchemy, configured through `.env`.

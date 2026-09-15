# Social Media Backend

FastAPI backend scaffold for the social media application.

## Run locally

```powershell
cd backend/social_media
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API health check is available at `http://127.0.0.1:8000/` and its OpenAPI docs at `/docs`.

The domain models, routers, services, and tests are organized by responsibility and ready for feature implementation. Database access is async SQLAlchemy, configured through `.env`.

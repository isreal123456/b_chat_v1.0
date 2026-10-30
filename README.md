# TickMe — Connect. Create. Collaborate.

TickMe is a professional social network for developers and designers. Build a
public profile, share project updates, collect Ticks and comments, showcase
what you ship, find collaborators, and message your network in real time.

## Stack

- **Frontend:** React 19, Vite 8, React Router 7, lucide-react, hand-built
  semantic CSS design system (Terminal Lime palette, light + dark themes).
- **Backend:** FastAPI, async SQLAlchemy 2.0, SQLite (aiosqlite) or Postgres
  (asyncpg), Alembic migrations, JWT auth with argon2 hashing, WebSockets for
  messaging, notifications, and presence.
- **Optional:** Redis for the 30-second per-user feed cache.
- **Email:** SMTP-ready verification and password-reset mail. Without SMTP the
  API exposes development action links so the flows stay testable locally.

## Features

- **Accounts:** register, log in, email verification, password reset, JWT
  sessions, onboarding, profile editing, avatar upload.
- **Profiles:** headline, bio, skills, category, location, availability,
  GitHub/portfolio/LinkedIn links, followers, connections, project grid.
- **Feed 2.0:** text, image, and video posts; project-tagged updates; Ticks,
  comments, reposts, bookmarks; paginated ranking that blends engagement,
  freshness, follows, skill overlap, project category, and past interactions.
- **Projects:** showcase projects with covers, tech stacks, status, and
  "open to collaborate" flags; owner "Share update" flow into the composer.
- **Build Together:** collaboration requests, accept/reject/cancel, collaborator
  management.
- **Discovery:** people search across names, headlines, bios, and skills;
  project search; trending updates; trending skills; ranked people suggestions
  based on shared skills, mutual connections, and category.
- **Messaging & notifications:** private WebSocket chat with history, unread
  counts, online presence, live in-app notifications, live badge counts,
  mark-one/mark-all read, and blocking enforcement.
- **Privacy:** block/unblock API that removes blocked users from search, feeds,
  friends, conversations, and prevents new messages or connection requests.

## Getting started

### Deploy to Render

This repository includes a [`render.yaml`](./render.yaml) Blueprint that
creates the FastAPI API and Vite frontend as separate Render services.

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and select this repository.
3. Before the first deploy finishes, set `DATABASE_URL` on `tickme-api` to the
   private Neon connection string.
4. Render runs the Alembic migrations during API startup and publishes the
   frontend after its build.

The Blueprint generates `SECRET_KEY` and `MESSAGE_ENCRYPTION_KEY` values and
connects the frontend to the API automatically. Keep the Neon connection
string and other secrets in Render environment variables, not in Git.

### Backend

```bash
cd backend/social_media
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

API docs: <http://127.0.0.1:8000/docs>

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at <http://127.0.0.1:5173>. Point it at another API with
`VITE_API_URL` in `frontend/.env`.

## Tests and checks

```bash
# Backend (isolated in-memory SQLite)
cd backend/social_media
python -m pytest

# Frontend
cd frontend
npm run lint
npm run build
```

## Configuration

Backend settings live in `backend/social_media/.env` (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite or Postgres connection string |
| `SECRET_KEY` | JWT signing secret — set a long random value |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime |
| `REDIS_URL` | Optional feed cache; leave empty to disable |
| `FRONTEND_URL` | Base URL used in verification/reset links |
| `SMTP_*` | Outgoing mail; leave `SMTP_HOST` empty for dev links |

## Project structure

```
backend/social_media/
  app/routers/      API endpoints (auth, feed, projects, discovery, ...)
  app/models/       SQLAlchemy models and indexes
  app/services/     feed ranking, notifications, access checks
  alembic/versions/ schema migrations
  tests/            pytest suite
frontend/src/
  app/              route pages (home, explore, projects, messages, ...)
  components/       layout, feed, projects, and UI primitives
  lib/api.js        typed-by-convention API client
  providers/        auth and realtime notification contexts
  styles/           design tokens, base, components, pages
```

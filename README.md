# Personal Tracker

Next.js app with spend, goals, and todo tracking. Data is stored per user in **MongoDB**; access is protected with **email/password auth** (Auth.js / NextAuth v5).

## Features

- **Spend Tracker** — Monthly budgets per category, daily spend logging, charts, remaining budget.
- **Goal Tracker** — Goals with date ranges, daily repeatable actions, progress.
- **Todo Tracker** — Tasks with optional due dates.

## Setup

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Set in `.env.local`:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (e.g. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)) |
| `MONGODB_DB` | Database name (default: `goaltracker`) |
| `AUTH_SECRET` | Random secret for JWT sessions (`openssl rand -base64 32`) |

3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), **Register**, then use Spend / Goals / Todos.

## Auth & API

- **Register** — `POST /api/register` (email, password, optional name)
- **Sign in** — Auth.js credentials at `/api/auth/*`
- **Data** — `GET` / `PUT /api/data` (requires session; stores tracker JSON per user)

Protected routes: `/spend`, `/goals`, `/todos` (middleware redirects to `/login`).

## Deploy to GCP (Cloud Run)

Set environment variables on the Cloud Run service:

- `MONGODB_URI`
- `AUTH_SECRET`
- `MONGODB_DB` (optional)

```bash
gcloud builds submit --config cloudbuild.yaml
```

Or run the Docker image locally (with env vars):

```bash
docker build -t goaltracker .
docker run -p 8080:8080 \
  -e MONGODB_URI="..." \
  -e AUTH_SECRET="..." \
  goaltracker
```

## Stack

- Next.js 16, React 19, Tailwind CSS 4
- NextAuth v5 (Auth.js) — JWT sessions, credentials provider
- MongoDB Node driver
- Recharts, date-fns

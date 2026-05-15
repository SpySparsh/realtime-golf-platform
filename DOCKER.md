# Docker Deployment

## Services

- `frontend`: Next.js standalone production server on port `3000`.
- `worker`: BullMQ/background worker runtime with health and metrics on port `9101`.
- `websocket`: Socket.IO runtime on port `3001`.
- `redis`: Redis for queues, websocket fanout, and runtime coordination.
- `mongo`: MongoDB container provisioned for services that need document storage.

## Environment

Create a local `.env` from `.env.example` and fill in Supabase/payment secrets:

```bash
cp .env.example .env
```

Compose sets container-local defaults for `REDIS_URL` and `MONGODB_URI`:

```text
REDIS_URL=redis://redis:6379
MONGODB_URI=mongodb://mongo:27017/golf_subscription
```

## Build And Run

```bash
docker compose build
docker compose up -d
```

Health endpoints:

- Frontend: `http://localhost:3000/api/health`
- Worker: `http://localhost:9101/health`
- Websocket: `http://localhost:3001/health`

Metrics endpoints:

- Frontend/API: `http://localhost:3000/api/metrics`
- Worker: `http://localhost:9101/metrics`
- Websocket: `http://localhost:3001/metrics`

# Cho Neo Deployment Hygiene

Cho Neo's current release path is intentionally narrow. Use this note before any
manual production deploy so the app does not end up in the wrong Vercel project.

## Correct Target

- Vercel project: `cho-neo`
- Production alias: `https://cho-neo.vercel.app`
- Live Gossip Cafe route: `https://cho-neo.vercel.app/cho-neo/gossip`

The local Vercel link should point at `cho-neo` in `.vercel/project.json`.

## Manual Production Deploy

```bash
cd /Users/baonguyen/dev/cho-neo
git checkout main
git pull origin main
npx vercel --prod
```

## Wrong House

- Deprecated/wrong-house Vercel project: `vikami-cho`
- Do not add Cho Neo secrets or production environment variables to `vikami-cho`.
- Do not use `vikami-cho` for Cho Neo production deploys.

## Guardrails

- Do not chase Vercel GitHub auto-deploy unless that becomes a separate task.
- Cloudflare is not the current release path.
- Do not expose service role keys in browser code or public docs.
- Do not create duplicate repositories or duplicate Vercel projects for Cho Neo.

## 24/7 Readiness Controls

- Canonical entrance: `/` redirects to `/cho-neo`.
- Health check: `GET /api/health` returns only booleans and service status. It
  must never return environment variable values or secrets.
- Ông Địa provider: production should set `ONG_DIA_PROVIDER=openai`,
  `OPENAI_API_KEY`, and `OPENAI_ONG_DIA_MODEL`.
- Shared Quán Tám memory: production should set `NEXT_PUBLIC_SUPABASE_URL` and
  a public Supabase key. Host-only moderation tools additionally require
  `SUPABASE_SERVICE_ROLE_KEY` and `CHO_NEO_HOST_TOOLS_KEY`.
- Emergency posting switch: set `CHO_NEO_GOSSIP_POSTING_DISABLED=1` to disable
  new front-counter posts while leaving the room readable.
- If Ông Địa provider traffic fails, do not change UI copy first. Check
  `/api/health`, server logs for `[ong-dia-prayer]`, provider status, and
  environment variable presence.
- Emergency rollback: redeploy the last known good Vercel production deployment
  for the `cho-neo` project. Do not point the production alias at `vikami-cho`.

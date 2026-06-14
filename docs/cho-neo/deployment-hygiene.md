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

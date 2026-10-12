# Dev Tracker web

Next.js 16 + Tailwind CSS 4 dashboard for the Dev Tracker API. See the [root README](../README.md) for setup and deployment.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3000
```

- `src/app/(auth)`: sign in and register
- `src/app/(app)`: dashboard, daily planner (`/tasks`), projects, AI scaffolding (`/projects/new`), settings
- `src/lib/api.ts`: typed API client; the bearer token is kept in `localStorage`
- `src/components`: shared UI (progress bars, health badges, task editor)

# WorkHub frontend

Next.js (App Router) client for the WorkHub project-management API.
Stack: Next.js 16 · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui (base-ui) · TanStack Query · React Hook Form + Zod · Recharts · date-fns · Sonner · dnd-kit.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: the default already points at the deployed API
npm run dev                  # http://localhost:3000
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` (route types are generated, so run this rather than bare `tsc`) |
| `npm test` | Vitest (75 tests) |

### Environment

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend origin, e.g. `https://workhub-backend-9r7x.onrender.com`. No trailing slash; a trailing `/api` is stripped so routes never become `/api/api/...`. It is read on the **server** only, because the browser talks to the Next.js proxy. |

No secrets are used or needed. Never put JWT secrets in frontend env vars.

## Architecture

### Auth: a backend-for-frontend proxy with HttpOnly cookies

The API returns JWTs in JSON bodies (no cookies), refresh tokens are **single-use and rotating**, and CORS is an origin allow-list. Instead of keeping tokens in `localStorage`, the browser only ever talks to `/api/proxy/*` (`src/app/api/proxy/[...path]/route.ts`):

- `POST /auth/login` → the proxy stores the access and refresh tokens in `HttpOnly; SameSite=Lax` cookies (`Secure` over HTTPS) and returns only the user. Tokens never reach browser JavaScript.
- Every other call gets its `Authorization: Bearer` header attached server-side. An expired access cookie triggers one refresh, then a retry, with the rotated cookies set on the response.
- Parallel requests share **one** refresh (`src/lib/server/session.ts`), so the single-use rotation cannot log users out. A successful rotation is reused for 30 s for requests already in flight.
- A rejected refresh → `401` + cookies cleared. Network/5xx/429 during refresh → `503` and the session is **kept**. This is why the app can never loop between `/login` and `/overview`.
- Only the documented backend paths are forwarded (allow-list), and mutations must be same-origin (CSRF defence on top of SameSite).
- `src/proxy.ts` gates page routes on the presence of a session cookie; validity is enforced by the proxy route.

The browser-side client (`src/lib/api/client.ts`) throws typed `ApiError`s (401/403/404/validation/network), supports `AbortSignal` cancellation via TanStack Query, and a single `AuthEvents` listener handles expired sessions.

### Code layout

```
src/
  app/            routes: (auth)/login|register, (app)/overview|my-tasks|projects|team|settings, api/proxy
  components/     layout, shared (badges, states, dialogs…), dashboard, projects, tasks, members, comments, settings, ui (shadcn)
  features/       TanStack Query hooks per domain: auth, projects, tasks, members, comments, dashboard
  lib/api/        client, errors, endpoints, query keys     lib/server/  proxy session + cookies
  lib/validations Zod schemas (mirror backend limits)       lib/utils/   dates, labels, permissions, navigation
  types/api.ts    types derived from the OpenAPI document   proxy.ts      route gate
```

Authenticated pages are client components behind the app shell (data is per-user and cached by TanStack Query); layouts, metadata and auth pages are server components.

## API coverage (verified against the live API and the OpenAPI document)

Integrated: `POST /auth/register|login|logout`, `GET /auth/me`, token refresh (server-side), `GET|POST /projects`, `GET|PATCH|DELETE /projects/{id}`, `GET /projects/{id}/stats`, `GET|POST /projects/{id}/members`, `DELETE /projects/{id}/members/{userId}`, `PATCH …/members/{userId}/role`, `GET|POST /projects/{id}/tasks` (search, status, priority, assignedTo, overdue, sort, pagination), `GET|PATCH|DELETE …/tasks/{taskId}`, `GET|POST …/tasks/{taskId}/comments`, `GET …/tasks/{taskId}/activities`.

### Backend gaps and how the UI handles them

| Gap | Behaviour |
| --- | --- |
| No global dashboard/stats endpoint | Overview aggregates the real per-project `/stats` of your 12 most recently updated projects (and says so when truncated). |
| No cross-project task list | *My Tasks* queries each project with `assignedTo=<me>` (up to 25 projects); merge/sort happens client-side after server-side filtering. |
| No user directory / search | Members are added by **user ID** (copyable from Settings). A real picker needs e.g. `GET /users?search=`. |
| Tasks/comments carry only user IDs | Names are resolved from the project member list and the current user. |
| Project **owner is not in the members list** | The owner is shown as "Project owner" with the name unavailable unless it is you. Needs an `owner` object on `Project`. |
| No priority breakdown in stats (only `highPriority`) | No priority chart is drawn; high-priority is a metric instead. |
| No global activity feed | Activity is shown per task only; there is no fake Activity page. |
| No profile/password endpoints | Settings shows the profile read-only. |
| No notifications or global search | Not shown. |
| No task ordering field | The board changes status only, not in-column order. |
| Only ADMIN/PROJECT_MANAGER can create projects; sign-up always creates `MEMBER` | Create actions are hidden for members, with explanatory empty states. There is no self-service path to a PM account. |

## Security notes (need your attention)

1. **Shared rate limits.** The backend limits by IP: **10 auth requests / 15 min** (this includes `/auth/me` and `/auth/refresh`, not just login) and 300 API requests / 15 min. Behind the proxy **all users share one egress IP**, so the limit is shared by everyone. Mitigations here: the user profile is cached per session so `/me` rarely hits the backend, queries are cached for 60 s, and fan-out is capped. For real multi-user traffic the backend should key limiters by user/forwarded IP, or exempt `/auth/me` and `/auth/refresh`.
2. **Multi-instance refresh race.** Refresh de-duplication is in-memory per server instance. On serverless hosting with several instances, two instances can still race on the same single-use token. Fixes: sticky sessions, a shared store (e.g. Redis) for the in-flight refresh, or a short server-side grace window for token reuse on the backend.
3. Access tokens stay valid for up to 15 minutes after logout (stateless JWT); logout revokes the refresh token only.
4. Role/permission hints in the UI are conveniences; the API is the authority and its 403s are always surfaced.
5. The `Content-Security-Policy` of the Next app is not configured; add one for production.

## Deployment (Vercel; any Node host works)

1. Import the repo, framework preset **Next.js**.
2. Set `NEXT_PUBLIC_API_BASE_URL` for Production (and Preview).
3. Deploy. No CORS change is needed on the backend, because requests are server-to-server. The proxy route sets `maxDuration = 60` to survive Render free-tier cold starts (the first request after idle can take ~30 s).

Self-hosting: `npm run build && npm start` behind a TLS-terminating proxy that sets `X-Forwarded-Proto` (so cookies are `Secure`).

## Testing

`npm test` covers: Zod schemas, utilities and permission rules, API-client error handling (401/403/404/network/abort), route protection (`proxy.ts`), the login form, the project create/edit form, optimistic task-status updates with rollback, and the proxy route (cookie handling, token secrecy, single refresh under concurrency, allow-list, CSRF). Mocks exist only in tests. The app itself always talks to the real API.

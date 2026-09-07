---
name: erp-ctv-frontend
description: Maintain the ERP CTV Next.js frontend, especially login, authenticated layout, account management, RBAC-aware navigation, dashboard UI, and Spring API integration. Use for React, TypeScript, Next.js, Tailwind, frontend auth, route, form, responsive UI, or browser verification work in erp-ctv; do not use for backend or SQL-only changes.
---

# ERP CTV Frontend

Work only in `C:\Users\ADMIN\ctv-code\erp-ctv` unless the user explicitly expands the scope.

## Start with the current implementation

1. Read `package.json`, `.env.example`, `app/layout.tsx`, `app/providers.tsx`, and only the relevant feature folder.
2. Search for existing components, styles, request helpers, and types before adding a new abstraction.
3. Preserve unrelated user work and the existing ERP dashboard demo.
4. Keep pages thin: route files under `app/` should compose feature components rather than own business logic.

## Preserve the folder boundaries

- `app/`: routes, root layout, providers, and route-level styles.
- `features/auth/`: authentication API, context, route protection, login UI, and auth types.
- `features/accounts/`: account API, management views, access drawer, dialogs, and account types.
- `components/layout/`: shared authenticated shell and navigation chrome.
- `components/ui/`: reusable presentation primitives.
- `lib/api/`: shared HTTP behavior; `lib/config/`: environment normalization; `types/`: cross-feature contracts.
- Add domain-specific work under `features/<domain>` and expose a small component or API surface to the route.

## Preserve authentication safety

- Use `NEXT_PUBLIC_API_BASE_URL`; its local default is `http://localhost:8080`.
- Send `credentials: 'include'` for refresh-cookie and CSRF-cookie requests.
- Obtain the CSRF cookie from `/api/auth/csrf` and send `X-XSRF-TOKEN` for protected mutations, refresh, and logout.
- Keep the access token in memory through the auth provider. Never store access or refresh tokens in `localStorage`, `sessionStorage`, query strings, or readable persistent cookies.
- Keep the refresh token owned by the backend HttpOnly cookie.
- Use the shared API client so a `401` can attempt one refresh and one request retry; prevent retry loops.
- Clear in-memory authentication and return to `/login` when refresh fails.
- Treat `401` as unauthenticated and `403` as authenticated but unauthorized. Show distinct messages and do not hide backend permission defects with frontend-only checks.

## Keep routes and permissions coherent

- `/` redirects to `/accounts`.
- `/login` is public and redirects authenticated users to `/accounts`.
- `/accounts` and `/dashboard` are protected by the current auth flow.
- Render sidebar items from `GET /api/navigation/me` when dynamic RBAC navigation is implemented; do not hard-code visibility as the authorization mechanism.
- The backend remains the final authority for every protected action. Frontend permission checks improve UX only.
- Account administration uses `/api/security/**` and requires `SECURITY.MANAGE`.

## UI and implementation quality

- Keep TypeScript strict and use existing request/response types. Do not introduce `any` to bypass a contract mismatch.
- Reuse the `nova-admin-*` design language and `components/ui/icon.tsx` before adding new global styles or icon systems.
- Support keyboard navigation, visible focus, labels, useful validation messages, loading states, empty states, and disabled submit buttons during mutations.
- Make all changed screens usable at desktop and narrow mobile widths. Avoid horizontal overflow and inaccessible modal or drawer content.
- Wire every visible action to real behavior or clearly mark it unavailable; do not ship decorative buttons that appear functional.
- Keep secrets out of `NEXT_PUBLIC_*` variables. Only public origins and other non-secret browser configuration belong there.

## Verification

1. Run `npm run lint` after TypeScript or UI changes.
2. Run `npm run build` to catch route, server/client boundary, and production compilation failures.
3. For auth or API changes, verify successful login, failed login, refresh, logout, protected redirect, `401`, `403`, and CSRF failure behavior.
4. For visual changes, inspect the real page in the browser at desktop and narrow viewport sizes and check the console.
5. Report changed routes/files, commands run, and any backend prerequisite without exposing credentials or tokens.

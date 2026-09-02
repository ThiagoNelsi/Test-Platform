# Test Platform frontend

The frontend is a browser-only React single-page application. Vite builds the
application, React Router handles navigation, and the Express API owns
authentication, authorization, business rules, and persistence.

## Requirements

- Node.js 20 or newer.
- npm.
- A running Test Platform API at `http://localhost:8000`, unless you configure
  another URL.

## Development

Install dependencies from the monorepo root:

```bash
pnpm install
```

Create `.env` or `.env.local` with the browser-safe API URL:

```dotenv
VITE_BACKEND_URL=http://localhost:8000
```

Start the Vite development server:

```bash
pnpm --filter test-platform-frontend run dev
```

Open `http://localhost:5173`. The browser sends API requests with credentials
so the Express HTTP-only session cookie remains available across requests.

## Validation and production build

Run the frontend checks from this directory:

```bash
pnpm --filter test-platform-frontend run type-check
pnpm --filter test-platform-frontend run test
pnpm --filter test-platform-frontend run lint
pnpm --filter test-platform-frontend run build
```

The production build writes static assets to `dist/`. Preview that build with:

```bash
pnpm --filter test-platform-frontend run preview
```

Deploy `dist/` to a static host or reverse proxy. Configure the host to serve
`dist/index.html` for every application route, including `/home`,
`/questoes`, and `/prova/:testId`; this fallback is required for direct refresh
of React Router URLs. Set `VITE_BACKEND_URL` to the API origin before building.

## Source layout

- `src/main.tsx` starts the React application.
- `src/router.tsx` defines public, protected, and fallback routes.
- `src/layouts.tsx` composes application providers and authenticated layouts.
- `src/components/`, `src/context/`, `src/controllers/`, and `src/hooks/`
  contain browser UI and state logic.
- `lib/` contains API clients, transport types, and domain adapters.
- `public/` contains static assets copied into the build.

The frontend does not contain database clients, AWS credentials, server-only
environment variables, or Next.js runtime code. All protected operations go
through the Express API.

# Configuration Guide

This document describes the runtime configuration used by the OsmoWeb BTS Demo. It covers backend environment variables, frontend development settings, CORS behavior, static serving, and dynamic BTS configuration.

## Package Dependencies

The application consumes shared packages from npm:

- `@osmoweb/*`
- `@websdr/*`

Published project manifests should use normal semver versions, for example `^0.6.0`, so installation works with a regular `npm install`.

## Backend Environment Variables

The backend loads environment variables through `@nestjs/config`.

| Variable | Default | Used by | Description |
| --- | --- | --- | --- |
| `PORT` | `4000` | Backend | HTTP port for the NestJS server. |
| `NODE_ENV` | `development` | Backend | Controls development vs production behavior. |
| `CORS_ALLOW_ALL` | unset | Backend | In production, set to `true` to allow all origins. |
| `CORS_ORIGIN` | unset | Backend | Comma-separated list of allowed production origins. |
| `LOG_LEVEL` | unset | Backend | Logger level input parsed by the shared logging helper. |
| `LOG_LEVELS` | unset | Backend | Multi-level logger configuration parsed by the shared logging helper. |

Example backend `.env`:

```env
PORT=4001
NODE_ENV=development
LOG_LEVELS=log,error,warn
```

## Frontend Environment Variables

The frontend dev server reads environment values from Vite's runtime process environment.

| Variable | Default | Used by | Description |
| --- | --- | --- | --- |
| `VITE_DEV_PORT` | `4000` | Vite dev server | Preferred frontend development server port. |
| `PORT` | `4000` | Vite dev server | Fallback frontend development server port when `VITE_DEV_PORT` is not set. |
| `VITE_API_URL` | `http://localhost:4000` | Vite proxy | Backend target for `/api` requests during development. |

Example frontend `.env`:

```env
VITE_DEV_PORT=4000
VITE_API_URL=http://localhost:4001
```

## Recommended Local Ports

The backend and frontend development server both default to `4000`. When running both separately, use different ports.

Recommended setup:

```sh
PORT=4001 npm run start --prefix backend
VITE_DEV_PORT=4000 VITE_API_URL=http://localhost:4001 npm run dev --prefix frontend
```

In this setup:

- frontend UI: `http://localhost:4000`
- backend API: `http://localhost:4001`
- Vite proxies `/api` requests to `http://localhost:4001`

## CORS

The backend CORS setup is handled in `backend/src/main.ts`.

Development behavior:

```ts
{ origin: true, credentials: true }
```

This is enabled whenever `NODE_ENV !== 'production'`.

Production behavior:

- `CORS_ALLOW_ALL=true` enables all origins with credentials.
- `CORS_ORIGIN=https://example.com,https://admin.example.com` allows only the listed origins.
- If neither variable is set, the local bootstrap code does not enable CORS.

## Vite Proxy

The frontend development server proxies `/api` to the backend.

Default target:

```text
http://localhost:4000
```

Override with:

```env
VITE_API_URL=http://localhost:4001
```

The proxy is configured with WebSocket support:

```ts
ws: true
```

This keeps local API and WebSocket development behind the frontend origin.

## Cross-Origin Isolation Headers

The Vite development server sets:

```text
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

These headers enable browser features required by the SDR runtime, such as `SharedArrayBuffer` and high-precision timing. Use `window.crossOriginIsolated` in the browser console to verify that the page is isolated.

## Static Frontend Serving

The backend serves the compiled frontend from:

```text
frontend/dist
```

The static server excludes backend route prefixes:

```text
/auth/*
/api/*
```

This allows a built deployment to serve both the browser app and backend routes from the same NestJS server.

## Dynamic BTS Configuration

BTS configuration is selected in the frontend and resolved through the shared Osmo service layer.

The frontend sends:

- `instanceId`
- GSM `band`
- `arfcn`

The shared service call returns the BTS runtime configuration used by `OsmoBtsTrx`.

The local backend app does not rely on static BTS entries.

## Frontend Stored Settings

The frontend stores the last selected radio selection in `localStorage`.

Storage key:

```text
osmoweb:bts-config
```

Stored fields:

- `technology`
- `band`
- `arfcn`

The app validates stored data before applying it. Invalid or missing data falls back to the default GSM EGSM 900 / ARFCN 975 configuration.

## Logging

Backend logging is configured before and after Nest application creation:

1. `LOG_LEVELS` or `LOG_LEVEL` is read from `process.env`.
2. Parsed levels are applied through Nest's `Logger.overrideLogger`.
3. After `ConfigService` is available, `.env` values can override the initial process environment values.
4. `LoggerLevelService` receives the parsed levels.

Use logging configuration when diagnosing startup, CORS, backend module, or WebSocket behavior.

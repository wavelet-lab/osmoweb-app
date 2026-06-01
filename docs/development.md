# Development Guide

This guide describes the usual development workflow for the OsmoWeb BTS Demo.

## Install

Install dependencies from the repository root:

```sh
npm install
```

The root package uses npm workspaces for:

- `backend`
- `frontend`

## Build The Backend First

The backend `start` script runs compiled JavaScript:

```sh
node dist/main.js
```

Build it before the first run or after changing backend TypeScript:

```sh
npm run build --prefix backend
```

For continuous backend TypeScript compilation:

```sh
npm run watch --prefix backend
```

## Run Backend And Frontend Separately

Recommended split-port setup:

```sh
npm run build --prefix backend
PORT=4001 npm run start --prefix backend
```

In another terminal:

```sh
VITE_DEV_PORT=4000 VITE_API_URL=http://localhost:4001 npm run dev --prefix frontend
```

Open:

```text
http://localhost:4000
```

## Run From The Root

The root scripts are:

```sh
npm run start
npm run dev
npm run build
npm run test
```

`npm run dev` starts backend and frontend through `concurrently`.

Because both the backend and Vite dev server default to port `4000`, prefer explicit ports when using both in development.

## Production-Style Build

Build both packages:

```sh
npm run build
```

This runs:

1. frontend build
2. backend build

After a successful build:

- frontend assets are in `frontend/dist`
- backend output is in `backend/dist`
- backend static serving points at `frontend/dist`

Start the compiled backend:

```sh
npm run start --prefix backend
```

## Frontend Workflow

Common frontend files:

| File | Purpose |
| --- | --- |
| `frontend/src/main.ts` | Vue application entry point. |
| `frontend/src/App.vue` | Root Vue component. |
| `frontend/src/components/OsmoMain.vue` | Main BTS runtime screen. |
| `frontend/src/components/BtsControlPanel.vue` | Start/stop panel and runtime metrics. |
| `frontend/src/components/StatisticsModal.vue` | Nested statistics viewer. |
| `frontend/src/osmoBtsTrx.ts` | Local wrapper around the shared TRX manager. |
| `frontend/src/osmoBtsStats.ts` | Statistics normalization helpers. |
| `frontend/src/styles/` | Local SCSS styles. |

Frontend commands:

```sh
npm run dev --prefix frontend
npm run build --prefix frontend
npm run serve --prefix frontend
```

## Backend Workflow

Common backend files:

| File | Purpose |
| --- | --- |
| `backend/src/main.ts` | NestJS bootstrap and runtime setup. |
| `backend/src/app.module.ts` | Root NestJS module composition. |
| `backend/src/app.controller.ts` | Local guarded example controller. |
| `backend/src/app.service.ts` | Local example service. |
| `backend/src/common/` | Optional debugging middleware and filters. |

Backend commands:

```sh
npm run build --prefix backend
npm run start --prefix backend
npm run watch --prefix backend
```

## Debugging Helpers

The backend includes optional debugging helpers:

- `RequestLoggerMiddleware`
- `AllExceptionsFilter`

They are currently imported as commented-out helpers in `backend/src/main.ts`. Enable them temporarily when diagnosing request routing or backend exceptions.

## Browser Requirements

Use a browser that supports the runtime APIs required by the shared SDR stack.

Important browser-side capabilities:

- WebUSB
- cross-origin isolation
- `SharedArrayBuffer`
- WebSocket support

In development, Vite sets the COOP/COEP headers required for cross-origin isolation. Verify with:

```js
window.crossOriginIsolated
```

## Troubleshooting

### Backend Fails With Missing `dist/main.js`

Build the backend:

```sh
npm run build --prefix backend
```

### Backend And Frontend Port Conflict

Run them on separate ports:

```sh
PORT=4001 npm run start --prefix backend
VITE_DEV_PORT=4000 VITE_API_URL=http://localhost:4001 npm run dev --prefix frontend
```

### Vite Proxy Returns Errors

Check that the backend is running and that `VITE_API_URL` points to the backend origin.

Example:

```env
VITE_API_URL=http://localhost:4001
```

### WebUSB Device Is Not Available

Check:

- the browser supports WebUSB
- the page is opened from a secure context
- the device is connected
- the browser permission prompt was accepted
- another application is not already using the device

### Cross-Origin Isolation Is Disabled

Check the browser console:

```js
window.crossOriginIsolated
```

If it returns `false`, verify that the dev server is serving the COOP/COEP headers and that loaded resources are compatible with cross-origin isolation.

### Statistics Modal Is Empty

Statistics are polled only while the BTS state is `connected`. Start the BTS runtime first, then open the statistics modal.

### Tests Fail

The current test scripts are placeholders. The root `npm run test` command calls backend and frontend test scripts, but automated tests are not fully wired yet for this demo.

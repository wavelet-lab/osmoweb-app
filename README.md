# OsmoWeb BTS Demo

OsmoWeb BTS Demo is a full-stack demonstration project that exposes an `osmo-bts`-style control surface in a browser. It combines a NestJS backend with a Vue 3 frontend and relies on shared `@osmoweb/*` and `@websdr/*` packages for BTS, SDR, WebUSB, WebSocket, authentication, and telemetry behavior.

The project is intended for local development and experimentation. It is not a production-ready BTS deployment package.

## Repository Layout

```text
.
|-- backend/              # NestJS application and backend configuration
|-- frontend/             # Vue 3 / Vite application
|-- docs/
|   |-- architecture.md   # System overview and runtime flows
|   |-- backend.md        # Backend implementation notes
|   |-- configuration.md  # Runtime configuration guide
|   |-- development.md    # Local development workflow
|   |-- frontend.md       # Frontend implementation notes
|   |-- runtime-flows.md  # Detailed runtime scenarios
|   `-- user-guide.md     # End-user walkthrough
|-- package.json          # Root workspace scripts
`-- README.md
```

## Main Technologies

- Backend: NestJS, TypeScript, WebSocket adapter, static frontend serving.
- Frontend: Vue 3, Vite, TypeScript, SCSS.
- Shared packages: `@osmoweb/*` and `@websdr/*`, installed from npm.
- Runtime integrations: WebUSB device selection, BTS configuration, WebSocket transport, stream telemetry, and BTS statistics polling.

## Related Repositories

This demo application is built around several Wavelet Lab / OsmoWeb projects:

- [wavelet-lab/osmoweb-app](https://github.com/wavelet-lab/osmoweb-app) - this demo web application.
- [wavelet-lab/osmoweb](https://github.com/wavelet-lab/osmoweb) - shared OsmoWeb packages used by the frontend and backend.
- [wavelet-lab/websdr](https://github.com/wavelet-lab/websdr) - shared WebSDR packages for SDR, WebUSB, telemetry, and UI components.
- [wavelet-lab/osmoweb-tools](https://github.com/wavelet-lab/osmoweb-tools) - helper scripts and Osmocom service configuration used to run the Osmo backend services.

## Prerequisites

- Node.js and npm.
- Access to the shared `@osmoweb/*` and `@websdr/*` npm packages.
- A browser environment that supports the APIs used by the frontend runtime, including WebUSB for SDR device selection.

## Install

Install dependencies from the repository root:

```sh
npm install
```

The root package is configured as an npm workspace with `backend` and `frontend` packages.

## Development

Run both applications from the repository root:

```sh
npm run dev
```

This starts:

- the backend with `npm run start --prefix backend`
- the frontend Vite dev server with `npm run dev --prefix frontend`

The backend `start` script runs `dist/main.js`, so build the backend first when `dist/` is not present:

```sh
npm run build --prefix backend
```

The same backend command can be run from inside the backend directory without `--prefix`:

```sh
cd backend
npm run build
npm run start
```

Likewise, the frontend dev server can be started from inside the frontend directory:

```sh
cd frontend
npm run dev
```

The backend default port is `4000`, read from `PORT` when provided. The frontend dev server also defaults to `4000`, using `VITE_DEV_PORT` or `PORT` when provided. In local development, set different ports when both servers need to run at the same time.

Split-port example from the repository root:

```sh
PORT=4001 npm run start --prefix backend
VITE_DEV_PORT=4000 VITE_API_URL=http://localhost:4001 npm run dev --prefix frontend
```

Equivalent split-port example from package directories:

```sh
cd backend
PORT=4001 npm run start

cd ../frontend
VITE_DEV_PORT=4000 VITE_API_URL=http://localhost:4001 npm run dev
```

## Build

Build both packages:

```sh
npm run build
```

The frontend build is emitted to `frontend/dist`. The backend serves this directory as static content when running from the compiled backend.

## Documentation

- [Architecture overview](docs/architecture.md)
- [Backend documentation](docs/backend.md)
- [Configuration guide](docs/configuration.md)
- [Development guide](docs/development.md)
- [Frontend documentation](docs/frontend.md)
- [Runtime flows](docs/runtime-flows.md)
- [User guide](docs/user-guide.md)

## Current Demo Scope

The backend currently provides the NestJS host application, authentication and Osmo modules from shared packages, static frontend serving, CORS setup, logging configuration, and a small guarded example endpoint.

The frontend provides the visible BTS control workflow: select an SDR device, configure GSM BTS parameters, start or stop the BTS runtime, watch telemetry, view normalized statistics, and read runtime logs.

## Funding

This project is funded through [NGI0 Commons Fund](https://nlnet.nl/commonsfund), a fund established by [NLnet](https://nlnet.nl) with financial support from the European Commission's [Next Generation Internet](https://ngi.eu) program. Learn more at the [NLnet project page](https://nlnet.nl/project/WSDR).

[<img src="https://nlnet.nl/logo/banner.png" alt="NLnet foundation logo" width="20%" />](https://nlnet.nl)
[<img src="https://nlnet.nl/image/logos/NGI0_tag.svg" alt="NGI Zero Logo" width="20%" />](https://nlnet.nl/commonsfund)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

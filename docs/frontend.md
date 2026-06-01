# Frontend Documentation

The frontend is a Vue 3 and Vite application that provides the browser-based control surface for the OsmoWeb BTS demo. It lets a user select an SDR device, configure GSM BTS radio parameters, start or stop the BTS runtime, inspect stream telemetry, view BTS statistics, and follow runtime logs.

## Responsibilities

- Render the BTS demo UI.
- Select an SDR/WebUSB device.
- Configure GSM BTS parameters through shared Osmo UI components.
- Coordinate BTS allocation and release through shared frontend services.
- Start and stop the TRX runtime through `OsmoBtsTrx`.
- Display RX/TX traffic metrics from `StreamMeter`.
- Poll and normalize BTS statistics.
- Display runtime logs grouped by subsystem.
- Persist the last BTS radio configuration in `localStorage`.

## Entry Point

The frontend starts from `frontend/src/main.ts`:

```ts
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#app');
```

The Vite HTML entry is `frontend/index.html`.

## Main Components

### `OsmoMain.vue`

`frontend/src/components/OsmoMain.vue` is the main runtime component.

It coordinates:

- SDR device selection through `SdrInput`.
- BTS radio configuration through `BtsInput`.
- Start/stop control through `BtsControlPanel`.
- Log rendering through `LogArea`.
- Runtime state such as `configured`, `connected`, and `disconnected`.
- Stream telemetry subscription.
- BTS statistics polling every two seconds while the BTS is running.
- Cleanup on page hide and component unmount.

Default BTS configuration is created with `configureARFCN(...)` using GSM EGSM 900 and ARFCN 975.

The selected BTS config is stored under:

```text
osmoweb:bts-config
```

### `BtsControlPanel.vue`

`frontend/src/components/BtsControlPanel.vue` renders the operational BTS panel.

It displays:

- BTS state.
- Start/stop button.
- RX and TX frequencies.
- Cloud connection status.
- RX bytes received.
- TX bytes sent.
- TX lag behind RX.
- A statistics modal trigger.

It emits:

```text
toggle-running
```

### `StatisticsModal.vue`

`frontend/src/components/StatisticsModal.vue` displays nested statistics as a collapsible tree. It accepts primitive values, arrays, and nested objects through the `StatisticsValue` type.

### `ThemeToggle.vue`

`frontend/src/components/ThemeToggle.vue` controls the UI theme.

## TRX Runtime Wrapper

`frontend/src/osmoBtsTrx.ts` defines the local `OsmoBtsTrx` wrapper around the shared Osmo TRX manager from `@osmoweb/frontend-core/osmo`.

Main methods:

| Method | Purpose |
| --- | --- |
| `configure(...)` | Stores WebUSB IDs, BTS config, and WebSocket URLs. |
| `open_bts(...)` | Opens a BTS definition in the shared TRX manager. |
| `start()` | Opens WebSocket transport and the selected USB device. |
| `stop()` | Closes the shared TRX manager. |
| `getBtsStats(group)` | Reads and parses BTS statistics for a group. |
| `reinitialize()` | Starts the worker and re-applies the current BTS configuration. |
| `destroy()` | Stops runtime activity and tears down the worker. |

`OsmoBtsTrx` also forwards log events through `onLogItem`.

## BTS Start/Stop Flow

The main start flow in `OsmoMain.vue` is:

1. User selects an SDR device.
2. User selects GSM BTS radio settings.
3. User presses Start.
4. Frontend calls `updateBts(...)` with the tab-specific `instanceId`, GSM band, and ARFCN.
5. The returned BTS configuration is passed to `OsmoBtsTrx.configure(...)`.
6. `OsmoBtsTrx.start()` opens WebSocket transport and the selected USB device.
7. UI state changes to `connected`.
8. Statistics polling starts.

The stop flow is:

1. User presses Stop, or the page is hidden/unmounted.
2. `OsmoBtsTrx.stop()` closes the runtime.
3. `releaseBts(...)` releases the BTS instance.
4. UI state returns to `configured`.

## Statistics Normalization

`frontend/src/osmoBtsStats.ts` converts raw BTS statistics into a UI-friendly structure for `StatisticsModal.vue`.

It handles:

- flat counter arrays
- named counters
- rate counter groups
- stat item groups
- transceiver, timeslot, and channel arrays
- nested objects returned by BTS statistic groups

The currently polled groups are:

```ts
['stats', 'rate-counters', 'bts', 'trx', 'transceiver', 'websdr']
```

## Vite Configuration

The Vite config is `frontend/vite.config.ts`.

Important behavior:

- Uses the Vue plugin.
- Defines `@` as an alias for `frontend/src`.
- Defaults the dev server port to `4000`.
- Allows overriding the dev server port with `VITE_DEV_PORT` or `PORT`.
- Adds COOP/COEP headers required for cross-origin isolation.
- Proxies `/api` requests to `VITE_API_URL` or `http://localhost:4000`.
- Enables WebSocket proxying for `/api`.
- Allows serving selected files from local shared package build outputs.

Recommended local split-port setup:

```sh
cd /path/to/osmoweb-app
npm run build --prefix backend
PORT=4001 npm run start --prefix backend
VITE_DEV_PORT=4000 VITE_API_URL=http://localhost:4001 npm run dev --prefix frontend
```

## Scripts

Run from `frontend/`:

```sh
npm run dev
npm run build
npm run serve
```

Run from the repository root:

```sh
npm run dev
npm run build
```

## Styling

Local SCSS files live in `frontend/src/styles`.

Shared component styles are imported directly in `OsmoMain.vue` from:

- `@websdr/vue3-components`
- `@osmoweb/vue3-components`

## Development Notes

- The app consumes shared `@osmoweb/*` and `@websdr/*` packages from npm.
- WebUSB device access requires a compatible browser and user permission.
- The frontend relies on cross-origin isolation headers configured in Vite for runtime features used by the shared SDR stack.
- The root `npm run test` command currently calls a missing frontend test script and a placeholder backend test script, so tests are not yet wired for this demo.

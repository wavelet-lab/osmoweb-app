# Backend Documentation

The backend is a NestJS application that hosts the server-side part of the OsmoWeb BTS demo. It wires shared `@osmoweb` and `@websdr` NestJS modules into a local application shell, configures runtime behavior, and serves the compiled frontend in production-style builds.

## Responsibilities

- Start the NestJS application.
- Load environment configuration through `ConfigModule`.
- Configure logging before and after Nest application creation.
- Register cookie parsing and global validation.
- Register the Nest WebSocket adapter from `@nestjs/platform-ws`.
- Configure CORS for local development and production deployments.
- Mount shared authentication and Osmo backend modules.
- Serve `frontend/dist` as static browser assets.
- Provide a small guarded example API endpoint.

## Entry Point

The backend starts from `backend/src/main.ts`.

Startup sequence:

1. Import `reflect-metadata`.
2. Read logger configuration from `LOG_LEVELS` or `LOG_LEVEL`.
3. Create the Nest app through `AppModule.withLogging(...)`.
4. Read configuration through `ConfigService`.
5. Apply logger levels through `LoggerLevelService`.
6. Register middleware and global pipes.
7. Register the WebSocket adapter.
8. Configure CORS.
9. Listen on the configured port.

The default backend port is `4000`:

```ts
const port = Number(configService.get<number>('PORT') ?? 4000);
```

## Application Module

The root module is defined in `backend/src/app.module.ts`.

Main imports:

- `ConfigModule.forRoot({ isGlobal: true })`
- `ServeStaticModule.forRoot(...)`
- `AuthModule` from `@websdr/nestjs-microservice`
- `OsmoModule` from `@osmoweb/nestjs-microservice`
- `LoggingModule.forRoot(...)` when the app is created through `withLogging`

Static frontend serving is configured with:

```ts
rootPath: join(__dirname, '..', '..', 'frontend', 'dist')
```

The static server excludes API/auth paths:

```ts
exclude: ['/auth/*path', '/api/*path']
```

This allows the backend to serve the frontend bundle while keeping backend routes available.

## API Surface

The local app controller is defined in `backend/src/app.controller.ts`.

Current local endpoint:

```text
GET /api/hello
```

This route is guarded by `JwtAuthGuard` from `@websdr/nestjs-microservice` and returns the `AppService.getHello()` response.

Most BTS-specific backend behavior is expected to come from the shared `OsmoModule`, rather than from local controllers in this repository.

## WebSocket Support

`main.ts` registers:

```ts
app.useWebSocketAdapter(new WsAdapter(app));
```

This enables WebSocket support for modules and gateways that use NestJS WebSocket abstractions. The actual Osmo-specific WebSocket behavior is provided by the shared backend package.

## Configuration

Configuration is loaded from environment variables through `@nestjs/config`.

Common variables:

| Variable | Description |
| --- | --- |
| `PORT` | Backend HTTP port. Defaults to `4000`. |
| `NODE_ENV` | Runtime environment. Development mode enables permissive CORS. |
| `CORS_ALLOW_ALL` | In production, set to `true` to allow all origins. |
| `CORS_ORIGIN` | Comma-separated list of allowed production origins. |
| `LOG_LEVEL` | Logger level configuration. |
| `LOG_LEVELS` | Logger level configuration with support for multiple levels. |

## CORS Behavior

CORS is enabled automatically outside production:

```ts
{ origin: true, credentials: true }
```

In production:

- `CORS_ALLOW_ALL=true` allows all origins with credentials.
- `CORS_ORIGIN` allows a specific comma-separated origin list.
- If neither option is set, CORS is not enabled by the local bootstrap code.

## BTS Configuration

BTS configuration is dynamic. The frontend sends the selected GSM band and ARFCN through the shared frontend service layer, and the backend-side Osmo integration resolves or allocates the corresponding BTS runtime configuration.

The local backend app does not use a static BTS configuration file.

## Scripts

Run from `backend/`:

```sh
npm run build
npm run start
npm run watch
```

`npm run start` runs the compiled `dist/main.js` file. Run `npm run build` first when starting from a clean checkout.

Run from the repository root:

```sh
npm run start
npm run build
npm run dev
```

## Development Notes

- `backend/src/common/request-logger.middleware.ts` and `backend/src/common/all-exceptions.filter.ts` are available as debugging helpers but are commented out in `main.ts`.
- The package is configured as an ES module package with `"type": "module"`.
- The backend consumes shared `@osmoweb/*` and `@websdr/*` packages from npm.
- The current `test` script is a placeholder and exits with an error.

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { LoggerLevelService, parseLogLevels } from '@websdr/nestjs-microservice';
/* Imports below for debugging */
// import { RequestLoggerMiddleware } from '@/common/request-logger.middleware';
// import { AllExceptionsFilter } from '@/common/all-exceptions.filter';

async function bootstrap() {
    const globalLogger = new Logger();
    // First, apply any logger config from process.env so that loggers created during module init
    const rawEnvLog = process.env.LOG_LEVELS ?? process.env.LOG_LEVEL;
    const parsedFromEnv = parseLogLevels(rawEnvLog);
    if (parsedFromEnv !== undefined)
        Logger.overrideLogger(parsedFromEnv);

    // Import AppModule after logger setup so module-level loggers are created with correct global settings
    const app = await NestFactory.create(AppModule.withLogging(globalLogger)/* , { logger: globalLogger } */);
    const logger = new Logger('Bootstrap');

    // Then read ConfigService (loads .env via ConfigModule.forRoot()) and, if present,
    // apply/override logger config from ConfigService so .env values win when used.
    const configService = app.get(ConfigService);

    // Register LoggerLevelService and apply levels from ConfigService (or fallback to process.env)
    try {
        const rawConfigLog = configService.get<string>('LOG_LEVELS') ?? configService.get<string>('LOG_LEVEL');
        const parsedFromConfig = parseLogLevels(rawConfigLog);
        const loggerLevelService = app.get(LoggerLevelService);
        loggerLevelService.setLevels(parsedFromConfig as any);
    } catch { /* ignore */ }

    app.use(cookieParser());
    app.use((_req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useWebSocketAdapter(new WsAdapter(app));
    /* Usages below for debugging */
    /* Global request logger (captures all incoming requests regardless of module) */
    // app.use(RequestLoggerMiddleware.prototype.use.bind(new RequestLoggerMiddleware()));
    /* Global exception filter to log stack traces for 500s */
    // app.useGlobalFilters(new AllExceptionsFilter());

    // Read ConfigService (loads .env via ConfigModule.forRoot())

    // CORS handling:
    // - If NODE_ENV !== 'production' allow all origins by default to ease local development.
    // - Otherwise, respect CORS_ALLOW_ALL or CORS_ORIGIN env vars.
    const nodeEnv = configService.get<string>('NODE_ENV') || process.env.NODE_ENV || 'development';
    const corsAllowAllEnv = configService.get<string>('CORS_ALLOW_ALL');
    const corsOriginEnv = configService.get<string>('CORS_ORIGIN');

    let corsOptions: any = undefined;
    if (nodeEnv !== 'production') {
        // In development allow any origin (helpful when frontend uses custom port)
        corsOptions = { origin: true, credentials: true };
    } else if (corsAllowAllEnv === 'true') {
        corsOptions = { origin: true, credentials: true };
    } else if (corsOriginEnv) {
        const origins = corsOriginEnv.split(',').map((s) => s.trim()).filter(Boolean);
        corsOptions = { origin: origins, credentials: true };
    }

    if (corsOptions) {
        app.enableCors(corsOptions);
        logger.log(`CORS enabled with options: ${JSON.stringify(corsOptions)}`);
    } else {
        logger.log('CORS not enabled (no config)');
    }

    const port = Number(configService.get<number>('PORT') ?? 4000);

    await app.listen(port, () => {
        logger.log(`Server running at http://localhost:${port}`);
    });
}

bootstrap();

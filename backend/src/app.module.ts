import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule, LoggingModule, LoggerLevelService } from '@websdr/nestjs-microservice';
import { OsmoModule } from '@osmoweb/nestjs-microservice';

@Module({
    imports: [
        // Load .env into process.env and make ConfigService available globally
        ConfigModule.forRoot({ isGlobal: true }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
            exclude: ['/auth/*path', '/api/*path'],
        }),
        // Modules provided by the shared osmoweb package
        AuthModule,
        OsmoModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        LoggerLevelService,
    ],
})
export class AppModule {
    static withLogging(loggerInstance: unknown): DynamicModule {
        return {
            module: AppModule,
            imports: [
                ConfigModule.forRoot({ isGlobal: true }),
                ServeStaticModule.forRoot({
                    rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
                    exclude: ['/auth/*path', '/api/*path'],
                }),
                AuthModule,
                LoggingModule.forRoot(loggerInstance),
                OsmoModule,
            ],
            exports: [LoggingModule],
        };
    }
}

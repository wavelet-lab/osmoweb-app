import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('RequestLogger');
    use(req: Request, res: Response, next: NextFunction) {
        const origin = req.headers.origin || req.headers.referer || '';
        this.logger.log(`${req.method} ${req.originalUrl} from origin=${origin} ip=${req.ip}`);
        next();
    }
}

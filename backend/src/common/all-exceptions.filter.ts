import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger('AllExceptions');
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : 500;

        console.error('>>> Exception caught', {
            name: exception?.constructor?.name,
            status,
            response: exception?.response,
        });

        response.status(status).json(
            exception instanceof HttpException
                ? exception.getResponse()
                : { statusCode: 500, message: 'Internal server error' },
        );
    }
}

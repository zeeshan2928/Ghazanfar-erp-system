import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AppLoggerService } from '../logging/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const requestId = request.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        errors = responseObj.error;
      } else {
        message = exceptionResponse as string;
      }

      if (exception instanceof BadRequestException) {
        errorCode = 'VALIDATION_ERROR';
      } else {
        errorCode = exception.name.toUpperCase();
      }
    } else if (exception instanceof Error) {
      errorCode = exception.name.toUpperCase();
      // Prisma error messages (especially validation errors) render the full
      // query arguments inline, which can include customer/vendor PII. Log a
      // safe summary instead of the raw message for those - the stack trace
      // still points at the offending call site for debugging.
      const isPrismaError = exception.constructor.name.startsWith('Prisma');
      const logMessage = isPrismaError
        ? `${exception.constructor.name} (details redacted - see stack)`
        : exception.message;
      this.logger.error(logMessage, exception.stack, 'ExceptionFilter', { requestId });
      // Never echo raw internal error text (DB/Prisma internals, file paths)
      // back to the client in production; only the logs above get the detail.
      message = process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message;
    } else {
      message = String(exception);
      this.logger.error(message, undefined, 'ExceptionFilter', { requestId });
    }

    const errorResponse = {
      status,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      requestId,
      ...(errors && { errors }),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logging/logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private logger: AppLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent');
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const contentLength = res.get('content-length');

      const logData = {
        method,
        url: originalUrl,
        ip,
        statusCode,
        duration: `${duration}ms`,
        contentLength,
        userAgent,
        requestId: (req as any).id,
      };

      // Log based on status code
      if (statusCode >= 500) {
        this.logger.error(`HTTP ${method} ${originalUrl}`, undefined, 'HTTP', logData);
      } else if (statusCode >= 400) {
        this.logger.warn(`HTTP ${method} ${originalUrl}`, 'HTTP', logData);
      } else {
        this.logger.log(`HTTP ${method} ${originalUrl} - ${statusCode}`, 'HTTP');
        if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(`Request details`, 'HTTP', logData);
        }
      }
    });

    // Log request details in debug mode
    if (process.env.LOG_LEVEL === 'debug') {
      this.logger.debug(
        `Incoming request: ${method} ${originalUrl}`,
        'HTTP',
        {
          ip,
          userAgent,
          contentLength: req.get('content-length'),
        },
      );
    }

    next();
  }
}

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '@modules/audit/services/audit.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only audit POST, PUT, DELETE, PATCH requests
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return next.handle();
    }

    const path = request.path;
    const body = request.body;
    const user = (request as any).user;
    const orgContext = (request as any).orgContext;
    const ipAddress = request.ip;
    const userAgent = request.get('user-agent');

    // Extract entity type and ID from route
    const entityMatch = path.match(/^\/(\w+)\/?(\d+)?/);
    if (!entityMatch) {
      return next.handle();
    }

    const entity = entityMatch[1].replace(/s$/, '').toUpperCase(); // Remove trailing 's' and uppercase
    const entityId = entityMatch[2] ? parseInt(entityMatch[2], 10) : null;

    return next.handle().pipe(
      tap(
        async (response) => {
          try {
            const organizationId = orgContext?.organizationId || user?.organizationId;
            const userId = user?.sub || user?.id;

            if (!organizationId || !userId) {
              return;
            }

            // Determine action type
            let action = 'CREATE';
            if (method === 'PUT' || method === 'PATCH') {
              action = 'UPDATE';
            } else if (method === 'DELETE') {
              action = 'DELETE';
            }

            // Log based on action
            if (action === 'CREATE') {
              await this.auditService.logCreate(
                organizationId,
                entity,
                response?.id || entityId,
                body,
                userId,
                ipAddress,
                userAgent,
              );
            } else if (action === 'UPDATE') {
              // Note: In a real scenario, you'd have access to the old data before update
              // For now, we'll just log the new data
              await this.auditService.logUpdate(
                organizationId,
                entity,
                entityId || response?.id,
                {}, // oldData would need to be captured before the operation
                body,
                userId,
                ipAddress,
                userAgent,
              );
            } else if (action === 'DELETE') {
              // Log deletion with the entity ID
              await this.auditService.logDelete(
                organizationId,
                entity,
                entityId,
                {}, // deletedData would ideally be the entity before deletion
                userId,
                ipAddress,
                userAgent,
              );
            }
          } catch (error) {
            this.logger.error(`Error in audit interceptor: ${error.message}`);
            // Don't throw - just log the error and let the response continue
          }
        },
        (error) => {
          // Handle errors - just log and re-throw
          this.logger.error(`Error during audited request: ${error.message}`);
          throw error;
        },
      ),
    );
  }
}

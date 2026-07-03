import { Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

export interface OrgContext {
  organizationId: number;
  userId: number;
  email: string;
}

@Injectable()
export class OrganizationContextService {
  getOrgContext(request: Request): OrgContext {
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    if (!user.organizationId) {
      throw new ForbiddenException('Organization context not found');
    }

    return {
      organizationId: user.organizationId,
      userId: user.sub,
      email: user.email,
    };
  }
}

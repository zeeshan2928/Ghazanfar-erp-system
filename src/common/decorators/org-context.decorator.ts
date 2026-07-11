import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface OrgContextType {
  organizationId: number;
  userId?: number;
  email?: string;
  role?: string;
  canViewFinancials?: boolean;
  permissions?: Record<string, boolean>;
}

export const OrgContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): OrgContextType => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No authenticated user on request');
    }

    return {
      organizationId: user.organizationId,
      userId: user.sub,
      email: user.email,
      role: user.role,
      canViewFinancials: user.canViewFinancials,
      permissions: user.permissions,
    };
  },
);

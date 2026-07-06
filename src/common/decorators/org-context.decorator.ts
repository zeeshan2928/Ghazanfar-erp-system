import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface OrgContextType {
  organizationId: number;
  userId?: number;
  email?: string;
  role?: string;
}

export const OrgContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): OrgContextType | number => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      return {
        organizationId: user.organizationId,
        userId: user.sub,
        email: user.email,
        role: user.role,
      };
    }

    const orgId = request.headers['x-organization-id'];
    if (orgId) {
      return parseInt(orgId as string, 10);
    }

    return 1;
  },
);

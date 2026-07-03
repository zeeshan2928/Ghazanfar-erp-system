import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface OrgContextType {
  organizationId: number;
  userId: number;
  email: string;
  role: string;
}

export const OrgContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): OrgContextType => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return {
      organizationId: user.organizationId,
      userId: user.sub,
      email: user.email,
      role: user.role,
    };
  },
);

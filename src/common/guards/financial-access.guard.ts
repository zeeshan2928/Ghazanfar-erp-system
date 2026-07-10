import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Gates whole-report endpoints (Balance Sheet, Income Statement, Vendor
// scorecard) behind the per-user canViewFinancials flag. Must run after
// JwtGuard - relies on request.user already being populated with the
// live-looked-up flag from JwtStrategy.validate().
@Injectable()
export class FinancialAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.canViewFinancials) {
      throw new ForbiddenException('You do not have permission to view financial data');
    }

    return true;
  }
}

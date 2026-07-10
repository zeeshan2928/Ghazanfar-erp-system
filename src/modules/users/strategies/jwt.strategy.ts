import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  // Looks up the live User row on every request instead of trusting the
  // JWT payload alone - so a revoked canViewFinancials flag, a permission
  // override, or a deactivated account takes effect immediately, not just
  // after the token expires.
  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, canViewFinancials: true, isActive: true, organizationId: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // ADMIN always has every permission - skip the lookup entirely rather
    // than build a map that ActionPermissionGuard would ignore anyway.
    let permissions: Record<string, boolean> = {};
    if (user.role !== 'ADMIN') {
      const overrides = await this.prisma.userPermission.findMany({
        where: { userId: user.id },
        select: { permissionKey: true, granted: true },
      });
      permissions = Object.fromEntries(overrides.map((o) => [o.permissionKey, o.granted]));
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      canViewFinancials: user.canViewFinancials,
      organizationId: user.organizationId,
      permissions,
    };
  }
}

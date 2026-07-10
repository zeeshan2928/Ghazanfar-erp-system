import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { PasswordService } from './password.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
  ) {}

  // role and canViewFinancials may only be set by an ADMIN caller - a
  // freshly-registering user or a non-admin editing someone else's record
  // can't grant themselves (or anyone) elevated role/financial access.
  private assertCanSetPrivilegedFields(data: { role?: UserRole; canViewFinancials?: boolean }, callerRole?: UserRole) {
    if ((data.role !== undefined || data.canViewFinancials !== undefined) && callerRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only an admin can set role or financial access');
    }
  }

  async create(createUserDto: CreateUserDto, callerRole?: UserRole) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    this.assertCanSetPrivilegedFields(createUserDto, callerRole);

    const hashedPassword = await this.passwordService.hashPassword(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        organizationId: createUserDto.organizationId || 1,
        role: createUserDto.role,
        canViewFinancials: createUserDto.canViewFinancials,
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll(organizationId?: number, skip = 0, take = 10, filters: any = {}) {
    const where: any = { isActive: true };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          organizationId: true,
          role: true,
          canViewFinancials: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  async findById(id: number, organizationId?: number) {
    const where: any = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const user = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        role: true,
        canViewFinancials: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateData: Partial<CreateUserDto>, organizationId?: number, callerRole?: UserRole) {
    const where: any = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const user = await this.prisma.user.findFirst({ where });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    this.assertCanSetPrivilegedFields(updateData, callerRole);

    const data: any = { ...updateData };

    if (updateData.password) {
      data.password = await this.passwordService.hashPassword(updateData.password);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.sanitizeUser(updated);
  }

  async remove(id: number, organizationId?: number) {
    const where: any = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const user = await this.prisma.user.findFirst({ where });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'User deleted successfully' };
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
    organizationId?: number,
  ) {
    const where: any = { id: userId };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const user = await this.prisma.user.findFirst({ where });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify old password
    const isPasswordValid = await this.passwordService.validatePassword(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    // Hash and set new password
    const hashedPassword = await this.passwordService.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getStats(organizationId: number) {
    // Previously `total` was counted with isActive:true already applied, so
    // `active = total - inactive` produced a nonsensical negative/near-zero
    // number instead of a real active count - fixed to count total
    // unconditionally, active/inactive as their own separate counts.
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: { role: true, isActive: true, canViewFinancials: true },
    });

    const byRole = new Map<string, number>();
    users.forEach(u => byRole.set(u.role, (byRole.get(u.role) || 0) + 1));

    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      canViewFinancials: users.filter(u => u.canViewFinancials).length,
      byRole: Array.from(byRole.entries()).map(([role, count]) => ({ role, count })),
      timestamp: new Date(),
    };
  }

  private sanitizeUser(user: any) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

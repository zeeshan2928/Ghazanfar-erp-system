import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { PasswordService } from './password.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await this.passwordService.hashPassword(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role || UserRole.SALESMAN,
        organizationId: createUserDto.organizationId || 1,
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
    });
    return users.map(user => this.sanitizeUser(user));
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateData: Partial<CreateUserDto>) {
    const data: any = { ...updateData };

    if (updateData.password) {
      data.password = await this.passwordService.hashPassword(updateData.password);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.sanitizeUser(user);
  }

  async remove(id: number) {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private sanitizeUser(user: any) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

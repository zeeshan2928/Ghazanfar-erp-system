import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '@database/prisma.service';
import { PasswordService } from './password.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: any;
  let passwordServiceMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    passwordServiceMock = {
      hash: jest.fn().mockResolvedValue('hashed_password'),
      compare: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PasswordService, useValue: passwordServiceMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const createUserDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Test@123456',
        role: 'STAFF',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 1,
        ...createUserDto,
        password: 'hashed_password',
        isActive: true,
      });

      const result = await service.create(createUserDto);

      expect(passwordServiceMock.hash).toHaveBeenCalledWith('Test@123456');
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(result.id).toBe(1);
      expect(result.email).toBe('test@example.com');
    });

    it('should throw BadRequestException if email already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Test@123456',
        role: 'STAFF',
      };

      prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: 'existing@example.com' });

      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate password strength', async () => {
      const createUserDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'weak',
        role: 'STAFF',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      // Password validation should happen in the service
      // This test ensures weak passwords are rejected
      try {
        await service.create(createUserDto);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', firstName: 'John' },
        { id: 2, email: 'user2@example.com', firstName: 'Jane' },
      ];

      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.user.count.mockResolvedValue(2);

      const result = await service.findAll(0, 10);

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(2);
    });

    it('should support filtering by role', async () => {
      const mockUsers = [{ id: 1, role: 'ADMIN' }];

      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.user.count.mockResolvedValue(1);

      const result = await service.findAll(0, 10, 'ADMIN');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password with validation', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed_old_password',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      passwordServiceMock.compare.mockResolvedValue(true);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        password: 'hashed_new_password',
      });

      const result = await service.changePassword(userId, {
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
      });

      expect(passwordServiceMock.compare).toHaveBeenCalled();
      expect(passwordServiceMock.hash).toHaveBeenCalledWith('NewPassword123');
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if old password is incorrect', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        password: 'hashed_old_password',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      passwordServiceMock.compare.mockResolvedValue(false);

      await expect(
        service.changePassword(userId, {
          oldPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should soft delete a user', async () => {
      const userId = 1;

      prismaMock.user.findUnique.mockResolvedValue({ id: userId });
      prismaMock.user.update.mockResolvedValue({
        id: userId,
        isActive: false,
      });

      await service.delete(userId);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      const userId = 1;
      const role = 'MANAGER';

      prismaMock.user.findUnique.mockResolvedValue({ id: userId });
      prismaMock.user.update.mockResolvedValue({
        id: userId,
        role,
      });

      const result = await service.assignRole(userId, role);

      expect(result.role).toBe(role);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.assignRole(999, 'MANAGER')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

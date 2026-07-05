import { Test, TestingModule } from '@nestjs/testing';
import { LabourStaffService } from '../services/labour-staff.service';
import { PrismaService } from '@database/prisma.service';

describe('LabourStaffService', () => {
  let service: LabourStaffService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
    },
    leaveManagement: {
      findMany: jest.fn(),
    },
  };

  const mockEmployee = {
    id: 1,
    organizationId: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '1234567890',
    department: 'Engineering',
    position: 'Developer',
    salary: 50000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabourStaffService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LabourStaffService>(LabourStaffService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmployeeStats', () => {
    it('should return employee stats with attendance and leaves', async () => {
      const employeeId = 1;
      const organizationId = 1;

      mockPrismaService.employee.findUnique.mockResolvedValue({
        ...mockEmployee,
        Attendance: [],
        LeaveManagement: [],
      });

      mockPrismaService.attendance.findMany.mockResolvedValue([
        {
          id: 1,
          organizationId,
          employeeId,
          status: 'PRESENT',
          attendanceDate: new Date(),
        },
      ]);

      mockPrismaService.leaveManagement.findMany.mockResolvedValue([]);

      const result = await service.getEmployeeStats(organizationId, employeeId);

      expect(result).toBeDefined();
      expect(result?.employee).toEqual(expect.objectContaining({ firstName: 'John' }));
      expect(result?.attendanceThisMonth).toEqual(1);
      expect(result?.totalLeaves).toEqual(0);
    });

    it('should return null for non-existent employee', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      const result = await service.getEmployeeStats(1, 999);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.employee.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getEmployeeStats(1, 1)).rejects.toThrow('Database error');
    });
  });

  describe('getOrganizationEmployees', () => {
    it('should return all active employees for organization', async () => {
      const organizationId = 1;

      mockPrismaService.employee.findMany.mockResolvedValue([
        mockEmployee,
        { ...mockEmployee, id: 2, firstName: 'Jane' },
      ]);

      const result = await service.getOrganizationEmployees(organizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ firstName: 'John' }));
      expect(result[1]).toEqual(expect.objectContaining({ firstName: 'Jane' }));
    });

    it('should return empty array when no employees exist', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);

      const result = await service.getOrganizationEmployees(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('updateEmployeeSalary', () => {
    it('should update employee salary', async () => {
      const employeeId = 1;
      const newSalary = 60000;

      mockPrismaService.employee.update.mockResolvedValue({
        ...mockEmployee,
        salary: newSalary,
      });

      const result = await service.updateEmployeeSalary(employeeId, newSalary);

      expect(result.salary).toBe(newSalary);
      expect(mockPrismaService.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: employeeId },
          data: { salary: newSalary },
        }),
      );
    });

    it('should handle update errors', async () => {
      mockPrismaService.employee.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.updateEmployeeSalary(1, 60000)).rejects.toThrow('Update failed');
    });
  });

  describe('getEmployeeLeaveBalance', () => {
    it('should return leave balance for employee', async () => {
      const organizationId = 1;
      const employeeId = 1;

      const mockLeaves = [
        {
          id: 1,
          leaveType: 'CASUAL',
          startDate: new Date(),
          endDate: new Date(),
          daysUsed: 2,
          approvalStatus: 'APPROVED',
        },
      ];

      mockPrismaService.leaveManagement.findMany.mockResolvedValue(mockLeaves);

      const result = await service.getEmployeeLeaveBalance(organizationId, employeeId);

      expect(result.employeeId).toBe(employeeId);
      expect(result.totalLeavesApproved).toBe(1);
      expect(result.leaves).toHaveLength(1);
    });

    it('should handle no leaves', async () => {
      mockPrismaService.leaveManagement.findMany.mockResolvedValue([]);

      const result = await service.getEmployeeLeaveBalance(1, 1);

      expect(result.totalLeavesApproved).toBe(0);
      expect(result.leaves).toHaveLength(0);
    });
  });
});

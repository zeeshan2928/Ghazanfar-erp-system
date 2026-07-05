import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LabourStaffController } from '../controllers/labour-staff.controller';
import { LabourStaffService } from '../services/labour-staff.service';
import { AttendanceService } from '../services/attendance.service';
import { LeaveService } from '../services/leave.service';
import { BonusCalculationService } from '../services/bonus-calculation.service';

describe('LabourStaffController', () => {
  let controller: LabourStaffController;
  let labourStaffService: LabourStaffService;
  let attendanceService: AttendanceService;
  let leaveService: LeaveService;
  let bonusService: BonusCalculationService;

  const mockLabourStaffService = {
    getOrganizationEmployees: jest.fn(),
    getEmployeeStats: jest.fn(),
    updateEmployeeSalary: jest.fn(),
    getEmployeeLeaveBalance: jest.fn(),
  };

  const mockAttendanceService = {
    recordAttendance: jest.fn(),
    getAttendanceHistory: jest.fn(),
    getMonthlyAttendanceStats: jest.fn(),
    bulkUpdateAttendance: jest.fn(),
    getOrganizationAttendanceStats: jest.fn(),
  };

  const mockLeaveService = {
    applyForLeave: jest.fn(),
    getPendingLeaves: jest.fn(),
    getLeaveHistory: jest.fn(),
    getLeaveBalance: jest.fn(),
    approveLeave: jest.fn(),
    rejectLeave: jest.fn(),
  };

  const mockBonusService = {
    calculateMonthlyBonus: jest.fn(),
    calculateAllMonthlyBonuses: jest.fn(),
    getBonusHistory: jest.fn(),
    getOrganizationBonusStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabourStaffController],
      providers: [
        {
          provide: LabourStaffService,
          useValue: mockLabourStaffService,
        },
        {
          provide: AttendanceService,
          useValue: mockAttendanceService,
        },
        {
          provide: LeaveService,
          useValue: mockLeaveService,
        },
        {
          provide: BonusCalculationService,
          useValue: mockBonusService,
        },
      ],
    }).compile();

    controller = module.get<LabourStaffController>(LabourStaffController);
    labourStaffService = module.get<LabourStaffService>(LabourStaffService);
    attendanceService = module.get<AttendanceService>(AttendanceService);
    leaveService = module.get<LeaveService>(LeaveService);
    bonusService = module.get<BonusCalculationService>(BonusCalculationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerStaff', () => {
    it('should successfully register new staff member', async () => {
      const staffData = {
        organizationId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        department: 'Engineering',
        position: 'Developer',
        salary: 50000,
      };

      const mockEmployee = { id: 1, ...staffData };
      mockLabourStaffService.getOrganizationEmployees.mockResolvedValue([mockEmployee]);

      const result = await controller.registerStaff(staffData);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(mockEmployee);
    });

    it('should handle registration errors', async () => {
      mockLabourStaffService.getOrganizationEmployees.mockRejectedValue(
        new Error('Registration failed'),
      );

      const staffData = {
        organizationId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        department: 'Engineering',
        position: 'Developer',
        salary: 50000,
      };

      await expect(controller.registerStaff(staffData)).rejects.toThrow(HttpException);
    });
  });

  describe('getOrganizationStaff', () => {
    it('should return all staff members for organization', async () => {
      const mockStaff = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' },
      ];

      mockLabourStaffService.getOrganizationEmployees.mockResolvedValue(mockStaff);

      const result = await controller.getOrganizationStaff('1');

      expect(result.status).toBe('success');
      expect(result.count).toBe(2);
      expect(result.data).toEqual(mockStaff);
    });

    it('should handle errors when fetching staff', async () => {
      mockLabourStaffService.getOrganizationEmployees.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.getOrganizationStaff('1')).rejects.toThrow(HttpException);
    });
  });

  describe('recordCheckIn', () => {
    it('should record check-in attendance', async () => {
      const checkInData = {
        organizationId: 1,
        employeeId: 1,
        date: '2026-07-05',
      };

      const mockAttendance = { id: 1, status: 'PRESENT', ...checkInData };
      mockAttendanceService.recordAttendance.mockResolvedValue(mockAttendance);

      const result = await controller.recordCheckIn(checkInData);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Check-in recorded');
      expect(result.data).toEqual(mockAttendance);
    });

    it('should handle check-in errors', async () => {
      mockAttendanceService.recordAttendance.mockRejectedValue(new Error('Check-in failed'));

      await expect(
        controller.recordCheckIn({
          organizationId: 1,
          employeeId: 1,
          date: '2026-07-05',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('applyLeave', () => {
    it('should submit leave application', async () => {
      const leaveData = {
        organizationId: 1,
        employeeId: 1,
        leaveType: 'CASUAL',
        startDate: '2026-07-10',
        endDate: '2026-07-12',
      };

      const mockLeave = { id: 1, approvalStatus: 'PENDING', ...leaveData };
      mockLeaveService.applyForLeave.mockResolvedValue(mockLeave);

      const result = await controller.applyLeave(leaveData);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Leave application submitted');
      expect(result.data.approvalStatus).toBe('PENDING');
    });

    it('should handle leave application errors', async () => {
      mockLeaveService.applyForLeave.mockRejectedValue(new Error('Leave application failed'));

      await expect(
        controller.applyLeave({
          organizationId: 1,
          employeeId: 1,
          leaveType: 'CASUAL',
          startDate: '2026-07-10',
          endDate: '2026-07-12',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getPendingLeaves', () => {
    it('should return pending leave requests', async () => {
      const mockLeaves = [
        { id: 1, approvalStatus: 'PENDING', leaveType: 'CASUAL' },
        { id: 2, approvalStatus: 'PENDING', leaveType: 'SICK' },
      ];

      mockLeaveService.getPendingLeaves.mockResolvedValue(mockLeaves);

      const result = await controller.getPendingLeaves('1');

      expect(result.status).toBe('success');
      expect(result.count).toBe(2);
      expect(result.data).toEqual(mockLeaves);
    });
  });

  describe('approveLeave', () => {
    it('should approve leave request', async () => {
      const mockApprovedLeave = {
        id: 1,
        approvalStatus: 'APPROVED',
        approvedBy: 5,
      };

      mockLeaveService.approveLeave.mockResolvedValue(mockApprovedLeave);

      const result = await controller.approveLeave('1', { approvedBy: 5 });

      expect(result.status).toBe('success');
      expect(result.message).toBe('Leave approved');
      expect(result.data.approvalStatus).toBe('APPROVED');
    });

    it('should handle approval errors', async () => {
      mockLeaveService.approveLeave.mockRejectedValue(new Error('Approval failed'));

      await expect(controller.approveLeave('1', { approvedBy: 5 })).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('calculateBonus', () => {
    it('should calculate monthly bonus', async () => {
      const bonusData = {
        organizationId: 1,
        employeeId: 1,
        month: 6,
        year: 2026,
        baseBonus: 1000,
      };

      const mockBonus = { id: 1, bonusAmount: 1500, bonusMonth: '2026-06-01' };
      mockBonusService.calculateMonthlyBonus.mockResolvedValue(mockBonus);

      const result = await controller.calculateBonus(bonusData);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Bonus calculated');
      expect(result.data).toEqual(mockBonus);
    });

    it('should handle bonus calculation errors', async () => {
      mockBonusService.calculateMonthlyBonus.mockRejectedValue(new Error('Calculation failed'));

      await expect(
        controller.calculateBonus({
          organizationId: 1,
          employeeId: 1,
          month: 6,
          year: 2026,
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('calculateAllBonuses', () => {
    it('should calculate bonuses for all employees', async () => {
      const bonusData = {
        organizationId: 1,
        month: 6,
        year: 2026,
      };

      const mockBonuses = [
        { id: 1, employeeId: 1, bonusAmount: 1500 },
        { id: 2, employeeId: 2, bonusAmount: 1200 },
      ];

      mockBonusService.calculateAllMonthlyBonuses.mockResolvedValue(mockBonuses);

      const result = await controller.calculateAllBonuses(bonusData);

      expect(result.status).toBe('success');
      expect(result.count).toBe(2);
      expect(result.message).toContain('Calculated bonuses for 2 employees');
    });
  });
});

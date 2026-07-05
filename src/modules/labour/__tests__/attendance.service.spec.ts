import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from '../services/attendance.service';
import { PrismaService } from '@database/prisma.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    attendance: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAttendanceRecord = {
    id: 1,
    organizationId: 1,
    employeeId: 1,
    attendanceDate: new Date('2026-07-05'),
    status: 'PRESENT',
    hoursWorked: 8,
    remarks: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordAttendance', () => {
    it('should record attendance with PRESENT status', async () => {
      mockPrismaService.attendance.create.mockResolvedValue(mockAttendanceRecord);

      const result = await service.recordAttendance(
        1,
        1,
        new Date('2026-07-05'),
        'PRESENT',
        8,
      );

      expect(result).toEqual(mockAttendanceRecord);
      expect(mockPrismaService.attendance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 1,
            employeeId: 1,
            status: 'PRESENT',
          }),
        }),
      );
    });

    it('should record attendance with ABSENT status', async () => {
      const absentRecord = { ...mockAttendanceRecord, status: 'ABSENT' };
      mockPrismaService.attendance.create.mockResolvedValue(absentRecord);

      const result = await service.recordAttendance(1, 1, new Date('2026-07-05'), 'ABSENT');

      expect(result.status).toBe('ABSENT');
    });

    it('should handle database errors', async () => {
      mockPrismaService.attendance.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.recordAttendance(1, 1, new Date(), 'PRESENT'),
      ).rejects.toThrow('DB error');
    });
  });

  describe('getAttendanceHistory', () => {
    it('should retrieve attendance records within date range', async () => {
      const records = [
        mockAttendanceRecord,
        { ...mockAttendanceRecord, id: 2, status: 'ABSENT' },
      ];

      mockPrismaService.attendance.findMany.mockResolvedValue(records);

      const result = await service.getAttendanceHistory(
        1,
        1,
        new Date('2026-07-01'),
        new Date('2026-07-31'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PRESENT');
      expect(result[1].status).toBe('ABSENT');
    });

    it('should return empty array for date range with no records', async () => {
      mockPrismaService.attendance.findMany.mockResolvedValue([]);

      const result = await service.getAttendanceHistory(1, 1, new Date(), new Date());

      expect(result).toHaveLength(0);
    });
  });

  describe('getMonthlyAttendanceStats', () => {
    it('should calculate correct attendance statistics', async () => {
      const records = [
        { ...mockAttendanceRecord, status: 'PRESENT' },
        { ...mockAttendanceRecord, id: 2, status: 'PRESENT' },
        { ...mockAttendanceRecord, id: 3, status: 'ABSENT' },
        { ...mockAttendanceRecord, id: 4, status: 'LEAVE' },
      ];

      mockPrismaService.attendance.findMany.mockResolvedValue(records);

      const result = await service.getMonthlyAttendanceStats(1, 1, 6, 2026);

      expect(result.total).toBe(4);
      expect(result.present).toBe(2);
      expect(result.absent).toBe(1);
      expect(result.leave).toBe(1);
      expect(result.attendancePercentage).toBe(50);
    });

    it('should handle empty attendance records', async () => {
      mockPrismaService.attendance.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyAttendanceStats(1, 1, 6, 2026);

      expect(result.total).toBe(0);
      expect(result.attendancePercentage).toBe(0);
    });
  });

  describe('bulkUpdateAttendance', () => {
    it('should update multiple attendance records', async () => {
      mockPrismaService.attendance.findFirst.mockResolvedValue(mockAttendanceRecord);
      mockPrismaService.attendance.update.mockResolvedValue(
        { ...mockAttendanceRecord, status: 'LEAVE' },
      );

      const updates = [
        { employeeId: 1, date: new Date('2026-07-05'), status: 'LEAVE' },
        { employeeId: 2, date: new Date('2026-07-05'), status: 'ABSENT' },
      ];

      const result = await service.bulkUpdateAttendance(1, updates);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.attendance.update).toHaveBeenCalledTimes(2);
    });

    it('should create new records if they do not exist', async () => {
      mockPrismaService.attendance.findFirst.mockResolvedValue(null);
      mockPrismaService.attendance.create.mockResolvedValue(mockAttendanceRecord);

      const updates = [
        { employeeId: 1, date: new Date('2026-07-05'), status: 'PRESENT' },
      ];

      const result = await service.bulkUpdateAttendance(1, updates);

      expect(mockPrismaService.attendance.create).toHaveBeenCalled();
    });
  });

  describe('getOrganizationAttendanceStats', () => {
    it('should aggregate attendance statistics for organization', async () => {
      const records = [
        { ...mockAttendanceRecord, status: 'PRESENT', employee: { id: 1 } },
        { ...mockAttendanceRecord, id: 2, status: 'PRESENT', employee: { id: 2 } },
        { ...mockAttendanceRecord, id: 3, status: 'ABSENT', employee: { id: 3 } },
      ];

      mockPrismaService.attendance.findMany.mockResolvedValue(records);

      const result = await service.getOrganizationAttendanceStats(1);

      expect(result.total).toBe(3);
      expect(result.present).toBe(2);
      expect(result.absent).toBe(1);
      expect(result.attendancePercentage).toBeCloseTo(66.67, 1);
    });
  });
});

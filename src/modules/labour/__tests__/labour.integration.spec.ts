import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { LabourModule } from '../labour.module';
import { PrismaService } from '@database/prisma.service';

describe('Labour Module Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const mockOrganizationId = 1;
  const mockEmployeeData = {
    organizationId: mockOrganizationId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    department: 'Engineering',
    position: 'Software Developer',
    salary: 50000,
  };

  const mockAttendanceData = {
    organizationId: mockOrganizationId,
    employeeId: 1,
    date: new Date('2026-07-05').toISOString(),
  };

  const mockLeaveData = {
    organizationId: mockOrganizationId,
    employeeId: 1,
    leaveType: 'CASUAL',
    startDate: '2026-07-10',
    endDate: '2026-07-12',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LabourModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Staff Management Flow', () => {
    describe('POST /labour/staff', () => {
      it('should register a new staff member', async () => {
        const response = await request(app.getHttpServer())
          .post('/labour/staff')
          .send(mockEmployeeData)
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      });

      it('should validate required fields', async () => {
        const invalidData = {
          organizationId: mockOrganizationId,
          firstName: 'John',
          // Missing other required fields
        };

        await request(app.getHttpServer())
          .post('/labour/staff')
          .send(invalidData)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('GET /labour/staff/:organizationId', () => {
      it('should retrieve all staff members', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/staff/${mockOrganizationId}`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.count).toBeGreaterThanOrEqual(0);
      });

      it('should handle invalid organization ID', async () => {
        await request(app.getHttpServer())
          .get('/labour/staff/invalid-id')
          .expect(HttpStatus.INTERNAL_SERVER_ERROR);
      });
    });

    describe('GET /labour/staff/:organizationId/:employeeId', () => {
      it('should retrieve staff member details', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/staff/${mockOrganizationId}/1`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      });

      it('should return 404 for non-existent staff', async () => {
        await request(app.getHttpServer())
          .get(`/labour/staff/${mockOrganizationId}/99999`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('PUT /labour/staff/:employeeId', () => {
      it('should update staff member salary', async () => {
        const response = await request(app.getHttpServer())
          .put('/labour/staff/1')
          .send({ salary: 60000 })
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('updated');
      });
    });
  });

  describe('Attendance Management Flow', () => {
    describe('POST /labour/attendance/check-in', () => {
      it('should record check-in', async () => {
        const response = await request(app.getHttpServer())
          .post('/labour/attendance/check-in')
          .send(mockAttendanceData)
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Check-in');
        expect(response.body.data).toBeDefined();
      });
    });

    describe('GET /labour/attendance/:organizationId', () => {
      it('should retrieve organization attendance stats', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/attendance/${mockOrganizationId}`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      });

      it('should retrieve employee attendance history', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/attendance/${mockOrganizationId}?employeeId=1`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /labour/attendance/:organizationId/:employeeId/monthly', () => {
      it('should retrieve monthly attendance statistics', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/attendance/${mockOrganizationId}/1/monthly?month=7&year=2026`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(response.body.data.attendancePercentage).toBeDefined();
      });
    });

    describe('POST /labour/attendance/bulk-update', () => {
      it('should bulk update attendance records', async () => {
        const bulkData = {
          organizationId: mockOrganizationId,
          updates: [
            { employeeId: 1, date: '2026-07-05', status: 'PRESENT' },
            { employeeId: 2, date: '2026-07-05', status: 'ABSENT' },
          ],
        };

        const response = await request(app.getHttpServer())
          .post('/labour/attendance/bulk-update')
          .send(bulkData)
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Updated');
      });
    });
  });

  describe('Leave Management Flow', () => {
    describe('POST /labour/leaves', () => {
      it('should submit leave application', async () => {
        const response = await request(app.getHttpServer())
          .post('/labour/leaves')
          .send(mockLeaveData)
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Leave application');
      });

      it('should validate leave dates', async () => {
        const invalidLeaveData = {
          ...mockLeaveData,
          startDate: '2026-07-12',
          endDate: '2026-07-10', // End before start
        };

        await request(app.getHttpServer())
          .post('/labour/leaves')
          .send(invalidLeaveData)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('GET /labour/leaves/pending/:organizationId', () => {
      it('should retrieve pending leave requests', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/leaves/pending/${mockOrganizationId}`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /labour/leaves/:organizationId/:employeeId', () => {
      it('should retrieve employee leave history', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/leaves/${mockOrganizationId}/1`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /labour/leaves/:organizationId/:employeeId/balance', () => {
      it('should retrieve leave balance', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/leaves/${mockOrganizationId}/1/balance`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(response.body.data.totalLeavesApproved).toBeDefined();
      });
    });

    describe('POST /labour/leaves/:leaveId/approve', () => {
      it('should approve leave request', async () => {
        const response = await request(app.getHttpServer())
          .post('/labour/leaves/1/approve')
          .send({ approvedBy: 1 })
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('approved');
      });
    });

    describe('POST /labour/leaves/:leaveId/reject', () => {
      it('should reject leave request', async () => {
        const response = await request(app.getHttpServer())
          .post('/labour/leaves/1/reject')
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('rejected');
      });
    });
  });

  describe('Bonus Management Flow', () => {
    describe('POST /labour/bonus/calculate', () => {
      it('should calculate bonus for employee', async () => {
        const bonusData = {
          organizationId: mockOrganizationId,
          employeeId: 1,
          month: 7,
          year: 2026,
          baseBonus: 1000,
        };

        const response = await request(app.getHttpServer())
          .post('/labour/bonus/calculate')
          .send(bonusData)
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Bonus calculated');
      });
    });

    describe('POST /labour/bonus/calculate-all', () => {
      it('should calculate bonuses for all employees', async () => {
        const bonusData = {
          organizationId: mockOrganizationId,
          month: 7,
          year: 2026,
        };

        const response = await request(app.getHttpServer())
          .post('/labour/bonus/calculate-all')
          .send(bonusData)
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.count).toBeGreaterThanOrEqual(0);
      });
    });

    describe('GET /labour/bonus/:organizationId/:employeeId/history', () => {
      it('should retrieve bonus history', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/bonus/${mockOrganizationId}/1/history`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /labour/bonus/:organizationId/summary', () => {
      it('should retrieve organization bonus summary', async () => {
        const response = await request(app.getHttpServer())
          .get(`/labour/bonus/${mockOrganizationId}/summary?month=7&year=2026`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(response.body.data.totalAmount).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized access', async () => {
      await request(app.getHttpServer())
        .get(`/labour/staff/${mockOrganizationId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should handle invalid JSON in request body', async () => {
      await request(app.getHttpServer())
        .post('/labour/staff')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});

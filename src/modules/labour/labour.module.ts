import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { LabourStaffService } from './services/labour-staff.service';
import { AttendanceService } from './services/attendance.service';
import { LeaveService } from './services/leave.service';
import { BonusCalculationService } from './services/bonus-calculation.service';
import { LabourStaffController } from './controllers/labour-staff.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [LabourStaffController],
  providers: [LabourStaffService, AttendanceService, LeaveService, BonusCalculationService],
  exports: [LabourStaffService, AttendanceService, LeaveService, BonusCalculationService],
})
export class LabourModule {}

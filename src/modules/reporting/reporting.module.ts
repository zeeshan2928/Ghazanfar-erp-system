import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './services/reporting.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}

import { Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { AuditController } from './audit.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

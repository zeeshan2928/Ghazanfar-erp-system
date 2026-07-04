import { Module } from '@nestjs/common';
import { PermissionsService } from './services/permissions.service';
import { PermissionsController } from './permissions.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [DatabaseModule, CommonModule, AuditModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}

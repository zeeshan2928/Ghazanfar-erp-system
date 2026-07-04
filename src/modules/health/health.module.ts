import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health-check.service';
import { DatabaseModule } from '../../database/database.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [HealthController],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthModule {}

import { Module } from '@nestjs/common';
import { ArApAgingService } from './services/ar-ap-aging.service';
import { ArApAgingController } from './controllers/ar-ap-aging.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ArApAgingService],
  controllers: [ArApAgingController],
  exports: [ArApAgingService],
})
export class ArApAgingModule {}

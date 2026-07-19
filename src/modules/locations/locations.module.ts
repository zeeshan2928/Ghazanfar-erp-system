import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LocationsService } from './services/locations.service';
import { LocationsController } from './locations.controller';

@Module({
  imports: [DatabaseModule, CommonModule, NotificationsModule],
  providers: [LocationsService],
  controllers: [LocationsController],
  exports: [LocationsService],
})
export class LocationsModule {}

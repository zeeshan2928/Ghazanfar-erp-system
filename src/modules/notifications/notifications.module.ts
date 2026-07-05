import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './notifications.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

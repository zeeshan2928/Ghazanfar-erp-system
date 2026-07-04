import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './notifications.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

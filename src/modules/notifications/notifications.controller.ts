import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import {
  CreateNotificationDto,
  SendNotificationDto,
  NotificationPreferenceDto,
} from './dto/create-notification.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * Get user's notifications (paginated, unread first)
   */
  @Get()
  async getNotifications(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.notificationsService.getUserNotifications(
      orgContext.organizationId,
      orgContext.userId,
      skipNum,
      takeNum,
    );
  }

  /**
   * Get notification history with filters
   */
  @Get('history')
  async getHistory(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('type') type?: string,
    @Query('isRead') isRead?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;
    const filters = {
      type,
      isRead: isRead === 'true',
      startDate,
      endDate,
    };

    return this.notificationsService.getNotificationHistory(
      orgContext.organizationId,
      filters,
      skipNum,
      takeNum,
    );
  }

  /**
   * Mark notification as read
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') notificationId: string, @OrgContext() orgContext?: any) {
    return this.notificationsService.markAsRead(
      orgContext.organizationId,
      parseInt(notificationId, 10),
    );
  }

  /**
   * Mark all notifications as read
   */
  @Post('mark-all/read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@OrgContext() orgContext?: any) {
    return this.notificationsService.markAllAsRead(orgContext.organizationId, orgContext.userId);
  }

  /**
   * Delete notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(@Param('id') notificationId: string, @OrgContext() orgContext?: any) {
    await this.notificationsService.deleteNotification(
      orgContext.organizationId,
      parseInt(notificationId, 10),
    );
  }

  /**
   * Get user notification preferences
   */
  @Get('preferences')
  async getPreferences(@OrgContext() orgContext?: any) {
    return this.notificationsService.getNotificationPreferences(
      orgContext.organizationId,
      orgContext.userId,
    );
  }

  /**
   * Save/Update notification preferences
   */
  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  async savePreferences(@Body() dto: NotificationPreferenceDto, @OrgContext() orgContext?: any) {
    return this.notificationsService.saveNotificationPreferences(
      orgContext.organizationId,
      orgContext.userId,
      dto,
    );
  }
}

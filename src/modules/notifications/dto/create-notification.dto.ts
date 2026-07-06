import { IsString, IsInt, IsOptional, IsObject, IsEnum } from 'class-validator';
import { NotificationType } from '../types/notification-type.enum';

export class CreateNotificationDto {
  @IsInt()
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: any;
}

export class SendNotificationDto {
  @IsInt()
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class NotificationPreferenceDto {
  @IsOptional()
  billApprovalEmail?: boolean;

  @IsOptional()
  billPaidEmail?: boolean;

  @IsOptional()
  paymentDueEmail?: boolean;

  @IsOptional()
  poApprovalEmail?: boolean;

  @IsOptional()
  poReceivedEmail?: boolean;

  @IsOptional()
  poDelayedEmail?: boolean;

  @IsOptional()
  inventoryLowEmail?: boolean;

  @IsOptional()
  inventoryLowSMS?: boolean;
}

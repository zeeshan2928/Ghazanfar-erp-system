import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { EmailTemplateType } from '../types/email-template-type.enum';

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PreviewEmailTemplateDto {
  @IsEnum(EmailTemplateType)
  templateType: EmailTemplateType;

  @IsOptional()
  sampleData?: any;
}

export class SendTestEmailDto {
  @IsEnum(EmailTemplateType)
  templateType: EmailTemplateType;

  @IsString()
  testEmail: string;
}

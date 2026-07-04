import { Module } from '@nestjs/common';
import { EmailTemplateService } from './services/email-template.service';
import { EmailController } from './email.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [EmailController],
  providers: [EmailTemplateService],
  exports: [EmailTemplateService],
})
export class EmailModule {}

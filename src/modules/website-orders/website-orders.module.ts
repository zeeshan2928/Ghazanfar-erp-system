import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { BillsModule } from '@modules/bills/bills.module';
import { WebsiteOrdersController } from './website-orders.controller';
import { WebsiteOrdersService } from './services/website-orders.service';

@Module({
  imports: [DatabaseModule, CommonModule, BillsModule],
  controllers: [WebsiteOrdersController],
  providers: [WebsiteOrdersService],
  exports: [WebsiteOrdersService],
})
export class WebsiteOrdersModule {}

import { Module } from '@nestjs/common';
import { BillsService } from './services/bills.service';
import { BillsSearchService } from './services/bills-search.service';
import { BillsController } from './bills.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [BillsController],
  providers: [BillsService, BillsSearchService],
  exports: [BillsService, BillsSearchService],
})
export class BillsModule {}

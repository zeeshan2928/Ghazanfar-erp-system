import { Module } from '@nestjs/common';
import { CustomersService } from './services/customers.service';
import { CustomersSearchService } from './services/customers-search.service';
import { CustomersController } from './customers.controller';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomersSearchService],
  exports: [CustomersService, CustomersSearchService],
})
export class CustomersModule {}

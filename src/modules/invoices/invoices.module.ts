import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { InvoicesService } from './services/invoices.service';

@Module({
  imports: [DatabaseModule],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

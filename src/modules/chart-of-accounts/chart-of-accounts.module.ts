import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ChartOfAccountsService } from './services/chart-of-accounts.service';
import { ChartOfAccountsController } from './controllers/chart-of-accounts.controller';

@Module({
  imports: [DatabaseModule],
  providers: [ChartOfAccountsService],
  controllers: [ChartOfAccountsController],
  exports: [ChartOfAccountsService],
})
export class ChartOfAccountsModule {}

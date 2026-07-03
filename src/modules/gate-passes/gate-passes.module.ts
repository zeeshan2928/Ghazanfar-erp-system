import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { GatePassesController } from './gate-passes.controller';
import { GatePassesService } from './services/gate-passes.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [GatePassesController],
  providers: [GatePassesService],
  exports: [GatePassesService],
})
export class GatePassesModule {}

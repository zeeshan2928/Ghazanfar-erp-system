import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ArchivalService } from './services/archival.service';
import { DataManagementController } from './controllers/data-management.controller';
import { PrismaService } from '@database/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [DataManagementController],
  providers: [ArchivalService, PrismaService],
  exports: [ArchivalService],
})
export class DataManagementModule {}

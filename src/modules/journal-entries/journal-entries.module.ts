import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { JournalEntriesService } from './services/journal-entries.service';
import { GLPostingService } from './services/gl-posting.service';
import { JournalEntriesController } from './controllers/journal-entries.controller';

@Module({
  imports: [DatabaseModule],
  providers: [JournalEntriesService, GLPostingService],
  controllers: [JournalEntriesController],
  exports: [JournalEntriesService, GLPostingService],
})
export class JournalEntriesModule {}

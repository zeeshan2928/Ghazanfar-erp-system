import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { GlobalSearchService } from './services/global-search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SearchController],
  providers: [GlobalSearchService],
  exports: [GlobalSearchService],
})
export class SearchModule {}

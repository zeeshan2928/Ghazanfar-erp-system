import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { GlobalSearchService } from './services/global-search.service';

@Controller('search')
@UseGuards(JwtGuard)
export class SearchController {
  constructor(private readonly globalSearchService: GlobalSearchService) {}

  @Get()
  async search(@Query('q') q: string, @OrgContext() { organizationId }: any) {
    return this.globalSearchService.search(organizationId, q || '');
  }
}

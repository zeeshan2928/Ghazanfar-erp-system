import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { JwtGuard } from '@common/guards/jwt.guard';
import { FinancialAccessGuard } from '@common/guards/financial-access.guard';
import { ProductCostService } from './product-cost.service';
import { ChangeCostDto, CorrectCostDto } from './dto/product-cost.dto';

// Cost is financial data, so gate the whole controller behind FinancialAccessGuard
// (same as the assembly/sales-analysis controllers).
@Controller('product-cost')
@UseGuards(JwtGuard, FinancialAccessGuard)
export class ProductCostController {
  constructor(private readonly service: ProductCostService) {}

  // Components whose cost feeds a build, with current cost + change count.
  @Get('components')
  async components(@Query('search') search: string | undefined, @OrgContext() ctx: any) {
    return { components: await this.service.listComponents(ctx.organizationId, search) };
  }

  // A component's cost timeline.
  @Get('products/:id/history')
  async history(@Param('id', ParseIntPipe) id: number, @OrgContext() ctx: any) {
    return { history: await this.service.getHistory(ctx.organizationId, id) };
  }

  // A component's cost on a specific date.
  @Get('products/:id/as-of')
  async asOf(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
    @OrgContext() ctx: any,
  ) {
    const d = new Date(date);
    if (isNaN(d.getTime())) throw new BadRequestException('date query param required (ISO)');
    return { productId: id, asOf: d.toISOString(), cost: await this.service.costAsOf(ctx.organizationId, id, d) };
  }

  // What a recipe cost to build on a specific date.
  @Get('boms/:id/as-of')
  async bomAsOf(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
    @OrgContext() ctx: any,
  ) {
    const d = new Date(date);
    if (isNaN(d.getTime())) throw new BadRequestException('date query param required (ISO)');
    return this.service.bomCostAsOf(ctx.organizationId, id, d);
  }

  // A genuine price change, effective from a date (INSERTs a dated row).
  @Post('products/:id/change')
  async change(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeCostDto,
    @OrgContext() ctx: any,
  ) {
    return {
      history: await this.service.changeCost(
        ctx.organizationId,
        id,
        dto.costPrice,
        new Date(dto.effectiveFrom),
        dto.note ?? null,
        ctx.email ?? null,
      ),
    };
  }

  // Fix a typo in the latest entry (UPDATEs it in place).
  @Post('products/:id/correct')
  async correct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CorrectCostDto,
    @OrgContext() ctx: any,
  ) {
    return {
      history: await this.service.correctLatest(
        ctx.organizationId,
        id,
        dto.costPrice,
        dto.note ?? null,
        ctx.email ?? null,
      ),
    };
  }

  @Delete('products/:id/history/:entryId')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @OrgContext() ctx: any,
  ) {
    return { history: await this.service.deleteEntry(ctx.organizationId, id, entryId) };
  }
}

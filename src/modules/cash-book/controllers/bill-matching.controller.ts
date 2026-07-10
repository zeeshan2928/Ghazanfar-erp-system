import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { BillMatchingService } from '../services/bill-matching.service';

@Controller('api/cash-book')
@UseGuards(JwtGuard)
export class BillMatchingController {
  constructor(private readonly billMatchingService: BillMatchingService) {}

  @Get('bills/unmatched')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.view')
  async getUnmatchedBills(@Req() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) throw new Error('Unauthorized');

    return this.billMatchingService.getUnmatchedBills(organizationId);
  }

  @Get('matches/candidates/:billId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.view')
  async getMatchingCandidates(@Param('billId') billId: string, @Req() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) throw new Error('Unauthorized');

    return this.billMatchingService.getMatchingCandidates(parseInt(billId), organizationId);
  }

  @Post('matches')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.match')
  async matchBillToEntry(
    @Body() dto: { billId: number; entryId: number; reason?: string },
    @Req() req: any,
  ) {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.sub;
    if (!organizationId || !userId) throw new Error('Unauthorized');

    return this.billMatchingService.matchBillToEntry(
      dto.billId,
      dto.entryId,
      organizationId,
      userId,
      dto.reason,
    );
  }

  @Delete('matches/:matchId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.match')
  async undoMatch(@Param('matchId') matchId: string, @Req() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) throw new Error('Unauthorized');

    return this.billMatchingService.undoMatch(parseInt(matchId), organizationId);
  }

  @Post('matches/batch-auto')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.match')
  async batchAutoMatch(@Req() req: any) {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.sub;
    if (!organizationId || !userId) throw new Error('Unauthorized');

    return this.billMatchingService.batchAutoMatch(organizationId, userId);
  }
}

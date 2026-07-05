import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { GatePassesService } from './services/gate-passes.service';
import { ConfirmGatePassDto, RejectGatePassDto } from './dto/confirm-gate-pass.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('gate-passes')
@UseGuards(JwtGuard)
export class GatePassesController {
  constructor(private gatePassesService: GatePassesService) {}

  @Get()
  async getPending(
    @Query('warehouseId') warehouseId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const warehouseIdNum = parseInt(warehouseId, 10);
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.gatePassesService.getPending(
      orgContext.organizationId,
      warehouseIdNum,
      skipNum,
      takeNum,
    );
  }

  @Get(':gatePassId')
  async getById(
    @Param('gatePassId') gatePassId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.gatePassesService.getById(
      orgContext.organizationId,
      parseInt(gatePassId, 10),
    );
  }

  @Post(':gatePassId/confirm')
  async confirm(
    @Param('gatePassId') gatePassId: string,
    @Body() confirmDto: ConfirmGatePassDto,
    @OrgContext() orgContext: any,
  ) {
    return this.gatePassesService.confirm(
      orgContext.organizationId,
      parseInt(gatePassId, 10),
      orgContext.userId,
      confirmDto,
    );
  }

  @Post(':gatePassId/reject')
  async reject(
    @Param('gatePassId') gatePassId: string,
    @Body() rejectDto: RejectGatePassDto,
    @OrgContext() orgContext: any,
  ) {
    return this.gatePassesService.reject(
      orgContext.organizationId,
      parseInt(gatePassId, 10),
      orgContext.userId,
      rejectDto,
    );
  }

  /**
   * REPORT SHORTAGE - warehouse staff marks items not available
   * POST /gate-passes/:gatePassId/shortage
   * Body: {
   *   shortageItems: [
   *     { billLineId: 1, orderQuantity: 10, pickedQuantity: 8 }
   *   ]
   * }
   */
  @Post(':gatePassId/shortage')
  async reportShortage(
    @Param('gatePassId') gatePassId: string,
    @Body() body: { shortageItems: Array<any> },
    @OrgContext() orgContext: any,
  ) {
    return this.gatePassesService.reportShortage(
      orgContext.organizationId,
      parseInt(gatePassId, 10),
      orgContext.userId,
      body.shortageItems,
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ActionPermissionGuard } from '../../../common/guards/action-permission.guard';
import { RequireAction } from '../../../common/decorators/require-action.decorator';
import { GatePassesService } from '../services/gate-passes.service';

@Controller('gate-passes')
@UseGuards(JwtGuard)
export class GatePassesController {
  constructor(private gatePassesService: GatePassesService) {}

  /**
   * GET all gate passes with filtering
   * Query params: warehouseId, status, skip, take
   */
  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('gatepasses.view')
  async getAllGatePasses(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const organizationId = req.user.organizationId;

    return this.gatePassesService.getAll(organizationId, {
      warehouseId: warehouseId ? parseInt(warehouseId) : undefined,
      status,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 20,
    });
  }

  /**
   * GET warehouse dashboard stats
   */
  @Get('warehouse/:warehouseId/stats')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('gatepasses.view')
  async getWarehouseStats(@Request() req: any, @Param('warehouseId') warehouseId: string) {
    const organizationId = req.user.organizationId;

    return this.gatePassesService.getWarehouseStats(organizationId, parseInt(warehouseId));
  }

  /**
   * GET single gate pass by ID
   */
  @Get(':id')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('gatepasses.view')
  async getGatePassById(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.user.organizationId;

    return this.gatePassesService.getById(organizationId, parseInt(id));
  }

  /**
   * POST - Auto-trigger: Create gate pass from bill
   * Called when bill status changes to CONFIRMED
   */
  @Post('from-bill/:billId')
  @HttpCode(HttpStatus.CREATED)
  async createFromBill(@Request() req: any, @Param('billId') billId: string) {
    const organizationId = req.user.organizationId;

    return this.gatePassesService.createFromBill(organizationId, parseInt(billId));
  }

  /**
   * PATCH - Update picked quantity for single item
   */
  @Patch(':id/pick-item/:billLineId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('gatepasses.pick')
  async updatePickQuantity(
    @Request() req: any,
    @Param('id') gatePassId: string,
    @Param('billLineId') billLineId: string,
    @Body() body: { quantity: number },
  ) {
    const organizationId = req.user.organizationId;

    if (typeof body.quantity !== 'number' || body.quantity < 0) {
      throw new BadRequestException('Invalid quantity provided');
    }

    return this.gatePassesService.updatePickQuantity(
      organizationId,
      parseInt(gatePassId),
      parseInt(billLineId),
      body.quantity,
    );
  }

  /**
   * POST - Complete picking: Mark all items as picked
   */
  @Post(':id/complete-picking')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('gatepasses.pick')
  async completePicking(@Request() req: any, @Param('id') gatePassId: string) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.gatePassesService.completePicking(organizationId, parseInt(gatePassId), userId);
  }

  /**
   * POST - Confirm gate pass: Validates picked quantities and updates inventory
   */
  @Post(':id/confirm')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('gatepasses.confirm')
  async confirmGatePass(
    @Request() req: any,
    @Param('id') gatePassId: string,
    @Body() body: { pickedItems: Array<{ billLineId: number; pickedQuantity: number }> },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.gatePassesService.confirm(organizationId, parseInt(gatePassId), userId, body);
  }

  /**
   * POST - Reject gate pass: Release reserved inventory and return to PENDING
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('gatepasses.reject')
  async rejectGatePass(
    @Request() req: any,
    @Param('id') gatePassId: string,
    @Body() body: { reason?: string },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.gatePassesService.reject(organizationId, parseInt(gatePassId), userId, {
      reason: body.reason,
    });
  }

  /**
   * POST - Record a print event for a gate pass. First print always
   * succeeds; a second+ print is a reprint and is ADMIN-only (hard rule,
   * not a togglable permission). Call this right before window.print(),
   * and use the returned isDuplicate flag to render a DUPLICATE watermark.
   */
  @Post(':id/record-print')
  @HttpCode(HttpStatus.OK)
  async recordPrint(@Request() req: any, @Param('id') gatePassId: string) {
    return this.gatePassesService.recordPrint(
      req.user.organizationId,
      parseInt(gatePassId, 10),
      req.user.role,
    );
  }

  /**
   * POST - Report shortage: Staff marks items not available for picking
   */
  @Post(':id/report-shortage')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('gatepasses.report_shortage')
  async reportShortage(
    @Request() req: any,
    @Param('id') gatePassId: string,
    @Body()
    body: {
      items: Array<{
        billLineId: number;
        orderQuantity: number;
        pickedQuantity: number;
      }>;
    },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.gatePassesService.reportShortage(
      organizationId,
      parseInt(gatePassId),
      userId,
      body.items,
    );
  }
}

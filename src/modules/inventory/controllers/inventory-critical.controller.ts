import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ActionPermissionGuard } from '../../../common/guards/action-permission.guard';
import { RequireAction } from '../../../common/decorators/require-action.decorator';
import { InventoryCriticalFeaturesService } from '../services/inventory-critical-features.service';

@Controller('api/v1/inventory/critical')
@UseGuards(JwtGuard)
export class InventoryCriticalController {
  constructor(private criticalFeaturesService: InventoryCriticalFeaturesService) {}

  /**
   * POST - Set min/max stock levels for product
   */
  @Post('levels/set')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.set_levels')
  async setStockLevels(
    @Request() req: any,
    @Body()
    body: {
      inventoryId: number;
      minimumQuantity: number;
      reorderQuantity: number;
      maximumQuantity?: number;
      safetyStock?: number;
    },
  ) {
    const organizationId = req.user.organizationId;

    return this.criticalFeaturesService.setStockLevels(
      organizationId,
      body.inventoryId,
      body.minimumQuantity,
      body.reorderQuantity,
      body.maximumQuantity,
      body.safetyStock,
    );
  }

  /**
   * GET - Get reorder alerts (items below minimum)
   */
  @Get('alerts/reorder')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getReorderAlerts(@Request() req: any) {
    const organizationId = req.user.organizationId;

    return this.criticalFeaturesService.getReorderAlerts(organizationId);
  }

  /**
   * POST - Start physical inventory reconciliation
   */
  @Post('reconciliation/start')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.reconcile')
  async startReconciliation(@Request() req: any) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.criticalFeaturesService.startReconciliation(organizationId, userId);
  }

  /**
   * PATCH - Record physical count for an item
   */
  @Patch('reconciliation/count/:itemId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.reconcile')
  async recordPhysicalCount(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body() body: { countedQuantity: number },
  ) {
    const organizationId = req.user.organizationId;

    return this.criticalFeaturesService.recordPhysicalCount(
      organizationId,
      parseInt(itemId),
      body.countedQuantity,
    );
  }

  /**
   * PATCH - Approve reconciliation and apply adjustments
   */
  @Patch('reconciliation/:reconciliationId/approve')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.reconcile_approve')
  async approveReconciliation(
    @Request() req: any,
    @Param('reconciliationId') reconciliationId: string,
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.criticalFeaturesService.approveReconciliation(
      organizationId,
      parseInt(reconciliationId),
      userId,
    );
  }

  /**
   * POST - Process customer return
   */
  @Post('returns/customer')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.process_return')
  async processCustomerReturn(
    @Request() req: any,
    @Body()
    body: {
      billId: number;
      productId: number;
      quantity: number;
      reason: string;
    },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.criticalFeaturesService.processCustomerReturn(
      organizationId,
      body.billId,
      body.productId,
      body.quantity,
      body.reason,
      userId,
    );
  }

  /**
   * POST - Place stock hold (QC, dispute, etc)
   */
  @Post('holds/place')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.hold')
  async placeStockHold(
    @Request() req: any,
    @Body()
    body: {
      inventoryId: number;
      quantity: number;
      holdType: 'QC_HOLD' | 'DISPUTE' | 'DAMAGED_PENDING' | 'WARRANTY' | 'LEGAL_HOLD';
      reason: string;
    },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.criticalFeaturesService.placeStockHold(
      organizationId,
      body.inventoryId,
      body.quantity,
      body.holdType,
      body.reason,
      userId,
    );
  }

  /**
   * PATCH - Release stock hold
   */
  @Patch('holds/:holdId/release')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.hold')
  async releaseStockHold(@Request() req: any, @Param('holdId') holdId: string) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.criticalFeaturesService.releaseStockHold(organizationId, parseInt(holdId), userId);
  }

  /**
   * GET - Get inventory summary with min/max levels
   */
  @Get('summary-with-levels')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getInventorySummaryWithLevels(@Request() req: any) {
    const organizationId = req.user.organizationId;

    return this.criticalFeaturesService.getInventorySummaryWithLevels(organizationId);
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ActionPermissionGuard } from '../../../common/guards/action-permission.guard';
import { RequireAction } from '../../../common/decorators/require-action.decorator';
import { InventoryOperationsService } from '../services/inventory-operations.service';

@Controller('api/v1/inventory/operations')
@UseGuards(JwtGuard)
export class InventoryOperationsController {
  constructor(private inventoryOperationsService: InventoryOperationsService) {}

  /**
   * POST - Create new inventory record for a product in a warehouse
   * Body: { productId, warehouseId, openingBalance? }
   */
  @Post('create')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.set_levels')
  async createInventory(
    @Request() req: any,
    @Body()
    body: {
      productId: number;
      warehouseId: number;
      openingBalance?: number;
    },
  ) {
    const organizationId = req.user.organizationId;

    return this.inventoryOperationsService.createInventory(
      organizationId,
      body.productId,
      body.warehouseId,
      body.openingBalance || 0,
    );
  }

  /**
   * POST - Stock In (receive stock from PO, returns, etc)
   * Body: { productId, warehouseId, quantity, reference, remarks? }
   */
  @Post('stock-in')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.stock_in')
  async stockIn(
    @Request() req: any,
    @Body()
    body: {
      productId: number;
      warehouseId: number;
      quantity: number;
      reference: string;
      remarks?: string;
    },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.inventoryOperationsService.stockIn(
      organizationId,
      body.productId,
      body.warehouseId,
      body.quantity,
      body.reference,
      userId,
      body.remarks,
    );
  }

  /**
   * POST - Stock Out (issue stock for sales, transfers, etc)
   * Body: { productId, warehouseId, quantity, reference, remarks? }
   */
  @Post('stock-out')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.stock_out')
  async stockOut(
    @Request() req: any,
    @Body()
    body: {
      productId: number;
      warehouseId: number;
      quantity: number;
      reference: string;
      remarks?: string;
    },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.inventoryOperationsService.stockOut(
      organizationId,
      body.productId,
      body.warehouseId,
      body.quantity,
      body.reference,
      userId,
      body.remarks,
    );
  }

  /**
   * POST - Adjust Stock (damage, shrinkage, reconciliation)
   * Body: { productId, warehouseId, quantityDifference, adjustmentType, remarks? }
   */
  @Post('adjust')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.adjust')
  async adjustStock(
    @Request() req: any,
    @Body()
    body: {
      productId: number;
      warehouseId: number;
      quantityDifference: number;
      adjustmentType: 'DAMAGE' | 'SHRINKAGE' | 'ADJUSTMENT';
      remarks?: string;
    },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.inventoryOperationsService.adjustStock(
      organizationId,
      body.productId,
      body.warehouseId,
      body.quantityDifference,
      body.adjustmentType,
      userId,
      body.remarks,
    );
  }

  /**
   * POST - Initiate stock transfer between warehouses
   * Body: { productId, fromWarehouseId, toWarehouseId, quantity, remarks? }
   */
  @Post('transfers/initiate')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.transfer')
  async initiateTransfer(
    @Request() req: any,
    @Body()
    body: {
      productId: number;
      fromWarehouseId: number;
      toWarehouseId: number;
      quantity: number;
      remarks?: string;
    },
  ) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.inventoryOperationsService.initiateTransfer(
      organizationId,
      body.productId,
      body.fromWarehouseId,
      body.toWarehouseId,
      body.quantity,
      userId,
      body.remarks,
    );
  }

  /**
   * PATCH - Confirm transfer (warehouse receives stock)
   * Params: transferId
   */
  @Patch('transfers/:transferId/confirm')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.transfer')
  async confirmTransfer(@Request() req: any, @Param('transferId') transferId: string) {
    const organizationId = req.user.organizationId;
    const userId = req.user.sub;

    return this.inventoryOperationsService.confirmTransfer(
      organizationId,
      parseInt(transferId),
      userId,
    );
  }

  /**
   * GET - Get movement history for an inventory item
   * Query: limit?, offset?
   */
  @Get('movements/:inventoryId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getMovementHistory(
    @Request() req: any,
    @Param('inventoryId') inventoryId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const organizationId = req.user.organizationId;

    return this.inventoryOperationsService.getMovementHistory(
      organizationId,
      parseInt(inventoryId),
      limit ? parseInt(limit) : 100,
      offset ? parseInt(offset) : 0,
    );
  }

  /**
   * GET - Get transfer history
   * Query: warehouseId?, limit?, offset?
   */
  @Get('transfers/history')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getTransferHistory(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const organizationId = req.user.organizationId;

    return this.inventoryOperationsService.getTransferHistory(
      organizationId,
      warehouseId ? parseInt(warehouseId) : undefined,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  /**
   * GET - Get inventory summary across all warehouses
   */
  @Get('summary')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getInventorySummary(@Request() req: any) {
    const organizationId = req.user.organizationId;

    return this.inventoryOperationsService.getInventorySummary(organizationId);
  }
}

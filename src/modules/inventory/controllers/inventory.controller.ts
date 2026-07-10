import {
  Controller,
  Get,
  Post,
  Delete,
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
import { InventoryReservationService } from '../services/inventory-reservation.service';
import { InventoryOperationsService } from '../services/inventory-operations.service';

@Controller('api/v1/inventory')
@UseGuards(JwtGuard)
export class InventoryController {
  constructor(
    private inventoryReservationService: InventoryReservationService,
    private inventoryOperationsService: InventoryOperationsService,
  ) {}

  /**
   * POST - Create inventory for a product in a warehouse
   */
  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.set_levels')
  async createInventory(
    @Request() req: any,
    @Body() body: { productId: number; warehouseId: number; openingBalance?: number },
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
   * POST - Check availability for multiple products
   */
  @Post('check-availability')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async checkAvailability(
    @Request() req: any,
    @Body()
    body: {
      items: Array<{ productId: number; warehouseId: number; requiredQuantity: number }>;
    },
  ) {
    const organizationId = req.user.organizationId;

    return this.inventoryReservationService.bulkCheckAvailability(organizationId, body.items);
  }

  /**
   * GET - Get status of single inventory item with reservations
   */
  @Get(':productId/warehouse/:warehouseId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getInventoryStatus(
    @Request() req: any,
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    const organizationId = req.user.organizationId;

    return this.inventoryReservationService.getInventoryStatus(
      organizationId,
      parseInt(productId),
      parseInt(warehouseId),
    );
  }

  /**
   * GET - Reservation history for an inventory item
   */
  @Get(':inventoryId/reservations')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getReservationHistory(@Request() req: any, @Param('inventoryId') inventoryId: string) {
    const organizationId = req.user.organizationId;

    return this.inventoryReservationService.getReservationHistory(
      organizationId,
      parseInt(inventoryId),
    );
  }

  /**
   * GET - Detect shortage items in warehouse
   */
  @Get('shortages')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getShortages(@Request() req: any, @Query('warehouseId') warehouseId?: string) {
    const organizationId = req.user.organizationId;

    if (!warehouseId) {
      return {
        error: 'warehouseId query parameter required',
        status: 400,
      };
    }

    return this.inventoryReservationService.detectShortages(organizationId, parseInt(warehouseId));
  }

  /**
   * GET - Full warehouse inventory status
   */
  @Get('warehouse/:warehouseId/status')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.view')
  async getWarehouseInventoryStatus(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
  ) {
    const organizationId = req.user.organizationId;

    return this.inventoryReservationService.detectShortages(organizationId, parseInt(warehouseId));
  }

  /**
   * DELETE - Release a single reservation
   */
  @Delete('reservations/:reservationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ActionPermissionGuard)
  @RequireAction('inventory.release_reservation')
  async releaseReservation(
    @Request() req: any,
    @Param('reservationId') reservationId: string,
    @Body() body: { releaseType?: 'AUTO' | 'MANUAL' | 'EXPIRED' },
  ) {
    const organizationId = req.user.organizationId;
    const releaseType = body.releaseType || 'MANUAL';

    return this.inventoryReservationService.releaseReservation(
      organizationId,
      parseInt(reservationId),
      releaseType,
    );
  }
}

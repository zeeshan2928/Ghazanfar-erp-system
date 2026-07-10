import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { WarehouseTransfersService } from './services/warehouse-transfers.service';
import {
  CreateWarehouseTransferDto,
  ConfirmTransferReceiptDto,
  RejectTransferDto,
} from './dto/transfer.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('warehouse-transfers')
@UseGuards(JwtGuard)
export class WarehouseTransfersController {
  constructor(private transfersService: WarehouseTransfersService) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('warehouse_transfers.create')
  async create(@Body() createDto: CreateWarehouseTransferDto, @OrgContext() orgContext: any) {
    return this.transfersService.create(orgContext.organizationId, orgContext.userId, createDto);
  }

  @Post(':transferId/start')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('warehouse_transfers.start')
  async startTransfer(@Param('transferId') transferId: string, @OrgContext() orgContext: any) {
    return this.transfersService.startTransfer(orgContext.organizationId, parseInt(transferId, 10));
  }

  @Get('pending')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('warehouse_transfers.view')
  async getPending(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.transfersService.getPending(orgContext.organizationId, skipNum, takeNum);
  }

  @Get('in-transit')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('warehouse_transfers.view')
  async getInTransit(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.transfersService.getInTransit(orgContext.organizationId, skipNum, takeNum);
  }

  @Get(':transferId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('warehouse_transfers.view')
  async getById(@Param('transferId') transferId: string, @OrgContext() orgContext: any) {
    return this.transfersService.getById(orgContext.organizationId, parseInt(transferId, 10));
  }

  @Post(':transferId/confirm-receipt')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('warehouse_transfers.confirm_receipt')
  async confirmReceipt(
    @Param('transferId') transferId: string,
    @Body() confirmDto: ConfirmTransferReceiptDto,
    @OrgContext() orgContext: any,
  ) {
    return this.transfersService.confirmReceipt(
      orgContext.organizationId,
      parseInt(transferId, 10),
      orgContext.userId,
      confirmDto,
    );
  }

  @Post(':transferId/reject')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('warehouse_transfers.reject')
  async reject(
    @Param('transferId') transferId: string,
    @Body() rejectDto: RejectTransferDto,
    @OrgContext() orgContext: any,
  ) {
    return this.transfersService.reject(
      orgContext.organizationId,
      parseInt(transferId, 10),
      orgContext.userId,
      rejectDto,
    );
  }
}

import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { WarehouseTransfersService } from './services/warehouse-transfers.service';
import {
  CreateWarehouseTransferDto,
  ConfirmTransferReceiptDto,
  RejectTransferDto,
} from './dto/transfer.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('warehouse-transfers')
@UseGuards(JwtGuard)
export class WarehouseTransfersController {
  constructor(private transfersService: WarehouseTransfersService) {}

  @Post()
  async create(
    @Body() createDto: CreateWarehouseTransferDto,
    @OrgContext() orgContext: any,
  ) {
    return this.transfersService.create(
      orgContext.organizationId,
      orgContext.userId,
      createDto,
    );
  }

  @Post(':transferId/start')
  async startTransfer(
    @Param('transferId') transferId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.transfersService.startTransfer(
      orgContext.organizationId,
      parseInt(transferId, 10),
    );
  }

  @Get('pending')
  async getPending(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.transfersService.getPending(
      orgContext.organizationId,
      skipNum,
      takeNum,
    );
  }

  @Get('in-transit')
  async getInTransit(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.transfersService.getInTransit(
      orgContext.organizationId,
      skipNum,
      takeNum,
    );
  }

  @Get(':transferId')
  async getById(
    @Param('transferId') transferId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.transfersService.getById(
      orgContext.organizationId,
      parseInt(transferId, 10),
    );
  }

  @Post(':transferId/confirm-receipt')
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

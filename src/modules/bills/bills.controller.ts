import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { BillsService } from './services/bills.service';
import { BillsSearchService } from './services/bills-search.service';
import { CreateBillDto, UpdateBillDto, ChangeStatusDto } from './dto/create-bill.dto';
import { SearchRequestDto } from '@common/dto/filter.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('bills')
@UseGuards(JwtGuard)
export class BillsController {
  constructor(
    private billsService: BillsService,
    private billsSearchService: BillsSearchService,
  ) {}

  @Post()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.create')
  async create(@Body() createBillDto: CreateBillDto, @OrgContext() orgContext: any) {
    return this.billsService.create(orgContext.organizationId, orgContext.userId, createBillDto);
  }

  @Get()
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.view')
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;

    return this.billsService.findAll(orgContext.organizationId, skipNum, takeNum);
  }

  @Get(':billId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.view')
  async findById(@Param('billId') billId: string, @OrgContext() orgContext: any) {
    return this.billsService.findById(orgContext.organizationId, parseInt(billId, 10));
  }

  @Put(':billId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.edit')
  async update(
    @Param('billId') billId: string,
    @Body() updateBillDto: UpdateBillDto,
    @OrgContext() orgContext: any,
  ) {
    return this.billsService.update(orgContext.organizationId, parseInt(billId, 10), orgContext.userId, updateBillDto);
  }

  @Delete(':billId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.delete')
  async delete(@Param('billId') billId: string, @OrgContext() orgContext: any) {
    return this.billsService.delete(orgContext.organizationId, parseInt(billId, 10));
  }

  @Patch(':billId/status')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.change_status')
  async changeStatus(
    @Param('billId') billId: string,
    @Body() changeStatusDto: ChangeStatusDto,
    @OrgContext() orgContext: any,
  ) {
    return this.billsService.changeStatus(
      orgContext.organizationId,
      parseInt(billId, 10),
      changeStatusDto.status,
    );
  }

  @Get(':billId/export-pdf')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.export')
  async exportPDF(
    @Param('billId') billId: string,
    @OrgContext() orgContext: any,
    @Res() res: Response,
  ) {
    const pdfBase64 = await this.billsService.exportPDF(
      orgContext.organizationId,
      parseInt(billId, 10),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bill-${billId}.pdf"`);
    res.setHeader('Content-Transfer-Encoding', 'base64');
    return res.status(HttpStatus.OK).send(Buffer.from(pdfBase64, 'base64'));
  }

  @Post(':billId/send-email')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.export')
  async sendInvoiceEmail(
    @Param('billId') billId: string,
    @Body() body: { to?: string },
    @OrgContext() orgContext: any,
  ) {
    return this.billsService.sendInvoiceEmail(
      orgContext.organizationId,
      parseInt(billId, 10),
      body?.to,
    );
  }

  @Post('search')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('bills.view')
  async search(@Body() query: SearchRequestDto, @OrgContext() orgContext: any) {
    return this.billsSearchService.search(orgContext.organizationId, query);
  }

  @Get('filters/columns/:columnName')
  async getColumnValues(@Param('columnName') columnName: string, @OrgContext() orgContext: any) {
    return this.billsSearchService.getColumnValues(orgContext.organizationId, columnName);
  }
}

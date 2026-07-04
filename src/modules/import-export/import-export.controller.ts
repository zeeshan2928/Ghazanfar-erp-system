import { Controller, Get, Post, Body, UseGuards, BadRequestException, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ImportExportService } from './services/import-export.service';
import { ImportRequestDto } from './dto/import-export.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('import-export')
@UseGuards(JwtGuard)
export class ImportExportController {
  constructor(private importExportService: ImportExportService) {}

  // ==================== EXPORT ENDPOINTS ====================

  @Get('export/products')
  async exportProducts(@OrgContext() orgContext: any, @Res() res: Response) {
    try {
      const result = await this.importExportService.exportProducts(orgContext.organizationId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(HttpStatus.OK).send(result.data);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('export/bills')
  async exportBills(@OrgContext() orgContext: any, @Res() res: Response) {
    try {
      const result = await this.importExportService.exportBills(orgContext.organizationId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(HttpStatus.OK).send(result.data);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('export/purchase-orders')
  async exportPurchaseOrders(@OrgContext() orgContext: any, @Res() res: Response) {
    try {
      const result = await this.importExportService.exportPurchaseOrders(orgContext.organizationId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(HttpStatus.OK).send(result.data);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('export/customers')
  async exportCustomers(@OrgContext() orgContext: any, @Res() res: Response) {
    try {
      const result = await this.importExportService.exportCustomers(orgContext.organizationId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(HttpStatus.OK).send(result.data);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('export/vendors')
  async exportVendors(@OrgContext() orgContext: any, @Res() res: Response) {
    try {
      const result = await this.importExportService.exportVendors(orgContext.organizationId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(HttpStatus.OK).send(result.data);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ==================== IMPORT ENDPOINTS ====================

  @Post('import/products')
  async importProducts(@Body() request: ImportRequestDto, @OrgContext() orgContext: any) {
    try {
      if (!request.csvData) {
        throw new BadRequestException('csvData is required');
      }
      return await this.importExportService.importProducts(orgContext.organizationId, request.csvData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('import/bills')
  async importBills(@Body() request: ImportRequestDto, @OrgContext() orgContext: any) {
    try {
      if (!request.csvData) {
        throw new BadRequestException('csvData is required');
      }
      return await this.importExportService.importBills(orgContext.organizationId, request.csvData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('import/purchase-orders')
  async importPurchaseOrders(@Body() request: ImportRequestDto, @OrgContext() orgContext: any) {
    try {
      if (!request.csvData) {
        throw new BadRequestException('csvData is required');
      }
      return await this.importExportService.importPurchaseOrders(orgContext.organizationId, request.csvData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('import/customers')
  async importCustomers(@Body() request: ImportRequestDto, @OrgContext() orgContext: any) {
    try {
      if (!request.csvData) {
        throw new BadRequestException('csvData is required');
      }
      return await this.importExportService.importCustomers(orgContext.organizationId, request.csvData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('import/vendors')
  async importVendors(@Body() request: ImportRequestDto, @OrgContext() orgContext: any) {
    try {
      if (!request.csvData) {
        throw new BadRequestException('csvData is required');
      }
      return await this.importExportService.importVendors(orgContext.organizationId, request.csvData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}

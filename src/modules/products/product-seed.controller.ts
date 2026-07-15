import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductSeedService } from './services/product-seed.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('products')
@UseGuards(JwtGuard)
export class ProductSeedController {
  constructor(private productSeedService: ProductSeedService) {}

  // Dry-run: parses the inventory report + reads existing sales/purchase
  // history, returns the bucket counts, WRITES NOTHING. This is what the user
  // must see and approve before committing anything to the product master.
  @Post('seed/analyze')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product-seed.run')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async analyzeSeed(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) throw new BadRequestException('Inventory report file is required');
    return this.productSeedService.analyze(orgContext.organizationId, file.buffer);
  }

  @Post('seed/commit')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product-seed.run')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async commitSeed(@UploadedFile() file: Express.Multer.File, @OrgContext() orgContext: any) {
    if (!file) throw new BadRequestException('Inventory report file is required');
    return this.productSeedService.commit(orgContext.organizationId, file.buffer);
  }

  @Get('classification/review-queue')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product-seed.run')
  async getReviewQueue(@OrgContext() orgContext: any) {
    return this.productSeedService.getReviewQueue(orgContext.organizationId);
  }

  @Post('classification/:productId/confirm')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product-seed.run')
  async confirm(
    @Param('productId') productId: string,
    @Body() body: { kind: 'PART' | 'PRODUCT' },
    @OrgContext() orgContext: any,
  ) {
    return this.productSeedService.confirmClassification(
      orgContext.organizationId,
      parseInt(productId, 10),
      body.kind,
    );
  }

  @Post('classification/bulk-confirm-parts')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('product-seed.run')
  async bulkConfirmParts(@Body() body: { productIds: number[] }, @OrgContext() orgContext: any) {
    return this.productSeedService.bulkConfirmParts(orgContext.organizationId, body.productIds ?? []);
  }
}

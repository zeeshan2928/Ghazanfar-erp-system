import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { MediaStorageService } from '@common/services/media-storage.service';
import { ProductMediaType } from '@prisma/client';

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4'];

@Injectable()
export class ProductMediaService {
  constructor(
    private prisma: PrismaService,
    private mediaStorageService: MediaStorageService,
  ) {}

  async upload(organizationId: number, productId: number, file: Express.Multer.File) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let mediaType: ProductMediaType;
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      mediaType = ProductMediaType.IMAGE;
    } else if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
      mediaType = ProductMediaType.VIDEO;
    } else {
      throw new BadRequestException(
        `Unsupported file type ${file.mimetype}. Allowed: jpeg, png, gif, webp images or mp4 video.`,
      );
    }

    const { url } = await this.mediaStorageService.save(`products/${productId}`, file.buffer, file.originalname);

    return this.prisma.productMedia.create({
      data: { productId, url, mediaType, mimeType: file.mimetype },
    });
  }

  async list(organizationId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.productMedia.findMany({
      where: { productId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async remove(organizationId: number, productId: number, mediaId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
    });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    await this.prisma.productMedia.delete({ where: { id: mediaId } });
    await this.mediaStorageService.delete(media.url);
  }

  async setPrimary(organizationId: number, productId: number, mediaId: number) {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId, product: { organizationId } },
    });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    await this.prisma.productMedia.updateMany({
      where: { productId },
      data: { isPrimary: false },
    });
    return this.prisma.productMedia.update({
      where: { id: mediaId },
      data: { isPrimary: true },
    });
  }
}

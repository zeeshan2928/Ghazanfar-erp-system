import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '@database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      purchaseHistory: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('getPurchaseHistory', () => {
    it('should return purchase history for a product', async () => {
      const organizationId = 1;
      const productId = 1;
      const mockProduct = { id: productId, name: 'Test Product' };
      const mockPurchaseHistory = [
        {
          id: 1,
          vendorName: 'Vendor A',
          poNumber: 'PO-001',
          poDate: new Date('2024-01-15'),
          quantityPurchased: 100,
          costPrice: 500,
        },
        {
          id: 2,
          vendorName: 'Vendor B',
          poNumber: 'PO-002',
          poDate: new Date('2024-01-10'),
          quantityPurchased: 50,
          costPrice: 450,
        },
      ];

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.purchaseHistory.findMany.mockResolvedValue(
        mockPurchaseHistory,
      );

      const result = await service.getPurchaseHistory(
        organizationId,
        productId,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        vendor: 'Vendor A',
        poNumber: 'PO-001',
        poDate: mockPurchaseHistory[0].poDate,
        quantity: 100,
        costPrice: 500,
      });
      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      const organizationId = 1;
      const productId = 999;

      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        service.getPurchaseHistory(organizationId, productId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should respect the limit parameter', async () => {
      const organizationId = 1;
      const productId = 1;
      const mockProduct = { id: productId, name: 'Test Product' };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.purchaseHistory.findMany.mockResolvedValue([]);

      await service.getPurchaseHistory(organizationId, productId, 10);

      expect(prismaMock.purchaseHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should return empty array when no purchase history exists', async () => {
      const organizationId = 1;
      const productId = 1;
      const mockProduct = { id: productId, name: 'Test Product' };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.purchaseHistory.findMany.mockResolvedValue([]);

      const result = await service.getPurchaseHistory(
        organizationId,
        productId,
      );

      expect(result).toEqual([]);
    });
  });
});

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { TransactionService } from '@common/services/transaction.service';
import { TransactionSequenceService } from '@common/services/transaction-sequence.service';
import { DOC_SEQUENCE } from '@common/config/document-sequences';
import { InventoryOperationsService } from '../../inventory/services/inventory-operations.service';
import {
  CompleteManufacturingOrderDto,
  CreateManufacturingOrderDto,
  ManufacturingOrderSearchDto,
} from '../dto/manufacturing-order.dto';

export interface ManufacturingOrderLineView {
  id: number;
  slotName: string;
  componentProductId: number;
  componentName: string;
  componentCode: string;
  isService: boolean;
  quantityRequired: number;
  quantityConsumed: number | null;
  unitCostSnapshot: number | null;
}

export interface ManufacturingOrderView {
  id: number;
  organizationId: number;
  orderNumber: string;
  bomId: number;
  bomName: string;
  bomVersion: number;
  finishedProductId: number;
  finishedProductName: string;
  finishedProductCode: string;
  warehouseId: number;
  warehouseName: string;
  quantityPlanned: number;
  quantityProduced: number;
  status: string;
  unitCostSnapshot: number | null;
  remarks: string | null;
  lines: ManufacturingOrderLineView[];
  createdAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class ManufacturingOrdersService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private transactionSequenceService: TransactionSequenceService,
    private inventoryOperations: InventoryOperationsService,
  ) {}

  // ---------------------------------------------------------------------
  // CREATE — a plan. Nothing moves. Snapshots the recipe's lines at THIS
  // moment (quantities scaled to quantityPlanned) so that later edits to the
  // recipe never retroactively change an order already in flight.
  // ---------------------------------------------------------------------
  async create(organizationId: number, userId: number, dto: CreateManufacturingOrderDto): Promise<ManufacturingOrderView> {
    const bom = await this.prisma.bom.findFirst({
      where: { id: dto.bomId, organizationId },
      include: { lines: { include: { component: true } } },
    });
    if (!bom) throw new NotFoundException('Recipe not found');
    if (!bom.isActive) {
      throw new BadRequestException(
        'This recipe is not the current active version. Use the current version, or the product\'s active recipe, instead.',
      );
    }
    if (bom.lines.length === 0) {
      throw new BadRequestException('This recipe has no components yet - add at least one before building against it.');
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId },
      select: { id: true },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const outputQuantity = Number(bom.outputQuantity);
    // How many times the recipe must be "run" to reach quantityPlanned units
    // of the finished good. 1 for every real recipe today (outputQuantity
    // defaults to 1), but correct if a recipe is ever defined as "yields 5
    // per batch".
    const runs = dto.quantityPlanned / outputQuantity;

    const order = await this.transactionService.run(async tx => {
      const year = new Date().getFullYear();
      const next = await this.transactionSequenceService.getNextCounter(
        organizationId,
        DOC_SEQUENCE.manufacturingOrder(year),
        0,
        tx,
      );
      const orderNumber = `MO-${year}-${String(next).padStart(6, '0')}`;

      const created = await tx.manufacturingOrder.create({
        data: {
          organizationId,
          orderNumber,
          bomId: bom.id,
          finishedProductId: bom.productId,
          warehouseId: dto.warehouseId,
          quantityPlanned: dto.quantityPlanned,
          remarks: dto.remarks,
          createdBy: userId,
          status: 'DRAFT',
        },
      });

      await tx.manufacturingOrderLine.createMany({
        data: bom.lines.map(line => ({
          manufacturingOrderId: created.id,
          slotName: line.slotName,
          componentProductId: line.componentProductId,
          quantityRequired: Number(line.quantity) * runs,
        })),
      });

      return created;
    });

    return this.getById(organizationId, order.id);
  }

  // ---------------------------------------------------------------------
  // START — DRAFT -> IN_PROGRESS. Checks every stock-tracked line has enough
  // available stock in the target warehouse. Does NOT reserve anything -
  // the real, race-safe check happens again inside complete()'s own
  // transaction at the moment stock actually moves; this is a fast-fail
  // convenience so a shortage is caught before anyone starts assembling.
  // ---------------------------------------------------------------------
  async start(organizationId: number, id: number, userId: number): Promise<ManufacturingOrderView> {
    const order = await this.prisma.manufacturingOrder.findFirst({
      where: { id, organizationId },
      include: { lines: { include: { component: true } } },
    });
    if (!order) throw new NotFoundException('Manufacturing order not found');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot start an order with status ${order.status}`);
    }

    const shortages: string[] = [];
    for (const line of order.lines) {
      if (line.component.productType === 'SERVICE') continue;

      const inv = await this.prisma.inventory.findFirst({
        where: { organizationId, productId: line.componentProductId, warehouseId: order.warehouseId },
      });
      const available = inv ? inv.physical_on_hand - (inv.reserved || 0) : 0;
      if (!Number.isFinite(available)) {
        throw new Error(`Bad inventory read for product ${line.componentProductId}`);
      }

      const required = Number(line.quantityRequired);
      if (available < required) {
        shortages.push(`${line.component.name} (have ${available}, need ${required})`);
      }
    }

    if (shortages.length > 0) {
      throw new BadRequestException(`Insufficient stock: ${shortages.join('; ')}`);
    }

    await this.prisma.manufacturingOrder.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
    return this.getById(organizationId, id);
  }

  // ---------------------------------------------------------------------
  // COMPLETE — the moment stock actually moves. Every stock-tracked
  // component leaves the warehouse, the finished good arrives, the batch's
  // cost is frozen, and every movement is recorded. All in one transaction.
  // ---------------------------------------------------------------------
  async complete(
    organizationId: number,
    id: number,
    userId: number,
    dto: CompleteManufacturingOrderDto,
  ): Promise<ManufacturingOrderView> {
    const order = await this.prisma.manufacturingOrder.findFirst({
      where: { id, organizationId },
      include: { lines: { include: { component: true } } },
    });
    if (!order) throw new NotFoundException('Manufacturing order not found');
    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot complete an order with status ${order.status}`);
    }

    const consumptionByLine = new Map((dto.lineConsumption ?? []).map(c => [c.lineId, c.quantityConsumed]));

    await this.transactionService.run(async tx => {
      let totalCost = 0;

      for (const line of order.lines) {
        const consumed = consumptionByLine.get(line.id) ?? Number(line.quantityRequired);
        const unitCost = Number(line.component.cost_price);

        if (line.component.productType !== 'SERVICE' && consumed > 0) {
          await this.inventoryOperations.applyStockOutTx(tx, {
            organizationId,
            productId: line.componentProductId,
            warehouseId: order.warehouseId,
            quantity: consumed,
            movementType: 'MANUFACTURE_OUT',
            reference: order.orderNumber,
            createdBy: userId,
          });
        }

        await tx.manufacturingOrderLine.update({
          where: { id: line.id },
          data: { quantityConsumed: consumed, unitCostSnapshot: unitCost },
        });

        // Batch cost reflects what the RECIPE says it should cost at today's
        // prices (quantityRequired x unit cost) - not what was actually
        // consumed. Actual-vs-required is the separate scrap signal; folding
        // it into "cost" would make the batch's cost silently drift with
        // every inefficiency, which is not what "batch cost" means here.
        totalCost += Number(line.quantityRequired) * unitCost;
      }

      if (dto.quantityProduced > 0) {
        await this.inventoryOperations.applyStockInTx(tx, {
          organizationId,
          productId: order.finishedProductId,
          warehouseId: order.warehouseId,
          quantity: dto.quantityProduced,
          movementType: 'MANUFACTURE_IN',
          reference: order.orderNumber,
          createdBy: userId,
        });
      }

      await tx.manufacturingOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          quantityProduced: dto.quantityProduced,
          unitCostSnapshot: totalCost / order.quantityPlanned,
          completedBy: userId,
          completedAt: new Date(),
        },
      });
    });

    return this.getById(organizationId, id);
  }

  // Nothing was ever moved for DRAFT/IN_PROGRESS (start() only checks, never
  // reserves or mutates stock), so cancelling is a pure status change.
  async cancel(organizationId: number, id: number): Promise<void> {
    const order = await this.prisma.manufacturingOrder.findFirst({ where: { id, organizationId } });
    if (!order) throw new NotFoundException('Manufacturing order not found');
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel an order with status ${order.status}`);
    }
    await this.prisma.manufacturingOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async getById(organizationId: number, id: number): Promise<ManufacturingOrderView> {
    const order = await this.prisma.manufacturingOrder.findFirst({
      where: { id, organizationId },
      include: {
        bom: { select: { name: true, version: true } },
        finishedProduct: { select: { name: true, code: true } },
        warehouse: { select: { name: true } },
        lines: { include: { component: { select: { name: true, code: true, productType: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Manufacturing order not found');
    return this.toView(order);
  }

  async search(organizationId: number, dto: ManufacturingOrderSearchDto) {
    const skip = dto.skip ?? 0;
    const take = dto.take ?? 20;

    const where: Prisma.ManufacturingOrderWhereInput = {
      organizationId,
      ...(dto.status ? { status: dto.status as any } : {}),
      ...(dto.search
        ? {
            OR: [
              { orderNumber: { contains: dto.search, mode: 'insensitive' } },
              { finishedProduct: { name: { contains: dto.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.manufacturingOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { finishedProduct: { select: { name: true, code: true } }, warehouse: { select: { name: true } } },
      }),
      this.prisma.manufacturingOrder.count({ where }),
    ]);

    return {
      data: rows.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        finishedProductName: o.finishedProduct.name,
        finishedProductCode: o.finishedProduct.code,
        warehouseName: o.warehouse.name,
        quantityPlanned: o.quantityPlanned,
        quantityProduced: o.quantityProduced,
        status: o.status,
        createdAt: o.createdAt,
      })),
      total,
      skip,
      take,
    };
  }

  private toView(order: any): ManufacturingOrderView {
    return {
      id: order.id,
      organizationId: order.organizationId,
      orderNumber: order.orderNumber,
      bomId: order.bomId,
      bomName: order.bom.name,
      bomVersion: order.bom.version,
      finishedProductId: order.finishedProductId,
      finishedProductName: order.finishedProduct.name,
      finishedProductCode: order.finishedProduct.code,
      warehouseId: order.warehouseId,
      warehouseName: order.warehouse.name,
      quantityPlanned: order.quantityPlanned,
      quantityProduced: order.quantityProduced,
      status: order.status,
      unitCostSnapshot: order.unitCostSnapshot != null ? Number(order.unitCostSnapshot) : null,
      remarks: order.remarks,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      lines: order.lines.map((line: any) => ({
        id: line.id,
        slotName: line.slotName,
        componentProductId: line.componentProductId,
        componentName: line.component.name,
        componentCode: line.component.code,
        isService: line.component.productType === 'SERVICE',
        quantityRequired: Number(line.quantityRequired),
        quantityConsumed: line.quantityConsumed != null ? Number(line.quantityConsumed) : null,
        unitCostSnapshot: line.unitCostSnapshot != null ? Number(line.unitCostSnapshot) : null,
      })),
    };
  }
}

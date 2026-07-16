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
  plannedUnitCost: number | null;
  unitCostSnapshot: number | null;
  componentBatch: string | null;
}

export interface VarianceLineView {
  componentName: string;
  componentCode: string;
  quantityRequired: number;
  quantityConsumed: number;
  plannedUnitCost: number;
  actualUnitCost: number;
  plannedCost: number; // quantityRequired x plannedUnitCost
  priceVariance: number; // quantityRequired x (actual - planned)
  usageVariance: number; // (consumed - required) x actual
  lineVariance: number; // priceVariance + usageVariance
}

export interface VarianceView {
  orderId: number;
  orderNumber: string;
  finishedProductName: string;
  quantityPlanned: number;
  quantityProduced: number;
  plannedTotal: number;
  actualTotal: number; // sum of consumed x actual unit cost
  priceVariance: number;
  usageVariance: number;
  totalVariance: number; // actualTotal - plannedTotal
  captured: boolean; // false if plannedUnitCost was never recorded (pre-Phase-3 order)
  lines: VarianceLineView[];
}

export interface ComponentBatch {
  batchNumber: string;
  receivedDate: Date;
  quantityReceived: number;
  poNumber: string;
  vendorName: string;
}

export interface BatchTraceLine {
  slotName: string;
  componentName: string;
  componentCode: string;
  componentBatch: string | null;
  receivedDate: Date | null;
  poNumber: string | null;
  vendorName: string | null;
}

export interface BatchTraceView {
  orderId: number;
  finishedBatch: string; // the MO orderNumber
  finishedProductName: string;
  status: string;
  quantityProduced: number;
  lines: BatchTraceLine[];
}

export interface BatchWhereUsedRow {
  orderId: number;
  finishedBatch: string;
  finishedProductName: string;
  componentName: string;
  quantityConsumed: number | null;
  completedAt: Date | null;
}

export interface YieldScrapRow {
  finishedProductId: number;
  productName: string;
  productCode: string;
  orders: number;
  totalPlanned: number;
  totalProduced: number;
  totalRejected: number;
  yieldPercent: number; // produced / (produced + rejected)
  componentScrapCost: number | null; // null when caller can't view financials
}

export interface VendorDefectRow {
  vendorId: number;
  vendorName: string;
  scrappedQuantity: number;
  receivedQuantity: number;
  scrapRatePercent: number; // scrapped / received
  scrapCost: number | null; // null when caller can't view financials
}

export interface ProductCostSummaryRow {
  finishedProductId: number;
  productName: string;
  productCode: string;
  orders: number;
  unitsProduced: number;
  totalActualCost: number | null; // null when caller can't view financials
  avgUnitCost: number | null;
  sellingPrice: number | null;
  margin: number | null;
  marginPercent: number | null;
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
  quantityRejected: number;
  rejectReason: string | null;
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
          // Freeze the component's cost as of NOW. Compared against
          // unitCostSnapshot (frozen at completion), this is the price
          // variance - how much a component's price moved between planning
          // the batch and building it.
          plannedUnitCost: line.component.cost_price,
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
    const batchByLine = new Map((dto.lineBatches ?? []).map(b => [b.lineId, b.componentBatch]));

    await this.transactionService.run(async tx => {
      let totalCost = 0;

      for (const line of order.lines) {
        const consumed = consumptionByLine.get(line.id) ?? Number(line.quantityRequired);
        const unitCost = Number(line.component.cost_price);
        const componentBatch = batchByLine.get(line.id) ?? null;

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
          data: { quantityConsumed: consumed, unitCostSnapshot: unitCost, componentBatch },
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
          quantityRejected: dto.quantityRejected ?? 0,
          rejectReason: dto.rejectReason ?? null,
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
      quantityRejected: order.quantityRejected,
      rejectReason: order.rejectReason,
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
        plannedUnitCost: line.plannedUnitCost != null ? Number(line.plannedUnitCost) : null,
        unitCostSnapshot: line.unitCostSnapshot != null ? Number(line.unitCostSnapshot) : null,
        componentBatch: line.componentBatch ?? null,
      })),
    };
  }

  // ---------------------------------------------------------------------
  // VARIANCE (per completed order) — planned vs actual, decomposed into:
  //   price variance = standard qty x (completion price - creation price)
  //   usage variance = (actual consumed - standard qty) x completion price
  // Both readable straight from what the order already froze at creation
  // (plannedUnitCost) and completion (unitCostSnapshot, quantityConsumed).
  // ---------------------------------------------------------------------
  async getVariance(organizationId: number, id: number): Promise<VarianceView> {
    const order = await this.prisma.manufacturingOrder.findFirst({
      where: { id, organizationId },
      include: {
        finishedProduct: { select: { name: true } },
        lines: { include: { component: { select: { name: true, code: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Manufacturing order not found');
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('Variance is only available once the order is completed.');
    }

    let plannedTotal = 0;
    let actualTotal = 0;
    let priceVariance = 0;
    let usageVariance = 0;
    let captured = true;

    const lines: VarianceLineView[] = order.lines.map(line => {
      const required = Number(line.quantityRequired);
      const consumed = line.quantityConsumed != null ? Number(line.quantityConsumed) : required;
      const actualUnit = line.unitCostSnapshot != null ? Number(line.unitCostSnapshot) : 0;
      // Fall back to the completion price if this order predates plannedUnitCost
      // (then price variance is 0 - we simply can't know what it was planned at).
      if (line.plannedUnitCost == null) captured = false;
      const plannedUnit = line.plannedUnitCost != null ? Number(line.plannedUnitCost) : actualUnit;

      const plannedCost = required * plannedUnit;
      const linePrice = required * (actualUnit - plannedUnit);
      const lineUsage = (consumed - required) * actualUnit;
      const actualCost = consumed * actualUnit;

      plannedTotal += plannedCost;
      actualTotal += actualCost;
      priceVariance += linePrice;
      usageVariance += lineUsage;

      return {
        componentName: line.component.name,
        componentCode: line.component.code,
        quantityRequired: required,
        quantityConsumed: consumed,
        plannedUnitCost: plannedUnit,
        actualUnitCost: actualUnit,
        plannedCost,
        priceVariance: linePrice,
        usageVariance: lineUsage,
        lineVariance: linePrice + lineUsage,
      };
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      finishedProductName: order.finishedProduct.name,
      quantityPlanned: order.quantityPlanned,
      quantityProduced: order.quantityProduced,
      plannedTotal,
      actualTotal,
      priceVariance,
      usageVariance,
      totalVariance: actualTotal - plannedTotal,
      captured,
      lines,
    };
  }

  // ---------------------------------------------------------------------
  // COST & MARGIN per manufactured product, across all COMPLETED orders.
  // Cost/margin fields are stripped entirely when the caller can't view
  // financials (FOUNDATIONS profit-privacy rule).
  // ---------------------------------------------------------------------
  async getProductCostSummary(
    organizationId: number,
    canViewFinancials: boolean,
  ): Promise<ProductCostSummaryRow[]> {
    const orders = await this.prisma.manufacturingOrder.findMany({
      where: { organizationId, status: 'COMPLETED' },
      select: {
        finishedProductId: true,
        quantityProduced: true,
        unitCostSnapshot: true,
        finishedProduct: { select: { name: true, code: true } },
      },
    });

    // Aggregate per finished product.
    const byProduct = new Map<
      number,
      { name: string; code: string; orders: number; units: number; totalCost: number }
    >();
    for (const o of orders) {
      const agg = byProduct.get(o.finishedProductId) ?? {
        name: o.finishedProduct.name,
        code: o.finishedProduct.code,
        orders: 0,
        units: 0,
        totalCost: 0,
      };
      const unit = o.unitCostSnapshot != null ? Number(o.unitCostSnapshot) : 0;
      agg.orders += 1;
      agg.units += o.quantityProduced;
      agg.totalCost += unit * o.quantityProduced;
      byProduct.set(o.finishedProductId, agg);
    }

    // Representative selling price: active COUNTER (in-shop retail) list price
    // if present.
    const productIds = Array.from(byProduct.keys());
    const prices = await this.prisma.productPrice.findMany({
      where: { productId: { in: productIds }, channel: 'COUNTER', isActive: true },
      select: { productId: true, price: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    const priceByProduct = new Map<number, number>();
    for (const p of prices) {
      // ProductPrice.price is stored in the smallest unit (paisa) -> rupees.
      if (!priceByProduct.has(p.productId)) priceByProduct.set(p.productId, p.price / 100);
    }

    const rows: ProductCostSummaryRow[] = [];
    for (const [productId, agg] of byProduct) {
      const avgUnitCost = agg.units > 0 ? agg.totalCost / agg.units : 0;
      const sellingPrice = priceByProduct.get(productId) ?? null;
      const margin = sellingPrice != null ? sellingPrice - avgUnitCost : null;
      const marginPercent = sellingPrice != null && sellingPrice > 0 ? (margin! / sellingPrice) * 100 : null;

      rows.push({
        finishedProductId: productId,
        productName: agg.name,
        productCode: agg.code,
        orders: agg.orders,
        unitsProduced: agg.units,
        totalActualCost: canViewFinancials ? agg.totalCost : null,
        avgUnitCost: canViewFinancials ? avgUnitCost : null,
        sellingPrice: canViewFinancials ? sellingPrice : null,
        margin: canViewFinancials ? margin : null,
        marginPercent: canViewFinancials ? marginPercent : null,
      });
    }

    rows.sort((a, b) => b.unitsProduced - a.unitsProduced);
    return rows;
  }

  // ---------------------------------------------------------------------
  // BATCH / LOT TRACEABILITY
  // ---------------------------------------------------------------------

  // The batches actually received for a component, newest first - feeds the
  // completion form's "batch used" picker and its latest-batch default.
  async getComponentBatches(
    organizationId: number,
    productId: number,
    warehouseId?: number,
  ): Promise<ComponentBatch[]> {
    const receipts = await this.prisma.purchaseOrderReceipt.findMany({
      where: {
        productId,
        batch_number: { not: null },
        purchaseOrder: { organizationId },
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      },
      orderBy: { received_date: 'desc' },
      take: 50,
      include: { purchaseOrder: { select: { po_number: true, vendor: { select: { name: true } } } } },
    });

    return receipts.map(r => ({
      batchNumber: r.batch_number!,
      receivedDate: r.received_date,
      quantityReceived: r.quantity_received,
      poNumber: r.purchaseOrder.po_number,
      vendorName: r.purchaseOrder.vendor.name,
    }));
  }

  // Backward recall: a completed build -> the vendor batch every component came
  // from. "This juicer batch used Motor from RCPT-2026-000045 (PO-.., Vendor X)."
  async getBatchTrace(organizationId: number, id: number): Promise<BatchTraceView> {
    const order = await this.prisma.manufacturingOrder.findFirst({
      where: { id, organizationId },
      include: {
        finishedProduct: { select: { name: true } },
        lines: { include: { component: { select: { name: true, code: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Manufacturing order not found');

    // Resolve each consumed batch to its receipt/PO/vendor in one query.
    const batchNumbers = order.lines.map(l => l.componentBatch).filter((b): b is string => !!b);
    const receipts = batchNumbers.length
      ? await this.prisma.purchaseOrderReceipt.findMany({
          where: { batch_number: { in: batchNumbers }, purchaseOrder: { organizationId } },
          include: { purchaseOrder: { select: { po_number: true, vendor: { select: { name: true } } } } },
        })
      : [];
    const byBatch = new Map(receipts.map(r => [r.batch_number!, r]));

    return {
      orderId: order.id,
      finishedBatch: order.orderNumber,
      finishedProductName: order.finishedProduct.name,
      status: order.status,
      quantityProduced: order.quantityProduced,
      lines: order.lines.map(l => {
        const r = l.componentBatch ? byBatch.get(l.componentBatch) : undefined;
        return {
          slotName: l.slotName,
          componentName: l.component.name,
          componentCode: l.component.code,
          componentBatch: l.componentBatch ?? null,
          receivedDate: r?.received_date ?? null,
          poNumber: r?.purchaseOrder.po_number ?? null,
          vendorName: r?.purchaseOrder.vendor.name ?? null,
        };
      }),
    };
  }

  // Forward: given a vendor batch, which builds consumed it. "Motor batch
  // RCPT-45 went into these juicer builds" - the start of a recall.
  async whereBatchUsed(organizationId: number, batchNumber: string): Promise<BatchWhereUsedRow[]> {
    const lines = await this.prisma.manufacturingOrderLine.findMany({
      where: { componentBatch: batchNumber, manufacturingOrder: { organizationId } },
      include: {
        component: { select: { name: true } },
        manufacturingOrder: { select: { id: true, orderNumber: true, quantityProduced: true, completedAt: true, finishedProduct: { select: { name: true } } } },
      },
    });

    return lines.map(l => ({
      orderId: l.manufacturingOrder.id,
      finishedBatch: l.manufacturingOrder.orderNumber,
      finishedProductName: l.manufacturingOrder.finishedProduct.name,
      componentName: l.component.name,
      quantityConsumed: l.quantityConsumed != null ? Number(l.quantityConsumed) : null,
      completedAt: l.manufacturingOrder.completedAt,
    }));
  }

  // ---------------------------------------------------------------------
  // QUALITY REPORTS
  // ---------------------------------------------------------------------

  // Yield & scrap per manufactured product across completed builds. Yield is
  // good units over units built (good + rejected); component scrap cost is the
  // extra material consumed beyond the recipe (the positive usage variance).
  async getYieldScrapReport(
    organizationId: number,
    canViewFinancials: boolean,
  ): Promise<YieldScrapRow[]> {
    const orders = await this.prisma.manufacturingOrder.findMany({
      where: { organizationId, status: 'COMPLETED' },
      select: {
        finishedProductId: true,
        quantityPlanned: true,
        quantityProduced: true,
        quantityRejected: true,
        finishedProduct: { select: { name: true, code: true } },
        lines: { select: { quantityRequired: true, quantityConsumed: true, unitCostSnapshot: true } },
      },
    });

    const byProduct = new Map<number, YieldScrapRow & { _cost: number }>();
    for (const o of orders) {
      const row = byProduct.get(o.finishedProductId) ?? {
        finishedProductId: o.finishedProductId,
        productName: o.finishedProduct.name,
        productCode: o.finishedProduct.code,
        orders: 0,
        totalPlanned: 0,
        totalProduced: 0,
        totalRejected: 0,
        yieldPercent: 0,
        componentScrapCost: 0,
        _cost: 0,
      };
      row.orders += 1;
      row.totalPlanned += o.quantityPlanned;
      row.totalProduced += o.quantityProduced;
      row.totalRejected += o.quantityRejected;
      for (const l of o.lines) {
        const required = Number(l.quantityRequired);
        const consumed = l.quantityConsumed != null ? Number(l.quantityConsumed) : required;
        const unit = l.unitCostSnapshot != null ? Number(l.unitCostSnapshot) : 0;
        row._cost += Math.max(0, consumed - required) * unit;
      }
      byProduct.set(o.finishedProductId, row);
    }

    return Array.from(byProduct.values())
      .map(r => {
        const built = r.totalProduced + r.totalRejected;
        // Fall back to planned as the denominator when no rejects were recorded.
        const denom = built > 0 ? built : r.totalPlanned;
        const yieldPercent = denom > 0 ? (r.totalProduced / denom) * 100 : 0;
        return {
          finishedProductId: r.finishedProductId,
          productName: r.productName,
          productCode: r.productCode,
          orders: r.orders,
          totalPlanned: r.totalPlanned,
          totalProduced: r.totalProduced,
          totalRejected: r.totalRejected,
          yieldPercent,
          componentScrapCost: canViewFinancials ? r._cost : null,
        };
      })
      .sort((a, b) => a.yieldPercent - b.yieldPercent); // worst yield first
  }

  // Which vendor's components get scrapped most. Attributes each line's positive
  // usage variance (consumed beyond the recipe) to the vendor of the batch it
  // consumed, and rates it against how much was received from that vendor.
  async getVendorDefectScorecard(
    organizationId: number,
    canViewFinancials: boolean,
  ): Promise<VendorDefectRow[]> {
    // Scrap side: completed MO lines that carry a batch and used more than planned.
    const lines = await this.prisma.manufacturingOrderLine.findMany({
      where: {
        componentBatch: { not: null },
        manufacturingOrder: { organizationId, status: 'COMPLETED' },
      },
      select: { componentBatch: true, quantityRequired: true, quantityConsumed: true, unitCostSnapshot: true },
    });

    // Resolve each consumed batch -> vendor.
    const batchNumbers = Array.from(new Set(lines.map(l => l.componentBatch!).filter(Boolean)));
    const receipts = batchNumbers.length
      ? await this.prisma.purchaseOrderReceipt.findMany({
          where: { batch_number: { in: batchNumbers }, purchaseOrder: { organizationId } },
          select: { batch_number: true, purchaseOrder: { select: { vendorId: true, vendor: { select: { name: true } } } } },
        })
      : [];
    const vendorByBatch = new Map(receipts.map(r => [r.batch_number!, { id: r.purchaseOrder.vendorId, name: r.purchaseOrder.vendor.name }]));

    const agg = new Map<number, { name: string; scrapQty: number; scrapCost: number }>();
    for (const l of lines) {
      const v = vendorByBatch.get(l.componentBatch!);
      if (!v) continue;
      const required = Number(l.quantityRequired);
      const consumed = l.quantityConsumed != null ? Number(l.quantityConsumed) : required;
      const scrap = Math.max(0, consumed - required);
      if (scrap <= 0) continue;
      const unit = l.unitCostSnapshot != null ? Number(l.unitCostSnapshot) : 0;
      const a = agg.get(v.id) ?? { name: v.name, scrapQty: 0, scrapCost: 0 };
      a.scrapQty += scrap;
      a.scrapCost += scrap * unit;
      agg.set(v.id, a);
    }

    if (agg.size === 0) return [];

    // Received side: total qty received from each of those vendors (the rate denominator).
    const receivedByVendor = await this.prisma.purchaseOrderReceipt.groupBy({
      by: ['poId'],
      where: { purchaseOrder: { organizationId, vendorId: { in: Array.from(agg.keys()) } } },
      _sum: { quantity_received: true },
    });
    // groupBy poId -> need vendor; fetch po->vendor map.
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { id: { in: receivedByVendor.map(r => r.poId) } },
      select: { id: true, vendorId: true },
    });
    const vendorByPo = new Map(pos.map(p => [p.id, p.vendorId]));
    const receivedQtyByVendor = new Map<number, number>();
    for (const r of receivedByVendor) {
      const vid = vendorByPo.get(r.poId);
      if (vid == null) continue;
      receivedQtyByVendor.set(vid, (receivedQtyByVendor.get(vid) ?? 0) + (r._sum.quantity_received ?? 0));
    }

    return Array.from(agg.entries())
      .map(([vendorId, a]) => {
        const received = receivedQtyByVendor.get(vendorId) ?? 0;
        return {
          vendorId,
          vendorName: a.name,
          scrappedQuantity: a.scrapQty,
          receivedQuantity: received,
          scrapRatePercent: received > 0 ? (a.scrapQty / received) * 100 : 0,
          scrapCost: canViewFinancials ? a.scrapCost : null,
        };
      })
      .sort((a, b) => b.scrapRatePercent - a.scrapRatePercent); // worst vendor first
  }
}

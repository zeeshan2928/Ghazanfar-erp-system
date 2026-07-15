import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ImportResponseDto, ExportResponseDto } from '../dto/import-export.dto';
import { OrderStatus, PurchaseOrderStatus } from '@prisma/client';

@Injectable()
export class ImportExportService {
  constructor(private prisma: PrismaService) {}

  // ==================== EXPORT METHODS ====================

  async exportProducts(organizationId: number): Promise<ExportResponseDto> {
    const products = await this.prisma.product.findMany({
      where: { organizationId },
    });

    const csv = this.productsToCSV(products);
    return {
      data: csv,
      filename: `products-${organizationId}-${Date.now()}.csv`,
      timestamp: new Date(),
      rowCount: products.length,
    };
  }

  async exportBills(organizationId: number): Promise<ExportResponseDto> {
    const bills = await this.prisma.bill.findMany({
      where: { organizationId },
      include: { customer: true, lines: true },
    });

    const csv = this.billsToCSV(bills);
    return {
      data: csv,
      filename: `bills-${organizationId}-${Date.now()}.csv`,
      timestamp: new Date(),
      rowCount: bills.length,
    };
  }

  async exportPurchaseOrders(organizationId: number): Promise<ExportResponseDto> {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      include: { vendor: true, PurchaseOrderItem: true },
    });

    const csv = this.poToCSV(pos);
    return {
      data: csv,
      filename: `purchase-orders-${organizationId}-${Date.now()}.csv`,
      timestamp: new Date(),
      rowCount: pos.length,
    };
  }

  async exportCustomers(organizationId: number): Promise<ExportResponseDto> {
    const customers = await this.prisma.customer.findMany({
      where: { organizationId },
    });

    const csv = this.customersToCSV(customers);
    return {
      data: csv,
      filename: `customers-${organizationId}-${Date.now()}.csv`,
      timestamp: new Date(),
      rowCount: customers.length,
    };
  }

  async exportVendors(organizationId: number): Promise<ExportResponseDto> {
    const vendors = await this.prisma.vendor.findMany({
      where: { organizationId },
    });

    const csv = this.vendorsToCSV(vendors);
    return {
      data: csv,
      filename: `vendors-${organizationId}-${Date.now()}.csv`,
      timestamp: new Date(),
      rowCount: vendors.length,
    };
  }

  // ==================== IMPORT METHODS ====================

  async importProducts(organizationId: number, csvData: string): Promise<ImportResponseDto> {
    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;
    let skipped = 0;

    const rows = this.parseCSV(csvData);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNum = rowIndex + 2; // +1 for header, +1 for 1-based indexing

      try {
        const { code, name, description, cost_price: costPrice } = row;

        // Validate required fields
        if (!code || !name || !costPrice) {
          skipped++;
          errors.push({ row: rowNum, reason: 'Missing required fields: code, name, cost_price' });
          continue;
        }

        // cost_price is Decimal now - pass the trimmed string straight
        // through rather than parseInt (which truncates "12.50" to 12) or
        // parseFloat (which reintroduces binary float imprecision on write).
        // Prisma/Postgres parse the decimal string exactly.
        const trimmedCost = String(costPrice).trim();
        if (!/^\d+(\.\d{1,2})?$/.test(trimmedCost)) {
          skipped++;
          errors.push({ row: rowNum, reason: `Invalid cost_price: "${costPrice}"` });
          continue;
        }

        // Create product
        await this.prisma.product.create({
          data: {
            organizationId,
            code: code.trim(),
            name: name.trim(),
            description: description?.trim(),
            cost_price: trimmedCost,
            isActive: true,
          },
        });

        imported++;
      } catch (error: any) {
        skipped++;
        errors.push({ row: rowNum, reason: error.message });
      }
    }

    return {
      imported,
      skipped,
      errors: errors.slice(0, 100), // Limit error reporting
      timestamp: new Date(),
    };
  }

  async importBills(organizationId: number, csvData: string): Promise<ImportResponseDto> {
    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;
    let skipped = 0;

    const rows = this.parseCSV(csvData);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNum = rowIndex + 2;

      try {
        const { bill_number: billNumber, customerName, billDate, totalAmount, status } = row;

        // Validate required fields
        if (!billNumber || !customerName || !billDate || !totalAmount) {
          skipped++;
          errors.push({
            row: rowNum,
            reason: 'Missing required fields: bill_number, customerName, billDate, totalAmount',
          });
          continue;
        }

        // Find or create customer
        let customer = await this.prisma.customer.findFirst({
          where: { name: customerName.trim(), organizationId },
        });

        if (!customer) {
          customer = await this.prisma.customer.create({
            data: {
              organizationId,
              name: customerName.trim(),
              isActive: true,
            },
          });
        }

        // NOTE: OrderStatus has no DRAFT value (real values: PENDING_APPROVAL,
        // APPROVED, REJECTED, FULFILLED, CANCELLED). Defaulting imported bills
        // to APPROVED, matching the main bill creation path's default.
        await this.prisma.bill.create({
          data: {
            bill_number: billNumber.trim(),
            bill_date: new Date(billDate),
            customer: { connect: { id: customer.id } },
            salesman: { connect: { id: 1 } },
            User_Bill_created_byToUser: { connect: { id: 1 } },
            organization: { connect: { id: organizationId } },
            total_amount: parseInt(totalAmount, 10),
            discountPercentage: 0,
            channel: 'COUNTER',
            status: (status?.trim() as OrderStatus) || 'APPROVED',
            isActive: true,
          },
        });

        imported++;
      } catch (error: any) {
        skipped++;
        errors.push({ row: rowNum, reason: error.message });
      }
    }

    return {
      imported,
      skipped,
      errors: errors.slice(0, 100),
      timestamp: new Date(),
    };
  }

  async importPurchaseOrders(organizationId: number, csvData: string): Promise<ImportResponseDto> {
    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;
    let skipped = 0;

    const rows = this.parseCSV(csvData);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNum = rowIndex + 2;

      try {
        const {
          po_number: poNumber,
          vendor_name: vendorName,
          po_date: poDate,
          totalAmount,
          status,
        } = row;

        // Validate required fields
        if (!poNumber || !vendorName || !poDate || !totalAmount) {
          skipped++;
          errors.push({
            row: rowNum,
            reason: 'Missing required fields: po_number, vendor_name, po_date, totalAmount',
          });
          continue;
        }

        // Find or create vendor
        let vendor = await this.prisma.vendor.findFirst({
          where: { name: vendorName.trim(), organizationId },
        });

        if (!vendor) {
          vendor = await this.prisma.vendor.create({
            data: {
              organizationId,
              name: vendorName.trim(),
              isActive: true,
            },
          });
        }

        // Create PO
        // Note: PurchaseOrder has no po_date/total_amount columns; createdAt is used as the order date.
        await this.prisma.purchaseOrder.create({
          data: {
            organizationId,
            po_number: poNumber.trim(),
            vendorId: vendor.id,
            created_by: 1,
            createdAt: new Date(poDate),
            status: (status?.trim() as PurchaseOrderStatus) || 'DRAFT',
          },
        });

        imported++;
      } catch (error: any) {
        skipped++;
        errors.push({ row: rowNum, reason: error.message });
      }
    }

    return {
      imported,
      skipped,
      errors: errors.slice(0, 100),
      timestamp: new Date(),
    };
  }

  async importCustomers(organizationId: number, csvData: string): Promise<ImportResponseDto> {
    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;
    let skipped = 0;

    const rows = this.parseCSV(csvData);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNum = rowIndex + 2;

      try {
        const { name, email, phone, address } = row;

        // Validate required fields
        if (!name) {
          skipped++;
          errors.push({ row: rowNum, reason: 'Missing required field: name' });
          continue;
        }

        // Check for duplicate
        const existing = await this.prisma.customer.findFirst({
          where: { name: name.trim(), organizationId },
        });

        if (existing) {
          skipped++;
          errors.push({ row: rowNum, reason: 'Customer with this name already exists' });
          continue;
        }

        // Create customer
        await this.prisma.customer.create({
          data: {
            organizationId,
            name: name.trim(),
            email: email?.trim(),
            phone: phone?.trim(),
            address: address?.trim(),
            isActive: true,
          },
        });

        imported++;
      } catch (error: any) {
        skipped++;
        errors.push({ row: rowNum, reason: error.message });
      }
    }

    return {
      imported,
      skipped,
      errors: errors.slice(0, 100),
      timestamp: new Date(),
    };
  }

  async importVendors(organizationId: number, csvData: string): Promise<ImportResponseDto> {
    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;
    let skipped = 0;

    const rows = this.parseCSV(csvData);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNum = rowIndex + 2;

      try {
        const { name, email, phone, address, contactPerson } = row;

        // Validate required fields
        if (!name) {
          skipped++;
          errors.push({ row: rowNum, reason: 'Missing required field: name' });
          continue;
        }

        // Check for duplicate
        const existing = await this.prisma.vendor.findFirst({
          where: { name: name.trim(), organizationId },
        });

        if (existing) {
          skipped++;
          errors.push({ row: rowNum, reason: 'Vendor with this name already exists' });
          continue;
        }

        // Create vendor
        await this.prisma.vendor.create({
          data: {
            organizationId,
            name: name.trim(),
            email: email?.trim(),
            phone: phone?.trim(),
            address: address?.trim(),
            contact_person: contactPerson?.trim(),
            isActive: true,
          },
        });

        imported++;
      } catch (error: any) {
        skipped++;
        errors.push({ row: rowNum, reason: error.message });
      }
    }

    return {
      imported,
      skipped,
      errors: errors.slice(0, 100),
      timestamp: new Date(),
    };
  }

  // ==================== HELPER METHODS ====================

  private parseCSV(csvData: string): Record<string, string>[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      throw new BadRequestException('CSV must contain at least a header and one data row');
    }

    const headerLine = lines[0];
    const headers = this.parseCSVLine(headerLine);

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());
    return result;
  }

  private productsToCSV(products: any[]): string {
    const headers = ['code', 'name', 'description', 'cost_price'];
    const rows = products.map(p => [p.code, p.name, p.description || '', p.cost_price || '']);

    return this.arrayToCSV([headers, ...rows]);
  }

  private billsToCSV(bills: any[]): string {
    const headers = ['bill_number', 'customerName', 'billDate', 'totalAmount', 'status', 'remarks'];
    const rows = bills.map(b => [
      b.bill_number,
      b.customer?.name || '',
      b.bill_date.toISOString().split('T')[0],
      b.total_amount || '',
      b.status || '',
      b.remarks || '',
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  private poToCSV(pos: any[]): string {
    const headers = ['po_number', 'vendor_name', 'po_date', 'totalAmount', 'status', 'remarks'];
    const rows = pos.map(po => [
      po.po_number,
      po.vendor?.name || '',
      po.po_date.toISOString().split('T')[0],
      po.total_amount || '',
      po.status || '',
      po.remarks || '',
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  private customersToCSV(customers: any[]): string {
    const headers = ['name', 'email', 'phone', 'address'];
    const rows = customers.map(c => [c.name, c.email || '', c.phone || '', c.address || '']);

    return this.arrayToCSV([headers, ...rows]);
  }

  private vendorsToCSV(vendors: any[]): string {
    const headers = ['name', 'email', 'phone', 'address', 'contactPerson'];
    const rows = vendors.map(v => [
      v.name,
      v.email || '',
      v.phone || '',
      v.address || '',
      v.contact_person || '',
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  private arrayToCSV(data: string[][]): string {
    return data.map(row => row.map(cell => this.escapeCSVCell(cell)).join(',')).join('\n');
  }

  private escapeCSVCell(cell: string): string {
    if (!cell) return '';
    const cellStr = cell.toString();
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
      return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
  }
}

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { BillsModule } from './modules/bills/bills.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { GatePassesModule } from './modules/gate-passes/gate-passes.module';
import { WebsiteOrdersModule } from './modules/website-orders/website-orders.module';
import { WarehouseTransfersModule } from './modules/warehouse-transfers/warehouse-transfers.module';
import { CashBookModule } from './modules/cash-book/cash-book.module';
import { SalesCommissionModule } from './modules/sales-commission/sales-commission.module';
import { ChartOfAccountsModule } from './modules/chart-of-accounts/chart-of-accounts.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { GLReportingModule } from './modules/gl-reporting/gl-reporting.module';
import { ArApAgingModule } from './modules/ar-ap-aging/ar-ap-aging.module';
import { BudgetModule } from './modules/budget/budget.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { BrandsModule } from './modules/brands/brands.module';
// Orphaned modules - re-integrated in Phase 2
import { DataManagementModule } from './modules/data-management/data-management.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { ImportExportModule } from './modules/import-export/import-export.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { LabourModule } from './modules/labour/labour.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    UsersModule,
    // INCREMENTAL ENABLING (RULE #5)
    // ✅ Step 1: Core modules (UsersModule + DB)
    // ✅ Step 2: Warehouses - WORKING ✓
    // ✅ Step 3: Products - WORKING ✓
    WarehousesModule,
    ProductsModule,
    // Continuing...
    CustomersModule,
    BillsModule,
    InventoryModule,
    GatePassesModule,
    WebsiteOrdersModule,
    WarehouseTransfersModule,
    CashBookModule,
    SalesCommissionModule,
    // ACCOUNTING/GL MODULES (Phase 3)
    ChartOfAccountsModule,
    JournalEntriesModule,
    GLReportingModule,
    // AR/AP AGING (Phase 3.5)
    ArApAgingModule,
    // BUDGET MODULE (Phase 3.6)
    BudgetModule,
    // PRODUCT CATEGORIES (Phase 3.7)
    ProductCategoriesModule,
    BrandsModule,
    // RE-INTEGRATED ORPHANED MODULES (Phase 2)
    DataManagementModule,
    EmailModule,
    HealthModule,
    ImportExportModule,
    InvoicesModule,
    LabourModule,
    MetricsModule,
    NotificationsModule,
    PermissionsModule,
    PurchaseOrdersModule,
    ReportingModule,
    VendorsModule,
    WebSocketModule,
  ],
  controllers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

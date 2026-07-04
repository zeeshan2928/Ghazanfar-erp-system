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
import { ReportingModule } from './modules/reporting/reporting.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ImportExportModule } from './modules/import-export/import-export.module';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { PermissionsModule } from './modules/permissions/permissions.module';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    UsersModule,
    WarehousesModule,
    ProductsModule,
    CustomersModule,
    BillsModule,
    InventoryModule,
    GatePassesModule,
    WebsiteOrdersModule,
    WarehouseTransfersModule,
    ReportingModule,
    VendorsModule,
    PurchaseOrdersModule,
    ImportExportModule,
    NotificationsModule,
    AuditModule,
    EmailModule,
    WebSocketModule,
    PermissionsModule,
  ],
  controllers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

/**
 * Curated action-level permission taxonomy for the granular per-user
 * permissions system (Settings tab). Not one key per raw API endpoint -
 * grouped into the actions that actually matter per module, grounded in
 * what each controller really does. Extend this list (and the guards that
 * reference these keys) as more modules get covered in future rounds.
 */

export interface PermissionCatalogEntry {
  key: string;
  label: string;
}

export interface PermissionCatalogModule {
  module: string;
  label: string;
  permissions: PermissionCatalogEntry[];
}

export const PERMISSION_CATALOG: PermissionCatalogModule[] = [
  {
    module: 'bills',
    label: 'Bills / Invoices',
    permissions: [
      { key: 'bills.view', label: 'View bills' },
      { key: 'bills.create', label: 'Create bills' },
      { key: 'bills.edit', label: 'Edit bills' },
      { key: 'bills.delete', label: 'Delete bills' },
      { key: 'bills.change_status', label: 'Approve / reject / fulfill / cancel bills' },
      { key: 'bills.export', label: 'Export bill PDF' },
    ],
  },
  {
    module: 'gatepasses',
    label: 'Gate Passes',
    permissions: [
      { key: 'gatepasses.view', label: 'View gate passes' },
      { key: 'gatepasses.pick', label: 'Pick items / complete picking' },
      { key: 'gatepasses.confirm', label: 'Confirm gate pass' },
      { key: 'gatepasses.reject', label: 'Reject gate pass' },
      { key: 'gatepasses.report_shortage', label: 'Report stock shortage' },
    ],
  },
  {
    module: 'purchase_orders',
    label: 'Purchase Orders',
    permissions: [
      { key: 'purchase_orders.view', label: 'View purchase orders' },
      { key: 'purchase_orders.create', label: 'Create purchase orders' },
      { key: 'purchase_orders.edit', label: 'Edit purchase orders' },
      { key: 'purchase_orders.delete', label: 'Delete purchase orders' },
      { key: 'purchase_orders.send', label: 'Send purchase order to vendor' },
      { key: 'purchase_orders.confirm_receipt', label: 'Confirm receipt of goods' },
      { key: 'purchase_orders.auto_generate', label: 'Auto/manual-generate POs from low stock' },
    ],
  },
  {
    module: 'purchase_returns',
    label: 'Purchase Returns',
    permissions: [
      { key: 'purchase_returns.view', label: 'View purchase returns' },
      { key: 'purchase_returns.create', label: 'Create purchase returns' },
    ],
  },
  {
    module: 'journal_entries',
    label: 'Journal Entries',
    permissions: [
      { key: 'journal_entries.view', label: 'View journal entries' },
      { key: 'journal_entries.create', label: 'Create journal entries' },
      { key: 'journal_entries.post', label: 'Post journal entries' },
      { key: 'journal_entries.reverse', label: 'Reverse journal entries' },
    ],
  },
  {
    module: 'chart_of_accounts',
    label: 'Chart of Accounts',
    permissions: [
      { key: 'chart_of_accounts.view', label: 'View chart of accounts' },
      { key: 'chart_of_accounts.edit', label: 'Create / edit / seed accounts' },
      { key: 'chart_of_accounts.delete', label: 'Deactivate accounts' },
    ],
  },
  {
    module: 'vendors',
    label: 'Vendors',
    permissions: [
      { key: 'vendors.view', label: 'View vendors' },
      { key: 'vendors.create', label: 'Create vendors' },
      { key: 'vendors.edit', label: 'Edit vendors' },
      { key: 'vendors.deactivate', label: 'Deactivate vendors' },
    ],
  },
  {
    module: 'customers',
    label: 'Customers',
    permissions: [
      { key: 'customers.view', label: 'View customers' },
      { key: 'customers.create', label: 'Create customers' },
      { key: 'customers.edit', label: 'Edit customers' },
      { key: 'customers.deactivate', label: 'Deactivate customers' },
    ],
  },
  {
    module: 'inventory',
    label: 'Inventory',
    permissions: [
      { key: 'inventory.view', label: 'View inventory / stock status' },
      { key: 'inventory.set_levels', label: 'Set min/max/reorder stock levels' },
      { key: 'inventory.stock_in', label: 'Receive stock' },
      { key: 'inventory.stock_out', label: 'Issue / deduct stock' },
      { key: 'inventory.adjust', label: 'Manually adjust stock' },
      { key: 'inventory.reconcile', label: 'Start reconciliation / record physical count' },
      { key: 'inventory.reconcile_approve', label: 'Approve reconciliation (applies adjustments)' },
      { key: 'inventory.hold', label: 'Place / release stock holds' },
      { key: 'inventory.transfer', label: 'Initiate / confirm warehouse-to-warehouse transfer' },
      { key: 'inventory.release_reservation', label: 'Release a stock reservation' },
      { key: 'inventory.process_return', label: 'Process a customer return' },
    ],
  },
  {
    module: 'warehouses',
    label: 'Warehouses',
    permissions: [
      { key: 'warehouses.view', label: 'View warehouses' },
      { key: 'warehouses.create', label: 'Create warehouses' },
    ],
  },
  {
    module: 'warehouse_transfers',
    label: 'Warehouse Transfers',
    permissions: [
      { key: 'warehouse_transfers.view', label: 'View warehouse transfers' },
      { key: 'warehouse_transfers.create', label: 'Create a transfer request' },
      { key: 'warehouse_transfers.start', label: 'Start / dispatch a transfer' },
      { key: 'warehouse_transfers.confirm_receipt', label: 'Confirm receipt of a transfer' },
      { key: 'warehouse_transfers.reject', label: 'Reject a transfer' },
    ],
  },
  {
    module: 'cash_book',
    label: 'Cash Book',
    permissions: [
      { key: 'cash_book.view', label: 'View entries, reports, and audit trail' },
      { key: 'cash_book.create', label: 'Create cash book entries' },
      { key: 'cash_book.edit', label: 'Edit entries, link bills, add comments' },
      { key: 'cash_book.delete', label: 'Delete draft entries' },
      { key: 'cash_book.post', label: 'Post / finalize an entry' },
      { key: 'cash_book.approve', label: 'Approve / reject entries (incl. bulk)' },
      { key: 'cash_book.reconcile', label: 'Upload statements / run / complete bank reconciliation' },
      { key: 'cash_book.match', label: 'Match / undo-match / batch auto-match bills' },
      { key: 'cash_book.export', label: 'Export cash book reports' },
    ],
  },
  {
    module: 'budget',
    label: 'Budget',
    permissions: [
      { key: 'budget.view', label: 'View budgets and variance reports' },
      { key: 'budget.create', label: 'Create budgets' },
      { key: 'budget.edit', label: 'Edit budgets' },
      { key: 'budget.delete', label: 'Delete budgets' },
    ],
  },
  {
    module: 'brands',
    label: 'Brands',
    permissions: [
      { key: 'brands.view', label: 'View brands' },
      { key: 'brands.create', label: 'Create brands' },
      { key: 'brands.edit', label: 'Edit brands' },
      { key: 'brands.delete', label: 'Delete brands' },
    ],
  },
  {
    module: 'product_categories',
    label: 'Product Categories',
    permissions: [
      { key: 'product_categories.view', label: 'View product categories' },
      { key: 'product_categories.create', label: 'Create product categories' },
      { key: 'product_categories.edit', label: 'Edit product categories' },
      { key: 'product_categories.delete', label: 'Delete product categories' },
    ],
  },
  {
    module: 'commission',
    label: 'Sales Commission',
    permissions: [
      { key: 'commission.view', label: 'View assignments, rules, history, summary' },
      { key: 'commission.create', label: 'Create assignments / rules / product commission' },
      { key: 'commission.edit', label: 'Edit assignments / rules' },
      { key: 'commission.deactivate', label: 'Deactivate an assignment' },
      { key: 'commission.approve', label: 'Approve a calculated commission' },
      { key: 'commission.mark_paid', label: 'Mark commission as paid' },
    ],
  },
  {
    module: 'notifications',
    label: 'Notifications',
    permissions: [
      { key: 'notifications.view', label: 'View notifications' },
      { key: 'notifications.manage', label: 'Mark read / delete / change preferences' },
    ],
  },
  {
    module: 'website_orders',
    label: 'Website Orders',
    permissions: [
      { key: 'website_orders.view', label: 'View website orders' },
      { key: 'website_orders.approve', label: 'Approve a website order' },
      { key: 'website_orders.reject', label: 'Reject a website order' },
    ],
  },
  {
    module: 'import_export',
    label: 'Import / Export',
    permissions: [
      { key: 'import_export.export', label: 'Export data to CSV' },
      { key: 'import_export.import', label: 'Bulk import data from CSV' },
    ],
  },
  {
    module: 'data_management',
    label: 'Data Management',
    permissions: [
      { key: 'data_management.view', label: 'View archive/storage reports' },
      { key: 'data_management.archive', label: 'Archive old records' },
      { key: 'data_management.purge', label: 'Purge old records' },
    ],
  },
  {
    module: 'email',
    label: 'Email',
    permissions: [
      { key: 'email.view', label: 'View email templates and logs' },
      { key: 'email.edit_templates', label: 'Edit email templates' },
    ],
  },
  {
    module: 'assembly-formulas',
    label: 'Assembly Cost Formulas (BOM)',
    permissions: [
      { key: 'assembly-formulas.view', label: 'View assembly formulas and part costs' },
      { key: 'assembly-formulas.edit', label: 'Edit part costs' },
      { key: 'assembly-formulas.import', label: 'Import BOM cost spreadsheets' },
    ],
  },
  {
    module: 'boms',
    label: 'Recipes (BOM)',
    permissions: [
      { key: 'boms.view', label: 'View recipes, costs, and where-used' },
      { key: 'boms.create', label: 'Create a recipe' },
      { key: 'boms.edit', label: 'Edit a recipe, create a new version, or deactivate' },
    ],
  },
  {
    module: 'product-seed',
    label: 'Product Master Seeding',
    permissions: [
      { key: 'product-seed.run', label: 'Seed products from inventory/sales/purchase data, and review classification' },
    ],
  },
  {
    module: 'locations',
    label: 'Cities & Provinces',
    permissions: [
      { key: 'locations.view', label: 'View / search cities and provinces, request a missing city' },
    ],
  },
  {
    module: 'manufacturing',
    label: 'Manufacturing Orders',
    permissions: [
      { key: 'manufacturing.view', label: 'View manufacturing orders' },
      { key: 'manufacturing.create', label: 'Create a manufacturing order' },
      { key: 'manufacturing.start', label: 'Start production (checks material availability)' },
      { key: 'manufacturing.complete', label: 'Complete production - moves stock, freezes batch cost' },
      { key: 'manufacturing.cancel', label: 'Cancel a manufacturing order' },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap((m) =>
  m.permissions.map((p) => p.key),
);

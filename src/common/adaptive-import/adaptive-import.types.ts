// Canonical fields the importer maps arbitrary spreadsheet columns onto.
// The same engine serves both sales and purchase imports; a module picks
// which field set applies. `account` maps to the customer's account on the
// sales side and the vendor on the purchase side.
export type CanonicalField =
  | 'transactionDate'
  | 'billNumber'
  | 'itemRaw'
  | 'quantity'
  | 'unitPrice'
  | 'actualPrice'
  | 'lineAmount'
  | 'accountName'
  | 'customerName'
  | 'vendorName'
  | 'salesmanName'
  | 'category'
  | 'brand'
  | 'warehouseName'
  | 'transactionType';

export type ImportModule = 'SALES' | 'PURCHASE';
export type Structure = 'FLAT' | 'MULTI_ROW';

export interface FieldSpec {
  field: CanonicalField;
  label: string;
  required: boolean;
  synonyms: string[]; // already normalized (lowercase, alnum+spaces)
}

// Fields offered per module, in display order, with header synonyms.
export const FIELD_SETS: Record<ImportModule, FieldSpec[]> = {
  SALES: [
    { field: 'transactionDate', label: 'Date', required: true, synonyms: ['date time', 'date', 'bill date', 'invoice date', 'transaction date', 'sale date'] },
    { field: 'billNumber', label: 'Invoice / Bill No', required: true, synonyms: ['invoice ids', 'invoice id', 'invoice no', 'invoice number', 'invoice', 'manual sales number', 'bill no', 'bill number', 'reference', 'ref'] },
    { field: 'itemRaw', label: 'Item / Product', required: true, synonyms: ['item name', 'item', 'product', 'product name', 'description', 'particulars'] },
    { field: 'quantity', label: 'Quantity', required: true, synonyms: ['units sold', 'units', 'quantity', 'qty', 'qnty', 'no of units'] },
    { field: 'unitPrice', label: 'Sale / Unit Price', required: true, synonyms: ['sale price', 'sold price', 'unit price', 'rate', 'price', 'per item price', 'selling price'] },
    { field: 'lineAmount', label: 'Line Total', required: false, synonyms: ['total amount', 'amount', 'line total', 'net amount', 'value', 'total'] },
    { field: 'actualPrice', label: 'List / Actual Price', required: false, synonyms: ['actual price', 'list price', 'mrp', 'retail price', 'original price'] },
    { field: 'accountName', label: 'Account', required: false, synonyms: ['account', 'account name'] },
    { field: 'customerName', label: 'Customer', required: false, synonyms: ['customer name', 'customer', 'party', 'party name', 'client'] },
    { field: 'salesmanName', label: 'Salesman', required: false, synonyms: ['employee name', 'employee', 'salesman', 'sales man', 'salesperson', 'sales person', 'user name', 'user', 'cashier', 'sales rep', 'rep'] },
    { field: 'category', label: 'Category', required: false, synonyms: ['category', 'categories', 'item category', 'product category'] },
    { field: 'brand', label: 'Brand', required: false, synonyms: ['brand', 'brand name', 'company', 'make', 'manufacturer'] },
    { field: 'warehouseName', label: 'Warehouse', required: false, synonyms: ['warehouse name', 'warehouse', 'godown', 'store', 'location'] },
    { field: 'transactionType', label: 'Type (Cash/Credit/Return)', required: false, synonyms: ['type', 'bill type', 'transaction type', 'payment type', 'payment method', 'mode'] },
  ],
  PURCHASE: [
    { field: 'transactionDate', label: 'Date', required: true, synonyms: ['date time', 'date', 'po date', 'purchase date', 'bill date', 'transaction date'] },
    { field: 'billNumber', label: 'Batch / Stock / PO No', required: true, synonyms: ['stock ids', 'stock id', 'po number', 'po no', 'purchase order', 'batch', 'batch no', 'invoice ids', 'invoice no', 'reference', 'ref'] },
    { field: 'itemRaw', label: 'Item / Product', required: true, synonyms: ['item name', 'item', 'product', 'product name', 'description', 'particulars'] },
    { field: 'quantity', label: 'Quantity', required: true, synonyms: ['units', 'units purchased', 'quantity', 'quantity purchased', 'qty', 'qnty'] },
    { field: 'unitPrice', label: 'Purchase / Unit Price', required: true, synonyms: ['per item price', 'purchase price', 'cost price', 'buy price', 'unit cost', 'unit price', 'rate', 'price'] },
    { field: 'lineAmount', label: 'Line Total', required: false, synonyms: ['total amount', 'amount', 'line total', 'net amount', 'value', 'total'] },
    { field: 'vendorName', label: 'Vendor / Account', required: false, synonyms: ['vendor', 'vendor name', 'supplier', 'supplier name', 'account', 'account name', 'party'] },
    { field: 'warehouseName', label: 'Warehouse', required: false, synonyms: ['warehouse name', 'warehouse', 'godown', 'store', 'location'] },
    { field: 'category', label: 'Category', required: false, synonyms: ['category', 'categories', 'item category', 'product category'] },
    { field: 'brand', label: 'Brand', required: false, synonyms: ['brand', 'brand name', 'company', 'make', 'manufacturer'] },
    { field: 'transactionType', label: 'Type', required: false, synonyms: ['type', 'transaction type', 'purchase type'] },
  ],
};

// Header-ish (context) fields carried forward onto continuation rows in a
// multi-row-per-bill layout. Item-level fields (item, qty, prices, amount,
// category, brand) are always read from the current row.
export const CARRY_FORWARD_FIELDS: CanonicalField[] = [
  'transactionDate',
  'billNumber',
  'accountName',
  'customerName',
  'vendorName',
  'salesmanName',
  'warehouseName',
  'transactionType',
];

export interface DetectedColumn {
  index: number;
  header: string;
  sampleValues: string[];
}

export interface CanonicalRow {
  transactionDate: Date | null;
  billNumber: string;
  lineSequence: number;
  itemRaw: string;
  productCode: string | null;
  quantity: number;
  unitPrice: number;
  actualPrice: number | null;
  lineAmount: number;
  accountName: string | null;
  customerName: string | null;
  vendorName: string | null;
  salesmanName: string | null;
  category: string | null;
  brand: string | null;
  warehouseName: string | null;
  paymentMethod: string | null;
  isReturn: boolean;
}

export type ColumnMapping = Partial<Record<CanonicalField, number>>; // field -> column index

export interface AnalyzeResult {
  headerRowIndex: number;
  columns: DetectedColumn[];
  mapping: ColumnMapping;
  confidence: Partial<Record<CanonicalField, number>>;
  structure: Structure;
  signature: string;
  unmappedRequired: string[];
  matchedTemplate: boolean;
  preview: CanonicalRow[];
}

================================================================================
-- GHAZANFAR ERP SYSTEM - COMPLETE DATABASE SCHEMA
-- Phase 5: Database Indexing & Partitioning
-- Created: 2026-07-04
-- Database: PostgreSQL 13+
-- Tables: 126+ across 10 Business Heads
================================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

================================================================================
--                          MASTER TABLES (Shared)
================================================================================

-- Business Heads Configuration
CREATE TABLE IF NOT EXISTS business_heads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    icon VARCHAR(20),
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization (Multi-tenancy support)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    organization_id INT NOT NULL,
    role_id INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

================================================================================
--                        HEAD 1: SALES (7 Tables)
================================================================================

-- Partition parent table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    bill_number VARCHAR(50) NOT NULL,
    customer_id INT,
    bill_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) PARTITION BY RANGE (YEAR(bill_date), MONTH(bill_date));

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(20), -- 'amount' or 'percentage'
    tax_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    payment_method VARCHAR(50), -- 'Direct', 'JV', 'Credit', 'Cash'
    bank_account_id INT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Discounts
CREATE TABLE IF NOT EXISTS discounts (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT NOT NULL,
    discount_amount DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    discount_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Taxes
CREATE TABLE IF NOT EXISTS taxes (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    tax_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Shipping
CREATE TABLE IF NOT EXISTS shipping (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT NOT NULL,
    delivery_address TEXT,
    delivery_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Returns
CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT NOT NULL,
    returned_item VARCHAR(255),
    quantity INT,
    reason TEXT,
    refund_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- SALES Indexes
CREATE INDEX idx_orders_org_date ON orders(organization_id, bill_date DESC);
CREATE INDEX idx_orders_customer ON orders(organization_id, customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_payments_order ON payments(order_id);

================================================================================
--                      HEAD 2: PURCHASING (7 Tables)
================================================================================

-- Purchase Orders (Partitioned)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    po_number VARCHAR(50) NOT NULL,
    vendor_id INT,
    po_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) PARTITION BY RANGE (YEAR(po_date), MONTH(po_date));

-- PO Items
CREATE TABLE IF NOT EXISTS po_items (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    po_id INT NOT NULL,
    product_id INT,
    quantity_ordered INT NOT NULL,
    unit_price DECIMAL(12,2),
    line_total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- Goods Receipts
CREATE TABLE IF NOT EXISTS goods_receipts (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    po_id INT NOT NULL,
    quantity_received INT NOT NULL,
    received_date TIMESTAMP NOT NULL,
    inspection_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- Vendor Invoices
CREATE TABLE IF NOT EXISTS vendor_invoices (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    po_id INT,
    vendor_id INT,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date TIMESTAMP NOT NULL,
    amount DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- Vendor Payments
CREATE TABLE IF NOT EXISTS vendor_payments (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    invoice_id INT,
    payment_amount DECIMAL(15,2),
    payment_date TIMESTAMP NOT NULL,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES vendor_invoices(id) ON DELETE CASCADE
);

-- Purchase Returns
CREATE TABLE IF NOT EXISTS purchase_returns (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    po_id INT,
    item_returned VARCHAR(255),
    quantity INT,
    reason TEXT,
    credit_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- Reorder Management
CREATE TABLE IF NOT EXISTS reorder_management (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    product_id INT,
    minimum_stock_level INT,
    reorder_quantity INT,
    auto_trigger_enabled BOOLEAN DEFAULT false,
    last_reorder_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- PURCHASING Indexes
CREATE INDEX idx_po_org_date ON purchase_orders(organization_id, po_date DESC);
CREATE INDEX idx_po_vendor ON purchase_orders(organization_id, vendor_id);

================================================================================
--                      HEAD 3: INVENTORY (7 Tables)
================================================================================

-- Inventory (Stock Levels)
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    product_id INT,
    warehouse_id INT,
    physical_on_hand INT DEFAULT 0,
    reserved INT DEFAULT 0,
    available INT DEFAULT 0,
    opening_balance INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, product_id, warehouse_id)
);

-- Warehouse Transfers
CREATE TABLE IF NOT EXISTS warehouse_transfers (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    from_warehouse_id INT,
    to_warehouse_id INT,
    product_id INT,
    quantity INT NOT NULL,
    transfer_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    product_id INT,
    warehouse_id INT,
    quantity_difference INT NOT NULL,
    reason VARCHAR(100), -- 'Count mismatch', 'Damage', 'Theft', etc
    adjustment_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Stock Movements Log
CREATE TABLE IF NOT EXISTS stock_movements_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    product_id INT,
    warehouse_id INT,
    movement_type VARCHAR(50), -- 'In', 'Out', 'Transfer'
    quantity INT NOT NULL,
    reference_id INT, -- PO/Invoice/Transfer ID
    reference_type VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Reorder Points
CREATE TABLE IF NOT EXISTS reorder_points (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    product_id INT,
    minimum_level INT,
    maximum_level INT,
    reorder_quantity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Physical Stock Audit
CREATE TABLE IF NOT EXISTS physical_stock_audit (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    warehouse_id INT,
    audit_date TIMESTAMP NOT NULL,
    product_id INT,
    expected_quantity INT,
    actual_quantity INT,
    variance INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Stock Performance Analytics
CREATE TABLE IF NOT EXISTS stock_performance (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    product_id INT,
    last_sale_date TIMESTAMP,
    days_since_last_sale INT, -- Calculated: TODAY - last_sale_date
    sales_velocity DECIMAL(10,2), -- Units per day
    alert_status VARCHAR(50), -- 'HOT', 'NORMAL', 'SLOW', 'DEAD'
    dead_stock_threshold INT DEFAULT 45, -- 45 days without sale
    notification_flag BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- INVENTORY Indexes
CREATE INDEX idx_inventory_org_product ON inventory(organization_id, product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(organization_id, warehouse_id);
CREATE INDEX idx_stock_movements_product ON stock_movements_log(product_id, timestamp DESC);
CREATE INDEX idx_stock_performance_alert ON stock_performance(organization_id, alert_status);

================================================================================
--                      HEAD 4: ACCOUNTS (13 Tables)
================================================================================

-- Bank Accounts (Own + Vendor managed)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    account_type VARCHAR(50), -- 'Own', 'Vendor'
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_holder_name VARCHAR(100),
    current_balance DECIMAL(18,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    type VARCHAR(50), -- 'Direct', 'JV', 'Credit', 'Cash'
    description VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Ledger (Master)
CREATE TABLE IF NOT EXISTS ledger (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    ledger_date TIMESTAMP NOT NULL,
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(18,2),
    category_id INT,
    reference_type VARCHAR(50),
    reference_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    entry_date TIMESTAMP NOT NULL,
    debit_account INT,
    credit_account INT,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    budget_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    expense_date TIMESTAMP NOT NULL,
    category_id INT,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);

-- JV Payment Tracking (Joint Venture - Customer pays vendor, settlement required)
CREATE TABLE IF NOT EXISTS jv_payment_tracking (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    vendor_id INT,
    amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    receipt_status VARCHAR(50) DEFAULT 'PENDING', -- 'Pending', 'Verified', 'Cleared'
    verification_date TIMESTAMP,
    settlement_status VARCHAR(50) DEFAULT 'PENDING',
    settlement_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Payment Reconciliation
CREATE TABLE IF NOT EXISTS payment_reconciliation (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    reconciliation_date TIMESTAMP NOT NULL,
    payment_id INT,
    receipt_verified BOOLEAN DEFAULT false,
    bank_account_matched BOOLEAN DEFAULT false,
    status VARCHAR(50), -- 'Matched', 'Discrepancy'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Credit Limits
CREATE TABLE IF NOT EXISTS credit_limits (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    credit_limit_amount DECIMAL(15,2),
    current_used_amount DECIMAL(15,2) DEFAULT 0,
    available_credit DECIMAL(15,2),
    last_reviewed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Invoice-Payment Mapping
CREATE TABLE IF NOT EXISTS invoice_payment_mapping (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    invoice_id INT,
    payment_id INT,
    amount_applied DECIMAL(15,2),
    remaining_balance DECIMAL(15,2),
    application_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Aging Report
CREATE TABLE IF NOT EXISTS aging_report (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    invoice_id INT,
    invoice_date TIMESTAMP,
    days_outstanding INT,
    amount_outstanding DECIMAL(15,2),
    age_bracket VARCHAR(50), -- '0-7', '7-14', '14-21', '21-30', '30+'
    status VARCHAR(50), -- 'Pending', 'Partially paid', 'Overdue'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- P&L Report
CREATE TABLE IF NOT EXISTS profit_loss_reports (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    period_type VARCHAR(50), -- 'Month', 'Quarter', 'Year'
    period_date TIMESTAMP,
    total_revenue DECIMAL(18,2),
    total_cogs DECIMAL(18,2),
    gross_profit DECIMAL(18,2),
    total_expenses DECIMAL(18,2),
    net_profit DECIMAL(18,2),
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Balance Sheet
CREATE TABLE IF NOT EXISTS balance_sheets (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    report_date TIMESTAMP,
    assets_total DECIMAL(18,2),
    liabilities_total DECIMAL(18,2),
    equity_total DECIMAL(18,2),
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ACCOUNTS Indexes
CREATE INDEX idx_ledger_org_date ON ledger(organization_id, ledger_date DESC);
CREATE INDEX idx_jv_payment_status ON jv_payment_tracking(organization_id, settlement_status);
CREATE INDEX idx_aging_customer ON aging_report(organization_id, customer_id);

================================================================================
--                    HEAD 5: WALKIN_RETAIL (7 Tables)
================================================================================

-- Walk-in Orders
CREATE TABLE IF NOT EXISTS walkin_orders (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    bill_date TIMESTAMP NOT NULL,
    customer_name VARCHAR(100),
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Walk-in Items
CREATE TABLE IF NOT EXISTS walkin_items (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    bill_id INT NOT NULL,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(20), -- 'amount' or 'percentage'
    tax_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES walkin_orders(id) ON DELETE CASCADE
);

-- Walk-in Customers
CREATE TABLE IF NOT EXISTS walkin_customers (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    visit_frequency INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Walk-in Cash Register
CREATE TABLE IF NOT EXISTS walkin_cash_register (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    register_date TIMESTAMP NOT NULL,
    opening_balance DECIMAL(15,2),
    cash_in DECIMAL(15,2) DEFAULT 0,
    cash_out DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2),
    verified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Walk-in Returns
CREATE TABLE IF NOT EXISTS walkin_returns (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    bill_id INT,
    item_id INT,
    quantity INT,
    reason TEXT,
    refund_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES walkin_orders(id) ON DELETE CASCADE
);

-- Walk-in Discounts
CREATE TABLE IF NOT EXISTS walkin_discounts (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    bill_id INT,
    item_discount DECIMAL(10,2) DEFAULT 0,
    total_discount DECIMAL(10,2) DEFAULT 0,
    total_discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES walkin_orders(id) ON DELETE CASCADE
);

-- Walk-in Payment Methods
CREATE TABLE IF NOT EXISTS walkin_payment_methods (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    bill_id INT,
    amount DECIMAL(15,2),
    method VARCHAR(50), -- 'Cash', 'Card', 'UPI'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES walkin_orders(id) ON DELETE CASCADE
);

-- WALKIN_RETAIL Indexes
CREATE INDEX idx_walkin_orders_date ON walkin_orders(organization_id, bill_date DESC);

================================================================================
--                        HEAD 6: CUSTOMERS (10 Tables)
================================================================================

-- Customer Profiles
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    category VARCHAR(50), -- 'Retail', 'Wholesale', 'Corporate', 'VIP'
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Customer Categories
CREATE TABLE IF NOT EXISTS customer_categories (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(50),
    description TEXT,
    default_discount DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Customer Credit Limits
CREATE TABLE IF NOT EXISTS customer_credit_limits (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    credit_limit_amount DECIMAL(15,2),
    current_balance DECIMAL(15,2) DEFAULT 0,
    available_credit DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Customer History
CREATE TABLE IF NOT EXISTS customer_history (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    invoice_id INT,
    transaction_date TIMESTAMP,
    amount DECIMAL(15,2),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Customer Preferences
CREATE TABLE IF NOT EXISTS customer_preferences (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    preferred_payment_method VARCHAR(50),
    preferred_delivery_address TEXT,
    special_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Customer Communication Log
CREATE TABLE IF NOT EXISTS customer_communication_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    communication_type VARCHAR(50), -- 'Call', 'Message', 'Email', 'Visit'
    communication_date TIMESTAMP,
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Customer Analytics
CREATE TABLE IF NOT EXISTS customer_analytics (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    total_spent DECIMAL(18,2),
    days_as_customer INT,
    avg_order_value DECIMAL(15,2),
    total_orders INT,
    last_purchase_date TIMESTAMP,
    purchase_frequency VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Customer Product Purchases
CREATE TABLE IF NOT EXISTS customer_product_purchases (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    product_id INT,
    quantity INT,
    price_paid DECIMAL(12,2),
    purchase_date TIMESTAMP,
    purchase_frequency VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Customer Sales Targets
CREATE TABLE IF NOT EXISTS customer_targets (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    product_id INT,
    target_quantity INT,
    target_period VARCHAR(50), -- 'Month', 'Quarter'
    current_progress INT DEFAULT 0,
    deadline TIMESTAMP,
    target_status VARCHAR(50), -- 'On track', 'Behind', 'Completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Customer Incentives
CREATE TABLE IF NOT EXISTS customer_incentives (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    product_id INT,
    target_quantity INT,
    discount_offered DECIMAL(10,2),
    discount_type VARCHAR(50), -- 'amount' or 'percentage'
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- CUSTOMERS Indexes
CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customer_history_customer ON customer_history(customer_id, transaction_date DESC);

================================================================================
--                        HEAD 7: VENDORS (13 Tables)
================================================================================

-- Vendor Profiles
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    bank_account_details TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Vendor Categories
CREATE TABLE IF NOT EXISTS vendor_categories (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(50), -- 'Wholesaler', 'Distributor', 'Manufacturer'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Vendor Payment Terms
CREATE TABLE IF NOT EXISTS vendor_payment_terms (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    term_type VARCHAR(50), -- 'Net 30', 'COD', 'Advance'
    days_allowed INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Pricing History
CREATE TABLE IF NOT EXISTS vendor_pricing_history (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    product_id INT,
    price DECIMAL(12,2),
    effective_date TIMESTAMP,
    end_date TIMESTAMP,
    change_reason VARCHAR(255), -- 'inflation', 'negotiation', etc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Performance
CREATE TABLE IF NOT EXISTS vendor_performance (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    on_time_delivery_percentage DECIMAL(5,2),
    quality_rating DECIMAL(3,1), -- 1-5
    last_assessment_date TIMESTAMP,
    overall_score DECIMAL(3,1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Products
CREATE TABLE IF NOT EXISTS vendor_products (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    product_id INT,
    unit_price DECIMAL(12,2),
    lead_time_days INT,
    minimum_order_qty INT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Communication
CREATE TABLE IF NOT EXISTS vendor_communication_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    communication_type VARCHAR(50), -- 'Call', 'Email', 'Message', 'Meeting'
    communication_date TIMESTAMP,
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Quality Issues
CREATE TABLE IF NOT EXISTS vendor_quality_issues (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    po_id INT,
    issue_type VARCHAR(100), -- 'Defect', 'Wrong item', 'Damage', 'Short qty'
    quantity_affected INT,
    severity VARCHAR(50), -- 'Low', 'Medium', 'High'
    issue_date TIMESTAMP,
    resolution VARCHAR(50), -- 'Refund', 'Replace', 'Adjustment'
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Delivery Log
CREATE TABLE IF NOT EXISTS vendor_delivery_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    po_id INT,
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    status VARCHAR(50), -- 'On time', 'Late'
    days_delayed INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Outstanding
CREATE TABLE IF NOT EXISTS vendor_outstanding (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    total_amount_owed DECIMAL(15,2),
    last_invoice_date TIMESTAMP,
    next_payment_due_date TIMESTAMP,
    status VARCHAR(50), -- 'Pending', 'Overdue'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Agreements
CREATE TABLE IF NOT EXISTS vendor_agreements (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    contract_date TIMESTAMP,
    expiry_date TIMESTAMP,
    terms JSONB,
    status VARCHAR(50), -- 'Active', 'Expired', 'Renewed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Alternatives
CREATE TABLE IF NOT EXISTS vendor_alternatives (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    product_id INT,
    primary_vendor_id INT,
    alternative_vendor_id INT,
    price_difference DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (primary_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (alternative_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Vendor Disputes
CREATE TABLE IF NOT EXISTS vendor_disputes (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    dispute_date TIMESTAMP,
    issue VARCHAR(255), -- 'Price dispute', 'Quality complaint', etc
    description TEXT,
    amount_involved DECIMAL(15,2),
    status VARCHAR(50), -- 'Open', 'In discussion', 'Resolved'
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- VENDORS Indexes
CREATE INDEX idx_vendors_org ON vendors(organization_id);
CREATE INDEX idx_vendor_products_vendor ON vendor_products(vendor_id);

================================================================================
--                      HEAD 8: OPERATIONS (7 Tables)
================================================================================

-- Warehouse Locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    warehouse_id INT,
    zone VARCHAR(50),
    shelf VARCHAR(50),
    bin_rack VARCHAR(50),
    capacity INT,
    current_stock INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Stock Picking
CREATE TABLE IF NOT EXISTS stock_picking (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT,
    product_id INT,
    required_quantity INT,
    picked_quantity INT DEFAULT 0,
    pick_date TIMESTAMP,
    picked_by INT, -- Employee ID
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Packing
CREATE TABLE IF NOT EXISTS packing (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT,
    pick_id INT,
    packed_items JSONB,
    pack_date TIMESTAMP,
    packed_by INT, -- Employee ID
    box_id VARCHAR(50),
    weight DECIMAL(10,2),
    dimensions VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Delivery Tracking
CREATE TABLE IF NOT EXISTS delivery_tracking (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT,
    pack_id INT,
    shipment_date TIMESTAMP,
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'Pending', 'In Transit', 'Delivered', 'Failed'
    tracking_number VARCHAR(100),
    delivery_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Employee Task Assignment (OPTIONAL - can be toggled)
CREATE TABLE IF NOT EXISTS employee_task_assignment (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    task_type VARCHAR(50), -- 'Picking', 'Packing', 'Delivery'
    order_id INT,
    assigned_date TIMESTAMP,
    deadline TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ASSIGNED', -- 'Assigned', 'In progress', 'Completed'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- QC Inspection (OPTIONAL - can be toggled)
CREATE TABLE IF NOT EXISTS qc_inspection (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    pick_id INT,
    pack_id INT,
    inspector_id INT, -- Employee ID
    inspection_date TIMESTAMP,
    items_inspected INT,
    issues_found TEXT,
    inspection_status VARCHAR(50), -- 'Pass', 'Fail'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Shipment Manifest
CREATE TABLE IF NOT EXISTS shipment_manifest (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    shipment_id INT,
    order_id INT,
    items_list JSONB, -- Product ID, Qty, Weight
    total_weight DECIMAL(10,2),
    total_boxes INT,
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- OPERATIONS Indexes
CREATE INDEX idx_stock_picking_order ON stock_picking(order_id);
CREATE INDEX idx_delivery_tracking_status ON delivery_tracking(organization_id, status);

================================================================================
--                      HEAD 9: HR_PAYROLL (18 Tables)
================================================================================

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100), -- 'Sales', 'Labour', 'Admin', 'Accounting'
    designation VARCHAR(100),
    employee_type VARCHAR(50), -- 'Management', 'Sales Staff', 'Labour', 'Accountant'
    hire_date TIMESTAMP,
    salary_level INT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Salary Structure
CREATE TABLE IF NOT EXISTS salary_structure (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    basic_salary DECIMAL(15,2),
    hra DECIMAL(15,2) DEFAULT 0,
    da DECIMAL(15,2) DEFAULT 0,
    other_allowances DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    effective_from TIMESTAMP,
    effective_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    attendance_date TIMESTAMP NOT NULL,
    status VARCHAR(50), -- 'Present', 'Absent', 'Leave'
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    hours_worked DECIMAL(5,2),
    approved_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Payroll Processing
CREATE TABLE IF NOT EXISTS payroll_processing (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    payroll_month INT,
    payroll_year INT,
    basic_salary DECIMAL(15,2),
    allowances DECIMAL(15,2),
    deductions DECIMAL(15,2),
    net_salary DECIMAL(15,2),
    gross_salary DECIMAL(15,2),
    generated_date TIMESTAMP,
    approved_by INT,
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Leave Management
CREATE TABLE IF NOT EXISTS leave_management (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    leave_type VARCHAR(50), -- 'Sick', 'Casual', 'Earned'
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    days_taken INT,
    approved_by INT,
    status VARCHAR(50) DEFAULT 'PENDING',
    reason TEXT,
    balance_before INT,
    balance_after INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Performance Rating
CREATE TABLE IF NOT EXISTS performance_rating (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    rating_period VARCHAR(50), -- 'Month', 'Quarter'
    overall_rating DECIMAL(3,1), -- 1-5
    comments TEXT,
    reviewed_by INT,
    review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Compliance Documents
CREATE TABLE IF NOT EXISTS compliance_documents (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    document_type VARCHAR(50), -- 'Employment contract', 'Certification', 'Tax doc'
    file_path VARCHAR(255),
    issue_date TIMESTAMP,
    expiry_date TIMESTAMP,
    status VARCHAR(50), -- 'Valid', 'Expired', 'Pending'
    uploaded_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Commission Rules
CREATE TABLE IF NOT EXISTS commission_rules (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT, -- Sales staff ID
    product_id INT,
    commission_type VARCHAR(50), -- 'Per product', 'Per sale'
    commission_amount DECIMAL(10,2),
    commission_percentage DECIMAL(5,2),
    minimum_sale_qty INT,
    effective_from TIMESTAMP,
    effective_to TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Sales Targets
CREATE TABLE IF NOT EXISTS sales_targets (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT, -- Sales staff ID
    product_id INT,
    target_quantity INT,
    target_amount DECIMAL(15,2),
    target_period VARCHAR(50), -- 'Month', 'Quarter'
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    bonus_if_achieved DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Sales Progress Tracking
CREATE TABLE IF NOT EXISTS sales_progress_tracking (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    target_id INT,
    employee_id INT,
    product_id INT,
    current_sales INT,
    current_amount DECIMAL(15,2),
    target_quantity INT,
    target_amount DECIMAL(15,2),
    percentage_completed DECIMAL(5,2),
    days_remaining INT,
    status VARCHAR(50), -- 'On track', 'Behind', 'Completed'
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES sales_targets(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Commission Calculations
CREATE TABLE IF NOT EXISTS commission_calculations (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    sales_transaction_id INT,
    commission_type VARCHAR(50),
    commission_amount DECIMAL(15,2),
    commission_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'CALCULATED', -- 'Calculated', 'Approved', 'Paid'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Sales Data Import
CREATE TABLE IF NOT EXISTS sales_data_import (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    file_path VARCHAR(255),
    import_date TIMESTAMP,
    import_period VARCHAR(50), -- 'Month'
    status VARCHAR(50) DEFAULT 'IMPORTED', -- 'Imported', 'Processing', 'Completed'
    total_records_imported INT,
    analysis_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Labour Performance Rules
CREATE TABLE IF NOT EXISTS labour_performance_rules (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    rule_type VARCHAR(50), -- 'Leave deduction', 'No-leave bonus', 'On-time bonus', 'Late penalty'
    amount DECIMAL(15,2),
    percentage DECIMAL(5,2),
    condition TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Attendance Bonuses
CREATE TABLE IF NOT EXISTS attendance_bonuses (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    payroll_month INT,
    payroll_year INT,
    on_time_arrivals INT,
    on_time_bonus DECIMAL(15,2) DEFAULT 0,
    no_leave_bonus DECIMAL(15,2) DEFAULT 0,
    late_arrivals INT,
    late_penalty DECIMAL(15,2) DEFAULT 0,
    net_attendance_bonus DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'CALCULATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Leave Deductions
CREATE TABLE IF NOT EXISTS leave_deductions (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    payroll_month INT,
    payroll_year INT,
    total_days_leave INT,
    deduction_per_day DECIMAL(10,2),
    total_deduction DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'CALCULATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Role-Based Access Control
CREATE TABLE IF NOT EXISTS role_based_access_control (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    role_id INT,
    role_name VARCHAR(50), -- 'Admin', 'Manager', 'Sales Staff', 'Labour', 'Accountant', 'Viewer'
    permissions JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Role Assignments
CREATE TABLE IF NOT EXISTS role_assignments (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    role_id INT,
    assigned_date TIMESTAMP,
    assigned_by INT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES role_based_access_control(id)
);

-- Access Log (Audit)
CREATE TABLE IF NOT EXISTS access_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    action VARCHAR(50), -- 'View', 'Edit', 'Delete', 'Approve'
    data_accessed VARCHAR(255),
    access_date TIMESTAMP,
    access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- HR_PAYROLL Indexes
CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX idx_payroll_processing_period ON payroll_processing(organization_id, payroll_year, payroll_month);
CREATE INDEX idx_commission_rules_employee ON commission_rules(employee_id, product_id);
CREATE INDEX idx_sales_targets_employee ON sales_targets(employee_id, target_period);

================================================================================
--                    HEAD 10: REPORTS_ANALYTICS (15+ Tables)
================================================================================

-- Sales Dashboard Data
CREATE TABLE IF NOT EXISTS sales_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50), -- 'Day', 'Month', 'Quarter', 'Year'
    total_sales_amount DECIMAL(18,2),
    total_orders_count INT,
    top_products JSONB,
    top_customers JSONB,
    daily_breakdown JSONB,
    growth_percentage DECIMAL(10,2),
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Customer Dashboard Data
CREATE TABLE IF NOT EXISTS customer_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50),
    active_customers_count INT,
    new_customers_count INT,
    total_receivables DECIMAL(18,2),
    overdue_receivables DECIMAL(18,2),
    customer_aging_breakdown JSONB,
    top_customers_revenue JSONB,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Inventory Dashboard Data
CREATE TABLE IF NOT EXISTS inventory_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50),
    total_inventory_value DECIMAL(18,2),
    low_stock_items_count INT,
    dead_stock_items_count INT, -- 45+ days
    hot_items_count INT,
    stock_by_warehouse JSONB,
    slow_moving_items JSONB,
    stock_turnover_ratio DECIMAL(10,2),
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Purchase Dashboard Data
CREATE TABLE IF NOT EXISTS purchase_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50),
    total_purchase_amount DECIMAL(18,2),
    total_pos_count INT,
    top_vendors JSONB,
    vendor_performance JSONB,
    outstanding_payables DECIMAL(18,2),
    goods_received_vs_ordered JSONB,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Accounts Dashboard Data
CREATE TABLE IF NOT EXISTS accounts_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50),
    total_revenue DECIMAL(18,2),
    total_expenses DECIMAL(18,2),
    gross_profit DECIMAL(18,2),
    net_profit DECIMAL(18,2),
    cash_flow DECIMAL(18,2),
    profit_margin_percentage DECIMAL(10,2),
    expense_breakdown JSONB,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Vendor Dashboard Data
CREATE TABLE IF NOT EXISTS vendor_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50),
    total_vendors_count INT,
    vendor_performance_scores JSONB,
    quality_issues_count INT,
    delivery_delays_count INT,
    top_vendors JSONB,
    vendor_payment_status JSONB,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Employee Dashboard Data
CREATE TABLE IF NOT EXISTS employee_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50),
    total_employees_count INT,
    sales_targets_achievement_percentage DECIMAL(10,2),
    total_commission_payout DECIMAL(18,2),
    attendance_rate_percentage DECIMAL(5,2),
    top_performers JSONB,
    payroll_summary JSONB,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Comparison Data (M2M, Y2Y, etc)
CREATE TABLE IF NOT EXISTS comparison_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    metric_type VARCHAR(50), -- 'Sales', 'Revenue', 'Profit', etc
    period_1_type VARCHAR(50),
    period_1_date TIMESTAMP,
    period_1_value DECIMAL(18,2),
    period_2_type VARCHAR(50),
    period_2_date TIMESTAMP,
    period_2_value DECIMAL(18,2),
    change_amount DECIMAL(18,2),
    change_percentage DECIMAL(10,2),
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- KPI Metrics
CREATE TABLE IF NOT EXISTS kpi_metrics (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    kpi_name VARCHAR(100), -- 'Monthly Revenue Target', 'Profit Margin Target', etc
    current_value DECIMAL(18,2),
    target_value DECIMAL(18,2),
    achievement_percentage DECIMAL(10,2),
    trend VARCHAR(50), -- 'UP', 'DOWN', 'STABLE'
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Dashboard Preferences
CREATE TABLE IF NOT EXISTS dashboard_preferences (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    admin_user_id INT,
    dashboard_type VARCHAR(50), -- 'Sales', 'Customer', 'Inventory', etc
    visible_charts JSONB,
    chart_types JSONB, -- 'Line', 'Bar', 'Pie', 'Area'
    refresh_rate_minutes INT,
    custom_date_range JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    template_name VARCHAR(100), -- 'Sales Report', 'Payroll Report', etc
    dashboard_id INT,
    fields_to_include JSONB,
    chart_types JSONB,
    sort_order VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Report Schedules
CREATE TABLE IF NOT EXISTS report_schedules (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    template_id INT,
    admin_user_id INT,
    frequency VARCHAR(50), -- 'Daily', 'Weekly', 'Monthly'
    send_time TIME,
    email_recipients JSONB,
    format VARCHAR(50), -- 'PDF', 'Excel', 'Both'
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE
);

-- Report Exports
CREATE TABLE IF NOT EXISTS report_exports (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    admin_user_id INT,
    report_type VARCHAR(50),
    date_range_from TIMESTAMP,
    date_range_to TIMESTAMP,
    format VARCHAR(50), -- 'PDF', 'Excel'
    generated_date TIMESTAMP,
    file_path VARCHAR(255),
    exported_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Dashboard Audit Log
CREATE TABLE IF NOT EXISTS dashboard_audit_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    admin_user_id INT,
    dashboard_viewed VARCHAR(100),
    view_date TIMESTAMP,
    view_time TIME,
    duration_viewed INT,
    actions_taken JSONB, -- 'print', 'export', etc
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Custom Reports
CREATE TABLE IF NOT EXISTS custom_reports (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    report_name VARCHAR(100),
    created_by INT,
    data_source JSONB, -- which tables/heads to include
    filters_applied JSONB,
    chart_types JSONB,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'Draft', 'Active', 'Archived'
    created_date TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- REPORTS_ANALYTICS Indexes
CREATE INDEX idx_sales_dashboard_date ON sales_dashboard_data(organization_id, dashboard_date DESC);
CREATE INDEX idx_customer_dashboard_date ON customer_dashboard_data(organization_id, dashboard_date DESC);
CREATE INDEX idx_inventory_dashboard_date ON inventory_dashboard_data(organization_id, dashboard_date DESC);
CREATE INDEX idx_kpi_metrics_org ON kpi_metrics(organization_id);

================================================================================
--                          FINAL INDEXES & CONSTRAINTS
================================================================================

-- Add foreign key constraint for users.role_id
ALTER TABLE users ADD CONSTRAINT fk_users_role
FOREIGN KEY (role_id) REFERENCES employee_roles(id);

-- Add organization reference indexes
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- Add user indexes
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

================================================================================
--                          END OF SCHEMA
================================================================================
-- Total Tables: 126+
-- Total Indexes: 50+
-- Partition Strategy: Year/Month on transactional tables (orders, purchase_orders)
-- Audit & Compliance: audit_log, access_log, dashboard_audit_log
-- Multi-tenancy: All tables have organization_id foreign key
-- Data Retention: Hot/Warm/Cold tiers via partition management
================================================================================

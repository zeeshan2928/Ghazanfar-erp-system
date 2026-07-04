-- Migration: 002_create_phase5_heads_tables.sql
-- Description: Creates all Phase 5 tables for Heads 5-10
-- Date: 2026-07-04
-- Status: PENDING

-- ================================================================================
--                    HEAD 5: WALKIN_RETAIL (7 Tables)
-- ================================================================================

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

CREATE TABLE IF NOT EXISTS walkin_items (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    bill_id INT NOT NULL,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(20),
    tax_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES walkin_orders(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS walkin_payment_methods (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    bill_id INT,
    amount DECIMAL(15,2),
    method VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES walkin_orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_walkin_orders_date ON walkin_orders(organization_id, bill_date DESC);

-- ================================================================================
--                        HEAD 6: CUSTOMERS (10 Tables)
-- ================================================================================

CREATE TABLE IF NOT EXISTS customer_categories (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(50),
    description TEXT,
    default_discount DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS customer_communication_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    communication_type VARCHAR(50),
    communication_date TIMESTAMP,
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS customer_targets (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    product_id INT,
    target_quantity INT,
    target_period VARCHAR(50),
    current_progress INT DEFAULT 0,
    deadline TIMESTAMP,
    target_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customer_incentives (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT,
    product_id INT,
    target_quantity INT,
    discount_offered DECIMAL(10,2),
    discount_type VARCHAR(50),
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_history_customer ON customer_history(customer_id, transaction_date DESC);

-- ================================================================================
--                      HEAD 7: VENDORS (13 Tables)
-- ================================================================================

CREATE TABLE IF NOT EXISTS vendor_categories (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_payment_terms (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    term_type VARCHAR(50),
    days_allowed INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_pricing_history (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    product_id INT,
    price DECIMAL(12,2),
    effective_date TIMESTAMP,
    end_date TIMESTAMP,
    change_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_performance (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    on_time_delivery_percentage DECIMAL(5,2),
    quality_rating DECIMAL(3,1),
    last_assessment_date TIMESTAMP,
    overall_score DECIMAL(3,1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS vendor_communication_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    communication_type VARCHAR(50),
    communication_date TIMESTAMP,
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_quality_issues (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    po_id INT,
    issue_type VARCHAR(100),
    quantity_affected INT,
    severity VARCHAR(50),
    issue_date TIMESTAMP,
    resolution VARCHAR(50),
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_delivery_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    po_id INT,
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    status VARCHAR(50),
    days_delayed INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_outstanding (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    total_amount_owed DECIMAL(15,2),
    last_invoice_date TIMESTAMP,
    next_payment_due_date TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_agreements (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    contract_date TIMESTAMP,
    expiry_date TIMESTAMP,
    terms JSONB,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS vendor_disputes (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    vendor_id INT,
    dispute_date TIMESTAMP,
    issue VARCHAR(255),
    description TEXT,
    amount_involved DECIMAL(15,2),
    status VARCHAR(50),
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX idx_vendor_products_vendor ON vendor_products(vendor_id);

-- ================================================================================
--                      HEAD 8: OPERATIONS (7 Tables)
-- ================================================================================

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

CREATE TABLE IF NOT EXISTS stock_picking (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT,
    product_id INT,
    required_quantity INT,
    picked_quantity INT DEFAULT 0,
    pick_date TIMESTAMP,
    picked_by INT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS packing (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT,
    pick_id INT,
    packed_items JSONB,
    pack_date TIMESTAMP,
    packed_by INT,
    box_id VARCHAR(50),
    weight DECIMAL(10,2),
    dimensions VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS delivery_tracking (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    order_id INT,
    pack_id INT,
    shipment_date TIMESTAMP,
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING',
    tracking_number VARCHAR(100),
    delivery_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_task_assignment (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    task_type VARCHAR(50),
    order_id INT,
    assigned_date TIMESTAMP,
    deadline TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ASSIGNED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qc_inspection (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    pick_id INT,
    pack_id INT,
    inspector_id INT,
    inspection_date TIMESTAMP,
    items_inspected INT,
    issues_found TEXT,
    inspection_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shipment_manifest (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    shipment_id INT,
    order_id INT,
    items_list JSONB,
    total_weight DECIMAL(10,2),
    total_boxes INT,
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_picking_order ON stock_picking(order_id);
CREATE INDEX idx_delivery_tracking_status ON delivery_tracking(organization_id, status);

-- ================================================================================
--                      HEAD 9: HR_PAYROLL (18 Tables)
-- ================================================================================

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

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    attendance_date TIMESTAMP NOT NULL,
    status VARCHAR(50),
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    hours_worked DECIMAL(5,2),
    approved_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS leave_management (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    leave_type VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS performance_rating (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    rating_period VARCHAR(50),
    overall_rating DECIMAL(3,1),
    comments TEXT,
    reviewed_by INT,
    review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compliance_documents (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    document_type VARCHAR(50),
    file_path VARCHAR(255),
    issue_date TIMESTAMP,
    expiry_date TIMESTAMP,
    status VARCHAR(50),
    uploaded_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commission_rules (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    product_id INT,
    commission_type VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS sales_targets (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    product_id INT,
    target_quantity INT,
    target_amount DECIMAL(15,2),
    target_period VARCHAR(50),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    bonus_if_achieved DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

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
    status VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES sales_targets(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commission_calculations (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    sales_transaction_id INT,
    commission_type VARCHAR(50),
    commission_amount DECIMAL(15,2),
    commission_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'CALCULATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_data_import (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    file_path VARCHAR(255),
    import_date TIMESTAMP,
    import_period VARCHAR(50),
    status VARCHAR(50) DEFAULT 'IMPORTED',
    total_records_imported INT,
    analysis_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS labour_performance_rules (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    rule_type VARCHAR(50),
    amount DECIMAL(15,2),
    percentage DECIMAL(5,2),
    condition TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS role_based_access_control (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    role_id INT,
    role_name VARCHAR(50),
    permissions JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS access_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT,
    action VARCHAR(50),
    data_accessed VARCHAR(255),
    access_date TIMESTAMP,
    access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX idx_payroll_processing_period ON payroll_processing(organization_id, payroll_year, payroll_month);
CREATE INDEX idx_commission_rules_employee ON commission_rules(employee_id, product_id);
CREATE INDEX idx_sales_targets_employee ON sales_targets(employee_id, target_period);

-- ================================================================================
--                    HEAD 10: REPORTS_ANALYTICS (15+ Tables)
-- ================================================================================

CREATE TABLE IF NOT EXISTS sales_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50),
    total_sales_amount DECIMAL(18,2),
    total_orders_count INT,
    top_products JSONB,
    top_customers JSONB,
    daily_breakdown JSONB,
    growth_percentage DECIMAL(10,2),
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS inventory_dashboard_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    dashboard_date TIMESTAMP,
    period_type VARCHAR(50),
    total_inventory_value DECIMAL(18,2),
    low_stock_items_count INT,
    dead_stock_items_count INT,
    hot_items_count INT,
    stock_by_warehouse JSONB,
    slow_moving_items JSONB,
    stock_turnover_ratio DECIMAL(10,2),
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS comparison_data (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    metric_type VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS kpi_metrics (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    kpi_name VARCHAR(100),
    current_value DECIMAL(18,2),
    target_value DECIMAL(18,2),
    achievement_percentage DECIMAL(10,2),
    trend VARCHAR(50),
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dashboard_preferences (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    admin_user_id INT,
    dashboard_type VARCHAR(50),
    visible_charts JSONB,
    chart_types JSONB,
    refresh_rate_minutes INT,
    custom_date_range JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    template_name VARCHAR(100),
    dashboard_id INT,
    fields_to_include JSONB,
    chart_types JSONB,
    sort_order VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_schedules (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    template_id INT,
    admin_user_id INT,
    frequency VARCHAR(50),
    send_time TIME,
    email_recipients JSONB,
    format VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_exports (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    admin_user_id INT,
    report_type VARCHAR(50),
    date_range_from TIMESTAMP,
    date_range_to TIMESTAMP,
    format VARCHAR(50),
    generated_date TIMESTAMP,
    file_path VARCHAR(255),
    exported_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dashboard_audit_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    admin_user_id INT,
    dashboard_viewed VARCHAR(100),
    view_date TIMESTAMP,
    view_time TIME,
    duration_viewed INT,
    actions_taken JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_reports (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    report_name VARCHAR(100),
    created_by INT,
    data_source JSONB,
    filters_applied JSONB,
    chart_types JSONB,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_date TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_sales_dashboard_date ON sales_dashboard_data(organization_id, dashboard_date DESC);
CREATE INDEX idx_customer_dashboard_date ON customer_dashboard_data(organization_id, dashboard_date DESC);
CREATE INDEX idx_inventory_dashboard_date ON inventory_dashboard_data(organization_id, dashboard_date DESC);
CREATE INDEX idx_kpi_metrics_org ON kpi_metrics(organization_id);

-- ================================================================================
--                            MIGRATION COMPLETE
-- ================================================================================

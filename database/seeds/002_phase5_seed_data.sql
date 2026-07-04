-- Seed Data: 002_phase5_seed_data.sql
-- Description: Test data for Phase 5 (20K products, 5K customers, 10 vendors, etc)
-- Date: 2026-07-04
-- Status: PENDING - Review before execution

-- ================================================================================
--                        BASE ORGANIZATIONAL DATA
-- ================================================================================

-- Insert vendors (10 vendors for testing)
INSERT INTO vendors (organization_id, name, contact_person, phone, email, address, status) VALUES
(2, 'TechSupply Ltd', 'Ahmad Khan', '0300-1234567', 'contact@techsupply.pk', 'Karachi, Pakistan', 'ACTIVE'),
(2, 'Global Traders', 'Fatima Ali', '0321-9876543', 'info@globaltraders.pk', 'Lahore, Pakistan', 'ACTIVE'),
(2, 'Prime Distributors', 'Muhammad Hassan', '0333-5555555', 'sales@primedist.pk', 'Islamabad, Pakistan', 'ACTIVE'),
(2, 'Quality Imports', 'Aisha Malik', '0345-7777777', 'contact@qualityimports.pk', 'Multan, Pakistan', 'ACTIVE'),
(2, 'Urban Supplies', 'Bilal Ahmed', '0300-2222222', 'support@urbansupplies.pk', 'Rawalpindi, Pakistan', 'ACTIVE'),
(2, 'Standard Manufacturing', 'Nida Khan', '0321-3333333', 'info@standardmfg.pk', 'Hyderabad, Pakistan', 'ACTIVE'),
(2, 'Excel Traders', 'Ali Raza', '0333-4444444', 'hello@exceltraders.pk', 'Quetta, Pakistan', 'ACTIVE'),
(2, 'Premier Wholesale', 'Hina Mirza', '0300-8888888', 'wholesale@premierinc.pk', 'Peshawar, Pakistan', 'ACTIVE'),
(2, 'Direct Imports Inc', 'Usman Ali', '0345-9999999', 'trade@directimports.pk', 'Sialkot, Pakistan', 'ACTIVE'),
(2, 'Galaxy Distribution', 'Sara Khan', '0321-1111111', 'distribution@galaxy.pk', 'Gujranwala, Pakistan', 'ACTIVE');

-- ================================================================================
--                      HEAD 5: WALKIN_RETAIL SAMPLE DATA
-- ================================================================================

-- Insert walkin customers (sample)
INSERT INTO walkin_customers (organization_id, name, phone, email, visit_frequency) VALUES
(2, 'Ahmed Ali', '0300-1234567', 'ahmed@email.com', 5),
(2, 'Fatima Khan', '0321-9876543', 'fatima@email.com', 3),
(2, 'Hassan Ali', '0333-5555555', 'hassan@email.com', 2),
(2, 'Aisha Malik', '0345-7777777', 'aisha@email.com', 1),
(2, 'Muhammad Bilal', '0300-2222222', 'bilal@email.com', 4);

-- ================================================================================
--                      HEAD 6: CUSTOMERS ENHANCED DATA
-- ================================================================================

-- Insert customer categories
INSERT INTO customer_categories (organization_id, name, description, default_discount) VALUES
(2, 'Retail', 'Small retail stores and shops', 5.00),
(2, 'Wholesale', 'Wholesale buyers', 15.00),
(2, 'Corporate', 'Corporate and institutional buyers', 10.00),
(2, 'VIP', 'Premium customers with special terms', 20.00),
(2, 'Walk-in', 'Walk-in retail customers', 0.00);

-- Insert sample customer credit limits (for some existing customers if they exist)
-- Note: Adjust customer IDs based on your actual customer data
INSERT INTO customer_credit_limits (organization_id, customer_id, credit_limit_amount, current_balance, available_credit) VALUES
(2, 1, 100000.00, 25000.00, 75000.00),
(2, 2, 50000.00, 10000.00, 40000.00),
(2, 3, 75000.00, 0.00, 75000.00),
(2, 4, 200000.00, 150000.00, 50000.00),
(2, 5, 150000.00, 50000.00, 100000.00);

-- ================================================================================
--                      HEAD 7: VENDORS PERFORMANCE DATA
-- ================================================================================

-- Insert vendor performance data (for the 10 vendors)
INSERT INTO vendor_performance (organization_id, vendor_id, on_time_delivery_percentage, quality_rating, overall_score) VALUES
(2, 1, 95.50, 4.8, 4.7),
(2, 2, 92.00, 4.5, 4.3),
(2, 3, 98.00, 4.9, 4.9),
(2, 4, 88.50, 4.2, 4.1),
(2, 5, 96.00, 4.7, 4.6),
(2, 6, 91.00, 4.3, 4.2),
(2, 7, 94.50, 4.6, 4.5),
(2, 8, 89.00, 4.4, 4.2),
(2, 9, 97.00, 4.8, 4.8),
(2, 10, 93.50, 4.5, 4.4);

-- Insert vendor payment terms
INSERT INTO vendor_payment_terms (organization_id, vendor_id, term_type, days_allowed, description) VALUES
(2, 1, 'Net 30', 30, 'Payment due within 30 days of invoice'),
(2, 2, 'Net 15', 15, 'Payment due within 15 days'),
(2, 3, 'Net 45', 45, 'Extended payment terms'),
(2, 4, 'COD', 0, 'Cash on delivery'),
(2, 5, 'Net 30', 30, 'Standard 30 day terms'),
(2, 6, 'Net 14', 14, 'Expedited payment'),
(2, 7, 'Net 30', 30, 'Standard 30 day terms'),
(2, 8, 'COD', 0, 'Cash on delivery'),
(2, 9, 'Net 45', 45, 'Extended payment terms'),
(2, 10, 'Net 30', 30, 'Standard 30 day terms');

-- ================================================================================
--                      HEAD 8: OPERATIONS SAMPLE DATA
-- ================================================================================

-- Insert warehouse locations (assuming warehouse_id values exist)
INSERT INTO warehouse_locations (organization_id, warehouse_id, zone, shelf, bin_rack, capacity, current_stock) VALUES
(2, 1, 'A', 'A1', 'RACK-001', 1000, 500),
(2, 1, 'A', 'A2', 'RACK-002', 1000, 750),
(2, 1, 'B', 'B1', 'RACK-003', 1000, 200),
(2, 1, 'B', 'B2', 'RACK-004', 1000, 850),
(2, 2, 'C', 'C1', 'RACK-005', 1000, 600),
(2, 2, 'C', 'C2', 'RACK-006', 1000, 400),
(2, 2, 'D', 'D1', 'RACK-007', 1000, 900),
(2, 2, 'D', 'D2', 'RACK-008', 1000, 300);

-- ================================================================================
--                      HEAD 9: HR_PAYROLL SAMPLE DATA
-- ================================================================================

-- Insert labour performance rules
INSERT INTO labour_performance_rules (organization_id, rule_type, amount, is_active) VALUES
(2, 'On-time arrival bonus', 500.00, true),
(2, 'No leave in month bonus', 2000.00, true),
(2, 'Late penalty', -300.00, true),
(2, 'Performance bonus', 5000.00, true);

-- Insert sample salary structure for existing employees
-- Note: Adjust employee_id based on your actual employee data
INSERT INTO salary_structure (organization_id, employee_id, basic_salary, hra, da, other_allowances, deductions, effective_from) VALUES
(2, 1, 50000.00, 5000.00, 2500.00, 1000.00, 2000.00, '2026-01-01'),
(2, 2, 45000.00, 4500.00, 2250.00, 500.00, 1500.00, '2026-01-01'),
(2, 3, 60000.00, 6000.00, 3000.00, 1500.00, 2500.00, '2026-01-01'),
(2, 4, 40000.00, 4000.00, 2000.00, 500.00, 1000.00, '2026-01-01'),
(2, 5, 55000.00, 5500.00, 2750.00, 1000.00, 2000.00, '2026-01-01');

-- Insert commission rules for sales staff
INSERT INTO commission_rules (organization_id, employee_id, commission_type, commission_percentage, minimum_sale_qty, status) VALUES
(2, 1, 'Per sale', 2.50, 0, 'ACTIVE'),
(2, 2, 'Per sale', 3.00, 0, 'ACTIVE'),
(2, 3, 'Per sale', 2.00, 10, 'ACTIVE'),
(2, 4, 'Per sale', 2.50, 5, 'ACTIVE'),
(2, 5, 'Per sale', 3.50, 0, 'ACTIVE');

-- Insert sales targets
INSERT INTO sales_targets (organization_id, employee_id, target_quantity, target_amount, target_period, start_date, end_date, status, bonus_if_achieved) VALUES
(2, 1, 100, 500000.00, 'MONTH', '2026-07-01', '2026-07-31', 'ACTIVE', 10000.00),
(2, 2, 120, 600000.00, 'MONTH', '2026-07-01', '2026-07-31', 'ACTIVE', 15000.00),
(2, 3, 80, 400000.00, 'MONTH', '2026-07-01', '2026-07-31', 'ACTIVE', 8000.00),
(2, 4, 90, 450000.00, 'MONTH', '2026-07-01', '2026-07-31', 'ACTIVE', 9000.00),
(2, 5, 110, 550000.00, 'MONTH', '2026-07-01', '2026-07-31', 'ACTIVE', 12000.00);

-- Insert role-based access control
INSERT INTO role_based_access_control (organization_id, role_name, description, permissions) VALUES
(2, 'Admin', 'Full system access', '{"all": true}'),
(2, 'Manager', 'Department and team management', '{"sales": true, "inventory": true, "reports": true}'),
(2, 'Sales Staff', 'Sales operations access', '{"sales": true, "customer": true, "products": true}'),
(2, 'Labour', 'Warehouse operations', '{"inventory": true, "warehouse": true}'),
(2, 'Accountant', 'Accounting and finance', '{"accounts": true, "reports": true, "payroll": true}'),
(2, 'Viewer', 'Read-only access', '{"reports": true}');

-- ================================================================================
--                      HEAD 10: REPORTS_ANALYTICS SAMPLE DATA
-- ================================================================================

-- Insert dashboard preferences
INSERT INTO dashboard_preferences (organization_id, dashboard_type, refresh_rate_minutes) VALUES
(2, 'Sales', 5),
(2, 'Customer', 10),
(2, 'Inventory', 15),
(2, 'Purchase', 10),
(2, 'Accounts', 30),
(2, 'Vendor', 20),
(2, 'Employee', 15);

-- Insert report templates
INSERT INTO report_templates (organization_id, template_name, status) VALUES
(2, 'Daily Sales Report', 'ACTIVE'),
(2, 'Weekly Inventory Summary', 'ACTIVE'),
(2, 'Monthly P&L Report', 'ACTIVE'),
(2, 'Customer Aging Report', 'ACTIVE'),
(2, 'Vendor Performance Summary', 'ACTIVE'),
(2, 'Employee Payroll Report', 'ACTIVE'),
(2, 'Stock Performance Report', 'ACTIVE');

-- ================================================================================
--                      SAMPLE TRANSACTIONS (OPTIONAL)
-- ================================================================================

-- Sample Walkin Order
INSERT INTO walkin_orders (organization_id, bill_date, customer_name, total_amount, status) VALUES
(2, NOW(), 'Walk-in Customer 1', 15000.00, 'COMPLETED');

-- Sample Walkin Items (adjust order_id to match above)
INSERT INTO walkin_items (organization_id, bill_id, quantity, unit_price, line_total) VALUES
(2, 1, 5, 3000.00, 15000.00);

-- ================================================================================
--                      INDEXES FOR PERFORMANCE
-- ================================================================================

-- Create additional indexes for frequently queried fields (already defined in migration)
-- This section is a reminder of key indexes

-- ================================================================================
--                      SEED DATA INSERTION COMPLETE
-- ================================================================================
-- Total Records Inserted: ~100+ sample records
-- Heads Covered: 5, 6, 7, 8, 9, 10
-- Next Steps:
--   1. Review seed data for accuracy
--   2. Adjust IDs/references based on actual database state
--   3. Generate bulk data (20K products, 5K customers) using ETL scripts
--   4. Validate data integrity
-- ================================================================================

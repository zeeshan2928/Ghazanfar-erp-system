import React, { useState } from 'react';
import { DashboardScreen } from './screens/DashboardScreen';
import { BillsScreen } from './screens/BillsScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { WarehousesScreen } from './screens/WarehousesScreen';
import { PurchaseOrdersScreen } from './screens/PurchaseOrdersScreen';
import { ReportsAnalytics } from './screens/ReportsAnalytics';
import { UserManagement } from './screens/UserManagement';
import { GatePassesScreen } from './screens/GatePassesScreen';
import { CashBookReportScreen } from './cash-book-reports/CashBookReportScreen';
import { CashBookEntryScreen } from './screens/CashBookEntryScreen';
import { ReportingDashboard } from './ReportingDashboard';
import BillMatchingScreen from './bill-matching/BillMatchingScreen';
import { ExportImport } from './screens/ExportImport';
import { ChartOfAccountsScreen } from './screens/ChartOfAccountsScreen';
import { JournalEntryScreen } from './screens/JournalEntryScreen';
import { TrialBalanceScreen } from './screens/TrialBalanceScreen';
import { BalanceSheetScreen } from './screens/BalanceSheetScreen';
import { IncomeStatementScreen } from './screens/IncomeStatementScreen';
import { BudgetScreen } from './screens/BudgetScreen';
import { ArApAgingScreen } from './screens/ArApAgingScreen';
import { ProductCategoriesScreen } from './screens/ProductCategoriesScreen';
import { BrandsScreen } from './screens/BrandsScreen';
import { InvoiceScreen } from './screens/InvoiceScreen';

type Screen = 'dashboard' | 'invoice' | 'bills' | 'customers' | 'products' | 'warehouses' | 'inventory' | 'purchase-orders' | 'reports' | 'users' | 'gate-passes' | 'cash-book-reports' | 'cash-book-entry' | 'operations-analytics' | 'bill-matching' | 'export-import' | 'chart-of-accounts' | 'journal-entries' | 'trial-balance' | 'balance-sheet' | 'income-statement' | 'budget' | 'ar-ap-aging' | 'product-categories' | 'brands';

interface NavItem {
  id: Screen;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'invoice', label: 'New Invoice', icon: '🧾' },
  // GL Accounting (Top Priority)
  { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: '📋' },
  { id: 'journal-entries', label: 'Journal Entries', icon: '📝' },
  { id: 'trial-balance', label: 'Trial Balance', icon: '⚖️' },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: '📄' },
  { id: 'income-statement', label: 'Income Statement', icon: '💰' },
  // Finance & Analysis
  { id: 'budget', label: 'Budget', icon: '💵' },
  { id: 'ar-ap-aging', label: 'AR/AP Aging', icon: '⏰' },
  { id: 'product-categories', label: 'Product Categories', icon: '📂' },
  { id: 'brands', label: 'Brands', icon: '🏷️' },
  // Operations
  { id: 'bills', label: 'Bills', icon: '💳' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'products', label: 'Products', icon: '📦' },
  { id: 'warehouses', label: 'Warehouses', icon: '🏭' },
  { id: 'inventory', label: 'Inventory', icon: '📥' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: '🛒' },
  { id: 'reports', label: 'Reports', icon: '📈' },
  { id: 'users', label: 'Users', icon: '👤' },
  { id: 'gate-passes', label: 'Gate Passes', icon: '🚪' },
  { id: 'cash-book-reports', label: 'Cash Book Reports', icon: '📒' },
  { id: 'cash-book-entry', label: 'Cash Book Entry', icon: '💵' },
  { id: 'operations-analytics', label: 'Operations Analytics', icon: '📡' },
  { id: 'bill-matching', label: 'Bill Matching', icon: '🔗' },
  { id: 'export-import', label: 'Import/Export', icon: '📤' },
];

interface MainDashboardProps {
  onLogout: () => void;
}

export function MainDashboard({ onLogout }: MainDashboardProps) {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'invoice':
        return <InvoiceScreen />;
      case 'bills':
        return <BillsScreen />;
      case 'customers':
        return <CustomersScreen />;
      case 'products':
        return <ProductsScreen />;
      case 'warehouses':
        return <WarehousesScreen />;
      case 'inventory':
        return <InventoryScreen />;
      case 'purchase-orders':
        return <PurchaseOrdersScreen />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'users':
        return <UserManagement />;
      case 'gate-passes':
        return <GatePassesScreen />;
      case 'cash-book-reports':
        return <CashBookReportScreen organizationId={1} />;
      case 'cash-book-entry':
        return <CashBookEntryScreen />;
      case 'operations-analytics':
        return <ReportingDashboard />;
      case 'bill-matching':
        return <BillMatchingScreen organizationId={1} />;
      case 'export-import':
        return <ExportImport />;
      case 'chart-of-accounts':
        return <ChartOfAccountsScreen />;
      case 'journal-entries':
        return <JournalEntryScreen />;
      case 'trial-balance':
        return <TrialBalanceScreen />;
      case 'balance-sheet':
        return <BalanceSheetScreen />;
      case 'income-statement':
        return <IncomeStatementScreen />;
      case 'budget':
        return <BudgetScreen />;
      case 'ar-ap-aging':
        return <ArApAgingScreen />;
      case 'product-categories':
        return <ProductCategoriesScreen />;
      case 'brands':
        return <BrandsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📦 Ghazanfar ERP System</h1>
        <button onClick={onLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div style={styles.mainContent}>
        {/* Sidebar Navigation */}
        <nav style={styles.sidebar}>
          <div style={styles.navTitle}>Navigation</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              style={{
                ...styles.navItem,
                ...(activeScreen === item.id ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <div style={styles.content}>
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#f8f9fa',
  },
  header: {
    background: '#667eea',
    color: 'white',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
  },
  logoutBtn: {
    padding: '10px 20px',
    background: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '250px',
    background: 'white',
    borderRight: '1px solid #ddd',
    overflowY: 'auto',
    padding: '20px 0',
    boxShadow: '1px 0 3px rgba(0,0,0,0.05)',
  },
  navTitle: {
    padding: '0 20px 15px 20px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  navItem: {
    width: '100%',
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
  },
  navItemActive: {
    background: '#f0f2ff',
    color: '#667eea',
    fontWeight: 600,
    borderLeft: '3px solid #667eea',
  },
  navIcon: {
    fontSize: '18px',
    minWidth: '24px',
  },
  navLabel: {
    flex: 1,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
};

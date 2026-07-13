import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../services/api';
import { DashboardScreen } from './screens/DashboardScreen';
import { BillsScreen } from './screens/BillsScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { WarehousesScreen } from './screens/WarehousesScreen';
import { PurchaseOrdersScreen } from './screens/PurchaseOrdersScreen';
import { ReportsAnalytics } from './screens/ReportsAnalytics';
import { UserManagement } from './screens/UserManagement';
import { SettingsScreen } from './screens/SettingsScreen';
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
import { SalesCommissionScreen } from './screens/SalesCommissionScreen';
import { VendorsScreen } from './screens/VendorsScreen';
import { WarehouseTransfersScreen } from './screens/WarehouseTransfersScreen';
import { ReorderScreen } from './screens/ReorderScreen';
import { GeneralLedgerScreen } from './screens/GeneralLedgerScreen';
import { CashJournalsScreen } from './screens/CashJournalsScreen';
import { SalesOrdersScreen } from './screens/SalesOrdersScreen';
import { ProductStudioScreen } from './screens/ProductStudioScreen';
import { FinanceDashboardScreen } from './screens/FinanceDashboardScreen';
import { InventoryDashboardScreen } from './screens/InventoryDashboardScreen';
import { SalesmanPerformanceScreen } from './screens/SalesmanPerformanceScreen';
import { SalesAnalysisScreen } from './screens/SalesAnalysisScreen';
import { PurchaseAnalysisScreen } from './screens/PurchaseAnalysisScreen';
import { PartsReviewScreen } from './screens/PartsReviewScreen';
import { AssembledCostsScreen } from './screens/AssembledCostsScreen';
import { ProfitDashboardScreen } from './screens/ProfitDashboardScreen';
import { PnLStatementScreen } from './screens/PnLStatementScreen';
import { AssemblyFormulasScreen } from './screens/AssemblyFormulasScreen';
import { SalesDashboardScreen } from './screens/SalesDashboardScreen';
import { PurchasingDashboardScreen } from './screens/PurchasingDashboardScreen';
import { AdministrationDashboardScreen } from './screens/AdministrationDashboardScreen';

type Screen = 'dashboard' | 'sales-dashboard' | 'finance-dashboard' | 'inventory-dashboard' | 'purchasing-dashboard' | 'administration-dashboard' | 'salesman-performance' | 'sales-analysis' | 'purchase-analysis' | 'parts-review' | 'assembled-costs' | 'profit-dashboard' | 'pnl-statement' | 'assembly-formulas' | 'invoice' | 'sales-orders' | 'bills' | 'customers' | 'products' | 'product-studio' | 'warehouses' | 'inventory' | 'purchase-orders' | 'reports' | 'users' | 'settings' | 'gate-passes' | 'cash-book-reports' | 'cash-book-entry' | 'operations-analytics' | 'bill-matching' | 'export-import' | 'chart-of-accounts' | 'journal-entries' | 'trial-balance' | 'balance-sheet' | 'income-statement' | 'budget' | 'ar-ap-aging' | 'product-categories' | 'brands' | 'sales-commission' | 'vendors' | 'warehouse-transfers' | 'reorder' | 'general-ledger' | 'cash-journals';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NavItem {
  id: Screen;
  label: string;
  icon: string;
  group?: string;
}

interface GlobalSearchResult {
  type: 'bill' | 'purchase_order' | 'gate_pass' | 'journal_entry' | 'cash_book_entry' | 'customer' | 'vendor' | 'sales_order';
  id: number;
  title: string;
  subtitle: string;
}

const SEARCH_TYPE_LABELS: Record<GlobalSearchResult['type'], string> = {
  bill: 'Bill',
  purchase_order: 'Purchase Order',
  gate_pass: 'Gate Pass',
  journal_entry: 'Journal Entry',
  cash_book_entry: 'Cash Book Entry',
  customer: 'Customer',
  vendor: 'Vendor',
  sales_order: 'Sales Order',
};

const SEARCH_TYPE_SCREEN: Record<GlobalSearchResult['type'], Screen> = {
  bill: 'bills',
  purchase_order: 'purchase-orders',
  gate_pass: 'gate-passes',
  journal_entry: 'journal-entries',
  cash_book_entry: 'cash-book-entry',
  customer: 'customers',
  vendor: 'vendors',
  sales_order: 'sales-orders',
};

// Every screen belongs to exactly one functional group, rendered as its own
// collapsible section in the sidebar - only 'Dashboard' (the home/landing
// screen) stays outside any group. Groups are declared in GROUPS below, in
// sidebar display order.
const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },

  // ==================== SALES ====================
  { id: 'sales-dashboard', label: 'Sales Dashboard', icon: '📈', group: 'Sales' },
  { id: 'salesman-performance', label: 'Salesman Performance', icon: '🏆', group: 'Sales' },
  { id: 'invoice', label: 'New Invoice', icon: '🧾', group: 'Sales' },
  { id: 'sales-orders', label: 'Sales Orders', icon: '📃', group: 'Sales' },
  { id: 'bills', label: 'Bills', icon: '💳', group: 'Sales' },
  { id: 'customers', label: 'Customers', icon: '👥', group: 'Sales' },
  { id: 'gate-passes', label: 'Gate Passes', icon: '🚪', group: 'Sales' },

  // ==================== FINANCE & ACCOUNTING ====================
  { id: 'finance-dashboard', label: 'Finance Dashboard', icon: '💹', group: 'Finance & Accounting' },
  { id: 'trial-balance', label: 'Trial Balance', icon: '⚖️', group: 'Finance & Accounting' },
  { id: 'general-ledger', label: 'General Ledger', icon: '📚', group: 'Finance & Accounting' },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: '📄', group: 'Finance & Accounting' },
  { id: 'income-statement', label: 'Income Statement', icon: '💰', group: 'Finance & Accounting' },
  { id: 'ar-ap-aging', label: 'AR/AP Aging', icon: '⏰', group: 'Finance & Accounting' },
  { id: 'cash-book-reports', label: 'Cash Book Reports', icon: '📒', group: 'Finance & Accounting' },
  { id: 'bill-matching', label: 'Bill Matching', icon: '🔗', group: 'Finance & Accounting' },
  { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: '📋', group: 'Finance & Accounting' },
  { id: 'journal-entries', label: 'Journal Entries', icon: '📝', group: 'Finance & Accounting' },
  { id: 'budget', label: 'Budget', icon: '💵', group: 'Finance & Accounting' },
  { id: 'cash-journals', label: 'Cash Journals', icon: '💵', group: 'Finance & Accounting' },
  { id: 'cash-book-entry', label: 'Cash Book Entry', icon: '💵', group: 'Finance & Accounting' },
  { id: 'sales-commission', label: 'Sales Commission', icon: '💰', group: 'Finance & Accounting' },

  // ==================== INVENTORY & STOCK ====================
  { id: 'inventory-dashboard', label: 'Inventory Dashboard', icon: '📊', group: 'Inventory & Stock' },
  { id: 'products', label: 'Products', icon: '📦', group: 'Inventory & Stock' },
  { id: 'product-categories', label: 'Product Categories', icon: '📂', group: 'Inventory & Stock' },
  { id: 'brands', label: 'Brands', icon: '🏷️', group: 'Inventory & Stock' },
  { id: 'product-studio', label: 'Product Studio', icon: '🎬', group: 'Inventory & Stock' },
  { id: 'warehouses', label: 'Warehouses', icon: '🏭', group: 'Inventory & Stock' },
  { id: 'inventory', label: 'Inventory', icon: '📥', group: 'Inventory & Stock' },
  { id: 'warehouse-transfers', label: 'Warehouse Transfers', icon: '🔄', group: 'Inventory & Stock' },
  { id: 'reorder', label: 'Reorder / Low Stock', icon: '📉', group: 'Inventory & Stock' },

  // ==================== PURCHASING ====================
  { id: 'purchasing-dashboard', label: 'Purchasing Dashboard', icon: '📊', group: 'Purchasing' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: '🛒', group: 'Purchasing' },
  { id: 'vendors', label: 'Vendors', icon: '🏢', group: 'Purchasing' },

  // ==================== ADMINISTRATION ====================
  { id: 'administration-dashboard', label: 'Admin Dashboard', icon: '📊', group: 'Administration' },
  { id: 'users', label: 'Users', icon: '👤', group: 'Administration' },
  { id: 'settings', label: 'Settings', icon: '⚙️', group: 'Administration' },
  { id: 'export-import', label: 'Import/Export', icon: '📤', group: 'Administration' },

  // ==================== REPORTS (leftovers that don't belong to one group) ====================
  { id: 'operations-analytics', label: 'Operations Analytics', icon: '📡', group: 'Reports' },
  { id: 'reports', label: 'Other Reports', icon: '📈', group: 'Reports' },
  { id: 'sales-analysis', label: 'Sales Report Analysis', icon: '🔍', group: 'Reports' },
  { id: 'purchase-analysis', label: 'Purchase Report Analysis', icon: '📥', group: 'Reports' },
  { id: 'parts-review', label: 'Parts Review (vendor components)', icon: '🧩', group: 'Reports' },
  { id: 'assembled-costs', label: 'Cost Verification (no cost price)', icon: '🔧', group: 'Reports' },
  { id: 'profit-dashboard', label: 'Profit Dashboard', icon: '💎', group: 'Reports' },
  { id: 'pnl-statement', label: 'P&L (Gross Profit)', icon: '🧮', group: 'Reports' },
  { id: 'assembly-formulas', label: 'Assembly Costs (BOM)', icon: '🔧', group: 'Reports' },
];

// Sidebar display order + icon per group header.
const GROUPS: { name: string; icon: string }[] = [
  { name: 'Sales', icon: '🧾' },
  { name: 'Finance & Accounting', icon: '💰' },
  { name: 'Inventory & Stock', icon: '📦' },
  { name: 'Purchasing', icon: '🛒' },
  { name: 'Administration', icon: '⚙️' },
  { name: 'Reports', icon: '📈' },
];

interface MainDashboardProps {
  onLogout: () => void;
}

export function MainDashboard({ onLogout }: MainDashboardProps) {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(GROUPS.map(g => [g.name, true])),
  );

  function toggleGroup(name: string) {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [searchOpen]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await apiClient.globalSearch(query);
        setSearchResults(results);
      } catch (err) {
        console.error('Global search failed', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  function handleSearchResultClick(result: GlobalSearchResult) {
    setActiveScreen(SEARCH_TYPE_SCREEN[result.type]);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  async function loadNotifications() {
    try {
      const result = await apiClient.getNotifications(0, 20);
      setNotifications(result.data || []);
      setUnreadCount(result.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await apiClient.markNotificationRead(id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiClient.markAllNotificationsRead();
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all notifications read', err);
    }
  }

  function handleNotificationClick(n: NotificationItem) {
    handleMarkRead(n.id);
    if (n.type === 'INVENTORY_LOW') {
      setActiveScreen('reorder');
      setNotificationsOpen(false);
    }
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'sales-dashboard':
        return <SalesDashboardScreen />;
      case 'finance-dashboard':
        return <FinanceDashboardScreen />;
      case 'inventory-dashboard':
        return <InventoryDashboardScreen />;
      case 'purchasing-dashboard':
        return <PurchasingDashboardScreen />;
      case 'administration-dashboard':
        return <AdministrationDashboardScreen />;
      case 'salesman-performance':
        return <SalesmanPerformanceScreen />;
      case 'sales-analysis':
        return <SalesAnalysisScreen />;
      case 'purchase-analysis':
        return <PurchaseAnalysisScreen />;
      case 'parts-review':
        return <PartsReviewScreen />;
      case 'assembled-costs':
        return <AssembledCostsScreen />;
      case 'profit-dashboard':
        return <ProfitDashboardScreen />;
      case 'pnl-statement':
        return <PnLStatementScreen />;
      case 'assembly-formulas':
        return <AssemblyFormulasScreen />;
      case 'invoice':
        return <InvoiceScreen />;
      case 'sales-orders':
        return <SalesOrdersScreen />;
      case 'bills':
        return <BillsScreen />;
      case 'customers':
        return <CustomersScreen />;
      case 'products':
        return <ProductsScreen />;
      case 'product-studio':
        return <ProductStudioScreen />;
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
      case 'settings':
        return <SettingsScreen />;
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
      case 'general-ledger':
        return <GeneralLedgerScreen />;
      case 'cash-journals':
        return <CashJournalsScreen />;
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
      case 'sales-commission':
        return <SalesCommissionScreen />;
      case 'vendors':
        return <VendorsScreen />;
      case 'warehouse-transfers':
        return <WarehouseTransfersScreen />;
      case 'reorder':
        return <ReorderScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📦 Ghazanfar ERP System</h1>
        <div style={styles.headerRight}>
          <div style={styles.searchWrapper} ref={searchRef}>
            <input
              style={styles.searchInput}
              placeholder="Search bills, POs, gate passes, entries, customers, vendors..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchOpen && searchQuery.trim() && (
              <div style={styles.searchDropdown}>
                {searching && <div style={styles.searchEmpty}>Searching...</div>}
                {!searching && searchResults.length === 0 && (
                  <div style={styles.searchEmpty}>No matches</div>
                )}
                {!searching && searchResults.map(result => (
                  <div
                    key={`${result.type}-${result.id}`}
                    style={styles.searchResultItem}
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <span style={styles.searchResultType}>{SEARCH_TYPE_LABELS[result.type]}</span>
                    <span style={styles.searchResultTitle}>{result.title}</span>
                    <span style={styles.searchResultSubtitle}>{result.subtitle}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={styles.bellWrapper} ref={bellRef}>
            <button style={styles.bellBtn} onClick={() => setNotificationsOpen(!notificationsOpen)}>
              🔔
              {unreadCount > 0 && <span style={styles.bellBadge}>{unreadCount}</span>}
            </button>
            {notificationsOpen && (
              <div style={styles.notifDropdown}>
                <div style={styles.notifHeader}>
                  <strong>Notifications</strong>
                  <button style={styles.notifMarkAll} onClick={handleMarkAllRead}>Mark all read</button>
                </div>
                {notifications.length === 0 ? (
                  <div style={styles.notifEmpty}>No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      style={n.isRead ? styles.notifItem : styles.notifItemUnread}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div style={styles.notifTitle}>{n.title}</div>
                      <div style={styles.notifMessage}>{n.message}</div>
                      <div style={styles.notifTime}>{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Sidebar Navigation */}
        <nav style={styles.sidebar}>
          <div style={styles.navTitle}>Navigation</div>
          {navItems.filter(item => !item.group).map((item) => (
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

          {GROUPS.map(group => (
            <React.Fragment key={group.name}>
              <button style={styles.navGroupHeader} onClick={() => toggleGroup(group.name)}>
                <span>{group.icon} {group.name}</span>
                <span>{expandedGroups[group.name] ? '▾' : '▸'}</span>
              </button>
              {expandedGroups[group.name] && navItems.filter(item => item.group === group.name).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  style={{
                    ...styles.navItem,
                    ...styles.navItemGrouped,
                    ...(activeScreen === item.id ? styles.navItemActive : {}),
                  }}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span style={styles.navLabel}>{item.label}</span>
                </button>
              ))}
            </React.Fragment>
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
  // Pin the shell to the viewport (height, not minHeight) so the page body
  // never scrolls as a whole - that height cap is what lets the sidebar and
  // the content pane each own an independent scrollbar below.
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  searchWrapper: {
    position: 'relative' as const,
  },
  searchInput: {
    width: '340px',
    padding: '9px 14px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '13px',
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
  },
  searchDropdown: {
    position: 'absolute' as const,
    top: '44px',
    left: 0,
    width: '420px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
    background: 'white',
    color: '#222',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    zIndex: 1000,
  },
  searchEmpty: {
    padding: '14px',
    color: '#888',
    fontSize: '13px',
  },
  searchResultItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '8px 14px',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
  },
  searchResultType: {
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    color: '#888',
    letterSpacing: '0.5px',
  },
  searchResultTitle: {
    fontSize: '14px',
    fontWeight: 600,
  },
  searchResultSubtitle: {
    fontSize: '12px',
    color: '#666',
  },
  bellWrapper: {
    position: 'relative' as const,
  },
  bellBtn: {
    position: 'relative' as const,
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '18px',
    cursor: 'pointer',
    color: 'white',
  },
  bellBadge: {
    position: 'absolute' as const,
    top: '-2px',
    right: '-2px',
    background: '#e74c3c',
    color: 'white',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 5px',
    minWidth: '16px',
  },
  notifDropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    right: 0,
    width: '340px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
    background: 'white',
    color: '#333',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    zIndex: 1500,
  },
  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderBottom: '1px solid #eee',
  },
  notifMarkAll: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '12px',
  },
  notifEmpty: {
    padding: '20px',
    textAlign: 'center' as const,
    color: '#999',
    fontSize: '13px',
  },
  notifItem: {
    padding: '10px 14px',
    borderBottom: '1px solid #f2f2f2',
    cursor: 'pointer',
    opacity: 0.7,
  },
  notifItemUnread: {
    padding: '10px 14px',
    borderBottom: '1px solid #f2f2f2',
    cursor: 'pointer',
    background: '#f0f2ff',
  },
  notifTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  notifMessage: {
    fontSize: '12px',
    color: '#555',
    marginTop: '2px',
  },
  notifTime: {
    fontSize: '10px',
    color: '#999',
    marginTop: '4px',
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
  // minHeight: 0 is required on both flex children: a flex item's min-height
  // defaults to its content size, which would keep them from shrinking and
  // silently defeat overflowY below.
  mainContent: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  sidebar: {
    width: '250px',
    flexShrink: 0,
    background: 'white',
    borderRight: '1px solid #ddd',
    minHeight: 0,
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
  navItemGrouped: {
    paddingLeft: '36px',
    fontSize: '13px',
  },
  navGroupHeader: {
    width: '100%',
    padding: '12px 20px',
    marginTop: '8px',
    background: '#f5f5f7',
    border: 'none',
    borderTop: '1px solid #e5e5e5',
    borderBottom: '1px solid #e5e5e5',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    color: '#555',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    padding: '20px',
  },
};

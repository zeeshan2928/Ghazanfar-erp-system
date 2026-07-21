import React, { useState, useEffect, useRef } from 'react';
import { useListArrowNav } from '../utils/keyboardNav';
import { apiClient } from '../services/api';
import { DashboardScreen } from './screens/DashboardScreen';
import { BillsScreen } from './screens/BillsScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { WarehousesScreen } from './screens/WarehousesScreen';
import { PurchaseOrdersScreen } from './screens/PurchaseOrdersScreen';
import { PurchaseReturnsScreen } from './screens/PurchaseReturnsScreen';
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
import { CostHistoryScreen } from './screens/CostHistoryScreen';
import { RecipesScreen } from './screens/RecipesScreen';
import { ManufacturingOrdersScreen } from './screens/ManufacturingOrdersScreen';
import { SalesDashboardScreen } from './screens/SalesDashboardScreen';
import { PurchasingDashboardScreen } from './screens/PurchasingDashboardScreen';
import { AdministrationDashboardScreen } from './screens/AdministrationDashboardScreen';
import { LocationsScreen } from './screens/LocationsScreen';

type Screen = 'dashboard' | 'sales-dashboard' | 'finance-dashboard' | 'inventory-dashboard' | 'purchasing-dashboard' | 'administration-dashboard' | 'salesman-performance' | 'sales-analysis' | 'purchase-analysis' | 'parts-review' | 'assembled-costs' | 'profit-dashboard' | 'pnl-statement' | 'assembly-formulas' | 'recipes' | 'cost-history' | 'invoice' | 'sales-orders' | 'bills' | 'customers' | 'products' | 'product-studio' | 'warehouses' | 'inventory' | 'purchase-orders' | 'purchase-returns' | 'reports' | 'users' | 'settings' | 'gate-passes' | 'cash-book-reports' | 'cash-book-entry' | 'operations-analytics' | 'bill-matching' | 'export-import' | 'chart-of-accounts' | 'journal-entries' | 'trial-balance' | 'balance-sheet' | 'income-statement' | 'budget' | 'ar-ap-aging' | 'product-categories' | 'brands' | 'sales-commission' | 'vendors' | 'warehouse-transfers' | 'reorder' | 'general-ledger' | 'cash-journals' | 'manufacturing-orders' | 'locations';

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
  { id: 'manufacturing-orders', label: 'Manufacturing Orders', icon: '🏭', group: 'Inventory & Stock' },
  { id: 'reorder', label: 'Reorder / Low Stock', icon: '📉', group: 'Inventory & Stock' },

  // ==================== PURCHASING ====================
  { id: 'purchasing-dashboard', label: 'Purchasing Dashboard', icon: '📊', group: 'Purchasing' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: '🛒', group: 'Purchasing' },
  { id: 'purchase-returns', label: 'Purchase Returns', icon: '↩️', group: 'Purchasing' },
  { id: 'vendors', label: 'Vendors', icon: '🏢', group: 'Purchasing' },

  // ==================== ADMINISTRATION ====================
  { id: 'administration-dashboard', label: 'Admin Dashboard', icon: '📊', group: 'Administration' },
  { id: 'locations', label: 'Cities & Provinces', icon: '🗺️', group: 'Administration' },
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
  { id: 'recipes', label: 'Recipes (BOM)', icon: '🧪', group: 'Reports' },
  { id: 'cost-history', label: 'Cost History', icon: '⏱️', group: 'Reports' },
];

// Sidebar display order + icon per group header.
// Sidebar: full -> icon rail -> hidden -> full.
type NavMode = 'full' | 'rail' | 'hidden';
const RAIL_WIDTH = 64;
const TOP = '__top'; // the ungrouped items, keyed for the saved order

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
  // Up/Down moves through the 40-odd nav items instead of Tab-ing one by one.
  const sidebarRef = useRef<HTMLElement>(null);
  useListArrowNav(sidebarRef);

  const [navMode, setNavMode] = useState<NavMode>(
    () => (localStorage.getItem('nav_mode') as NavMode) || 'full',
  );
  const [navWidth, setNavWidth] = useState<number>(
    () => Number(localStorage.getItem('nav_width')) || 250,
  );
  const [itemOrder, setItemOrder] = useState<Record<string, string[]>>(
    () => { try { return JSON.parse(localStorage.getItem('nav_item_order') || '{}'); } catch { return {}; } },
  );
  const [groupOrder, setGroupOrder] = useState<string[]>(
    () => { try { return JSON.parse(localStorage.getItem('nav_group_order') || '[]'); } catch { return []; } },
  );
  const dragRef = useRef<{ kind: 'item' | 'group'; id: string; group?: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Opening a screen hands focus to it. Without this, focus stayed on the
  // sidebar button you just clicked, so the arrow keys went on driving the
  // sidebar list and the screen's own table never received them.
  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [activeScreen]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(GROUPS.map(g => [g.name, true])),
  );

  function toggleGroup(name: string) {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  }

  // ---------------------------------------------------------------- nav bar
  // Width, collapse state and running order belong to the user, so they survive
  // a reload. A layout you must re-arrange every morning is worse than one you
  // cannot arrange at all.
  useEffect(() => { localStorage.setItem('nav_mode', navMode); }, [navMode]);
  useEffect(() => { localStorage.setItem('nav_width', String(navWidth)); }, [navWidth]);
  useEffect(() => { localStorage.setItem('nav_item_order', JSON.stringify(itemOrder)); }, [itemOrder]);
  useEffect(() => { localStorage.setItem('nav_group_order', JSON.stringify(groupOrder)); }, [groupOrder]);

  // Saved order first, then anything the app has since added - a new screen must
  // never vanish just because it was not in the order saved last month.
  const orderedGroups = React.useMemo(() => {
    const known = GROUPS.map(g => g.name);
    const ordered = groupOrder.filter(n => known.includes(n));
    for (const n of known) if (!ordered.includes(n)) ordered.push(n);
    return ordered.map(n => GROUPS.find(g => g.name === n)!);
  }, [groupOrder]);

  const itemsOf = React.useCallback((group?: string) => {
    const items = navItems.filter(i => i.group === group);
    const saved = itemOrder[group ?? TOP] ?? [];
    const ordered = saved
      .map(id => items.find(i => i.id === id))
      .filter((i): i is NavItem => !!i);
    for (const i of items) if (!ordered.some(o => o.id === i.id)) ordered.push(i);
    return ordered;
  }, [itemOrder]);

  // --- drag to reorder ---
  // Items move within their own group, and groups move among groups. Dropping
  // "New Invoice" into Finance would have to re-home it, which is a different
  // and more surprising act than moving it higher up its own list.
  function onItemDrop(target: NavItem) {
    const d = dragRef.current;
    dragRef.current = null;
    setDragOver(null);
    if (!d || d.kind !== 'item') return;
    const g = target.group ?? TOP;
    if ((d.group ?? TOP) !== g) return;

    const list = itemsOf(target.group).map(i => i.id);
    const from = list.indexOf(d.id);
    const to = list.indexOf(target.id);
    if (from < 0 || to < 0 || from === to) return;
    list.splice(to, 0, list.splice(from, 1)[0]);
    setItemOrder(prev => ({ ...prev, [g]: list }));
  }

  function onGroupDrop(targetName: string) {
    const d = dragRef.current;
    dragRef.current = null;
    setDragOver(null);
    if (!d || d.kind !== 'group') return;

    const list = orderedGroups.map(g => g.name);
    const from = list.indexOf(d.id);
    const to = list.indexOf(targetName);
    if (from < 0 || to < 0 || from === to) return;
    list.splice(to, 0, list.splice(from, 1)[0]);
    setGroupOrder(list);
  }

  // --- drag the edge to resize ---
  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      // The sidebar starts at x=0, so the pointer's x IS the width. Clamped so
      // it can never be dragged away to nothing - that is what collapse is for.
      setNavWidth(Math.min(420, Math.max(170, ev.clientX)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // stop the drag selecting nav text
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const cycleNav = () => setNavMode(m => (m === 'full' ? 'rail' : m === 'rail' ? 'hidden' : 'full'));
  const rail = navMode === 'rail';
  const sidebarWidth = rail ? RAIL_WIDTH : navWidth;

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
      case 'locations':
        return <LocationsScreen />;
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
      case 'recipes':
        return <RecipesScreen />;
      case 'cost-history':
        return <CostHistoryScreen />;
      case 'manufacturing-orders':
        return <ManufacturingOrdersScreen />;
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
      case 'purchase-returns':
        return <PurchaseReturnsScreen />;
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

  // One row of the nav. Draggable (to reorder), and in rail mode it drops the
  // label but keeps the icon - with the label as a tooltip, so nothing is lost.
  function renderNavItems(items: NavItem[], grouped = false) {
    return items.map(item => (
      <button
        key={item.id}
        onClick={() => setActiveScreen(item.id)}
        draggable
        onDragStart={() => { dragRef.current = { kind: 'item', id: item.id, group: item.group }; }}
        onDragOver={e => { e.preventDefault(); setDragOver(`i:${item.id}`); }}
        onDragLeave={() => setDragOver(d => (d === `i:${item.id}` ? null : d))}
        onDrop={e => { e.preventDefault(); onItemDrop(item); }}
        title={rail ? item.label : `${item.label} — drag to reorder`}
        style={{
          ...styles.navItem,
          ...(grouped && !rail ? styles.navItemGrouped : {}),
          ...(rail ? styles.navItemRail : {}),
          ...(activeScreen === item.id ? styles.navItemActive : {}),
          ...(dragOver === `i:${item.id}` ? styles.navDropTarget : {}),
        }}
      >
        <span style={styles.navIcon}>{item.icon}</span>
        {!rail && <span style={styles.navLabel}>{item.label}</span>}
      </button>
    ));
  }

  return (
    <div style={styles.container}>
      {/* First stop for a keyboard user: jump past 40-odd nav links straight into
          the screen they came to work in. Only visible while focused. */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

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
        {/* Hidden: one button brings it back, so the nav can never be lost. */}
        {navMode === 'hidden' && (
          <button style={styles.navRestore} onClick={() => setNavMode('full')} title="Show navigation">
            ☰
          </button>
        )}

        {/* Sidebar - Up/Down walks the items; drag an item to reorder it;
            drag the right edge to resize; the ☰ button cycles
            full -> icons only -> hidden. */}
        {navMode !== 'hidden' && (
        <nav
          ref={sidebarRef}
          style={{ ...styles.sidebar, width: sidebarWidth }}
          aria-label="Main navigation"
        >
          <div style={styles.navHeader}>
            {!rail && <span style={styles.navTitleText}>Navigation</span>}
            <button
              style={styles.navToggle}
              onClick={cycleNav}
              title={rail ? 'Hide navigation' : 'Collapse to icons'}
              aria-label={rail ? 'Hide navigation' : 'Collapse to icons'}
            >
              {rail ? '»' : '«'}
            </button>
          </div>

          {renderNavItems(itemsOf(undefined))}

          {orderedGroups.map(group => (
            <React.Fragment key={group.name}>
              <button
                style={{
                  ...styles.navGroupHeader,
                  ...(dragOver === `g:${group.name}` ? styles.navDropTarget : {}),
                  ...(rail ? styles.navGroupHeaderRail : {}),
                }}
                onClick={() => toggleGroup(group.name)}
                draggable
                onDragStart={() => { dragRef.current = { kind: 'group', id: group.name }; }}
                onDragOver={e => { e.preventDefault(); setDragOver(`g:${group.name}`); }}
                onDragLeave={() => setDragOver(d => (d === `g:${group.name}` ? null : d))}
                onDrop={e => { e.preventDefault(); onGroupDrop(group.name); }}
                title={rail ? group.name : 'Drag to reorder this group'}
              >
                {rail ? (
                  <span>{group.icon}</span>
                ) : (
                  <>
                    <span>{group.icon} {group.name}</span>
                    <span>{expandedGroups[group.name] ? '▾' : '▸'}</span>
                  </>
                )}
              </button>
              {expandedGroups[group.name] && renderNavItems(itemsOf(group.name), true)}
            </React.Fragment>
          ))}

          {/* The resize edge. Only meaningful at full width - an icon rail has
              a fixed width by definition. */}
          {!rail && (
            <div
              style={styles.resizeHandle}
              onMouseDown={startResize}
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize"
            />
          )}
        </nav>
        )}

        {/* Main Content Area */}
        <div id="main-content" tabIndex={-1} style={styles.content}>
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
    // width is set inline: the user drags it, or the rail fixes it.
    flexShrink: 0,
    position: 'relative',
    background: 'white',
    borderRight: '1px solid #ddd',
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '12px 0 20px',
    boxShadow: '1px 0 3px rgba(0,0,0,0.05)',
  },
  navHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px 10px 20px',
  },
  navTitleText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  navToggle: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: '5px',
    color: '#666',
    cursor: 'pointer',
    fontSize: '13px',
    lineHeight: 1,
    padding: '4px 7px',
    margin: '0 auto',
  },
  // Brought back after the nav is hidden entirely.
  navRestore: {
    alignSelf: 'flex-start',
    margin: '10px 6px 0',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '6px 10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  // The grab strip on the sidebar's right edge. Sits above the scrolling
  // content so it can be caught anywhere down the sidebar's height.
  resizeHandle: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '6px',
    height: '100%',
    cursor: 'col-resize',
  },
  navItemRail: {
    justifyContent: 'center',
    padding: '12px 0',
  },
  navGroupHeaderRail: {
    justifyContent: 'center',
    padding: '10px 0',
  },
  // Where a dragged item would land.
  navDropTarget: {
    outline: '2px dashed #7c3aed',
    outlineOffset: '-2px',
    background: '#f5f3ff',
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

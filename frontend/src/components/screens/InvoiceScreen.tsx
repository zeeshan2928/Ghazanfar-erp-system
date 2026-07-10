import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { SearchBox } from '../filters/SearchBox';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterSummary } from '../filters/FilterSummary';
import { FilterOperator, DataType, FilterOperatorDto, SearchRequestDto, ColumnValueDto } from '../../types/filters';
import { BillDetailModal } from '../bills/BillDetailModal';

interface Customer {
  id: number;
  name: string;
  phone: string;
  customerType: string;
}

interface Salesman {
  id: number;
  firstName: string;
  lastName: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  code: string;
  cost_price?: number;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  totalStock?: number;
  salePrice?: number | null;
  commissionRate?: number | null;
}

type ProductSortField = 'name' | 'salePrice' | 'category' | 'totalStock' | 'brand' | 'commissionRate';

interface ProductColumnFilters {
  text: string;
  categoryIds: Set<number>;
  brandIds: Set<number>;
  minPrice: string;
  maxPrice: string;
  minStock: string;
  maxStock: string;
  minCommission: string;
  maxCommission: string;
}

function emptyProductFilters(): ProductColumnFilters {
  return {
    text: '',
    categoryIds: new Set(),
    brandIds: new Set(),
    minPrice: '',
    maxPrice: '',
    minStock: '',
    maxStock: '',
    minCommission: '',
    maxCommission: '',
  };
}

interface InvoiceLine {
  productId: number | '';
  productLabel: string;
  quantity: number;
  unitPrice: number;
  warehouseId: number | '';
}

interface StockRow {
  warehouseId: number;
  warehouseName: string;
  physical_on_hand: number;
  reserved: number;
  available: number;
}

interface SaleHistoryEntry {
  date: string;
  billNumber: string;
  items: Array<{ code: string; name: string; quantity: number }>;
  amount: number;
  channel: string;
}

interface PurchaseHistoryEntry {
  vendor: string;
  poNumber: string;
  poDate: string;
  quantity: number;
  costPrice: number;
}

interface CustomerProductHistoryEntry {
  date: string;
  billNumber: string;
  quantity: number;
  unitPrice: number;
}

interface TransactionSearchResult {
  id: number;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  billDate: string;
  status: string;
  paymentMethod: string;
  employeeName: string;
}

const TRANSACTION_SEARCH_COLUMNS: Array<{ name: string; label: string; dataType: DataType }> = [
  { name: 'billNumber', label: 'Bill #', dataType: DataType.TEXT },
  { name: 'customerName', label: 'Customer', dataType: DataType.TEXT },
  { name: 'amount', label: 'Amount', dataType: DataType.NUMERIC },
  { name: 'billDate', label: 'Date', dataType: DataType.DATE },
  { name: 'status', label: 'Status', dataType: DataType.ENUM },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Position/size for a draggable+resizable surface, persisted to
 * localStorage so it reopens exactly where the user last left it -
 * across invoices, across screens, across reloads.
 */
/**
 * A boolean toggle (e.g. "auto-search on/off" for a preview panel)
 * persisted to localStorage, defaulting to true. Shared by all 3 live
 * preview panels so each can independently pause/resume its own fetching.
 */
function usePersistedToggle(storageKey: string): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) !== 'false';
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setValue(prev => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // non-fatal - just won't remember the toggle
      }
      return next;
    });
  }, [storageKey]);

  return [value, toggle];
}

function usePersistedRect(storageKey: string, defaultRect: Rect) {
  const [rect, setRect] = useState<Rect>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as Rect;
    } catch {
      // corrupt/old storage shape - fall back to default
    }
    return defaultRect;
  });

  const rectRef = useRef(rect);
  rectRef.current = rect;

  // Write-through on every move, not just on mouseup - if mouseup is ever
  // missed (release outside the window, focus loss mid-drag, etc.) the last
  // successfully-applied position/size is still the one saved, instead of
  // silently reverting to whatever was there before the drag started.
  function applyAndPersist(next: Rect) {
    rectRef.current = next;
    setRect(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // storage full/unavailable - non-fatal, just won't remember position
    }
  }

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRect = rectRef.current;

    function onMove(ev: MouseEvent) {
      applyAndPersist({ ...startRect, top: startRect.top + (ev.clientY - startY), left: startRect.left + (ev.clientX - startX) });
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const startResize = useCallback(
    (edge: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = rectRef.current;
      const MIN_W = 240;
      const MIN_H = 160;

      function onMove(ev: MouseEvent) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let { top, left, width, height } = startRect;
        if (edge.includes('e')) width = Math.max(MIN_W, startRect.width + dx);
        if (edge.includes('s')) height = Math.max(MIN_H, startRect.height + dy);
        if (edge.includes('w')) {
          width = Math.max(MIN_W, startRect.width - dx);
          left = startRect.left + (startRect.width - width);
        }
        if (edge.includes('n')) {
          height = Math.max(MIN_H, startRect.height - dy);
          top = startRect.top + (startRect.height - height);
        }
        applyAndPersist({ top, left, width, height });
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [storageKey],
  );

  return { rect, setRect, startDrag, startResize };
}

// Handles sit fully INSIDE the box (non-negative insets) rather than
// straddling the border - straddling with negative offsets meant they got
// silently clipped by the panel's own `overflow: auto`, which is what made
// some edges (whichever ones happened to be mostly outside the box) appear
// unresponsive while others still worked.
const RESIZE_HANDLE_DEFS: Array<{ edge: string; style: React.CSSProperties }> = [
  { edge: 'n', style: { top: 0, left: 10, right: 10, height: 8, cursor: 'ns-resize' } },
  { edge: 's', style: { bottom: 0, left: 10, right: 10, height: 8, cursor: 'ns-resize' } },
  { edge: 'e', style: { right: 0, top: 10, bottom: 10, width: 8, cursor: 'ew-resize' } },
  { edge: 'w', style: { left: 0, top: 10, bottom: 10, width: 8, cursor: 'ew-resize' } },
  { edge: 'ne', style: { top: 0, right: 0, width: 14, height: 14, cursor: 'nesw-resize' } },
  { edge: 'nw', style: { top: 0, left: 0, width: 14, height: 14, cursor: 'nwse-resize' } },
  { edge: 'se', style: { bottom: 0, right: 0, width: 14, height: 14, cursor: 'nwse-resize' } },
  { edge: 'sw', style: { bottom: 0, left: 0, width: 14, height: 14, cursor: 'nesw-resize' } },
];

function ResizeHandles({ startResize }: { startResize: (edge: string) => (e: React.MouseEvent) => void }) {
  return (
    <>
      {RESIZE_HANDLE_DEFS.map(h => (
        <div key={h.edge} onMouseDown={startResize(h.edge)} style={{ position: 'absolute', zIndex: 50, ...h.style }} />
      ))}
    </>
  );
}

function FloatingPanel({
  storageKey,
  defaultRect,
  title,
  visible,
  onClose,
  headerExtra,
  children,
  panelRef,
}: {
  storageKey: string;
  defaultRect: Rect;
  title: string;
  visible: boolean;
  onClose?: () => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  panelRef?: React.Ref<HTMLDivElement>;
}) {
  const { rect, startDrag, startResize } = usePersistedRect(storageKey, defaultRect);
  if (!visible) return null;
  return (
    <div
      ref={panelRef}
      style={{ ...styles.floatingPanel, top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    >
      <div style={styles.floatingHeader} onMouseDown={startDrag}>
        <span style={styles.floatingTitle}>{title}</span>
        <div style={{ flex: 1 }} />
        {headerExtra}
        {onClose && <button style={styles.floatingCloseBtn} onClick={onClose}>✕</button>}
      </div>
      <div style={styles.floatingBody}>{children}</div>
      <ResizeHandles startResize={startResize} />
    </div>
  );
}

interface GatePassItemView {
  productId: number;
  quantity: number;
  billLine?: { product?: { name: string; code: string } };
}

interface GatePassView {
  id: number;
  gate_pass_number: string;
  warehouseId: number;
  warehouse?: { name: string };
  items: GatePassItemView[];
}

interface SavedInvoice {
  id: number;
  bill_number: string;
  total_amount: number;
  bill_date: string;
  customer?: { name: string; phone: string; email?: string };
  lines?: Array<{ quantity: number; unit_price: number; line_total: number; product?: { name: string; code: string } }>;
  gatePasses?: GatePassView[];
}

type TransactionType = 'SALE' | 'RETURN';

const emptyLine = (): InvoiceLine => ({
  productId: '',
  productLabel: '',
  quantity: 1,
  unitPrice: 0,
  warehouseId: '',
});

export function InvoiceScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [transactionType, setTransactionType] = useState<TransactionType>('SALE');
  const [returnWarehouseId, setReturnWarehouseId] = useState<number | ''>('');

  const [customerId, setCustomerId] = useState<number | ''>('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [salesmanId, setSalesmanId] = useState<number | ''>('');
  const [channel, setChannel] = useState('COUNTER');
  const [creditStatus, setCreditStatus] = useState<{ creditLimit: number; outstandingBalance: number; availableCredit: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [deliveryCharges, setDeliveryCharges] = useState('');
  const [cashbookNumber, setCashbookNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedInvoice, setSavedInvoice] = useState<SavedInvoice | null>(null);

  // Top "Search By Bill #" transaction lookup - same search/filter/sort
  // experience as the Bills screen (reuses the same components), and opens
  // the same shared detail/edit modal when a result is picked.
  const [txSearchOpen, setTxSearchOpen] = useState(false);
  const [txResults, setTxResults] = useState<TransactionSearchResult[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txSkip, setTxSkip] = useState(0);
  const [txTake] = useState(10);
  const [txLoading, setTxLoading] = useState(false);
  const [txPrimaryFilter, setTxPrimaryFilter] = useState<FilterOperatorDto | undefined>();
  const [txColumnFilters, setTxColumnFilters] = useState<FilterOperatorDto[]>([]);
  const [txColumnValues, setTxColumnValues] = useState<Record<string, ColumnValueDto[]>>({});
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const txSearchRef = useRef<HTMLDivElement | null>(null);

  // Walk-in customer popup
  const [walkInPopupOpen, setWalkInPopupOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ name: '', email: '', phone: '', city: '', address: '' });
  const [walkInPhoneMatches, setWalkInPhoneMatches] = useState<Customer[]>([]);
  const [walkInSaving, setWalkInSaving] = useState(false);
  const [walkInError, setWalkInError] = useState('');
  const walkInPhoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick-add product popup - same idea as the Walk-in customer quick-add,
  // for when a product doesn't exist yet while building an invoice.
  const [quickAddProductOpen, setQuickAddProductOpen] = useState(false);
  const [quickAddProductForm, setQuickAddProductForm] = useState({ code: '', name: '', categoryId: '', brandId: '', costPrice: '' });
  const [quickAddProductSaving, setQuickAddProductSaving] = useState(false);
  const [quickAddProductError, setQuickAddProductError] = useState('');

  // Product picker: sortable/filterable table of products, opened per line
  const [productPicker, setProductPicker] = useState<{ lineIndex: number } | null>(null);
  const [productSort, setProductSort] = useState<{ field: ProductSortField; direction: 'asc' | 'desc' }>({
    field: 'name',
    direction: 'asc',
  });
  const [productFilters, setProductFilters] = useState<ProductColumnFilters>(emptyProductFilters());
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [lastFocusedLineIndex, setLastFocusedLineIndex] = useState<number | null>(null);
  const lastEscapeTimeRef = useRef(0);
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const stockPanelRef = useRef<HTMLDivElement | null>(null);
  const vendorHistoryPanelRef = useRef<HTMLDivElement | null>(null);
  const customerHistoryPanelRef = useRef<HTMLDivElement | null>(null);

  // Live preview panels - update as the highlight moves through the product
  // picker, so these three don't require actually selecting a product first
  const [previewStock, setPreviewStock] = useState<StockRow[]>([]);
  const [previewVendorHistory, setPreviewVendorHistory] = useState<PurchaseHistoryEntry[]>([]);
  const [previewCustomerHistory, setPreviewCustomerHistory] = useState<CustomerProductHistoryEntry[]>([]);
  const [stockAutoSearch, toggleStockAutoSearch] = usePersistedToggle('invoicePicker:stockAutoSearch');
  const [vendorHistoryAutoSearch, toggleVendorHistoryAutoSearch] = usePersistedToggle('invoicePicker:vendorHistoryAutoSearch');
  const [customerHistoryAutoSearch, toggleCustomerHistoryAutoSearch] = usePersistedToggle('invoicePicker:customerHistoryAutoSearch');
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mainPickerBox = usePersistedRect('invoicePicker:mainBox', { top: 44, left: 0, width: 460, height: 340 });

  // Popup 1: warehouse + quantity for a product
  const [stockPopup, setStockPopup] = useState<{ lineIndex: number; rows: StockRow[] } | null>(null);
  // Popup 2: customer's last purchases
  const [historyPopup, setHistoryPopup] = useState<SaleHistoryEntry[] | null>(null);
  // Popup 3: product's last vendor purchases
  const [purchasePopup, setPurchasePopup] = useState<PurchaseHistoryEntry[] | null>(null);

  // Post-save print workflow
  const [confirmGatePassPrint, setConfirmGatePassPrint] = useState(false);
  const [gatePassQueue, setGatePassQueue] = useState<GatePassView[]>([]);
  const [gatePassQueueIndex, setGatePassQueueIndex] = useState(0);
  const [printingGatePass, setPrintingGatePass] = useState<GatePassView | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<SavedInvoice | null>(null);
  const [gatePassCopies, setGatePassCopies] = useState(2);
  const [gatePassIsDuplicate, setGatePassIsDuplicate] = useState(false);
  const [printingGatePassBusy, setPrintingGatePassBusy] = useState(false);

  // Invoice delivery: download / WhatsApp (wa.me, text pre-filled, PDF
  // attached manually since there's no official WhatsApp file-send API) /
  // email (real SMTP wiring, see MailerService - no-ops with a clear reason
  // until credentials are configured).
  const [downloadingInvoicePdf, setDownloadingInvoicePdf] = useState(false);
  const [whatsappPhonePrompt, setWhatsappPhonePrompt] = useState(false);
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState('');
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState(false);
  const [invoiceEmailStatus, setInvoiceEmailStatus] = useState<string | null>(null);

  useEffect(() => {
    loadReferenceData();
  }, []);

  async function loadReferenceData() {
    try {
      const [custRes, userRes, whRes, prodRes] = await Promise.all([
        apiClient.searchCustomers({ skip: 0, take: 200 }),
        apiClient.getUsers(0, 200, undefined, 'SALESMAN'),
        apiClient.getWarehouses(),
        apiClient.searchProducts({ skip: 0, take: 500 }),
      ]);
      setCustomers(custRes.data || []);
      setSalesmen(userRes.data || userRes || []);
      setWarehouses(Array.isArray(whRes) ? whRes : whRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load reference data', err);
    }
  }

  async function fetchTxSearch() {
    try {
      setTxLoading(true);
      const request: SearchRequestDto = {
        skip: txSkip,
        take: txTake,
        primaryFilter: txPrimaryFilter,
        columnFilters: txColumnFilters.length > 0 ? txColumnFilters : undefined,
      };
      const result = await apiClient.searchBills(request);
      setTxResults(result.data || []);
      setTxTotal(result.total || 0);
    } catch (err) {
      console.error('Failed to search transactions', err);
    } finally {
      setTxLoading(false);
    }
  }

  async function openTxSearch() {
    setTxSearchOpen(true);
    if (Object.keys(txColumnValues).length === 0) {
      try {
        const [statusVals, paymentVals] = await Promise.all([
          apiClient.getBillColumnValues('status'),
          apiClient.getBillColumnValues('paymentMethod'),
        ]);
        setTxColumnValues({ status: statusVals || [], paymentMethod: paymentVals || [] });
      } catch (err) {
        console.error('Failed to load transaction filter values', err);
      }
    }
  }

  useEffect(() => {
    if (txSearchOpen) fetchTxSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSearchOpen, txPrimaryFilter, txColumnFilters, txSkip]);

  // Credit-limit indicator - part of the invoice screen's "360 view": shows
  // how much of this customer's credit limit is already used up by unpaid
  // bills before another sale is added on top.
  useEffect(() => {
    if (!customerId) {
      setCreditStatus(null);
      return;
    }
    let cancelled = false;
    apiClient.getCustomerCreditStatus(customerId as number)
      .then(status => { if (!cancelled) setCreditStatus(status); })
      .catch(() => { if (!cancelled) setCreditStatus(null); });
    return () => { cancelled = true; };
  }, [customerId]);

  // Click-outside closes the search popover (it isn't a full-screen modal,
  // so it needs the same pattern the product picker uses).
  useEffect(() => {
    if (!txSearchOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (txSearchRef.current && !txSearchRef.current.contains(e.target as Node)) {
        setTxSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [txSearchOpen]);

  function handleTxPrimarySearch(value: string, operator: FilterOperator) {
    setTxPrimaryFilter({ field: 'billNumber', operator, value, dataType: DataType.TEXT });
    setTxSkip(0);
  }

  function getTxDataType(fieldName: string): DataType {
    return TRANSACTION_SEARCH_COLUMNS.find(c => c.name === fieldName)?.dataType || DataType.TEXT;
  }

  function handleTxColumnFilter(columnName: string, operator: FilterOperator, value: any) {
    const newFilter: FilterOperatorDto = { field: columnName, operator, value, dataType: getTxDataType(columnName) };
    const existingIdx = txColumnFilters.findIndex(f => f.field === columnName);
    if (existingIdx >= 0) {
      const updated = [...txColumnFilters];
      updated[existingIdx] = newFilter;
      setTxColumnFilters(updated);
    } else {
      setTxColumnFilters([...txColumnFilters, newFilter]);
    }
    setTxSkip(0);
  }

  function handleRemoveTxPrimaryFilter() {
    setTxPrimaryFilter(undefined);
    setTxSkip(0);
  }

  function handleRemoveTxColumnFilter(index: number) {
    setTxColumnFilters(prev => prev.filter((_, i) => i !== index));
    setTxSkip(0);
  }

  function handleCustomerChange(id: string) {
    const idNum = id ? parseInt(id, 10) : '';
    setCustomerId(idNum);
    const selected = customers.find(c => c.id === idNum);
    setCustomerPhone(selected?.phone || '');
    setHistoryPopup(null);
  }

  function openWalkInPopup() {
    setWalkInForm({ name: '', email: '', phone: '', city: '', address: '' });
    setWalkInPhoneMatches([]);
    setWalkInError('');
    setWalkInPopupOpen(true);
  }

  function updateWalkInField(field: keyof typeof walkInForm, value: string) {
    setWalkInForm(prev => ({ ...prev, [field]: value }));

    if (field === 'phone') {
      if (walkInPhoneDebounceRef.current) clearTimeout(walkInPhoneDebounceRef.current);
      if (!value.trim()) {
        setWalkInPhoneMatches([]);
        return;
      }
      // Auto-search for existing walk-ins as the phone is typed - repeat
      // walk-ins sharing the same name are told apart by contact number,
      // so this is the point where a duplicate would otherwise get created.
      walkInPhoneDebounceRef.current = setTimeout(async () => {
        try {
          const result = await apiClient.searchCustomers({
            primaryFilter: { field: 'phone', operator: FilterOperator.CONTAINS, value, dataType: DataType.TEXT },
            take: 5,
          });
          setWalkInPhoneMatches(result.data || []);
        } catch (err) {
          console.error('Failed to search existing walk-in customers', err);
        }
      }, 300);
    }
  }

  function selectExistingWalkIn(customer: Customer) {
    setCustomers(prev => (prev.some(c => c.id === customer.id) ? prev : [...prev, customer]));
    setCustomerId(customer.id);
    setCustomerPhone(customer.phone || '');
    setWalkInPopupOpen(false);
  }

  async function submitWalkIn() {
    setWalkInError('');
    if (!walkInForm.name.trim()) {
      setWalkInError('Name is required');
      return;
    }
    if (!walkInForm.phone.trim()) {
      setWalkInError('Contact number is required');
      return;
    }

    setWalkInSaving(true);
    try {
      const created = await apiClient.createCustomer({
        name: walkInForm.name.trim(),
        phone: walkInForm.phone.trim(),
        email: walkInForm.email.trim() || undefined,
        city: walkInForm.city.trim() || undefined,
        address: walkInForm.address.trim() || undefined,
        customerType: 'WALK_IN',
      });
      setCustomers(prev => [...prev, created]);
      setCustomerId(created.id);
      setCustomerPhone(created.phone || '');
      setWalkInPopupOpen(false);
    } catch (err: any) {
      setWalkInError(err.response?.data?.message || 'Failed to create walk-in customer');
    } finally {
      setWalkInSaving(false);
    }
  }

  async function openCustomerHistory() {
    if (!customerId) return;
    try {
      const data = await apiClient.getCustomerSaleHistory(customerId as number);
      setHistoryPopup(data);
    } catch (err) {
      setError('Failed to load customer purchase history');
    }
  }

  // Opens in a real separate browser window (not an in-app popup) - this app
  // has no client-side router, so rather than adding one just for this, the
  // ledger is rendered as a small self-contained HTML document written
  // directly into a blank window, the same technique already used for
  // printable documents elsewhere in this screen.
  async function openCustomerLedger() {
    if (!customerId) return;
    try {
      const ledger = await apiClient.getCustomerLedger(customerId as number);
      const rows = ledger.entries.map(e => `
        <tr>
          <td>${e.billDate.split('T')[0]}</td>
          <td>${e.billNumber}</td>
          <td>${e.status}</td>
          <td style="text-align:right">${e.totalAmount}</td>
          <td style="text-align:right">${e.amountPaid}</td>
          <td style="text-align:right">${e.outstanding}</td>
          <td style="text-align:right"><strong>${e.runningBalance}</strong></td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <title>Ledger - ${ledger.customer.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
              h2 { margin-bottom: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
              th { background: #f5f5f5; text-align: left; }
              .summary { margin-top: 16px; font-size: 15px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>${ledger.customer.name}</h2>
            <div>Phone: ${ledger.customer.phone || 'N/A'} | Credit Limit: ${ledger.customer.creditLimit}</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Bill #</th><th>Status</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Running Balance</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7">No bills for this customer</td></tr>'}</tbody>
            </table>
            <div class="summary">Total Outstanding: ${ledger.totalOutstanding}</div>
          </body>
        </html>
      `;

      const ledgerWindow = window.open('', '_blank');
      if (ledgerWindow) {
        ledgerWindow.document.write(html);
        ledgerWindow.document.close();
      }
    } catch (err) {
      setError('Failed to load customer ledger');
    }
  }

  async function openProductHistory(productId: number | '') {
    if (!productId) return;
    try {
      const data = await apiClient.getProductPurchaseHistory(productId as number);
      setPurchasePopup(data);
    } catch (err) {
      setError('Failed to load product purchase history');
    }
  }

  async function handleLineProductPick(index: number, productId: number) {
    const product = products.find(p => p.id === productId);

    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      productId,
      productLabel: product ? `${product.code} - ${product.name}` : '',
      unitPrice: product?.salePrice ?? product?.cost_price ?? updated[index].unitPrice,
    };
    setLines(updated);
    setProductPicker(null);
    setOpenFilterColumn(null);

    try {
      const stock = await apiClient.getProductStockAcrossWarehouses(productId);
      setStockPopup({ lineIndex: index, rows: stock });
    } catch (err) {
      console.error('Failed to load stock across warehouses', err);
    }
  }

  function openQuickAddProduct() {
    setQuickAddProductForm({ code: '', name: '', categoryId: '', brandId: '', costPrice: '' });
    setQuickAddProductError('');
    setQuickAddProductOpen(true);
  }

  function updateQuickAddProductField(field: keyof typeof quickAddProductForm, value: string) {
    setQuickAddProductForm(prev => ({ ...prev, [field]: value }));
  }

  async function submitQuickAddProduct() {
    setQuickAddProductError('');
    if (!quickAddProductForm.name.trim()) {
      setQuickAddProductError('Product name is required');
      return;
    }
    if (!quickAddProductForm.code.trim()) {
      setQuickAddProductError('Product code is required');
      return;
    }

    setQuickAddProductSaving(true);
    try {
      const created = await apiClient.createProduct({
        code: quickAddProductForm.code.trim(),
        name: quickAddProductForm.name.trim(),
        categoryId: quickAddProductForm.categoryId || undefined,
        brandId: quickAddProductForm.brandId || undefined,
        costPrice: quickAddProductForm.costPrice || undefined,
      });
      setProducts(prev => [...prev, created]);
      setQuickAddProductOpen(false);
      if (productPicker) {
        await handleLineProductPick(productPicker.lineIndex, created.id);
      }
    } catch (err: any) {
      setQuickAddProductError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setQuickAddProductSaving(false);
    }
  }

  function toggleProductSort(field: ProductSortField) {
    setProductSort(prev =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' },
    );
  }

  function getFilteredSortedProducts(): Product[] {
    const f = productFilters;
    const text = f.text.trim().toLowerCase();

    let result = products.filter(p => {
      if (text && !`${p.code} ${p.name}`.toLowerCase().includes(text)) return false;
      if (f.categoryIds.size > 0 && (!p.category || !f.categoryIds.has(p.category.id))) return false;
      if (f.brandIds.size > 0 && (!p.brand || !f.brandIds.has(p.brand.id))) return false;
      const price = p.salePrice ?? p.cost_price ?? 0;
      if (f.minPrice && price < Number(f.minPrice)) return false;
      if (f.maxPrice && price > Number(f.maxPrice)) return false;
      const stock = p.totalStock ?? 0;
      if (f.minStock && stock < Number(f.minStock)) return false;
      if (f.maxStock && stock > Number(f.maxStock)) return false;
      const commission = p.commissionRate ?? 0;
      if (f.minCommission && commission < Number(f.minCommission)) return false;
      if (f.maxCommission && commission > Number(f.maxCommission)) return false;
      return true;
    });

    const dir = productSort.direction === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      switch (productSort.field) {
        case 'name':
          return dir * `${a.code} ${a.name}`.localeCompare(`${b.code} ${b.name}`);
        case 'salePrice':
          return dir * ((a.salePrice ?? a.cost_price ?? 0) - (b.salePrice ?? b.cost_price ?? 0));
        case 'category':
          return dir * (a.category?.name || '').localeCompare(b.category?.name || '');
        case 'brand':
          return dir * (a.brand?.name || '').localeCompare(b.brand?.name || '');
        case 'totalStock':
          return dir * ((a.totalStock ?? 0) - (b.totalStock ?? 0));
        case 'commissionRate':
          return dir * ((a.commissionRate ?? 0) - (b.commissionRate ?? 0));
        default:
          return 0;
      }
    });

    return result;
  }

  function getDistinctCategories(): Array<{ id: number; name: string }> {
    const map = new Map<number, string>();
    products.forEach(p => p.category && map.set(p.category.id, p.category.name));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  function getDistinctBrands(): Array<{ id: number; name: string }> {
    const map = new Map<number, string>();
    products.forEach(p => p.brand && map.set(p.brand.id, p.brand.name));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  function toggleSetMember(set: Set<number>, id: number): Set<number> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  function pickWarehouseFromPopup(warehouseId: number) {
    if (!stockPopup) return;
    const updated = [...lines];
    updated[stockPopup.lineIndex] = { ...updated[stockPopup.lineIndex], warehouseId };
    setLines(updated);
    setStockPopup(null);
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: any) {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  }

  function addLine() {
    setLines([...lines, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const discountNum = Number(discountValue) || 0;
  const discountAmountPreview =
    discountType === 'PERCENTAGE' ? Math.round((subtotal * discountNum) / 100) : discountNum;
  const deliveryNum = Number(deliveryCharges) || 0;
  const totalPreview = subtotal - discountAmountPreview + deliveryNum;

  function resetForm() {
    setCustomerId('');
    setCustomerPhone('');
    setSalesmanId('');
    setDiscountValue('');
    setDeliveryCharges('');
    setCashbookNumber('');
    setRemarks('');
    setReturnWarehouseId('');
    setTransactionType('SALE');
    setLines([emptyLine()]);
  }

  // mode: 'ask' = save then ask about printing gate passes (Ctrl+Shift+S / Save button)
  //       'direct' = save then go straight into the gate-pass print loop (Ctrl+S)
  const handleSave = useCallback(
    async (mode: 'ask' | 'direct') => {
      setError('');

      if (!customerId) return setError('Select a customer');
      if (!customerPhone.trim()) return setError('Customer contact number is required');
      if (!salesmanId) return setError('Select a salesman');

      if (transactionType === 'RETURN') {
        if (!returnWarehouseId) return setError('Select the warehouse the return is going back into');
        if (lines.length === 0 || lines.some(l => !l.productId)) {
          return setError('Every line needs a product');
        }
      } else if (lines.length === 0 || lines.some(l => !l.productId || !l.warehouseId)) {
        return setError('Every line needs a product and a warehouse');
      }

      setSaving(true);
      try {
        const payload: any = {
          customerId,
          customerPhone: customerPhone.trim(),
          salesmanId,
          channel,
          paymentMethod,
          transactionType,
          discountType,
          discountPercentage: discountType === 'PERCENTAGE' ? discountNum : undefined,
          discountAmount: discountType === 'FIXED' ? discountNum : undefined,
          deliveryCharges: deliveryNum || undefined,
          cashbookNumber: cashbookNumber ? parseInt(cashbookNumber, 10) : undefined,
          remarks: remarks || undefined,
          lines: lines.map(l => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            warehouseId: transactionType === 'RETURN' ? returnWarehouseId : l.warehouseId,
          })),
        };
        if (transactionType === 'RETURN') {
          payload.returnWarehouseId = returnWarehouseId;
        }

        const result: SavedInvoice = await apiClient.createBill(payload);
        setSavedInvoice(result);
        resetForm();

        const gatePasses = result.gatePasses || [];

        if (gatePasses.length === 0) {
          // RETURN transactions (or a SALE with no dispatch, unlikely) have no
          // gate pass to print - offer the invoice print view directly.
          setPrintingInvoice(result);
          return;
        }

        if (mode === 'ask') {
          setConfirmGatePassPrint(true);
          setGatePassQueue(gatePasses);
          setGatePassQueueIndex(0);
        } else {
          setGatePassQueue(gatePasses);
          setGatePassQueueIndex(0);
          setPrintingGatePass(gatePasses[0]);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to save invoice');
      } finally {
        setSaving(false);
      }
    },
    [
      customerId,
      customerPhone,
      salesmanId,
      transactionType,
      returnWarehouseId,
      lines,
      channel,
      paymentMethod,
      discountType,
      discountNum,
      deliveryNum,
      cashbookNumber,
      remarks,
    ],
  );

  // Ctrl+Shift+S -> ask before printing gate passes. Ctrl+S alone -> print
  // them directly. Check the shift-modifier variant first since both share
  // the same base key.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave('ask');
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave('direct');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  // Double-Esc opens the product picker for whichever line was last
  // focused. Two Escape presses within 500ms count as "double"; a single
  // Escape still closes whatever popup is open (browser default / the
  // picker's own Escape handler), so this only fires on the second press.
  // Falls back to the last line in the invoice if nothing has been focused
  // yet this session (e.g. right after loading the screen or adding a new
  // line without having clicked into it first) - previously this silently
  // did nothing in that case, which read as "double-Esc doesn't work".
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      const now = Date.now();
      const isDoubleEscape = now - lastEscapeTimeRef.current < 500;
      lastEscapeTimeRef.current = now;

      if (isDoubleEscape) {
        const targetLine = lastFocusedLineIndex !== null ? lastFocusedLineIndex : lines.length - 1;
        if (targetLine < 0) return;
        e.preventDefault();
        setProductFilters(emptyProductFilters());
        setHighlightedIndex(0);
        setLastFocusedLineIndex(targetLine);
        setProductPicker({ lineIndex: targetLine });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lastFocusedLineIndex, lines.length]);

  // Once the invoice is shown (after gate passes are printed/skipped), a
  // single Escape closes that view so the next invoice can start - the form
  // underneath is already reset (resetForm() ran right after save).
  useEffect(() => {
    if (!printingInvoice) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setPrintingInvoice(null);
      setInvoiceEmailStatus(null);
      setWhatsappPhonePrompt(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [printingInvoice]);

  useEffect(() => {
    if (productPicker) {
      setHighlightedIndex(0);
      productSearchInputRef.current?.focus();
    }
  }, [productPicker]);

  // Anchored dropdown (not a full-screen modal), so closing on an outside
  // click needs its own listener rather than an overlay's onClick. The 3
  // floating preview panels are rendered separately (position: fixed, not
  // inside pickerRef) - without checking them too, starting a drag on one
  // of their headers registers as an "outside" click and closes the whole
  // picker (which is what "they disappear when I drag them" bug was).
  useEffect(() => {
    if (!productPicker) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (pickerRef.current?.contains(target)) return;
      if (stockPanelRef.current?.contains(target)) return;
      if (vendorHistoryPanelRef.current?.contains(target)) return;
      if (customerHistoryPanelRef.current?.contains(target)) return;
      setProductPicker(null);
      setOpenFilterColumn(null);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [productPicker]);

  // Live preview: as the highlight moves (arrow keys or mouse hover) over
  // the product list, refresh all three preview panels for whichever
  // product is currently highlighted - no need to actually select it first.
  // Debounced so holding an arrow key doesn't fire a request per row skipped.
  useEffect(() => {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);

    if (!productPicker) {
      setPreviewStock([]);
      setPreviewVendorHistory([]);
      setPreviewCustomerHistory([]);
      return;
    }

    previewDebounceRef.current = setTimeout(async () => {
      const rows = getFilteredSortedProducts();
      const product = rows[highlightedIndex];
      if (!product) {
        setPreviewStock([]);
        setPreviewVendorHistory([]);
        setPreviewCustomerHistory([]);
        return;
      }

      if (stockAutoSearch) {
        try {
          const stock = await apiClient.getProductStockAcrossWarehouses(product.id);
          setPreviewStock(stock);
        } catch {
          setPreviewStock([]);
        }
      } else {
        setPreviewStock([]);
      }

      if (vendorHistoryAutoSearch) {
        try {
          const vendorHistory = await apiClient.getProductPurchaseHistory(product.id);
          setPreviewVendorHistory(vendorHistory);
        } catch {
          setPreviewVendorHistory([]);
        }
      } else {
        setPreviewVendorHistory([]);
      }

      if (customerId && customerHistoryAutoSearch) {
        try {
          const customerHistory = await apiClient.getCustomerProductHistory(customerId as number, product.id);
          setPreviewCustomerHistory(customerHistory);
        } catch {
          setPreviewCustomerHistory([]);
        }
      } else {
        setPreviewCustomerHistory([]);
      }
    }, 150);

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productPicker, highlightedIndex, customerId, stockAutoSearch, vendorHistoryAutoSearch, customerHistoryAutoSearch]);

  function handleProductPickerKeyDown(e: React.KeyboardEvent) {
    const rows = getFilteredSortedProducts();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = rows[highlightedIndex];
      if (picked && productPicker) handleLineProductPick(productPicker.lineIndex, picked.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setProductPicker(null);
      setOpenFilterColumn(null);
    }
  }

  function confirmPrintGatePasses(yes: boolean) {
    setConfirmGatePassPrint(false);
    if (yes) {
      setPrintingGatePass(gatePassQueue[0]);
    } else {
      setPrintingInvoice(savedInvoice);
    }
  }

  function afterGatePassPrint() {
    const nextIndex = gatePassQueueIndex + 1;
    setPrintingGatePass(null);
    setGatePassIsDuplicate(false);
    if (nextIndex < gatePassQueue.length) {
      setGatePassQueueIndex(nextIndex);
    } else {
      setGatePassQueue([]);
      setGatePassQueueIndex(0);
      // Gate-pass queue finished (nothing left to skip past) - move on to
      // the invoice print view, matching the original intended flow.
      if (savedInvoice) setPrintingInvoice(savedInvoice);
    }
  }

  // Records the print event server-side BEFORE actually printing, so the
  // popup can't be used to silently print a second physical copy - the
  // button is disabled for the duration of the call, and once print
  // completes the queue auto-advances instead of leaving the same
  // "Print this gate pass" button sitting there clickable again.
  async function doPrintGatePass() {
    if (!printingGatePass || printingGatePassBusy) return;
    setPrintingGatePassBusy(true);
    try {
      const result = await apiClient.recordGatePassPrint(printingGatePass.id);
      setGatePassIsDuplicate(result.isDuplicate);
      // Let the DUPLICATE watermark actually paint before the print dialog opens.
      await new Promise(resolve => setTimeout(resolve, 50));
      window.print();
      afterGatePassPrint();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to print gate pass');
    } finally {
      setPrintingGatePassBusy(false);
    }
  }

  function doPrint() {
    window.print();
  }

  async function downloadInvoicePdf() {
    if (!printingInvoice || downloadingInvoicePdf) return;
    setDownloadingInvoicePdf(true);
    try {
      const blob = await apiClient.exportBillPDF(printingInvoice.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${printingInvoice.bill_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download invoice PDF');
    } finally {
      setDownloadingInvoicePdf(false);
    }
  }

  // wa.me can only pre-fill text, not attach a file - the customer's PDF
  // must already be downloaded (see downloadInvoicePdf) and attached by hand
  // in the WhatsApp window this opens. If there's no phone on file, ask for
  // one inline rather than silently failing.
  function sendInvoiceOnWhatsApp(phoneOverride?: string) {
    if (!printingInvoice) return;
    const phone = (phoneOverride ?? printingInvoice.customer?.phone ?? '').trim();
    if (!phone) {
      setWhatsappPhoneInput('');
      setWhatsappPhonePrompt(true);
      return;
    }
    const digitsOnly = phone.replace(/[^\d]/g, '');
    const message =
      `Invoice ${printingInvoice.bill_number}\n` +
      `Date: ${printingInvoice.bill_date.split('T')[0]}\n` +
      `Total: ${printingInvoice.total_amount}\n\n` +
      `Please find your invoice PDF attached.`;
    window.open(`https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`, '_blank');
  }

  function confirmWhatsappPhone() {
    const phone = whatsappPhoneInput.trim();
    if (!phone) return;
    setWhatsappPhonePrompt(false);
    sendInvoiceOnWhatsApp(phone);
  }

  async function sendInvoiceViaEmail() {
    if (!printingInvoice || sendingInvoiceEmail) return;
    setSendingInvoiceEmail(true);
    setInvoiceEmailStatus(null);
    try {
      const result = await apiClient.sendInvoiceEmail(printingInvoice.id);
      setInvoiceEmailStatus(result.sent ? `Emailed to ${result.to}` : (result.reason || 'Email not sent'));
    } catch (err: any) {
      setInvoiceEmailStatus(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSendingInvoiceEmail(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>🧾 New Invoice</h2>
        <div style={styles.headerRight}>
          {savedInvoice && (
            <div style={styles.savedBanner}>
              Saved as <strong>{savedInvoice.bill_number}</strong>
            </div>
          )}

          <div style={styles.txSearchWrapper} ref={txSearchRef}>
            <button type="button" style={styles.txSearchTrigger} onClick={() => (txSearchOpen ? setTxSearchOpen(false) : openTxSearch())}>
              🔍 Search By Bill #
            </button>

            {txSearchOpen && (
              <div style={styles.txSearchPopover}>
                <SearchBox onSearch={handleTxPrimarySearch} placeholder="Search by bill number..." />
                <FilterPanel
                  columns={TRANSACTION_SEARCH_COLUMNS.map(col => ({ ...col, values: txColumnValues[col.name] }))}
                  onFilterApply={handleTxColumnFilter}
                />
                <FilterSummary
                  primaryFilter={txPrimaryFilter}
                  columnFilters={txColumnFilters}
                  onRemovePrimary={handleRemoveTxPrimaryFilter}
                  onRemoveColumn={handleRemoveTxColumnFilter}
                />

                {txLoading ? (
                  <p style={styles.previewEmpty}>Loading...</p>
                ) : txResults.length === 0 ? (
                  <p style={styles.previewEmpty}>No transactions found</p>
                ) : (
                  <>
                    <div style={styles.txResultsScroll}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Bill #</th>
                            <th style={styles.th}>Customer</th>
                            <th style={styles.th}>Contact</th>
                            <th style={styles.th}>Amount</th>
                            <th style={styles.th}>Employee</th>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Bill Type</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txResults.map(tx => (
                            <tr
                              key={tx.id}
                              style={styles.pickerRow}
                              onClick={() => {
                                setSelectedBillId(tx.id);
                                setTxSearchOpen(false);
                              }}
                            >
                              <td style={styles.td}>{tx.billNumber}</td>
                              <td style={styles.td}>{tx.customerName}</td>
                              <td style={styles.td}>{tx.customerPhone || '-'}</td>
                              <td style={styles.td}>Rs {tx.amount.toLocaleString()}</td>
                              <td style={styles.td}>{tx.employeeName}</td>
                              <td style={styles.td}>{new Date(tx.billDate).toLocaleDateString()}</td>
                              <td style={styles.td}>{tx.paymentMethod}</td>
                              <td style={styles.td}>{tx.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={styles.txPaginationRow}>
                      <span style={styles.pickerHint}>
                        {txSkip + 1}-{Math.min(txSkip + txTake, txTotal)} of {txTotal}
                      </span>
                      <div style={styles.inlineRow}>
                        <button style={styles.smallBtn} disabled={txSkip === 0} onClick={() => setTxSkip(Math.max(0, txSkip - txTake))}>← Prev</button>
                        <button style={styles.smallBtn} disabled={txSkip + txTake >= txTotal} onClick={() => setTxSkip(txSkip + txTake)}>Next →</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BillDetailModal billId={selectedBillId} onClose={() => setSelectedBillId(null)} />

      {walkInPopupOpen && (
        <div style={styles.popupOverlay} onClick={() => setWalkInPopupOpen(false)}>
          <div style={styles.popup} onClick={e => e.stopPropagation()}>
            <h4 style={styles.popupTitle}>Walk-in Customer</h4>
            {walkInError && <div style={styles.errorBanner}>{walkInError}</div>}

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Name *</label>
                <input style={styles.input} value={walkInForm.name} onChange={e => updateWalkInField('name', e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Contact Number *</label>
                <input style={styles.input} value={walkInForm.phone} onChange={e => updateWalkInField('phone', e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} value={walkInForm.email} onChange={e => updateWalkInField('email', e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>City</label>
                <input style={styles.input} value={walkInForm.city} onChange={e => updateWalkInField('city', e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Address</label>
                <input style={styles.input} value={walkInForm.address} onChange={e => updateWalkInField('address', e.target.value)} />
              </div>
            </div>

            {walkInPhoneMatches.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={styles.label}>Existing walk-ins with this number - use one instead of creating a duplicate:</div>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {walkInPhoneMatches.map(c => (
                      <tr key={c.id}>
                        <td style={styles.td}>{c.name}</td>
                        <td style={styles.td}>{c.phone}</td>
                        <td style={styles.td}>
                          <button style={styles.smallBtn} onClick={() => selectExistingWalkIn(c)}>Use this customer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={styles.inlineRow}>
              <button style={styles.saveBtn} disabled={walkInSaving} onClick={submitWalkIn}>
                {walkInSaving ? 'Saving...' : 'Create walk-in customer'}
              </button>
              <button style={styles.smallBtn} onClick={() => setWalkInPopupOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {quickAddProductOpen && (
        <div style={styles.popupOverlay} onClick={() => setQuickAddProductOpen(false)}>
          <div style={styles.popup} onClick={e => e.stopPropagation()}>
            <h4 style={styles.popupTitle}>Quick Add Product</h4>
            {quickAddProductError && <div style={styles.errorBanner}>{quickAddProductError}</div>}

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Product Code *</label>
                <input style={styles.input} value={quickAddProductForm.code} onChange={e => updateQuickAddProductField('code', e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Product Name *</label>
                <input style={styles.input} value={quickAddProductForm.name} onChange={e => updateQuickAddProductField('name', e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Category</label>
                <select style={styles.input} value={quickAddProductForm.categoryId} onChange={e => updateQuickAddProductField('categoryId', e.target.value)}>
                  <option value="">Select category...</option>
                  {getDistinctCategories().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Brand</label>
                <select style={styles.input} value={quickAddProductForm.brandId} onChange={e => updateQuickAddProductField('brandId', e.target.value)}>
                  <option value="">Select brand...</option>
                  {getDistinctBrands().map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Cost Price</label>
                <input style={styles.input} type="number" value={quickAddProductForm.costPrice} onChange={e => updateQuickAddProductField('costPrice', e.target.value)} />
              </div>
            </div>

            <div style={styles.inlineRow}>
              <button style={styles.saveBtn} disabled={quickAddProductSaving} onClick={submitQuickAddProduct}>
                {quickAddProductSaving ? 'Saving...' : 'Create product'}
              </button>
              <button style={styles.smallBtn} onClick={() => setQuickAddProductOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.card}>
        <div style={styles.toggleRow}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              checked={transactionType === 'SALE'}
              onChange={() => setTransactionType('SALE')}
            />
            Sale
          </label>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              checked={transactionType === 'RETURN'}
              onChange={() => setTransactionType('RETURN')}
            />
            Return
          </label>
        </div>

        <div style={styles.grid3}>
          <div style={styles.field}>
            <label style={styles.label}>Customer *</label>
            <div style={styles.inlineRow}>
              <select
                style={styles.input}
                value={customerId}
                onChange={e => handleCustomerChange(e.target.value)}
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerType})
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={styles.smallBtn}
                disabled={!customerId}
                onClick={openCustomerHistory}
                title="View last 10 purchases"
              >
                History
              </button>
              <button
                type="button"
                style={styles.smallBtn}
                disabled={!customerId}
                onClick={openCustomerLedger}
                title="Open full running-balance ledger in a new window"
              >
                📒
              </button>
              <button type="button" style={styles.smallBtn} onClick={openWalkInPopup} title="Add a walk-in customer">
                🚶 Walk-in
              </button>
            </div>
            {creditStatus && (
              <div style={{
                ...styles.creditIndicator,
                ...(creditStatus.availableCredit < 0
                  ? styles.creditIndicatorOver
                  : creditStatus.creditLimit > 0 && creditStatus.outstandingBalance / creditStatus.creditLimit >= 0.8
                    ? styles.creditIndicatorWarning
                    : styles.creditIndicatorOk),
              }}>
                Credit: {creditStatus.outstandingBalance} / {creditStatus.creditLimit} used
                {creditStatus.availableCredit < 0 && ' - OVER LIMIT'}
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Customer Contact Number *</label>
            <input
              style={styles.input}
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="required to save"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Salesman *</label>
            <select style={styles.input} value={salesmanId} onChange={e => setSalesmanId(e.target.value ? parseInt(e.target.value, 10) : '')}>
              <option value="">Select salesman...</option>
              {salesmen.map(s => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          {transactionType === 'RETURN' && (
            <div style={styles.field}>
              <label style={styles.label}>Return to Warehouse *</label>
              <select
                style={styles.input}
                value={returnWarehouseId}
                onChange={e => setReturnWarehouseId(e.target.value ? parseInt(e.target.value, 10) : '')}
              >
                <option value="">Select warehouse...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {transactionType === 'SALE' && (
            <div style={styles.field}>
              <label style={styles.label}>Channel</label>
              <select style={styles.input} value={channel} onChange={e => setChannel(e.target.value)}>
                <option value="COUNTER">Counter</option>
                <option value="PHONE">Phone</option>
                <option value="BULK">Bulk</option>
                <option value="WEBSITE">Website</option>
              </select>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Payment Method</label>
            <select style={styles.input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
              <option value="CREDIT">Credit</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Cashbook Number</label>
            <input
              style={styles.input}
              type="number"
              value={cashbookNumber}
              onChange={e => setCashbookNumber(e.target.value)}
              placeholder="entered manually"
            />
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.lineHeaderRow}>
          <h3 style={styles.h3}>Items</h3>
          <button type="button" style={styles.smallBtn} onClick={addLine}>+ Add line</button>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Product</th>
              {transactionType === 'SALE' && <th style={styles.th}>Warehouse</th>}
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Unit Price</th>
              <th style={styles.th}>Line Total</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} onFocus={() => setLastFocusedLineIndex(idx)}>
                <td style={{ ...styles.td, position: 'relative' as const }}>
                  <div style={styles.inlineRow}>
                    <button
                      type="button"
                      style={styles.input}
                      onFocus={() => setLastFocusedLineIndex(idx)}
                      onClick={() => {
                        setLastFocusedLineIndex(idx);
                        setProductFilters(emptyProductFilters());
                        setProductPicker({ lineIndex: idx });
                      }}
                      title="Click, or focus this field and press Esc twice, to open the product picker"
                    >
                      {line.productLabel || 'Select product...'}
                    </button>
                    <button
                      type="button"
                      style={styles.smallBtn}
                      disabled={!line.productId}
                      onClick={() => openProductHistory(line.productId)}
                      title="View last 5 vendor purchases"
                    >
                      Purchases
                    </button>
                  </div>

                  {productPicker?.lineIndex === idx && (
                    <div
                      ref={pickerRef}
                      style={{
                        ...styles.pickerAnchored,
                        top: mainPickerBox.rect.top,
                        left: mainPickerBox.rect.left,
                        width: mainPickerBox.rect.width,
                        height: mainPickerBox.rect.height,
                      }}
                      onKeyDown={handleProductPickerKeyDown}
                    >
                      <ResizeHandles startResize={mainPickerBox.startResize} />
                      <div style={styles.pickerHeaderRow}>
                        <input
                          ref={productSearchInputRef}
                          style={styles.input}
                          placeholder="Search by name or code..."
                          value={productFilters.text}
                          onChange={e => {
                            setProductFilters({ ...productFilters, text: e.target.value });
                            setHighlightedIndex(0);
                          }}
                        />
                        <button style={styles.smallBtn} onClick={() => setProductFilters(emptyProductFilters())}>Clear</button>
                        <button style={styles.smallBtn} onClick={openQuickAddProduct} title="Add a new product">+ Quick Add</button>
                        <button style={styles.smallBtn} onClick={() => { setProductPicker(null); setOpenFilterColumn(null); }}>✕</button>
                      </div>

                      <div style={styles.pickerTableScroll}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <ProductColumnHeader label="Product" field="name" sort={productSort} onSort={toggleProductSort} />
                              <ProductColumnHeader
                                label="Sale Price"
                                field="salePrice"
                                sort={productSort}
                                onSort={toggleProductSort}
                                filterKey="price"
                                openFilterColumn={openFilterColumn}
                                setOpenFilterColumn={setOpenFilterColumn}
                                filterContent={
                                  <RangeFilter
                                    min={productFilters.minPrice}
                                    max={productFilters.maxPrice}
                                    onChange={(min, max) => setProductFilters({ ...productFilters, minPrice: min, maxPrice: max })}
                                  />
                                }
                              />
                              <ProductColumnHeader
                                label="Category"
                                field="category"
                                sort={productSort}
                                onSort={toggleProductSort}
                                filterKey="category"
                                openFilterColumn={openFilterColumn}
                                setOpenFilterColumn={setOpenFilterColumn}
                                filterContent={
                                  <CheckboxFilter
                                    options={getDistinctCategories()}
                                    selected={productFilters.categoryIds}
                                    onToggle={id => setProductFilters({ ...productFilters, categoryIds: toggleSetMember(productFilters.categoryIds, id) })}
                                  />
                                }
                              />
                              <ProductColumnHeader
                                label="Total Stock"
                                field="totalStock"
                                sort={productSort}
                                onSort={toggleProductSort}
                                filterKey="stock"
                                openFilterColumn={openFilterColumn}
                                setOpenFilterColumn={setOpenFilterColumn}
                                filterContent={
                                  <RangeFilter
                                    min={productFilters.minStock}
                                    max={productFilters.maxStock}
                                    onChange={(min, max) => setProductFilters({ ...productFilters, minStock: min, maxStock: max })}
                                  />
                                }
                              />
                              <ProductColumnHeader
                                label="Brand"
                                field="brand"
                                sort={productSort}
                                onSort={toggleProductSort}
                                filterKey="brand"
                                openFilterColumn={openFilterColumn}
                                setOpenFilterColumn={setOpenFilterColumn}
                                filterContent={
                                  <CheckboxFilter
                                    options={getDistinctBrands()}
                                    selected={productFilters.brandIds}
                                    onToggle={id => setProductFilters({ ...productFilters, brandIds: toggleSetMember(productFilters.brandIds, id) })}
                                  />
                                }
                              />
                              <ProductColumnHeader
                                label="Commission"
                                field="commissionRate"
                                sort={productSort}
                                onSort={toggleProductSort}
                                filterKey="commission"
                                openFilterColumn={openFilterColumn}
                                setOpenFilterColumn={setOpenFilterColumn}
                                filterContent={
                                  <RangeFilter
                                    min={productFilters.minCommission}
                                    max={productFilters.maxCommission}
                                    onChange={(min, max) => setProductFilters({ ...productFilters, minCommission: min, maxCommission: max })}
                                  />
                                }
                              />
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredSortedProducts().map((p, rowIdx) => (
                              <tr
                                key={p.id}
                                ref={el => {
                                  if (rowIdx === highlightedIndex) el?.scrollIntoView({ block: 'nearest' });
                                }}
                                style={rowIdx === highlightedIndex ? styles.pickerRowHighlighted : styles.pickerRow}
                                onMouseEnter={() => setHighlightedIndex(rowIdx)}
                                onClick={() => handleLineProductPick(idx, p.id)}
                              >
                                <td style={styles.td}>{p.code} - {p.name}</td>
                                <td style={styles.td}>{p.salePrice != null ? `Rs ${p.salePrice.toLocaleString()}` : (p.cost_price ? `Rs ${p.cost_price.toLocaleString()}*` : '-')}</td>
                                <td style={styles.td}>{p.category?.name || '-'}</td>
                                <td style={styles.td}>{p.totalStock ?? 0}</td>
                                <td style={styles.td}>{p.brand?.name || '-'}</td>
                                <td style={styles.td}>{p.commissionRate != null ? `${p.commissionRate}%` : '-'}</td>
                              </tr>
                            ))}
                            {getFilteredSortedProducts().length === 0 && (
                              <tr><td style={styles.td} colSpan={6}>No products match these filters</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div style={styles.pickerHint}>↑↓ to navigate, Enter to select, Esc to close · drag any edge/corner to resize</div>
                    </div>
                  )}
                </td>
                {transactionType === 'SALE' && (
                  <td style={styles.td}>
                    <select
                      style={styles.input}
                      value={line.warehouseId}
                      onChange={e => updateLine(idx, 'warehouseId', e.target.value ? parseInt(e.target.value, 10) : '')}
                    >
                      <option value="">Select warehouse...</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td style={styles.td}>
                  <input
                    style={styles.inputNarrow}
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={e => updateLine(idx, 'quantity', e.target.value)}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.inputNarrow}
                    type="number"
                    min={0}
                    value={line.unitPrice}
                    onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                  />
                </td>
                <td style={styles.td}>
                  Rs {((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)).toLocaleString()}
                </td>
                <td style={styles.td}>
                  <button type="button" style={styles.dangerBtn} onClick={() => removeLine(idx)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Live preview panels - update as the highlight moves through the
            product picker above. Each is independently draggable/resizable
            and remembers its own position/size (localStorage), per line-item
            product currently highlighted rather than only after selection. */}
        <FloatingPanel
          storageKey="invoicePicker:stockPreview"
          defaultRect={{ top: 120, left: 900, width: 300, height: 220 }}
          title="Stock by warehouse"
          visible={!!productPicker}
          panelRef={stockPanelRef}
          headerExtra={
            <label style={styles.toggleSwitch} onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={stockAutoSearch} onChange={toggleStockAutoSearch} />
              auto-search
            </label>
          }
        >
          {!stockAutoSearch && <div style={styles.previewEmpty}>Auto-search paused</div>}
          {stockAutoSearch && previewStock.length === 0 && <div style={styles.previewEmpty}>Arrow through products to preview stock</div>}
          {stockAutoSearch &&
            previewStock.map(row => (
              <div key={row.warehouseId} style={styles.previewRow}>
                {row.warehouseName}: {row.available} available ({row.physical_on_hand} on hand, {row.reserved} reserved)
              </div>
            ))}
        </FloatingPanel>

        <FloatingPanel
          storageKey="invoicePicker:vendorHistoryPreview"
          defaultRect={{ top: 360, left: 900, width: 300, height: 220 }}
          title="Vendor purchase history"
          visible={!!productPicker}
          panelRef={vendorHistoryPanelRef}
          headerExtra={
            <label style={styles.toggleSwitch} onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={vendorHistoryAutoSearch} onChange={toggleVendorHistoryAutoSearch} />
              auto-search
            </label>
          }
        >
          {!vendorHistoryAutoSearch && <div style={styles.previewEmpty}>Auto-search paused</div>}
          {vendorHistoryAutoSearch && previewVendorHistory.length === 0 && <div style={styles.previewEmpty}>No prior vendor purchases</div>}
          {vendorHistoryAutoSearch &&
            previewVendorHistory.map((h, i) => (
              <div key={i} style={styles.previewRow}>
                {h.vendor} · {new Date(h.poDate).toLocaleDateString()} · qty {h.quantity} @ Rs {h.costPrice.toLocaleString()}
              </div>
            ))}
        </FloatingPanel>

        <FloatingPanel
          storageKey="invoicePicker:customerHistoryPreview"
          defaultRect={{ top: 600, left: 900, width: 300, height: 220 }}
          title="Customer's history with this item"
          visible={!!productPicker}
          panelRef={customerHistoryPanelRef}
          headerExtra={
            <label style={styles.toggleSwitch} onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={customerHistoryAutoSearch} onChange={toggleCustomerHistoryAutoSearch} />
              auto-search
            </label>
          }
        >
          {!customerHistoryAutoSearch && <div style={styles.previewEmpty}>Auto-search paused</div>}
          {customerHistoryAutoSearch && !customerId && <div style={styles.previewEmpty}>Select a customer first</div>}
          {customerHistoryAutoSearch && customerId && previewCustomerHistory.length === 0 && (
            <div style={styles.previewEmpty}>This customer hasn't bought this item before</div>
          )}
          {customerHistoryAutoSearch &&
            customerId &&
            previewCustomerHistory.map((h, i) => (
              <div key={i} style={styles.previewRow}>
                {h.billNumber} · {new Date(h.date).toLocaleDateString()} · qty {h.quantity} @ Rs {h.unitPrice.toLocaleString()}
              </div>
            ))}
        </FloatingPanel>

        {/* Popup 1: warehouse + quantity picker */}
        {stockPopup && (
          <div style={styles.popupOverlay} onClick={() => setStockPopup(null)}>
            <div style={styles.popup} onClick={e => e.stopPropagation()}>
              <h4 style={styles.popupTitle}>Stock by warehouse</h4>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Warehouse</th>
                    <th style={styles.th}>Physical</th>
                    <th style={styles.th}>Reserved</th>
                    <th style={styles.th}>Available</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {stockPopup.rows.map(row => (
                    <tr key={row.warehouseId}>
                      <td style={styles.td}>{row.warehouseName}</td>
                      <td style={styles.td}>{row.physical_on_hand}</td>
                      <td style={styles.td}>{row.reserved}</td>
                      <td style={styles.td}>{row.available}</td>
                      <td style={styles.td}>
                        <button style={styles.smallBtn} onClick={() => pickWarehouseFromPopup(row.warehouseId)}>
                          Use this warehouse
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stockPopup.rows.length === 0 && (
                    <tr><td style={styles.td} colSpan={5}>No stock recorded for this product yet</td></tr>
                  )}
                </tbody>
              </table>
              <button style={styles.smallBtn} onClick={() => setStockPopup(null)}>Close</button>
            </div>
          </div>
        )}

        {/* Popup 2: customer's last 10 purchases */}
        {historyPopup && (
          <div style={styles.popupOverlay} onClick={() => setHistoryPopup(null)}>
            <div style={styles.popup} onClick={e => e.stopPropagation()}>
              <h4 style={styles.popupTitle}>Customer's last purchases</h4>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Bill #</th>
                    <th style={styles.th}>Items</th>
                    <th style={styles.th}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {historyPopup.map((h, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{new Date(h.date).toLocaleDateString()}</td>
                      <td style={styles.td}>{h.billNumber}</td>
                      <td style={styles.td}>{h.items.map(it => `${it.name} x${it.quantity}`).join(', ')}</td>
                      <td style={styles.td}>Rs {h.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {historyPopup.length === 0 && (
                    <tr><td style={styles.td} colSpan={4}>No previous purchases</td></tr>
                  )}
                </tbody>
              </table>
              <button style={styles.smallBtn} onClick={() => setHistoryPopup(null)}>Close</button>
            </div>
          </div>
        )}

        {/* Popup 3: product's last 5 vendor purchases */}
        {purchasePopup && (
          <div style={styles.popupOverlay} onClick={() => setPurchasePopup(null)}>
            <div style={styles.popup} onClick={e => e.stopPropagation()}>
              <h4 style={styles.popupTitle}>Product's last vendor purchases</h4>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Vendor</th>
                    <th style={styles.th}>PO #</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Cost Price</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasePopup.map((p, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{p.vendor}</td>
                      <td style={styles.td}>{p.poNumber}</td>
                      <td style={styles.td}>{new Date(p.poDate).toLocaleDateString()}</td>
                      <td style={styles.td}>{p.quantity}</td>
                      <td style={styles.td}>Rs {p.costPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                  {purchasePopup.length === 0 && (
                    <tr><td style={styles.td} colSpan={5}>No previous vendor purchases</td></tr>
                  )}
                </tbody>
              </table>
              <button style={styles.smallBtn} onClick={() => setPurchasePopup(null)}>Close</button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.grid3}>
          <div style={styles.field}>
            <label style={styles.label}>Discount</label>
            <div style={styles.inlineRow}>
              <select
                style={styles.inputNarrow}
                value={discountType}
                onChange={e => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
              >
                <option value="PERCENTAGE">%</option>
                <option value="FIXED">Rs (fixed)</option>
              </select>
              <input
                style={styles.input}
                type="number"
                min={0}
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Delivery Charges</label>
            <input
              style={styles.input}
              type="number"
              min={0}
              value={deliveryCharges}
              onChange={e => setDeliveryCharges(e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Remarks</label>
            <input style={styles.input} value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        </div>

        <div style={styles.totalsRow}>
          <span>Subtotal: Rs {subtotal.toLocaleString()}</span>
          <span>Discount: Rs {discountAmountPreview.toLocaleString()}</span>
          <span>Delivery: Rs {deliveryNum.toLocaleString()}</span>
          <strong>Total: Rs {totalPreview.toLocaleString()}</strong>
        </div>

        <div style={styles.inlineRow}>
          <button style={styles.saveBtn} disabled={saving} onClick={() => handleSave('ask')}>
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
          <span style={styles.shortcutHint}>Ctrl+Shift+S to save &amp; ask about printing · Ctrl+S to save &amp; print gate passes directly</span>
        </div>
      </div>

      {/* "Print gate pass(es)?" confirmation - Ctrl+Shift+S / Save button path */}
      {confirmGatePassPrint && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <h4 style={styles.popupTitle}>Print gate pass{gatePassQueue.length > 1 ? 'es' : ''}?</h4>
            <p>
              {gatePassQueue.length} gate pass{gatePassQueue.length > 1 ? 'es were' : ' was'} generated for{' '}
              {savedInvoice?.bill_number}.
            </p>
            <div style={styles.inlineRow}>
              <button style={styles.saveBtn} onClick={() => confirmPrintGatePasses(true)}>Yes, print</button>
              <button style={styles.smallBtn} onClick={() => confirmPrintGatePasses(false)}>No, view invoice instead</button>
            </div>
          </div>
        </div>
      )}

      {/* Sequential "print next gate pass?" stepper */}
      {printingGatePass && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <h4 style={styles.popupTitle}>
              Print gate pass {gatePassQueueIndex + 1} of {gatePassQueue.length}
            </h4>
            <p>{printingGatePass.gate_pass_number} — {printingGatePass.warehouse?.name}</p>
            <label style={styles.copiesLabel}>
              Copies:{' '}
              <select
                value={gatePassCopies}
                onChange={e => setGatePassCopies(parseInt(e.target.value, 10))}
                style={styles.copiesSelect}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <div style={styles.inlineRow}>
              <button style={styles.saveBtn} onClick={doPrintGatePass} disabled={printingGatePassBusy}>
                {printingGatePassBusy ? 'Printing...' : 'Print this gate pass'}
              </button>
              <button style={styles.smallBtn} onClick={afterGatePassPrint} disabled={printingGatePassBusy}>Skip</button>
            </div>
          </div>

          {/* Print-only content for this gate pass - hidden on screen, shown by @media print */}
          <div id="print-area" style={styles.printAreaHidden}>
            <GatePassPrintDocument gatePass={printingGatePass} copies={gatePassCopies} isDuplicate={gatePassIsDuplicate} />
          </div>
        </div>
      )}

      {/* Invoice print view */}
      {printingInvoice && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <h4 style={styles.popupTitle}>Print invoice {printingInvoice.bill_number}</h4>
            <div style={styles.inlineRow}>
              <button style={styles.saveBtn} onClick={doPrint}>Print invoice</button>
              <button style={styles.smallBtn} onClick={downloadInvoicePdf} disabled={downloadingInvoicePdf}>
                {downloadingInvoicePdf ? 'Downloading...' : 'Download PDF'}
              </button>
              <button style={styles.smallBtn} onClick={() => sendInvoiceOnWhatsApp()}>Send on WhatsApp</button>
              <button style={styles.smallBtn} onClick={sendInvoiceViaEmail} disabled={sendingInvoiceEmail}>
                {sendingInvoiceEmail ? 'Sending...' : 'Email invoice'}
              </button>
              <button style={styles.smallBtn} onClick={() => setPrintingInvoice(null)}>Close (Esc)</button>
            </div>

            {whatsappPhonePrompt && (
              <div style={styles.inlineRow}>
                <input
                  style={styles.input}
                  placeholder="Customer WhatsApp number"
                  value={whatsappPhoneInput}
                  onChange={e => setWhatsappPhoneInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmWhatsappPhone(); }}
                  autoFocus
                />
                <button style={styles.saveBtn} onClick={confirmWhatsappPhone}>Open WhatsApp</button>
                <button style={styles.smallBtn} onClick={() => setWhatsappPhonePrompt(false)}>Cancel</button>
              </div>
            )}

            {invoiceEmailStatus && <p>{invoiceEmailStatus}</p>}
          </div>

          <div id="print-area" style={styles.printAreaHidden}>
            <InvoicePrintDocument invoice={printingInvoice} />
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
        }
      `}</style>
    </div>
  );
}

function ProductColumnHeader({
  label,
  field,
  sort,
  onSort,
  filterKey,
  openFilterColumn,
  setOpenFilterColumn,
  filterContent,
}: {
  label: string;
  field: ProductSortField;
  sort: { field: ProductSortField; direction: 'asc' | 'desc' };
  onSort: (field: ProductSortField) => void;
  filterKey?: string;
  openFilterColumn?: string | null;
  setOpenFilterColumn?: (key: string | null) => void;
  filterContent?: React.ReactNode;
}) {
  const isSorted = sort.field === field;
  const isFilterOpen = filterKey && openFilterColumn === filterKey;
  return (
    <th style={styles.th}>
      <div style={styles.pickerHeaderCell}>
        <span style={styles.pickerSortLabel} onClick={() => onSort(field)}>
          {label} {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
        </span>
        {filterKey && (
          <span
            style={styles.pickerFilterIcon}
            onClick={() => setOpenFilterColumn?.(isFilterOpen ? null : filterKey)}
            title="Filter this column"
          >
            ⏷
          </span>
        )}
      </div>
      {isFilterOpen && (
        <div style={styles.pickerFilterDropdown} onClick={e => e.stopPropagation()}>
          {filterContent}
        </div>
      )}
    </th>
  );
}

function RangeFilter({
  min,
  max,
  onChange,
}: {
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
}) {
  return (
    <div style={styles.rangeFilter}>
      <input style={styles.inputNarrow} type="number" placeholder="Min" value={min} onChange={e => onChange(e.target.value, max)} />
      <input style={styles.inputNarrow} type="number" placeholder="Max" value={max} onChange={e => onChange(min, e.target.value)} />
    </div>
  );
}

function CheckboxFilter({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ id: number; name: string }>;
  selected: Set<number>;
  onToggle: (id: number) => void;
}) {
  return (
    <div style={styles.checkboxFilter}>
      {options.length === 0 && <div style={{ fontSize: '12px', color: '#888' }}>No values</div>}
      {options.map(opt => (
        <label key={opt.id} style={styles.checkboxFilterRow}>
          <input type="checkbox" checked={selected.has(opt.id)} onChange={() => onToggle(opt.id)} />
          {opt.name}
        </label>
      ))}
    </div>
  );
}

const GATE_PASS_COPY_HEADINGS = ['WAREHOUSE COPY', 'OFFICE COPY', 'DRIVER COPY'];

function GatePassPrintDocument({
  gatePass,
  copies = 2,
  isDuplicate = false,
}: {
  gatePass: GatePassView;
  copies?: number;
  isDuplicate?: boolean;
}) {
  const Copy = ({ heading }: { heading: string }) => (
    <div style={printStyles.gatePassCopy}>
      {isDuplicate && <div style={printStyles.duplicateWatermark}>DUPLICATE</div>}
      <h3 style={printStyles.gatePassHeading}>{heading}</h3>
      <p style={printStyles.gatePassMeta}>Gate Pass #: {gatePass.gate_pass_number}</p>
      <p style={printStyles.gatePassMeta}>Warehouse: {gatePass.warehouse?.name}</p>
      <table style={printStyles.gatePassTable}>
        <thead>
          <tr>
            <th style={printStyles.gpTh}>Product</th>
            <th style={printStyles.gpTh}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {gatePass.items.map((item, i) => (
            <tr key={i}>
              <td style={printStyles.gpTd}>{item.billLine?.product?.name || item.productId}</td>
              <td style={printStyles.gpTd}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const headings = GATE_PASS_COPY_HEADINGS.slice(0, Math.max(1, Math.min(copies, 3)));

  return (
    <div>
      {headings.map((heading, i) => (
        <React.Fragment key={heading}>
          <Copy heading={heading} />
          {i < headings.length - 1 && <div style={printStyles.pageBreak} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function InvoicePrintDocument({ invoice }: { invoice: SavedInvoice }) {
  return (
    <div style={printStyles.invoiceDoc}>
      <h2 style={printStyles.invoiceHeading}>INVOICE</h2>
      <p>Invoice #: {invoice.bill_number}</p>
      <p>Date: {invoice.bill_date ? new Date(invoice.bill_date).toLocaleDateString() : ''}</p>
      <p>Customer: {invoice.customer?.name} ({invoice.customer?.phone})</p>
      <table style={printStyles.gatePassTable}>
        <thead>
          <tr>
            <th style={printStyles.gpTh}>Product</th>
            <th style={printStyles.gpTh}>Qty</th>
            <th style={printStyles.gpTh}>Unit Price</th>
            <th style={printStyles.gpTh}>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.lines || []).map((line, i) => (
            <tr key={i}>
              <td style={printStyles.gpTd}>{line.product?.name}</td>
              <td style={printStyles.gpTd}>{line.quantity}</td>
              <td style={printStyles.gpTd}>{line.unit_price}</td>
              <td style={printStyles.gpTd}>{line.line_total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={printStyles.invoiceTotal}>Total: Rs {invoice.total_amount?.toLocaleString()}</p>

      <style>{`@page { size: A5; margin: 12mm; }`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '1100px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  h2: { margin: 0 },
  h3: { margin: 0, fontSize: '16px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  savedBanner: { background: '#d4edda', color: '#155724', padding: '8px 14px', borderRadius: '6px', fontSize: '14px' },
  txSearchWrapper: { position: 'relative' as const },
  txSearchTrigger: { padding: '8px 14px', border: '1px solid #667eea', color: '#667eea', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  txSearchPopover: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    zIndex: 1200,
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    padding: '14px',
    width: '760px',
    maxWidth: '90vw',
  },
  txResultsScroll: { maxHeight: '320px', overflow: 'auto', border: '1px solid #eee', borderRadius: '6px' },
  txPaginationRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' },
  card: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '18px', marginBottom: '16px' },
  toggleRow: { display: 'flex', gap: '20px', marginBottom: '14px' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#555' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '100%' },
  inputNarrow: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '90px' },
  inlineRow: { display: 'flex', gap: '6px', alignItems: 'center' },
  lineHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px', borderBottom: '2px solid #eee', fontSize: '12px', color: '#666', position: 'relative' as const },
  td: { padding: '8px', borderBottom: '1px solid #eee', fontSize: '14px' },
  smallBtn: { padding: '6px 10px', fontSize: '12px', border: '1px solid #667eea', color: '#667eea', background: 'white', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' },
  dangerBtn: { padding: '4px 8px', border: 'none', background: '#f8d7da', color: '#721c24', borderRadius: '4px', cursor: 'pointer' },
  saveBtn: { marginTop: '14px', padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' },
  shortcutHint: { marginTop: '14px', fontSize: '11px', color: '#888' },
  totalsRow: { display: 'flex', gap: '20px', justifyContent: 'flex-end', marginTop: '16px', fontSize: '14px', color: '#333' },
  popupOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  popup: { background: 'white', borderRadius: '8px', padding: '20px', width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' },
  popupTitle: { marginTop: 0 },
  copiesLabel: { display: 'block', marginTop: '10px', fontSize: '13px', color: '#555' },
  copiesSelect: { marginLeft: '6px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' },
  creditIndicator: { marginTop: '6px', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  creditIndicatorOk: { background: '#e6f4ea', color: '#1e7e34' },
  creditIndicatorWarning: { background: '#fff3cd', color: '#856404' },
  creditIndicatorOver: { background: '#f8d7da', color: '#721c24' },
  printAreaHidden: { display: 'none' },
  pickerAnchored: {
    position: 'absolute',
    zIndex: 1200,
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #ccc',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'auto',
  },
  pickerHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
  pickerTableScroll: { overflowY: 'auto', overflowX: 'auto', flex: 1, border: '1px solid #eee', borderRadius: '6px' },
  pickerHint: { fontSize: '10px', color: '#999' },
  pickerRow: { cursor: 'pointer' },
  pickerRowHighlighted: { cursor: 'pointer', background: '#eef0fe' },
  pickerHeaderCell: { display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' },
  pickerSortLabel: { cursor: 'pointer', userSelect: 'none' as const },
  pickerFilterIcon: { cursor: 'pointer', color: '#667eea', fontSize: '11px' },
  pickerFilterDropdown: { position: 'absolute', marginTop: '4px', background: 'white', border: '1px solid #ccc', borderRadius: '6px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1100, minWidth: '160px' },
  rangeFilter: { display: 'flex', gap: '6px' },
  checkboxFilter: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' },
  checkboxFilterRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' },
  floatingPanel: {
    position: 'fixed',
    zIndex: 1300,
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #ccc',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },
  floatingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: '#f5f6fb',
    borderBottom: '1px solid #eee',
    cursor: 'move',
    userSelect: 'none' as const,
    flexShrink: 0,
  },
  floatingTitle: { fontSize: '12px', fontWeight: 700, color: '#444' },
  floatingCloseBtn: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#888' },
  floatingBody: { padding: '8px 10px', overflow: 'auto', flex: 1, fontSize: '12px' },
  toggleSwitch: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#666', cursor: 'pointer' },
  previewRow: { padding: '4px 0', borderBottom: '1px solid #f0f0f0' },
  previewEmpty: { color: '#999', fontStyle: 'italic' as const },
};

const printStyles: Record<string, React.CSSProperties> = {
  gatePassCopy: { width: '78mm', fontFamily: 'monospace', fontSize: '12px', position: 'relative' },
  duplicateWatermark: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    fontSize: '28px',
    fontWeight: 800,
    color: 'rgba(200, 0, 0, 0.35)',
    border: '3px solid rgba(200, 0, 0, 0.35)',
    padding: '4px 16px',
    letterSpacing: '4px',
    pointerEvents: 'none',
  },
  gatePassHeading: { textAlign: 'center', margin: '0 0 8px' },
  gatePassMeta: { margin: '2px 0' },
  gatePassTable: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  gpTh: { textAlign: 'left', borderBottom: '1px solid #000', padding: '4px 2px' },
  gpTd: { padding: '4px 2px', borderBottom: '1px dashed #999' },
  pageBreak: { pageBreakAfter: 'always' as any, height: 0 },
  invoiceDoc: { width: '100%', fontFamily: 'Georgia, serif' },
  invoiceHeading: { textAlign: 'center' },
  invoiceTotal: { textAlign: 'right', fontWeight: 700, marginTop: '12px' },
};

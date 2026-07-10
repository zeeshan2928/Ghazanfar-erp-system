import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { apiClient } from '../../services/api';

interface InventorySnapshot {
  snapshot: {
    totalProducts: number;
    totalPhysicalStock: number;
    totalReservedStock: number;
    totalAvailableStock: number;
    byWarehouse: Record<string, { warehouseName: string; physical: number; reserved: number; available: number }>;
  };
}

interface WarehousePerformance {
  warehouseId: number;
  warehouseName: string;
  gatePasses: { total: number; confirmed: number; fulfillmentRate: number };
  inventory: { itemsShipped: number; itemsReceived: number; netMovement: number };
}

interface StockMovementProduct {
  productId: number;
  productName: string;
  productCode: string;
  totalQuantity: number;
}

interface WarehouseTransferAnalytics {
  summary: {
    totalTransfers: number;
    completed: number;
    pending: number;
    inTransit: number;
    rejected: number;
    completionRate: number;
  };
  byStatus: Record<string, number>;
}

interface LowStockAlert {
  productId: number;
  productName?: string;
  shortage: number;
  primaryVendorId?: number | null;
}

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  RECEIVED: '#16a34a',
  PENDING: '#f59e0b',
  IN_TRANSIT: '#2563eb',
  REJECTED: '#dc2626',
};

export function InventoryDashboardScreen() {
  const [days, setDays] = useState(30);
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [warehousePerf, setWarehousePerf] = useState<WarehousePerformance[]>([]);
  const [stockMovement, setStockMovement] = useState<StockMovementProduct[]>([]);
  const [transferAnalytics, setTransferAnalytics] = useState<WarehouseTransferAnalytics | null>(null);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [snapResult, perfResult, movementResult, transferResult, lowStockResult] = await Promise.allSettled([
        apiClient.getInventorySnapshot(),
        apiClient.getWarehousePerformance(days),
        apiClient.getStockMovement(days),
        apiClient.getWarehouseTransferAnalytics(days),
        apiClient.getLowStockAlerts(),
      ]);

      if (snapResult.status === 'fulfilled') setSnapshot(snapResult.value);
      if (perfResult.status === 'fulfilled') setWarehousePerf(perfResult.value || []);
      if (movementResult.status === 'fulfilled') setStockMovement(movementResult.value?.movements || []);
      if (transferResult.status === 'fulfilled') setTransferAnalytics(transferResult.value);
      if (lowStockResult.status === 'fulfilled') setLowStock(lowStockResult.value?.alerts || []);
    } catch (err) {
      setError('Failed to load inventory dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const warehouseChartData = snapshot
    ? Object.values(snapshot.snapshot.byWarehouse).map(w => ({
        name: w.warehouseName,
        Physical: w.physical,
        Reserved: w.reserved,
        Available: w.available,
      }))
    : [];

  const topMovingProducts = stockMovement
    .slice()
    .sort((a, b) => Math.abs(b.totalQuantity) - Math.abs(a.totalQuantity))
    .slice(0, 10)
    .map(p => ({ name: `${p.productCode} - ${p.productName}`, Units: Math.abs(p.totalQuantity) }));

  const warehouseFulfillmentData = warehousePerf.map(w => ({
    name: w.warehouseName,
    'Fulfillment %': w.gatePasses.fulfillmentRate,
  }));

  const transferStatusData = transferAnalytics
    ? Object.entries(transferAnalytics.byStatus).map(([status, count]) => ({ name: status, value: count }))
    : [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Inventory Dashboard</h2>
        <div style={styles.controls}>
          <label style={styles.controlLabel}>Period
            <select style={styles.select} value={days} onChange={e => setDays(parseInt(e.target.value, 10))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
          <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.kpiGrid}>
        <KPICard label="Distinct Products" value={snapshot?.snapshot.totalProducts} isCount />
        <KPICard label="Physical Stock (units)" value={snapshot?.snapshot.totalPhysicalStock} isCount />
        <KPICard label="Reserved (units)" value={snapshot?.snapshot.totalReservedStock} isCount />
        <KPICard label="Available (units)" value={snapshot?.snapshot.totalAvailableStock} isCount />
        <KPICard label="Low Stock Alerts" value={lowStock.length} isCount highlight={lowStock.length > 0 ? false : undefined} />
        <KPICard label="Transfers In Progress" value={transferAnalytics ? transferAnalytics.summary.pending + transferAnalytics.summary.inTransit : undefined} isCount />
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Stock by Warehouse</h4>
        {warehouseChartData.length === 0 ? <p>No inventory data.</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={warehouseChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Physical" fill="#94a3b8" />
              <Bar dataKey="Reserved" fill="#f59e0b" />
              <Bar dataKey="Available" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Top Moving Products (last {days} days)</h4>
          {topMovingProducts.length === 0 ? <p>No sales movement in this period.</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMovingProducts} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Units" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Warehouse Transfer Status (last {days} days)</h4>
          {transferStatusData.length === 0 || transferAnalytics?.summary.totalTransfers === 0 ? (
            <p>No transfers in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={transferStatusData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {transferStatusData.map(entry => (
                    <Cell key={entry.name} fill={TRANSFER_STATUS_COLORS[entry.name] || '#999'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Warehouse Fulfillment Rate (last {days} days)</h4>
        {warehouseFulfillmentData.length === 0 ? <p>No gate-pass activity in this period.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={warehouseFulfillmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="Fulfillment %" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Low Stock Items ({lowStock.length})</h4>
        {lowStock.length === 0 ? <p>Nothing below reorder threshold.</p> : (
          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}>Product</th><th style={styles.th}>Shortage</th><th style={styles.th}>Vendor Assigned</th></tr>
            </thead>
            <tbody>
              {lowStock.slice(0, 15).map(a => (
                <tr key={a.productId}>
                  <td style={styles.td}>{a.productName || `#${a.productId}`}</td>
                  <td style={styles.td}>{a.shortage}</td>
                  <td style={styles.td}>{a.primaryVendorId ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, isCount, highlight }: { label: string; value?: number; isCount?: boolean; highlight?: boolean }) {
  const display = value === undefined || value === null ? '—' : isCount ? value.toLocaleString() : value.toLocaleString();
  return (
    <div style={{ ...styles.kpiCard, ...(highlight === false ? styles.kpiCardNegative : {}) }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{display}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  h2: { margin: 0 },
  controls: { display: 'flex', gap: '12px', alignItems: 'flex-end' },
  controlLabel: { display: 'flex', flexDirection: 'column', fontSize: '12px', color: '#555', gap: '2px' },
  select: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' },
  refreshBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' },
  kpiCard: { background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '14px' },
  kpiCardNegative: { background: '#fff3cd', borderColor: '#856404' },
  kpiLabel: { fontSize: '12px', color: '#666', marginBottom: '4px' },
  kpiValue: { fontSize: '20px', fontWeight: 700 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  chartTitle: { margin: '0 0 8px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '13px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '8px', fontSize: '14px' },
};

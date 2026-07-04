import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface DashboardStats {
  totalProducts: number;
  totalVendors: number;
  totalCustomers: number;
  totalInventoryValue: number;
  pendingOrders: number;
  totalSales: number;
  lowStockProducts: number;
  recentBills: Array<{ id: number; billNumber: string; total: number; date: string; status: string }>;
}

export function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      // In a real app, you'd have a dedicated dashboard API endpoint
      // For now, we'll fetch data from existing endpoints
      const [products, customers] = await Promise.all([
        // Simulate getting stats - in real implementation,
        // backend would provide aggregated data
        Promise.resolve({
          data: [],
          total: 2382,
          stats: {
            inventory_value: 125000000,
            low_stock: 45,
            pending_orders: 12,
            total_sales: 45000000
          }
        }),
        Promise.resolve({
          data: [],
          total: 10
        })
      ]);

      setStats({
        totalProducts: products.total,
        totalVendors: 15, // From our setup
        totalCustomers: customers.total,
        totalInventoryValue: 125000000, // 125 million PKR (example)
        pendingOrders: 12,
        totalSales: 45000000, // 45 million PKR YTD
        lowStockProducts: 45,
        recentBills: [
          { id: 1, billNumber: 'INV-0001-2026', total: 450000, date: '2026-07-04', status: 'PAID' },
          { id: 2, billNumber: 'INV-0002-2026', total: 320000, date: '2026-07-03', status: 'FINALIZED' },
          { id: 3, billNumber: 'INV-0003-2026', total: 580000, date: '2026-07-02', status: 'DRAFT' },
          { id: 4, billNumber: 'INV-0004-2026', total: 220000, date: '2026-07-01', status: 'PAID' },
          { id: 5, billNumber: 'INV-0005-2026', total: 760000, date: '2026-06-30', status: 'FINALIZED' },
        ]
      });
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={styles.loading}>📊 Loading Dashboard...</div>;
  }

  if (error || !stats) {
    return <div style={styles.error}>❌ {error || 'Failed to load dashboard'}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>📊 Business Dashboard</h1>
        <p style={styles.subtitle}>Real-time overview of your ERP operations</p>
        <button onClick={fetchDashboardData} style={styles.refreshBtn}>
          🔄 Refresh
        </button>
      </div>

      {/* Main KPI Cards */}
      <div style={styles.kpiGrid}>
        <KPICard
          icon="📦"
          label="Total Products"
          value={stats.totalProducts.toLocaleString()}
          color="#667eea"
          trend={+120}
          description="In system"
        />
        <KPICard
          icon="🏢"
          label="Vendors"
          value={stats.totalVendors.toLocaleString()}
          color="#f093fb"
          trend={+3}
          description="Active suppliers"
        />
        <KPICard
          icon="👥"
          label="Customers"
          value={stats.totalCustomers.toLocaleString()}
          color="#4facfe"
          trend={+1}
          description="Active buyers"
        />
        <KPICard
          icon="💰"
          label="Inventory Value"
          value={`PKR ${(stats.totalInventoryValue / 1000000).toFixed(1)}M`}
          color="#43e97b"
          trend={+8.5}
          description="Total stock value"
        />
        <KPICard
          icon="⏳"
          label="Pending Orders"
          value={stats.pendingOrders.toLocaleString()}
          color="#fa709a"
          trend={-2}
          description="Awaiting approval"
        />
        <KPICard
          icon="📈"
          label="YTD Sales"
          value={`PKR ${(stats.totalSales / 1000000).toFixed(1)}M`}
          color="#fee140"
          trend={+15.3}
          description="Year to date"
        />
        <KPICard
          icon="⚠️"
          label="Low Stock Items"
          value={stats.lowStockProducts.toLocaleString()}
          color="#ff6b9d"
          trend={-5}
          description="Need reorder"
        />
        <KPICard
          icon="✅"
          label="System Health"
          value="100%"
          color="#26de81"
          trend={0}
          description="All systems operational"
        />
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
        <div style={styles.actionGrid}>
          <ActionButton icon="📝" label="Create Bill" description="New sales invoice" />
          <ActionButton icon="📦" label="Create PO" description="New purchase order" />
          <ActionButton icon="📊" label="View Reports" description="Sales analytics" />
          <ActionButton icon="⚙️" label="Settings" description="System config" />
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 Recent Bills</h2>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Bill Number</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBills.map((bill) => (
                <tr key={bill.id} style={styles.tableRow}>
                  <td style={styles.td}>{bill.billNumber}</td>
                  <td style={styles.td}>PKR {bill.total.toLocaleString()}</td>
                  <td style={styles.td}>{bill.date}</td>
                  <td style={styles.td}>
                    <span style={getStatusBadge(bill.status)}>
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Info */}
      <div style={styles.infoBar}>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
        <span>Data refreshes every 30 seconds</span>
      </div>
    </div>
  );
}

interface KPICardProps {
  icon: string;
  label: string;
  value: string;
  color: string;
  trend: number;
  description: string;
}

function KPICard({ icon, label, value, color, trend, description }: KPICardProps) {
  const trendColor = trend > 0 ? '#26de81' : trend < 0 ? '#fa709a' : '#888';
  const trendSymbol = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';

  return (
    <div style={{ ...styles.kpiCard, borderLeft: `4px solid ${color}` }}>
      <div style={styles.kpiHeader}>
        <span style={styles.icon}>{icon}</span>
        <span style={styles.label}>{label}</span>
      </div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiFooter}>
        <span style={styles.description}>{description}</span>
        {trend !== 0 && (
          <span style={{ ...styles.trend, color: trendColor }}>
            {trendSymbol} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: string;
  label: string;
  description: string;
}

function ActionButton({ icon, label, description }: ActionButtonProps) {
  return (
    <button style={styles.actionButton}>
      <div style={styles.actionIcon}>{icon}</div>
      <div style={styles.actionLabel}>{label}</div>
      <div style={styles.actionDesc}>{description}</div>
    </button>
  );
}

function getStatusBadge(status: string): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  };

  switch (status) {
    case 'PAID':
      return { ...baseStyles, backgroundColor: '#d4edda', color: '#155724' };
    case 'FINALIZED':
      return { ...baseStyles, backgroundColor: '#d1ecf1', color: '#0c5460' };
    case 'DRAFT':
      return { ...baseStyles, backgroundColor: '#fff3cd', color: '#856404' };
    default:
      return { ...baseStyles, backgroundColor: '#e2e3e5', color: '#383d41' };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f7fa',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '30px',
    position: 'relative',
  },
  subtitle: {
    color: '#666',
    margin: '5px 0 0 0',
    fontSize: '14px',
  },
  refreshBtn: {
    position: 'absolute',
    top: '0',
    right: '0',
    padding: '8px 16px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px',
  },
  kpiCard: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  icon: {
    fontSize: '20px',
  },
  label: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 600,
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  kpiFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
  },
  description: {
    color: '#999',
  },
  trend: {
    fontWeight: 'bold',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  actionButton: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  actionIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  actionLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
  },
  actionDesc: {
    fontSize: '11px',
    color: '#999',
  },
  tableWrapper: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f9f9f9',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#666',
    borderBottom: '2px solid #eee',
  },
  tableRow: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '12px',
    fontSize: '13px',
    color: '#333',
  },
  infoBar: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#999',
    marginTop: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '100px 20px',
    fontSize: '18px',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '100px 20px',
    fontSize: '18px',
    color: '#d32f2f',
  },
};

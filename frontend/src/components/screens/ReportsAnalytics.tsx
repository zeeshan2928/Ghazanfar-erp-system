import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface ReportMetrics {
  totalSales?: number;
  totalPurchases?: number;
  totalCustomers?: number;
  totalVendors?: number;
  averageOrderValue?: number;
  topCustomers?: Array<{ name: string; sales: number; orders: number }>;
  topVendors?: Array<{ name: string; purchases: number; orders: number }>;
  salesTrend?: Array<{ month: string; amount: number }>;
  inventoryStatus?: Array<{ product: string; stock: number; value: number }>;
  paymentStatus?: { paid: number; pending: number; overdue: number };
}

export function ReportsAnalytics() {
  const [activeReport, setActiveReport] = useState<'sales' | 'vendor' | 'inventory' | 'customer'>('sales');
  const [metrics, setMetrics] = useState<ReportMetrics>({});
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [filterVendor, setFilterVendor] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchReportData();
  }, [activeReport, dateFrom, dateTo, filterVendor, filterCustomer, filterStatus]);

  async function fetchReportData() {
    try {
      setLoading(true);
      const requests = [];

      if (activeReport === 'sales') {
        requests.push(apiClient.getBillAnalytics(90));
      } else if (activeReport === 'vendor') {
        // Would call vendor-specific API
      } else if (activeReport === 'inventory') {
        requests.push(apiClient.getInventorySnapshot());
      }

      // Simulate gathering data
      const mockData: ReportMetrics = generateMockMetrics(activeReport);
      setMetrics(mockData);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateMockMetrics(report: string): ReportMetrics {
    const baseMetrics: ReportMetrics = {};

    if (report === 'sales') {
      baseMetrics.totalSales = 1250000;
      baseMetrics.totalCustomers = 45;
      baseMetrics.averageOrderValue = 27777;
      baseMetrics.topCustomers = [
        { name: 'ABC Corporation', sales: 150000, orders: 12 },
        { name: 'XYZ Industries', sales: 125000, orders: 10 },
        { name: 'Global Traders', sales: 98000, orders: 8 },
        { name: 'Tech Solutions', sales: 85000, orders: 7 },
        { name: 'Prime Retail', sales: 72000, orders: 6 },
      ];
      baseMetrics.salesTrend = [
        { month: 'January', amount: 125000 },
        { month: 'February', amount: 145000 },
        { month: 'March', amount: 165000 },
        { month: 'April', amount: 185000 },
        { month: 'May', amount: 155000 },
        { month: 'June', amount: 205000 },
        { month: 'July', amount: 235000 },
        { month: 'August', amount: 195000 },
        { month: 'September', amount: 225000 },
      ];
      baseMetrics.paymentStatus = { paid: 32, pending: 8, overdue: 5 };
    } else if (report === 'vendor') {
      baseMetrics.totalPurchases = 890000;
      baseMetrics.totalVendors = 28;
      baseMetrics.averageOrderValue = 31785;
      baseMetrics.topVendors = [
        { name: 'Supplier A', purchases: 180000, orders: 24 },
        { name: 'Supplier B', purchases: 165000, orders: 22 },
        { name: 'Supplier C', purchases: 145000, orders: 18 },
        { name: 'Supplier D', purchases: 125000, orders: 16 },
        { name: 'Supplier E', purchases: 105000, orders: 14 },
      ];
      baseMetrics.paymentStatus = { paid: 45, pending: 12, overdue: 3 };
    } else if (report === 'inventory') {
      baseMetrics.inventoryStatus = [
        { product: 'Product A', stock: 450, value: 225000 },
        { product: 'Product B', stock: 320, value: 160000 },
        { product: 'Product C', stock: 280, value: 140000 },
        { product: 'Product D', stock: 510, value: 255000 },
        { product: 'Product E', stock: 190, value: 95000 },
        { product: 'Product F', stock: 75, value: 37500 },
        { product: 'Product G', stock: 420, value: 210000 },
        { product: 'Product H', stock: 35, value: 17500 },
      ];
    } else if (report === 'customer') {
      baseMetrics.totalCustomers = 45;
      baseMetrics.totalSales = 1250000;
      baseMetrics.topCustomers = [
        { name: 'ABC Corporation', sales: 150000, orders: 12 },
        { name: 'XYZ Industries', sales: 125000, orders: 10 },
        { name: 'Global Traders', sales: 98000, orders: 8 },
        { name: 'Tech Solutions', sales: 85000, orders: 7 },
        { name: 'Prime Retail', sales: 72000, orders: 6 },
        { name: 'Future Stores', sales: 65000, orders: 5 },
        { name: 'Metro Sales', sales: 58000, orders: 4 },
      ];
    }

    return baseMetrics;
  }

  function exportToCSV(reportType: string) {
    let csvContent = 'data:text/csv;charset=utf-8,';
    let filename = '';

    if (reportType === 'sales') {
      csvContent += 'Sales Report\n';
      csvContent += `Date Range: ${dateFrom} to ${dateTo}\n`;
      csvContent += `Total Sales: Rs ${metrics.totalSales?.toLocaleString()}\n`;
      csvContent += `Total Customers: ${metrics.totalCustomers}\n`;
      csvContent += `Average Order Value: Rs ${metrics.averageOrderValue?.toLocaleString()}\n\n`;
      csvContent += 'Top Customers\n';
      csvContent += 'Customer,Sales,Orders\n';
      metrics.topCustomers?.forEach((c) => {
        csvContent += `${c.name},${c.sales},${c.orders}\n`;
      });
      filename = 'sales-report.csv';
    } else if (reportType === 'vendor') {
      csvContent += 'Vendor Report\n';
      csvContent += `Date Range: ${dateFrom} to ${dateTo}\n`;
      csvContent += `Total Purchases: Rs ${metrics.totalPurchases?.toLocaleString()}\n`;
      csvContent += `Total Vendors: ${metrics.totalVendors}\n\n`;
      csvContent += 'Top Vendors\n';
      csvContent += 'Vendor,Purchases,Orders\n';
      metrics.topVendors?.forEach((v) => {
        csvContent += `${v.name},${v.purchases},${v.orders}\n`;
      });
      filename = 'vendor-report.csv';
    } else if (reportType === 'inventory') {
      csvContent += 'Inventory Report\n';
      csvContent += 'Product,Stock,Value (Rs)\n';
      metrics.inventoryStatus?.forEach((item) => {
        csvContent += `${item.product},${item.stock},${item.value}\n`;
      });
      filename = 'inventory-report.csv';
    } else if (reportType === 'customer') {
      csvContent += 'Customer Report\n';
      csvContent += `Total Customers: ${metrics.totalCustomers}\n`;
      csvContent += `Total Sales: Rs ${metrics.totalSales?.toLocaleString()}\n\n`;
      csvContent += 'Customer Details\n';
      csvContent += 'Customer,Sales,Orders\n';
      metrics.topCustomers?.forEach((c) => {
        csvContent += `${c.name},${c.sales},${c.orders}\n`;
      });
      filename = 'customer-report.csv';
    }

    const element = document.createElement('a');
    element.setAttribute('href', encodeURI(csvContent));
    element.setAttribute('download', filename);
    element.click();
  }

  function renderSalesReport() {
    return (
      <div>
        <div style={styles.metricsGrid}>
          <MetricCard
            icon="💰"
            label="Total Sales"
            value={`Rs ${metrics.totalSales?.toLocaleString() || '0'}`}
          />
          <MetricCard
            icon="👥"
            label="Total Customers"
            value={metrics.totalCustomers?.toString() || '0'}
          />
          <MetricCard
            icon="📊"
            label="Average Order Value"
            value={`Rs ${metrics.averageOrderValue?.toLocaleString() || '0'}`}
          />
          <MetricCard
            icon="📈"
            label="Payment Status"
            value={`${metrics.paymentStatus?.paid || 0} Paid / ${metrics.paymentStatus?.pending || 0} Pending`}
          />
        </div>

        <div style={styles.chartsGrid}>
          <div style={styles.chartCard}>
            <h4>Top Customers</h4>
            <table style={styles.reportTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Sales (Rs)</th>
                  <th style={styles.th}>Orders</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topCustomers?.map((c, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}>{c.sales.toLocaleString()}</td>
                    <td style={styles.td}>{c.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.chartCard}>
            <h4>Monthly Sales Trend</h4>
            <table style={styles.reportTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Month</th>
                  <th style={styles.th}>Amount (Rs)</th>
                  <th style={styles.th}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {metrics.salesTrend?.map((t, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{t.month}</td>
                    <td style={styles.td}>{t.amount.toLocaleString()}</td>
                    <td style={styles.td}>
                      <div style={{
                        height: '20px',
                        backgroundColor: '#667eea',
                        width: `${(t.amount / 250000) * 100}%`,
                        borderRadius: '2px',
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderVendorReport() {
    return (
      <div>
        <div style={styles.metricsGrid}>
          <MetricCard
            icon="🏭"
            label="Total Purchases"
            value={`Rs ${metrics.totalPurchases?.toLocaleString() || '0'}`}
          />
          <MetricCard
            icon="🤝"
            label="Total Vendors"
            value={metrics.totalVendors?.toString() || '0'}
          />
          <MetricCard
            icon="📊"
            label="Average PO Value"
            value={`Rs ${metrics.averageOrderValue?.toLocaleString() || '0'}`}
          />
          <MetricCard
            icon="✅"
            label="Payment Terms"
            value="30 days average"
          />
        </div>

        <div style={styles.chartsGrid}>
          <div style={styles.chartCard}>
            <h4>Top Vendors</h4>
            <table style={styles.reportTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Purchases (Rs)</th>
                  <th style={styles.th}>Orders</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topVendors?.map((v, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{v.name}</td>
                    <td style={styles.td}>{v.purchases.toLocaleString()}</td>
                    <td style={styles.td}>{v.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.chartCard}>
            <h4>Vendor Performance</h4>
            <table style={styles.reportTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Performance</th>
                  <th style={styles.th}>Score</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topVendors?.map((v, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{v.name}</td>
                    <td style={styles.td}>
                      <div style={{
                        height: '20px',
                        backgroundColor: '#28a745',
                        width: `${(v.purchases / (metrics.totalPurchases || 1)) * 100 * 1.5}%`,
                        borderRadius: '2px',
                      }} />
                    </td>
                    <td style={styles.td}>{(Math.random() * 30 + 70).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderInventoryReport() {
    return (
      <div>
        <div style={styles.metricsGrid}>
          <MetricCard
            icon="📦"
            label="Total Products"
            value={metrics.inventoryStatus?.length.toString() || '0'}
          />
          <MetricCard
            icon="💵"
            label="Inventory Value"
            value={`Rs ${(metrics.inventoryStatus?.reduce((sum, item) => sum + item.value, 0) || 0).toLocaleString()}`}
          />
          <MetricCard
            icon="⚠️"
            label="Low Stock Items"
            value={(metrics.inventoryStatus?.filter((item) => item.stock < 100).length || 0).toString()}
          />
          <MetricCard
            icon="📊"
            label="Average Stock Level"
            value={(metrics.inventoryStatus?.reduce((sum, item) => sum + item.stock, 0) || 0) / (metrics.inventoryStatus?.length || 1) | 0}
          />
        </div>

        <div style={styles.chartsGrid}>
          <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }}>
            <h4>Stock Levels & Valuation</h4>
            <table style={styles.reportTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Stock (Units)</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Value (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {metrics.inventoryStatus?.map((item, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{item.product}</td>
                    <td style={styles.td}>{item.stock}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: item.stock < 100 ? '#fff3cd' : '#d4edda',
                        color: item.stock < 100 ? '#856404' : '#155724',
                      }}>
                        {item.stock < 100 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td style={styles.td}>{item.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderCustomerReport() {
    return (
      <div>
        <div style={styles.metricsGrid}>
          <MetricCard
            icon="👥"
            label="Total Customers"
            value={metrics.totalCustomers?.toString() || '0'}
          />
          <MetricCard
            icon="💰"
            label="Total Sales"
            value={`Rs ${metrics.totalSales?.toLocaleString() || '0'}`}
          />
          <MetricCard
            icon="📊"
            label="Average Sales Per Customer"
            value={`Rs ${((metrics.totalSales || 0) / (metrics.totalCustomers || 1)).toLocaleString()}`}
          />
          <MetricCard
            icon="🔝"
            label="Top Customer Share"
            value={`${((metrics.topCustomers?.[0]?.sales || 0) / (metrics.totalSales || 1) * 100).toFixed(0)}%`}
          />
        </div>

        <div style={styles.chartsGrid}>
          <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }}>
            <h4>Customer Analysis</h4>
            <table style={styles.reportTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Sales (Rs)</th>
                  <th style={styles.th}>Orders</th>
                  <th style={styles.th}>Avg Order Value</th>
                  <th style={styles.th}>Share %</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topCustomers?.map((c, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}>{c.sales.toLocaleString()}</td>
                    <td style={styles.td}>{c.orders}</td>
                    <td style={styles.td}>Rs {(c.sales / c.orders).toLocaleString()}</td>
                    <td style={styles.td}>{((c.sales / (metrics.totalSales || 1)) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2>📊 Reports & Analytics</h2>

      <div style={styles.controls}>
        <div style={styles.reportTabs}>
          {['sales', 'vendor', 'inventory', 'customer'].map((report) => (
            <button
              key={report}
              onClick={() => setActiveReport(report as any)}
              style={{
                ...styles.tabBtn,
                ...(activeReport === report ? styles.tabBtnActive : {}),
              }}
            >
              {report === 'sales' && '📈 Sales'}
              {report === 'vendor' && '🤝 Vendors'}
              {report === 'inventory' && '📦 Inventory'}
              {report === 'customer' && '👥 Customers'}
            </button>
          ))}
        </div>

        <div style={styles.dateFilters}>
          <label>From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={styles.input}
          />
          <label>To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={styles.input}
          />
          <button
            onClick={() => exportToCSV(activeReport)}
            style={styles.exportBtn}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading report data...</p>
      ) : (
        <div>
          {activeReport === 'sales' && renderSalesReport()}
          {activeReport === 'vendor' && renderVendorReport()}
          {activeReport === 'inventory' && renderInventoryReport()}
          {activeReport === 'customer' && renderCustomerReport()}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricIcon}>{icon}</div>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '1400px', margin: '0 auto' },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px',
    flexWrap: 'wrap',
  },
  reportTabs: {
    display: 'flex',
    gap: '10px',
  },
  tabBtn: {
    padding: '10px 15px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  tabBtnActive: {
    backgroundColor: '#667eea',
    color: 'white',
    borderColor: '#667eea',
  },
  dateFilters: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  exportBtn: {
    padding: '10px 15px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '30px',
  },
  metricCard: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    textAlign: 'center',
  },
  metricIcon: {
    fontSize: '32px',
    marginBottom: '10px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '20px',
  },
  chartCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #ddd',
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '12px',
  },
  th: {
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #ddd',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #eee',
    fontSize: '13px',
  },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
};

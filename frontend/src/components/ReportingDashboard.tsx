import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface Analytics {
  period: { startDate: string; endDate: string; days: number };
  summary: {
    totalGatePasses: number;
    confirmed: number;
    pending: number;
    fulfillmentRate: number;
    avgFulfillmentTimeMinutes: number;
  };
}

interface WarehousePerf {
  warehouseId: number;
  warehouseName: string;
  location: string;
  gatePasses: { total: number; confirmed: number; fulfillmentRate: number };
  inventory: { itemsShipped: number; itemsReceived: number; netMovement: number };
}

interface BillAnalytics {
  period: { startDate: string; endDate: string; days: number };
  summary: {
    totalBills: number;
    totalAmount: number;
    avgBillAmount: number;
    totalDiscountAmount: number;
  };
  byChannel: Record<string, { count: number; amount: number }>;
}

interface InventorySnapshot {
  snapshot: {
    totalProducts: number;
    totalPhysicalStock: number;
    totalReservedStock: number;
    totalAvailableStock: number;
  };
}

export function ReportingDashboard() {
  const [gatePassAnalytics, setGatePassAnalytics] = useState<Analytics | null>(null);
  const [warehousePerformance, setWarehousePerformance] = useState<WarehousePerf[]>([]);
  const [billAnalytics, setBillAnalytics] = useState<BillAnalytics | null>(null);
  const [inventory, setInventory] = useState<InventorySnapshot | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [days]);

  async function fetchReports() {
    try {
      setLoading(true);
      const [gp, perf, bills, inv] = await Promise.all([
        apiClient.getGatePassAnalytics(days),
        apiClient.getWarehousePerformance(days),
        apiClient.getBillAnalytics(days),
        apiClient.getInventorySnapshot(),
      ]);

      setGatePassAnalytics(gp);
      setWarehousePerformance(perf);
      setBillAnalytics(bills);
      setInventory(inv);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h2>📊 Warehouse Analytics Dashboard</h2>

      <div style={styles.controls}>
        <label>Period (days): </label>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : (
        <div>
          {/* Gate Pass Analytics */}
          {gatePassAnalytics && (
            <div style={styles.section}>
              <h3>Gate Pass Performance</h3>
              <div style={styles.metrics}>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{gatePassAnalytics.summary.totalGatePasses}</div>
                  <div style={styles.metricLabel}>Total Gate Passes</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{gatePassAnalytics.summary.confirmed}</div>
                  <div style={styles.metricLabel}>Confirmed</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{gatePassAnalytics.summary.pending}</div>
                  <div style={styles.metricLabel}>Pending</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>
                    {gatePassAnalytics.summary.fulfillmentRate.toFixed(1)}%
                  </div>
                  <div style={styles.metricLabel}>Fulfillment Rate</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>
                    {gatePassAnalytics.summary.avgFulfillmentTimeMinutes.toFixed(0)}m
                  </div>
                  <div style={styles.metricLabel}>Avg Time</div>
                </div>
              </div>
            </div>
          )}

          {/* Bill Analytics */}
          {billAnalytics && (
            <div style={styles.section}>
              <h3>Bill Analytics</h3>
              <div style={styles.metrics}>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{billAnalytics.summary.totalBills}</div>
                  <div style={styles.metricLabel}>Total Bills</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>
                    Rs. {(billAnalytics.summary.totalAmount / 1000).toFixed(0)}K
                  </div>
                  <div style={styles.metricLabel}>Total Revenue</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>
                    Rs. {(billAnalytics.summary.avgBillAmount / 100).toFixed(0)}
                  </div>
                  <div style={styles.metricLabel}>Avg Bill</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>
                    Rs. {(billAnalytics.summary.totalDiscountAmount / 100).toFixed(0)}
                  </div>
                  <div style={styles.metricLabel}>Total Discount</div>
                </div>
              </div>

              <div style={styles.channelBreakdown}>
                <h4>By Channel:</h4>
                {Object.entries(billAnalytics.byChannel).map(([channel, data]) => (
                  <div key={channel} style={styles.channelRow}>
                    <span>{channel}</span>
                    <span>{data.count} bills</span>
                    <span>Rs. {data.amount / 100}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warehouse Performance */}
          {warehousePerformance.length > 0 && (
            <div style={styles.section}>
              <h3>Warehouse Performance</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>Warehouse</th>
                    <th>Location</th>
                    <th>Gate Passes</th>
                    <th>Fulfillment %</th>
                    <th>Items Shipped</th>
                    <th>Items Received</th>
                  </tr>
                </thead>
                <tbody>
                  {warehousePerformance.map((wh) => (
                    <tr key={wh.warehouseId}>
                      <td>{wh.warehouseName}</td>
                      <td>{wh.location}</td>
                      <td>{wh.gatePasses.total}</td>
                      <td>{wh.gatePasses.fulfillmentRate.toFixed(1)}%</td>
                      <td style={styles.rightAlign}>{wh.inventory.itemsShipped}</td>
                      <td style={styles.rightAlign}>{wh.inventory.itemsReceived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inventory Snapshot */}
          {inventory && (
            <div style={styles.section}>
              <h3>Inventory Snapshot</h3>
              <div style={styles.metrics}>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{inventory.snapshot.totalProducts}</div>
                  <div style={styles.metricLabel}>Total Products</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{inventory.snapshot.totalPhysicalStock}</div>
                  <div style={styles.metricLabel}>Physical Stock</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{inventory.snapshot.totalReservedStock}</div>
                  <div style={styles.metricLabel}>Reserved</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{inventory.snapshot.totalAvailableStock}</div>
                  <div style={styles.metricLabel}>Available</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  controls: {
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '5px',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginTop: '15px',
  },
  metric: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '5px',
    textAlign: 'center',
    borderLeft: '4px solid #007bff',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
  },
  channelBreakdown: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #eee',
  },
  channelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  rightAlign: {
    textAlign: 'right',
  },
};

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

interface AgingBucket {
  bucket: string;
  count: number;
  totalAmount: number;
}

interface ArAgingSummary {
  customerId?: number;
  customerName?: string;
  buckets: AgingBucket[];
  totalOutstanding: number;
  asOfDate: string;
}

interface ApAgingSummary {
  vendorId?: number;
  vendorName?: string;
  buckets: AgingBucket[];
  totalOutstanding: number;
  asOfDate: string;
}

type Tab = 'ar' | 'ap';

export function ArApAgingScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('ar');
  const [arSummaries, setArSummaries] = useState<ArAgingSummary[]>([]);
  const [apSummaries, setApSummaries] = useState<ApAgingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAgingData();
  }, [asOfDate]);

  const loadAgingData = async () => {
    try {
      setLoading(true);
      const [arResponse, apResponse] = await Promise.all([
        apiClient.getArAgingReport(undefined, asOfDate),
        apiClient.getApAgingReport(undefined, asOfDate),
      ]);
      setArSummaries(arResponse.summaries || []);
      setApSummaries(apResponse.summaries || []);
    } catch (error) {
      console.error('Error loading aging data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => (cents / 100).toFixed(2);
  const getBucketColor = (bucket: string) => {
    const colors: Record<string, string> = {
      '0-10': '#28a745',
      '10-20': '#ffc107',
      '20-30': '#ff9800',
      '30+': '#dc3545',
    };
    return colors[bucket] || '#6c757d';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>AR/AP Aging Analysis</h2>
        <div>
          <label>As Of Date:</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('ar')}
          style={{
            ...styles.tabButton,
            backgroundColor: activeTab === 'ar' ? '#007bff' : '#e9ecef',
            color: activeTab === 'ar' ? 'white' : '#333',
          }}
        >
          Accounts Receivable (AR)
        </button>
        <button
          onClick={() => setActiveTab('ap')}
          style={{
            ...styles.tabButton,
            backgroundColor: activeTab === 'ap' ? '#007bff' : '#e9ecef',
            color: activeTab === 'ap' ? 'white' : '#333',
          }}
        >
          Accounts Payable (AP)
        </button>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : activeTab === 'ar' ? (
        <div>
          <h3>Customer Aging ({arSummaries.length} customers)</h3>
          {arSummaries.length === 0 ? (
            <p>No AR data available</p>
          ) : (
            arSummaries.map((summary, idx) => (
              <div key={idx} style={styles.agingCard}>
                <h4 style={styles.cardTitle}>{summary.customerName}</h4>
                <div style={styles.bucketGrid}>
                  {summary.buckets.map((bucket) => (
                    <div key={bucket.bucket} style={styles.bucketItem}>
                      <div
                        style={{
                          ...styles.bucketLabel,
                          backgroundColor: getBucketColor(bucket.bucket),
                        }}
                      >
                        {bucket.bucket} days
                      </div>
                      <div style={styles.bucketValue}>{bucket.count} invoices</div>
                      <div style={styles.bucketAmount}>PKR {formatCurrency(bucket.totalAmount)}</div>
                    </div>
                  ))}
                </div>
                <div style={styles.total}>
                  Total Outstanding: PKR {formatCurrency(summary.totalOutstanding)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          <h3>Vendor Aging ({apSummaries.length} vendors)</h3>
          {apSummaries.length === 0 ? (
            <p>No AP data available</p>
          ) : (
            apSummaries.map((summary, idx) => (
              <div key={idx} style={styles.agingCard}>
                <h4 style={styles.cardTitle}>{summary.vendorName}</h4>
                <div style={styles.bucketGrid}>
                  {summary.buckets.map((bucket) => (
                    <div key={bucket.bucket} style={styles.bucketItem}>
                      <div
                        style={{
                          ...styles.bucketLabel,
                          backgroundColor: getBucketColor(bucket.bucket),
                        }}
                      >
                        {bucket.bucket} days
                      </div>
                      <div style={styles.bucketValue}>{bucket.count} POs</div>
                      <div style={styles.bucketAmount}>PKR {formatCurrency(bucket.totalAmount)}</div>
                    </div>
                  ))}
                </div>
                <div style={styles.total}>
                  Total Outstanding: PKR {formatCurrency(summary.totalOutstanding)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' },
  header: { display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: '20px' },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', marginLeft: '10px' },
  tabs: { display: 'flex' as const, gap: '10px', marginBottom: '20px' },
  tabButton: { padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  loading: { textAlign: 'center' as const, padding: '40px', color: '#666' },
  agingCard: { backgroundColor: 'white', padding: '20px', borderRadius: '4px', marginBottom: '15px' },
  cardTitle: { margin: '0 0 15px 0', color: '#333' },
  bucketGrid: { display: 'grid' as const, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' },
  bucketItem: { padding: '15px', border: '1px solid #e0e0e0', borderRadius: '4px', textAlign: 'center' as const },
  bucketLabel: { padding: '8px', color: 'white', borderRadius: '4px', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' as const },
  bucketValue: { fontSize: '14px', fontWeight: 'bold' as const, marginBottom: '5px' },
  bucketAmount: { fontSize: '12px', color: '#666' },
  total: { padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontWeight: 'bold' as const, textAlign: 'right' as const },
};

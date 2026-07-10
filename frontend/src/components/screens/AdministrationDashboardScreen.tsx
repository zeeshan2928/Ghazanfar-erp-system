import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../services/api';

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  canViewFinancials: number;
  byRole: { role: string; count: number }[];
}

interface PermissionOverrideStats {
  usersWithRestrictions: number;
  totalRestrictions: number;
  mostRestrictedKeys: { permissionKey: string; count: number }[];
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#dc2626',
  SALESMAN: '#2563eb',
  WAREHOUSE: '#f59e0b',
  ACCOUNTANT: '#16a34a',
  MANAGER: '#a855f7',
};

export function AdministrationDashboardScreen() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [overrideStats, setOverrideStats] = useState<PermissionOverrideStats | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [userR, overrideR, notifR] = await Promise.allSettled([
        apiClient.getUserStats(),
        apiClient.getPermissionOverrideStats(),
        apiClient.getNotifications(0, 1),
      ]);

      if (userR.status === 'fulfilled') setUserStats(userR.value);
      if (overrideR.status === 'fulfilled') setOverrideStats(overrideR.value);
      if (notifR.status === 'fulfilled') setUnreadNotifications(notifR.value.unreadCount ?? 0);
    } catch (err) {
      setError('Failed to load administration dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const roleChartData = (userStats?.byRole || []).map(r => ({ name: r.role, value: r.count }));
  const statusChartData = userStats ? [
    { name: 'Active', count: userStats.active },
    { name: 'Inactive', count: userStats.inactive },
  ] : [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Administration Dashboard</h2>
        <button style={styles.refreshBtn} onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.kpiGrid}>
        <KPICard label="Total Users" value={userStats?.total} />
        <KPICard label="Active Users" value={userStats?.active} />
        <KPICard label="Can View Financials" value={userStats?.canViewFinancials} />
        <KPICard label="Users w/ Custom Restrictions" value={overrideStats?.usersWithRestrictions} />
        <KPICard label="Unread Notifications" value={unreadNotifications ?? undefined} highlight={!!unreadNotifications} />
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Users by Role</h4>
          {roleChartData.length === 0 ? <p>No users found.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={roleChartData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {roleChartData.map(entry => (
                    <Cell key={entry.name} fill={ROLE_COLORS[entry.name] || '#999'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Users by Status</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.chartCard}>
        <h4 style={styles.chartTitle}>Most-Restricted Permissions</h4>
        {!overrideStats || overrideStats.mostRestrictedKeys.length === 0 ? (
          <p>No custom permission restrictions are currently in place - every non-admin user has the default access for their role.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}>Permission Key</th><th style={styles.th}>Users Restricted</th></tr>
            </thead>
            <tbody>
              {overrideStats.mostRestrictedKeys.map(k => (
                <tr key={k.permissionKey}>
                  <td style={styles.td}>{k.permissionKey}</td>
                  <td style={styles.td}>{k.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  const display = value === undefined || value === null ? '—' : value.toLocaleString();
  return (
    <div style={{ ...styles.kpiCard, ...(highlight ? styles.kpiCardHighlight : {}) }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{display}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  h2: { margin: 0 },
  refreshBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' },
  kpiCard: { background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '14px' },
  kpiCardHighlight: { borderLeft: '4px solid #f59e0b' },
  kpiLabel: { fontSize: '12px', color: '#666', marginBottom: '4px' },
  kpiValue: { fontSize: '20px', fontWeight: 700 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  chartTitle: { margin: '0 0 8px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '8px', fontSize: '13px', color: '#555' },
  td: { borderBottom: '1px solid #eee', padding: '8px', fontSize: '14px' },
};

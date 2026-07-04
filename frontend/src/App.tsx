import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { GatePassDashboard } from './components/GatePassDashboard';
import { ReportingDashboard } from './components/ReportingDashboard';
import { BillsScreen } from './components/screens/BillsScreen';
import { ProductsScreen } from './components/screens/ProductsScreen';
import { InventoryScreen } from './components/screens/InventoryScreen';
import { CustomersScreen } from './components/screens/CustomersScreen';
import { PurchaseOrdersScreen } from './components/screens/PurchaseOrdersScreen';

export function App() {
  const [view, setView] = useState<'dashboard' | 'gate-pass' | 'reporting' | 'bills' | 'products' | 'inventory' | 'customers' | 'orders' | 'login'>('login');
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');

    if (savedToken) {
      setToken(savedToken);
      setView('products');
    }
  }, []);

  function handleLoginSuccess(token: string) {
    setToken(token);
    setView('dashboard');
  }

  function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('warehouse_id');
    setToken('');
    setWarehouseId(null);
    setView('login');
  }

  return (
    <div style={styles.app}>
      {view === 'login' ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div>
          <header style={styles.header}>
            <div style={styles.headerContent}>
              <h1>🏭 ERP Warehouse Management System</h1>
              <div style={styles.nav}>
                <button
                  style={{
                    ...styles.navBtn,
                    ...(view === 'dashboard' ? styles.navBtnActive : {}),
                  }}
                  onClick={() => setView('dashboard')}
                >
                  📊 Dashboard
                </button>
                <button
                  style={{
                    ...styles.navBtn,
                    ...(view === 'gate-pass' ? styles.navBtnActive : {}),
                  }}
                  onClick={() => setView('gate-pass')}
                >
                  📦 Gate Passes
                </button>
                <button
                  style={{
                    ...styles.navBtn,
                    ...(view === 'bills' ? styles.navBtnActive : {}),
                  }}
                  onClick={() => setView('bills')}
                >
                  📄 Bills
                </button>
                <button
                  style={{
                    ...styles.navBtn,
                    ...(view === 'products' ? styles.navBtnActive : {}),
                  }}
                  onClick={() => setView('products')}
                >
                  📦 Products
                </button>
                <button
                  style={{
                    ...styles.navBtn,
                    ...(view === 'inventory' ? styles.navBtnActive : {}),
                  }}
                  onClick={() => setView('inventory')}
                >
                  📊 Inventory
                </button>
                <button
                  style={{
                    ...styles.navBtn,
                    ...(view === 'customers' ? styles.navBtnActive : {}),
                  }}
                  onClick={() => setView('customers')}
                >
                  👥 Customers
                </button>
                <button
                  style={{
                    ...styles.navBtn,
                    ...(view === 'orders' ? styles.navBtnActive : {}),
                  }}
                  onClick={() => setView('orders')}
                >
                  📋 Purchase Orders
                </button>
                <button
                  style={{
                    ...styles.navBtn,
                    ...(view === 'reporting' ? styles.navBtnActive : {}),
                  }}
                  onClick={() => setView('reporting')}
                >
                  📊 Reports
                </button>
                <button style={styles.logoutBtn} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main style={styles.main}>
            {view === 'dashboard' && <DashboardScreen />}
            {view === 'gate-pass' && warehouseId && (
              <GatePassDashboard warehouseId={warehouseId} />
            )}
            {view === 'bills' && <BillsScreen />}
            {view === 'products' && <ProductsScreen />}
            {view === 'inventory' && <InventoryScreen />}
            {view === 'customers' && <CustomersScreen />}
            {view === 'orders' && <PurchaseOrdersScreen />}
            {view === 'reporting' && <ReportingDashboard />}
          </main>
        </div>
      )}
    </div>
  );
}

function LoginForm({ onSubmit }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <h2>🏭 Warehouse Dashboard</h2>
        <p>Enter your credentials to continue</p>

        <form onSubmit={onSubmit}>
          <div style={styles.formGroup}>
            <label>JWT Token:</label>
            <textarea
              name="token"
              placeholder="Paste your JWT token here..."
              required
              style={styles.tokenInput}
              defaultValue="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiQURNSU4iLCJvcmdhbml6YXRpb25JZCI6MX0.YOUR_TOKEN_HERE"
            />
          </div>

          <div style={styles.formGroup}>
            <label>Warehouse ID:</label>
            <input
              type="number"
              name="warehouseId"
              placeholder="Enter warehouse ID (e.g., 1)"
              required
              defaultValue="1"
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.submitBtn}>
            Login
          </button>
        </form>

        <div style={styles.help}>
          <h4>Quick Start:</h4>
          <ol>
            <li>Get a JWT token from the ERP API</li>
            <li>Enter your warehouse ID (usually 1 or 2)</li>
            <li>Click Login to access the dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nav: {
    display: 'flex',
    gap: '10px',
  },
  navBtn: {
    padding: '10px 15px',
    backgroundColor: 'transparent',
    color: 'white',
    border: '1px solid white',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  navBtnActive: {
    backgroundColor: 'white',
    color: '#2c3e50',
  },
  logoutBtn: {
    padding: '10px 15px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 80px)',
  },
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '500px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  tokenInput: {
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    fontFamily: 'monospace',
    fontSize: '12px',
    minHeight: '100px',
    fontFamily: 'Arial, sans-serif',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  help: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
    fontSize: '14px',
  },
};

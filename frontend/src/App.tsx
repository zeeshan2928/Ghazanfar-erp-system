import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { MainDashboard } from './components/MainDashboard';
import { WarehouseStaffScreen } from './screens/WarehouseStaffScreen';

export function App() {
  const [view, setView] = useState<'login' | 'dashboard' | 'warehouse'>('login');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUserStr = localStorage.getItem('auth_user');
    if (savedToken && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setUser(savedUser);
        setView(savedUser.role === 'WAREHOUSE' ? 'warehouse' : 'dashboard');
      } catch (e) {
        // Fallback
        setView('dashboard');
      }
    }
  }, []);

  function handleLoginSuccess(token: string, userData: any) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
    setView(userData.role === 'WAREHOUSE' ? 'warehouse' : 'dashboard');
  }

  function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setView('login');
  }

  return (
    <div>
      {view === 'login' ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : view === 'warehouse' ? (
        <WarehouseStaffScreen warehouseId={user?.warehouseId || 1} onLogout={handleLogout} />
      ) : (
        <MainDashboard onLogout={handleLogout} />
      )}
    </div>
  );
}

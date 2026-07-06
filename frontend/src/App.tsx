import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { MainDashboard } from './components/MainDashboard';

export function App() {
  const [view, setView] = useState<'login' | 'dashboard'>('login');

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setView('dashboard');
    }
  }, []);

  function handleLoginSuccess(token: string) {
    localStorage.setItem('auth_token', token);
    setView('dashboard');
  }

  function handleLogout() {
    localStorage.removeItem('auth_token');
    setView('login');
  }

  return (
    <div>
      {view === 'login' ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <MainDashboard onLogout={handleLogout} />
      )}
    </div>
  );
}

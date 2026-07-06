import React, { useState, useEffect } from 'react';
import { TopNavigation } from '../components/navigation/BottomNavigation';
import { InventoryDashboard } from '../components/inventory/InventoryDashboard';
import { StockLevelDisplay } from '../components/inventory/StockLevelDisplay';
import { StockAdjustmentForm } from '../components/inventory/StockAdjustmentForm';
import { MovementHistory } from '../components/inventory/MovementHistory';
import { useInventoryStore } from '../stores/inventoryStore';
import { useOfflineMode } from '../hooks/useOfflineMode';
import './inventory-manager-screen.css';

type ScreenMode = 'dashboard' | 'stock-levels' | 'adjustment' | 'history' | 'reports';

interface InventoryManagerScreenProps {
  warehouseId?: number;
  userId?: number;
  userName?: string;
}

export const InventoryManagerScreen: React.FC<InventoryManagerScreenProps> = ({
  warehouseId = 1,
  userId = 1,
  userName = 'Manager',
}) => {
  const { loading } = useInventoryStore();
  const { isOnline, pendingCount, cacheSize, sync } = useOfflineMode();
  const [currentScreen, setCurrentScreen] = useState<ScreenMode>('dashboard');
  const [warehouseName, setWarehouseName] = useState('Main Warehouse');
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(!isOnline);

  // Show offline indicator when offline
  useEffect(() => {
    setShowOfflineIndicator(!isOnline);
    const timer = setTimeout(() => setShowOfflineIndicator(false), 3000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  const handleWarehouseChange = (id: number) => {
    setWarehouseId(id);
    const names: Record<number, string> = {
      1: 'Main Warehouse',
      2: 'Branch Warehouse',
      3: 'Storage Facility',
    };
    setWarehouseName(names[id] || 'Warehouse');
  };

  const handleScreenChange = (screen: ScreenMode) => {
    setCurrentScreen(screen);
  };

  const handleAdjustmentSuccess = () => {
    setCurrentScreen('dashboard');
  };

  return (
    <div className="inventory-manager-screen">
      {/* Top Navigation */}
      <TopNavigation
        warehouseId={warehouseId}
        warehouseName={warehouseName}
        userName={userName}
        onWarehouseChange={handleWarehouseChange}
        onLogout={() => window.location.href = '/login'}
      />

      {/* Offline Indicator */}
      {showOfflineIndicator && (
        <div className={`status-banner ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? (
            <>
              ✓ Back Online {pendingCount > 0 && `• Syncing ${pendingCount} pending`}
            </>
          ) : (
            <>
              ⚠️ You're Offline • Cache: {cacheSize}KB
              {pendingCount > 0 && ` • ${pendingCount} pending operations`}
            </>
          )}
          {isOnline && pendingCount > 0 && (
            <button className="sync-btn" onClick={sync}>
              Sync Now
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="screen-content">
        {currentScreen === 'dashboard' && (
          <InventoryDashboard
            warehouseId={warehouseId}
            onViewStock={() => handleScreenChange('stock-levels')}
            onAdjustStock={() => handleScreenChange('adjustment')}
          />
        )}

        {currentScreen === 'stock-levels' && (
          <div className="screen-wrapper">
            <button
              className="back-btn"
              onClick={() => handleScreenChange('dashboard')}
            >
              ← Dashboard
            </button>
            <StockLevelDisplay
              warehouseId={warehouseId}
              onSelectItem={(productId) => {
                // Could open product detail modal
                console.log('Product selected:', productId);
              }}
            />
          </div>
        )}

        {currentScreen === 'adjustment' && (
          <div className="screen-wrapper">
            <button
              className="back-btn"
              onClick={() => handleScreenChange('dashboard')}
            >
              ← Dashboard
            </button>
            <StockAdjustmentForm
              warehouseId={warehouseId}
              onSuccess={handleAdjustmentSuccess}
              onCancel={() => handleScreenChange('dashboard')}
            />
          </div>
        )}

        {currentScreen === 'history' && (
          <div className="screen-wrapper">
            <button
              className="back-btn"
              onClick={() => handleScreenChange('dashboard')}
            >
              ← Dashboard
            </button>
            <MovementHistory warehouseId={warehouseId} />
          </div>
        )}

        {currentScreen === 'reports' && (
          <div className="screen-wrapper">
            <button
              className="back-btn"
              onClick={() => handleScreenChange('dashboard')}
            >
              ← Dashboard
            </button>
            <div className="placeholder-screen">
              <div className="placeholder-icon">📈</div>
              <h2>Inventory Reports</h2>
              <p>Advanced analytics and insights</p>
              <p className="coming-soon">(Available in next phase)</p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Navigation Sidebar */}
      <nav className="desktop-nav">
        <div className="nav-menu">
          <button
            className={`nav-menu-item ${currentScreen === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleScreenChange('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-menu-item ${currentScreen === 'stock-levels' ? 'active' : ''}`}
            onClick={() => handleScreenChange('stock-levels')}
          >
            📈 Stock Levels
          </button>
          <button
            className={`nav-menu-item ${currentScreen === 'adjustment' ? 'active' : ''}`}
            onClick={() => handleScreenChange('adjustment')}
          >
            ✏️ Adjustments
          </button>
          <button
            className={`nav-menu-item ${currentScreen === 'history' ? 'active' : ''}`}
            onClick={() => handleScreenChange('history')}
          >
            📋 History
          </button>
          <button
            className={`nav-menu-item ${currentScreen === 'reports' ? 'active' : ''}`}
            onClick={() => handleScreenChange('reports')}
          >
            📈 Reports
          </button>
        </div>

        {/* Storage Stats */}
        <div className="storage-stats">
          <div className="stat">
            <span className="stat-label">Cache</span>
            <span className="stat-value">{cacheSize} KB</span>
          </div>
          {pendingCount > 0 && (
            <div className="stat">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{pendingCount}</span>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default InventoryManagerScreen;

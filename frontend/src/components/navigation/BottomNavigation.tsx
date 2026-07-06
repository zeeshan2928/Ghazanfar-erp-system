import React from 'react';
import './navigation.css';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  items?: NavItem[];
}

const DEFAULT_ITEMS: NavItem[] = [
  { id: 'picking', label: 'Picking', icon: '📦' },
  { id: 'inventory', label: 'Inventory', icon: '📊' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  items = DEFAULT_ITEMS,
}) => {
  return (
    <nav className="bottom-navigation">
      <div className="nav-container">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

// Top Navigation for manager view
interface TopNavigationProps {
  warehouseId?: number;
  warehouseName?: string;
  userName?: string;
  onWarehouseChange?: (id: number) => void;
  onLogout?: () => void;
  onMenu?: () => void;
  notificationCount?: number;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  warehouseId,
  warehouseName = 'Main Warehouse',
  userName = 'User',
  onWarehouseChange,
  onLogout,
  onMenu,
  notificationCount = 0,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="top-navigation">
      <div className="nav-top-container">
        {/* Left: Menu */}
        <button
          className="nav-menu-btn"
          onClick={() => {
            setIsMenuOpen(!isMenuOpen);
            onMenu?.();
          }}
        >
          ≡
        </button>

        {/* Center: Warehouse Selector */}
        <div className="nav-warehouse-selector">
          <label>Warehouse:</label>
          <select
            onChange={(e) => onWarehouseChange?.(parseInt(e.target.value))}
            value={warehouseId || ''}
          >
            <option value="1">Main Warehouse</option>
            <option value="2">Branch Warehouse</option>
            <option value="3">Storage Facility</option>
          </select>
        </div>

        {/* Right: User Menu */}
        <div className="nav-user-section">
          <button className="nav-notification-btn">
            🔔
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
          </button>
          <div className="nav-user-menu">
            <button className="nav-user-btn">{userName.charAt(0)}</button>
            {isMenuOpen && (
              <div className="user-dropdown">
                <button className="dropdown-item">👤 Profile</button>
                <button className="dropdown-item">⚙️ Settings</button>
                <button className="dropdown-item">🔐 Change Password</button>
                <hr />
                <button className="dropdown-item logout" onClick={onLogout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="nav-status-bar">
        <span className="status-item">
          <span className="status-dot online"></span>
          Online
        </span>
        <span className="status-item">🏢 {warehouseName}</span>
      </div>
    </nav>
  );
};

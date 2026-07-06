import React, { useState, useEffect } from 'react';
import EntryForm from '../components/cash-book-entry/EntryForm';
import EntryListUI from '../components/cash-book-entry/EntryListUI';
import BillMatchingInterface from '../components/bill-matching/BillMatchingInterface';
import BankReconciliation from '../components/cash-book-entry/BankReconciliation';
import ApprovalWorkflow from '../components/cash-book-entry/ApprovalWorkflow';
import AuditTrail from '../components/cash-book-entry/AuditTrail';
import { useCashBookEntryStore } from '../stores/cash-book/entryStore';
import './cash-book-entry-screen.css';

type TabName =
  | 'create'
  | 'list'
  | 'matching'
  | 'reconciliation'
  | 'approval'
  | 'audit';

interface TabConfig {
  id: TabName;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'create', label: 'Create Entry', icon: '➕' },
  { id: 'list', label: 'Entries', icon: '📋' },
  { id: 'matching', label: 'Bill Matching', icon: '🔗' },
  { id: 'reconciliation', label: 'Reconciliation', icon: '✓' },
  { id: 'approval', label: 'Approvals', icon: '👤' },
  { id: 'audit', label: 'Audit Trail', icon: '📝' },
];

export function CashBookEntryScreen(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabName>('create');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const store = useCashBookEntryStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'create':
        return <EntryForm />;
      case 'list':
        return <EntryListUI />;
      case 'matching':
        return <BillMatchingInterface />;
      case 'reconciliation':
        return <BankReconciliation />;
      case 'approval':
        return <ApprovalWorkflow />;
      case 'audit':
        return <AuditTrail />;
      default:
        return null;
    }
  };

  return (
    <div className="cash-book-screen">
      {!isOnline && (
        <div className="cash-book-screen__offline-banner">
          📡 Working Offline - Changes will sync when online
        </div>
      )}

      <div className="cash-book-screen__header">
        <h1 className="cash-book-screen__title">💰 Cash Book Management</h1>
        <div className="cash-book-screen__stats">
          <div className="cash-book-screen__stat">
            <span className="cash-book-screen__stat-label">Total Entries</span>
            <span className="cash-book-screen__stat-value">
              {store.entries.length}
            </span>
          </div>
          <div className="cash-book-screen__stat">
            <span className="cash-book-screen__stat-label">Synced</span>
            <span className="cash-book-screen__stat-value cash-book-screen__stat-value--success">
              {store.entries.filter((e) => e.syncStatus === 'synced').length}
            </span>
          </div>
          <div className="cash-book-screen__stat">
            <span className="cash-book-screen__stat-label">Pending</span>
            <span className="cash-book-screen__stat-value cash-book-screen__stat-value--warning">
              {store.entries.filter((e) => e.syncStatus === 'pending').length}
            </span>
          </div>
        </div>
      </div>

      <div className="cash-book-screen__tabs">
        <div className="cash-book-screen__tab-list">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`cash-book-screen__tab-button ${
                activeTab === tab.id
                  ? 'cash-book-screen__tab-button--active'
                  : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              <span className="cash-book-screen__tab-icon">{tab.icon}</span>
              <span className="cash-book-screen__tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cash-book-screen__content">{renderTabContent()}</div>
    </div>
  );
}

export default CashBookEntryScreen;

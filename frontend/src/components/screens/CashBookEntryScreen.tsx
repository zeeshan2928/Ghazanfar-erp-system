import React, { useState } from 'react';
import { EntryForm, EntryListUI, BankReconciliation, ApprovalWorkflow, AuditTrail } from '../cash-book-entry';

type Tab = 'entries' | 'new-entry' | 'reconciliation' | 'approvals' | 'audit';

export function CashBookEntryScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('entries');

  return (
    <div>
      <h1 style={{ padding: '20px 20px 0' }}>Cash Book Entry</h1>
      <div style={{ display: 'flex', gap: 10, padding: '10px 20px', borderBottom: '1px solid #ddd' }}>
        {(['entries', 'new-entry', 'reconciliation', 'approvals', 'audit'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ fontWeight: activeTab === tab ? 700 : 400, cursor: 'pointer', background: 'none', border: 'none', padding: '5px 10px', borderBottom: activeTab === tab ? '2px solid #667eea' : 'none' }}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>
      <div style={{ padding: 20 }}>
        {activeTab === 'entries' && <EntryListUI />}
        {activeTab === 'new-entry' && <EntryForm onSuccess={() => setActiveTab('entries')} onCancel={() => setActiveTab('entries')} />}
        {activeTab === 'reconciliation' && <BankReconciliation />}
        {activeTab === 'approvals' && <ApprovalWorkflow />}
        {activeTab === 'audit' && <AuditTrail />}
      </div>
    </div>
  );
}

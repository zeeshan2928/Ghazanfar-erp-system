import React, { useState, useEffect } from 'react';
import { useBillMatchingAPI } from '../../services/cash-book/matchingApiIntegration';
import { useBillMatchingStore } from '../../stores/cash-book/matchingStore';
import MatchingDashboard from './MatchingDashboard';
import BillList from './BillList';
import MatchingInterface from './MatchingInterface';
import './matching.css';

type ScreenMode = 'dashboard' | 'matching';

interface Bill {
  id: string;
  billNumber: string;
  amount: number;
  date: string;
  supplier: string;
  reference?: string;
  status: 'pending' | 'partial' | 'unmatched';
}

interface BillMatchingScreenProps {
  organizationId: number;
}

const BillMatchingScreen: React.FC<BillMatchingScreenProps> = ({ organizationId }) => {
  const [mode, setMode] = useState<ScreenMode>('dashboard');
  const [selectedBillId, setSelectedBillId] = useState<string | undefined>();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Zustand store
  const {
    unmatchedBills,
    matchedPairs,
    matchingCandidates,
    isLoading,
    error,
    setUnmatchedBills,
    setMatchedPairs,
    setMatchingCandidates,
    matchBill,
    undoMatch,
    autoMatch,
  } = useBillMatchingStore();

  // API hook
  const { bills, pairs, candidates, isLoading: apiLoading, loadBills, loadPairs, loadCandidates, matchBill: apiMatchBill, undoMatch: apiUndoMatch, autoMatch: apiAutoMatch } = useBillMatchingAPI({
    organizationId,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // Sync API data to store
  useEffect(() => {
    const billsForStore = bills.map(b => ({
      id: String(b.id),
      billNumber: b.billNumber,
      amount: b.amount,
      date: b.date,
      supplier: b.supplier,
      reference: b.reference,
      status: b.status || 'unmatched'
    } as any));
    setUnmatchedBills(billsForStore);
    setMatchedPairs(pairs);
  }, [bills, pairs, setUnmatchedBills, setMatchedPairs]);

  // Sync store candidates
  useEffect(() => {
    if (selectedBillId && candidates[selectedBillId]) {
      setMatchingCandidates(selectedBillId, candidates[selectedBillId] || []);
    }
  }, [selectedBillId, candidates, setMatchingCandidates]);

  // Online/offline tracking
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

  // Load candidates when bill is selected
  useEffect(() => {
    if (selectedBillId && mode === 'matching') {
      loadCandidates(selectedBillId);
    }
  }, [selectedBillId, mode, loadCandidates]);

  // Get selected bill
  const selectedBill = unmatchedBills.find((b) => b.id === selectedBillId);

  // Get candidates for selected bill
  const billCandidates = selectedBillId ? (matchingCandidates[selectedBillId] || []) : [];

  // Handle match from UI
  const handleMatch = async (entryId: number, amount: number, reason: string, confidence: number) => {
    if (!selectedBillId) return;

    matchBill(selectedBillId, String(entryId), reason);
    await apiMatchBill(parseInt(selectedBillId), entryId, amount, reason, confidence);

    setSelectedBillId(undefined);
  };

  // Handle undo match
  const handleUndoMatch = async (matchId: string, bill: any) => {
    undoMatch(matchId);
    await apiUndoMatch(parseInt(matchId), bill);
  };

  // Handle auto match
  const handleAutoMatch = async () => {
    autoMatch();
    await apiAutoMatch();
  };

  // Handle refresh
  const handleRefresh = async () => {
    await loadBills();
    await loadPairs();
  };

  // Switch to matching mode when bill is selected
  const handleSelectBill = (billId: string) => {
    setSelectedBillId(billId);
    setMode('matching');
  };

  const isLoadingData = apiLoading || isLoading;

  return (
    <div className="matching__screen">
      {/* Offline Banner */}
      {!isOnline && <div className="matching__offline-banner">You are offline. Changes will sync when connection is restored.</div>}

      {/* Mode Toggle & Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`matching__button ${mode === 'dashboard' ? 'matching__button--primary' : 'matching__button--secondary'}`}
              onClick={() => setMode('dashboard')}
              disabled={isLoadingData}
            >
              Dashboard
            </button>
            <button
              className={`matching__button ${mode === 'matching' ? 'matching__button--primary' : 'matching__button--secondary'}`}
              onClick={() => setMode('matching')}
              disabled={isLoadingData}
            >
              Match Bills
            </button>
          </div>

          {mode === 'dashboard' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="matching__button matching__button--primary"
                onClick={handleAutoMatch}
                disabled={isLoadingData}
                aria-busy={isLoadingData}
              >
                {isLoadingData ? 'Processing...' : 'Auto Match All'}
              </button>
              <button
                className="matching__button matching__button--secondary"
                onClick={handleRefresh}
                disabled={isLoadingData}
                aria-busy={isLoadingData}
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: '8px', padding: '8px', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '12px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Content Area */}
      {mode === 'dashboard' ? (
        <MatchingDashboard bills={unmatchedBills} pairs={matchedPairs} isLoading={isLoadingData} onAutoMatch={handleAutoMatch} onRefresh={handleRefresh} />
      ) : (
        <div style={{ display: 'flex', flex: 1, gap: '16px', padding: '16px', background: '#f5f5f5', overflow: 'hidden' }}>
          {/* Left: Bill List */}
          <div style={{ flex: '0 0 40%', minWidth: 0 }}>
            <BillList bills={unmatchedBills} onSelectBill={handleSelectBill} selectedBillId={selectedBillId} isLoading={isLoadingData} />
          </div>

          {/* Right: Matching Interface */}
          <div style={{ flex: '1', minWidth: 0, overflow: 'hidden' }}>
            <MatchingInterface selectedBill={selectedBill} candidates={billCandidates} isLoading={isLoadingData} onMatch={handleMatch} onUndo={handleUndoMatch} recentMatches={matchedPairs.slice(0, 5)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BillMatchingScreen;

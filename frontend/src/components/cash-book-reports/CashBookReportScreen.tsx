import React, { useEffect, useState } from 'react';
import { useCashBookReportsStore } from '../../stores/cash-book/reportStore';
import { useCashBookReportAPI } from '../../services/cash-book/reportApiIntegration';
import { ReconciliationDashboard } from './ReconciliationDashboard';
import { CashFlow } from './CashFlow';
import { DiscrepancyList } from './DiscrepancyList';
import './reports.css';

interface CashBookReportScreenProps {
  organizationId?: number;
}

export const CashBookReportScreen: React.FC<CashBookReportScreenProps> = ({
  organizationId = 1,
}) => {
  const {
    kpis,
    cashFlow,
    discrepancies,
    unmatchedItems,
    dateRange,
    selectedCategory,
    groupBy,
    isLoading,
    error,
    activeTab,
    setKPIs,
    setCashFlow,
    setDiscrepancies,
    setUnmatchedItems,
    setDateRange,
    setCategory,
    setGroupBy,
    setActiveTab,
    setLoading,
    setError,
  } = useCashBookReportsStore();

  const { state: apiState, fetchKPIs, fetchCashFlow, fetchDiscrepancies, fetchUnmatchedItems, exportReport } =
    useCashBookReportAPI();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [localFromDate, setLocalFromDate] = useState(dateRange.from);
  const [localToDate, setLocalToDate] = useState(dateRange.to);
  const [localCategory, setLocalCategory] = useState(selectedCategory || '');

  // Monitor online status
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

  // Sync API state with store
  useEffect(() => {
    if (apiState.kpis) setKPIs(apiState.kpis);
    if (apiState.cashFlow.length > 0) setCashFlow(apiState.cashFlow);
    if (apiState.discrepancies.length > 0) setDiscrepancies(apiState.discrepancies);
    if (apiState.unmatchedItems.length > 0) setUnmatchedItems(apiState.unmatchedItems);
  }, [apiState, setKPIs, setCashFlow, setDiscrepancies, setUnmatchedItems]);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      setDateRange({ from: localFromDate, to: localToDate });
      setCategory(localCategory || null);

      await Promise.all([
        fetchKPIs(localFromDate, localToDate),
        fetchCashFlow(groupBy, localFromDate, localToDate),
        fetchDiscrepancies(localFromDate, localToDate, localCategory || undefined),
        fetchUnmatchedItems(30),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      await exportReport(format, dateRange.from, dateRange.to);
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
    }
  };

  const handleGroupByChange = (newGroupBy: 'day' | 'week' | 'month') => {
    setGroupBy(newGroupBy);
    if (cashFlow.length > 0) {
      fetchCashFlow(newGroupBy, dateRange.from, dateRange.to);
    }
  };

  return (
    <div className="cash-book-report-screen">
      {/* Header */}
      <div className="screen-header">
        <div className="screen-header__top">
          <h1 className="screen-header__title">Cash Book Reports</h1>
          <button
            className="screen-header__export"
            onClick={() => handleExport('pdf')}
            disabled={!kpis || isLoading}
            title="Export report as PDF"
          >
            📥 Export
          </button>
        </div>

        {!isOnline && (
          <div className="offline-banner">
            <span className="offline-banner__icon">📡</span>
            <span>You are offline. Displaying cached data.</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: '#FFEBEE',
            color: '#C62828',
            padding: '12px 16px',
            fontSize: '14px',
            borderBottom: '1px solid #FFCDD2',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Filters */}
      <div className="screen-filters">
        <div className="filter-group">
          <label className="filter-label">From Date</label>
          <input
            type="date"
            className="filter-input"
            value={localFromDate}
            onChange={(e) => setLocalFromDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">To Date</label>
          <input
            type="date"
            className="filter-input"
            value={localToDate}
            onChange={(e) => setLocalToDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select
            className="filter-select"
            value={localCategory}
            onChange={(e) => setLocalCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="sales">Sales</option>
            <option value="purchases">Purchases</option>
            <option value="expenses">Expenses</option>
          </select>
        </div>

        <button
          className="filter-reset-btn"
          onClick={handleGenerateReport}
          disabled={isLoading || !isOnline}
          style={{ fontSize: '14px', fontWeight: 600 }}
        >
          {isLoading ? '⏳ Loading...' : '🔄 Generate Report'}
        </button>
      </div>

      {/* Tabs */}
      <div className="screen-tabs">
        <button
          className={`screen-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`screen-tab ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          Chart
        </button>
        <button
          className={`screen-tab ${activeTab === 'discrepancies' ? 'active' : ''}`}
          onClick={() => setActiveTab('discrepancies')}
        >
          Discrepancies
        </button>
      </div>

      {/* Content */}
      <div className="screen-content">
        <div className="tab-content">
          {activeTab === 'dashboard' && (
            <ReconciliationDashboard kpis={kpis} isLoading={isLoading} />
          )}

          {activeTab === 'chart' && (
            <CashFlow
              data={cashFlow}
              isLoading={isLoading}
              groupBy={groupBy}
              onGroupByChange={handleGroupByChange}
            />
          )}

          {activeTab === 'discrepancies' && (
            <DiscrepancyList
              discrepancies={discrepancies}
              isLoading={isLoading}
              onExport={handleExport}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CashBookReportScreen;

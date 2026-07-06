import React, { useEffect, useState } from 'react';
import { useGatePassStore } from '../../stores/gatePassStore';
import { GatePass } from '../../types/gate-pass';
import { Card, CardBody, CardHeader } from '../shared/Card';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import './gate-pass.css';

interface GatePassListProps {
  warehouseId: number;
  onSelectGatePass: (gatePass: GatePass) => void;
}

type StatusType = 'PENDING' | 'IN_PROGRESS' | 'CONFIRMED' | 'SHORTAGE_REPORTED' | 'REJECTED';

const STATUS_COLORS: Record<StatusType, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  'PENDING': 'warning',
  'IN_PROGRESS': 'info',
  'CONFIRMED': 'success',
  'SHORTAGE_REPORTED': 'danger',
  'REJECTED': 'danger',
};

const STATUS_LABELS: Record<StatusType, string> = {
  'PENDING': 'Pending',
  'IN_PROGRESS': 'In Progress',
  'CONFIRMED': 'Confirmed',
  'SHORTAGE_REPORTED': 'Shortage Reported',
  'REJECTED': 'Rejected',
};

export const GatePassList: React.FC<GatePassListProps> = ({ warehouseId, onSelectGatePass }) => {
  const {
    gatePasses,
    loading,
    error,
    pagination,
    filters,
    fetchGatePasses,
    setFilters,
    clearError,
  } = useGatePassStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchGatePasses(warehouseId, { status: selectedStatus, search: searchQuery });
  }, []);

  // Fetch when filters change
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setFilters({ status, skip: 0 });
    fetchGatePasses(warehouseId, { status });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFilters({ search: query, skip: 0 });
  };

  const handleSearchSubmit = () => {
    fetchGatePasses(warehouseId, { search: searchQuery, skip: 0 });
  };

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      const skip = (pagination.page - 2) * pagination.pageSize;
      setFilters({ skip });
      fetchGatePasses(warehouseId, { skip });
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      const skip = pagination.page * pagination.pageSize;
      setFilters({ skip });
      fetchGatePasses(warehouseId, { skip });
    }
  };

  const handleRefresh = () => {
    fetchGatePasses(warehouseId, { skip: 0, status: selectedStatus });
  };

  return (
    <div className="gate-pass-list-container">
      {/* Header */}
      <div className="list-header">
        <h1>Warehouse Picking</h1>
        <p className="subtitle">Manage gate passes and fulfillment</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger">
          <div className="alert-content">
            <span>{error}</span>
            <button className="alert-close" onClick={clearError}>×</button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Search gate pass number, bill, or customer..."
            value={searchQuery}
            onChange={handleSearch}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="search-input"
          />
          <button className="search-btn" onClick={handleSearchSubmit}>
            🔍
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="status-filters">
          {['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'SHORTAGE_REPORTED'].map((status) => (
            <button
              key={status}
              className={`filter-btn ${selectedStatus === status ? 'active' : ''}`}
              onClick={() => handleStatusChange(status)}
            >
              {STATUS_LABELS[status as StatusType]}
            </button>
          ))}
        </div>
        <button className="refresh-btn" onClick={handleRefresh} title="Refresh">
          ↻
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading gate passes...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && gatePasses.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No gate passes found</h3>
          <p>There are no {selectedStatus.toLowerCase()} gate passes for this warehouse.</p>
        </div>
      )}

      {/* Gate Passes List */}
      <div className="gate-passes-list">
        {gatePasses.map((gatePass) => (
          <Card
            key={gatePass.id}
            interactive
            onClick={() => onSelectGatePass(gatePass)}
            className="gate-pass-card"
          >
            <CardBody>
              {/* Header Row */}
              <div className="gate-pass-header">
                <div>
                  <h3 className="gate-pass-number">{gatePass.gate_pass_number}</h3>
                  <p className="bill-number">Bill: {gatePass.bill.bill_number}</p>
                </div>
                <Badge variant={STATUS_COLORS[gatePass.status as StatusType]}>
                  {STATUS_LABELS[gatePass.status as StatusType]}
                </Badge>
              </div>

              {/* Customer Info */}
              <div className="customer-info">
                <p className="customer-name">{gatePass.bill.customer.name}</p>
                {gatePass.bill.customer.phone && (
                  <a href={`tel:${gatePass.bill.customer.phone}`} className="customer-phone">
                    ☎ {gatePass.bill.customer.phone}
                  </a>
                )}
              </div>

              {/* Items Summary */}
              <div className="items-summary">
                <div className="item-stat">
                  <span className="label">Items:</span>
                  <span className="value">{gatePass.items.length}</span>
                </div>
                <div className="item-stat">
                  <span className="label">Total Qty:</span>
                  <span className="value">
                    {gatePass.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="item-stat">
                  <span className="label">Amount:</span>
                  <span className="value">
                    {(gatePass.bill.total_amount / 100).toLocaleString('en-PK', {
                      style: 'currency',
                      currency: 'PKR',
                    })}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {gatePass.status === 'IN_PROGRESS' && (
                <div className="progress-bar">
                  {Math.round(
                    (gatePass.items.filter((i) => i.picked_quantity > 0).length /
                      gatePass.items.length) *
                      100
                  )}% Complete
                </div>
              )}

              {/* Action Button */}
              <div className="gate-pass-action">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGatePass(gatePass);
                  }}
                >
                  {gatePass.status === 'PENDING' ? 'Start Picking' : 'Continue'}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {gatePasses.length > 0 && (
        <div className="pagination-section">
          <div className="pagination-info">
            Page {pagination.page} of{' '}
            {Math.ceil(pagination.total / pagination.pageSize)} ({pagination.total} items)
          </div>
          <div className="pagination-controls">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={pagination.page === 1}
            >
              ← Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!pagination.hasMore}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

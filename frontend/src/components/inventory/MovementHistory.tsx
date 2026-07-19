import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { InventoryMovement } from '../../types/inventory';
import { Card, CardBody, CardHeader } from '../shared/Card';
import './movement-history.css';

interface MovementHistoryProps {
  warehouseId: number;
}

type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
type ReferenceType = 'PURCHASE_ORDER' | 'GATE_PASS' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';

export const MovementHistory: React.FC<MovementHistoryProps> = ({ warehouseId }) => {
  const { movements, loading, error, fetchMovements, clearError } = useInventoryStore();

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filterType, setFilterType] = useState<MovementType | 'ALL'>('ALL');
  const [searchProduct, setSearchProduct] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch movements when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchMovements(warehouseId, fromDate, toDate);
    }
  }, [fromDate, toDate, warehouseId]);

  const filteredMovements = movements.filter((movement) => {
    const typeMatch =
      filterType === 'ALL' || movement.movementType === filterType;
    const productMatch =
      !searchProduct ||
      (movement.referenceId?.toLowerCase().includes(searchProduct.toLowerCase()));
    return typeMatch && productMatch;
  });

  const paginatedMovements = filteredMovements.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

  const getMovementIcon = (type: MovementType): string => {
    const icons: Record<MovementType, string> = {
      IN: '📥',
      OUT: '📤',
      ADJUSTMENT: '🔄',
      TRANSFER: '🚚',
      RETURN: '↩️',
    };
    return icons[type];
  };

  const getMovementColor = (type: MovementType): string => {
    const colors: Record<MovementType, string> = {
      IN: 'positive',
      OUT: 'negative',
      ADJUSTMENT: 'neutral',
      TRANSFER: 'neutral',
      RETURN: 'positive',
    };
    return colors[type];
  };

  return (
    <div className="movement-history-container">
      {/* Header */}
      <div className="history-header">
        <h1>Movement History</h1>
        <p className="subtitle">Audit trail of all stock movements</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
          <button className="alert-close" onClick={clearError}>
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <Card className="filter-card">
        <CardBody>
          <div className="filters-grid">
            {/* Date Range */}
            <div className="filter-group">
              <label>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="filter-input"
              />
            </div>

            {/* Type Filter */}
            <div className="filter-group">
              <label>Type</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as MovementType | 'ALL');
                  setPage(1);
                }}
                className="filter-input"
              >
                <option value="ALL">All Types</option>
                <option value="IN">Stock In</option>
                <option value="OUT">Stock Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="TRANSFER">Transfer</option>
                <option value="RETURN">Return</option>
              </select>
            </div>

            {/* Search */}
            <div className="filter-group">
              <label>Search Reference</label>
              <input
                type="text"
                placeholder="PO, Bill, or Transfer #"
                value={searchProduct}
                onChange={(e) => {
                  setSearchProduct(e.target.value);
                  setPage(1);
                }}
                className="filter-input"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Summary Stats */}
      <div className="history-stats">
        <div className="stat-box">
          <span className="stat-label">Total Movements</span>
          <span className="stat-value">{filteredMovements.length}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Stock In</span>
          <span className="stat-value positive">
            {filteredMovements.filter((m) => m.movementType === 'IN').length}
          </span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Stock Out</span>
          <span className="stat-value negative">
            {filteredMovements.filter((m) => m.movementType === 'OUT').length}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading movements...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMovements.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No movements found</h3>
          <p>Try adjusting your date range or filters</p>
        </div>
      )}

      {/* Movements List */}
      <div className="movements-timeline">
        {paginatedMovements.map((movement) => (
          <Card key={movement.id} className="movement-card">
            <CardBody>
              <div className="movement-header">
                <div className="movement-icon">
                  {getMovementIcon(movement.movementType as MovementType)}
                </div>
                <div className="movement-info">
                  <h4 className="movement-type">
                    {movement.movementType === 'IN'
                      ? 'Stock In'
                      : movement.movementType === 'OUT'
                      ? 'Stock Out'
                      : movement.movementType === 'ADJUSTMENT'
                      ? 'Adjustment'
                      : movement.movementType === 'TRANSFER'
                      ? 'Transfer'
                      : 'Return'}
                  </h4>
                  <p className="movement-datetime">
                    {new Date(movement.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className={`movement-qty ${getMovementColor(movement.movementType as MovementType)}`}>
                  {movement.movementType === 'IN' || movement.movementType === 'RETURN'
                    ? '+'
                    : '−'}
                  {Math.abs(movement.quantity).toLocaleString()}
                </div>
              </div>

              <div className="movement-details">
                <div className="detail-row">
                  <span className="detail-label">Reference:</span>
                  <span className="detail-value">{movement.referenceId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{movement.referenceType}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reason:</span>
                  <span className="detail-value">{movement.reason}</span>
                </div>
                {movement.createdByUser && (
                  <div className="detail-row">
                    <span className="detail-label">By:</span>
                    <span className="detail-value">
                      {movement.createdByUser.firstName}{' '}
                      {movement.createdByUser.lastName}
                    </span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {filteredMovements.length > itemsPerPage && (
        <div className="pagination-section">
          <div className="pagination-info">
            Page {page} of {totalPages} ({filteredMovements.length} total)
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span className="page-indicator">{page}</span>
            <button
              className="pagination-btn"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

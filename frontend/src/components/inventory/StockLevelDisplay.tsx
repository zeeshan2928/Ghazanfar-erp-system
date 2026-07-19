import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { Card, CardBody } from '../shared/Card';
import { Button } from '../shared/Button';
import './inventory.css';

interface StockLevelDisplayProps {
  warehouseId: number;
  onSelectItem: (productId: number) => void;
}

export const StockLevelDisplay: React.FC<StockLevelDisplayProps> = ({
  warehouseId,
  onSelectItem,
}) => {
  const { items, loading, error, pagination, fetchInventory, setFilters, clearError } =
    useInventoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'low_stock'>('name');
  const [showLowOnly, setShowLowOnly] = useState(false);

  useEffect(() => {
    fetchInventory(warehouseId, { skip: 0, take: 20 });
  }, [warehouseId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFilters({ search: query, skip: 0 });
  };

  const handleSearchSubmit = () => {
    fetchInventory(warehouseId, { search: searchQuery, skip: 0 });
  };

  const handleSort = (newSort: 'name' | 'stock' | 'low_stock') => {
    setSortBy(newSort);
    setFilters({ sortBy: newSort, skip: 0 });
    fetchInventory(warehouseId, { sortBy: newSort, skip: 0 });
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      const skip = pagination.page * pagination.pageSize;
      setFilters({ skip });
      fetchInventory(warehouseId, { skip });
    }
  };

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      const skip = (pagination.page - 2) * pagination.pageSize;
      setFilters({ skip });
      fetchInventory(warehouseId, { skip });
    }
  };

  return (
    <div className="stock-level-display">
      {/* Header */}
      <div className="display-header">
        <h1>Stock Levels</h1>
        <p className="subtitle">Monitor available and reserved inventory</p>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
          <button className="alert-close" onClick={clearError}>×</button>
        </div>
      )}

      {/* Search */}
      <div className="search-section">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Search by product name or SKU..."
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

      {/* Sort and Filter */}
      <div className="sort-section">
        <div className="sort-buttons">
          <button
            className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
            onClick={() => handleSort('name')}
          >
            A-Z
          </button>
          <button
            className={`sort-btn ${sortBy === 'stock' ? 'active' : ''}`}
            onClick={() => handleSort('stock')}
          >
            Stock High-Low
          </button>
          <button
            className={`sort-btn ${sortBy === 'low_stock' ? 'active' : ''}`}
            onClick={() => handleSort('low_stock')}
          >
            Low Stock First
          </button>
        </div>
        <button
          className={`filter-toggle ${showLowOnly ? 'active' : ''}`}
          onClick={() => setShowLowOnly(!showLowOnly)}
          title="Show only low stock items"
        >
          ⚠️
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading inventory...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No products found</h3>
          <p>Try adjusting your search filters</p>
        </div>
      )}

      {/* Stock Items List */}
      <div className="stock-items-list">
        {items.map((item) => {
          const threshold = 20; // Default threshold
          const isLow = item.available < threshold;
          const utilizationPercent =
            item.physical_on_hand > 0
              ? Math.round((item.available / item.physical_on_hand) * 100)
              : 0;

          return (
            <Card
              key={item.id}
              interactive
              onClick={() => onSelectItem(item.productId)}
              className={`stock-item ${isLow ? 'low-stock' : ''}`}
            >
              <CardBody>
                {/* Product Info */}
                <div className="product-header">
                  <div>
                    <h4 className="product-name">{item.product?.name || 'Unknown'}</h4>
                    <p className="product-sku">SKU: {item.product?.sku || 'N/A'}</p>
                  </div>
                  {isLow && <div className="low-badge">⚠ LOW</div>}
                </div>

                {/* Stock Breakdown */}
                <div className="stock-breakdown">
                  <div className="stock-stat available">
                    <span className="label">Available</span>
                    <span className="value">{item.available.toLocaleString()}</span>
                  </div>
                  <div className="stock-stat reserved">
                    <span className="label">Reserved</span>
                    <span className="value">{item.reserved.toLocaleString()}</span>
                  </div>
                  <div className="stock-stat physical">
                    <span className="label">Physical</span>
                    <span className="value">{item.physical_on_hand.toLocaleString()}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="stock-bar">
                  <div className="bar-container">
                    <div
                      className="available-bar"
                      style={{ width: `${utilizationPercent}%` }}
                      title={`Available: ${item.available}`}
                    ></div>
                    <div
                      className="reserved-bar"
                      style={{
                        width: `${100 - utilizationPercent}%`,
                      }}
                      title={`Reserved: ${item.reserved}`}
                    ></div>
                  </div>
                  <div className="bar-label">{utilizationPercent}% Available</div>
                </div>

                {/* Threshold */}
                {isLow && (
                  <div className="threshold-warning">
                    <span className="threshold-label">Threshold:</span>
                    <span className="threshold-value">{threshold}</span>
                    <span className="below-text">
                      {threshold - item.available} below threshold
                    </span>
                  </div>
                )}

                {/* Action */}
                <div className="item-action">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(item.productId);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
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

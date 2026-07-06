import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { Card, CardBody, CardHeader } from '../shared/Card';
import { Button } from '../shared/Button';
import './inventory.css';

interface InventoryDashboardProps {
  warehouseId: number;
  onViewStock: () => void;
  onAdjustStock: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  warehouseId,
  onViewStock,
  onAdjustStock,
}) => {
  const { dashboard, loading, error, fetchDashboard, clearError, fetchMovements } =
    useInventoryStore();

  useEffect(() => {
    fetchDashboard(warehouseId);
    fetchMovements(warehouseId);
  }, [warehouseId]);

  return (
    <div className="inventory-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Inventory Management</h1>
        <p className="subtitle">Monitor stock levels and movements</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
          <button className="alert-close" onClick={clearError}>×</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading inventory data...</p>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && dashboard && (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <Card className="stat-card">
              <CardBody>
                <div className="stat-content">
                  <div className="stat-label">Total Stock</div>
                  <div className="stat-value">
                    {dashboard.total_stock.toLocaleString()}
                  </div>
                  <div className="stat-unit">units</div>
                </div>
              </CardBody>
            </Card>

            <Card className="stat-card">
              <CardBody>
                <div className="stat-content">
                  <div className="stat-label">Available</div>
                  <div className="stat-value available">
                    {dashboard.available_stock.toLocaleString()}
                  </div>
                  <div className="stat-unit">ready to ship</div>
                </div>
              </CardBody>
            </Card>

            <Card className="stat-card">
              <CardBody>
                <div className="stat-content">
                  <div className="stat-label">Reserved</div>
                  <div className="stat-value reserved">
                    {dashboard.reserved_stock.toLocaleString()}
                  </div>
                  <div className="stat-unit">pending pickup</div>
                </div>
              </CardBody>
            </Card>

            <Card className="stat-card warning">
              <CardBody>
                <div className="stat-content">
                  <div className="stat-label">Low Stock</div>
                  <div className="stat-value">{dashboard.low_stock_items}</div>
                  <div className="stat-unit">products</div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <Button variant="primary" onClick={onViewStock} fullWidth>
              📊 View All Stock
            </Button>
            <Button variant="secondary" onClick={onAdjustStock} fullWidth>
              ✏️ Adjust Stock
            </Button>
          </div>

          {/* By Warehouse Breakdown */}
          {dashboard.by_warehouse.length > 0 && (
            <Card className="warehouse-breakdown">
              <CardHeader>
                <h3>Stock by Warehouse</h3>
              </CardHeader>
              <CardBody>
                <div className="warehouse-list">
                  {dashboard.by_warehouse.map((wh) => (
                    <div key={wh.warehouse_id} className="warehouse-item">
                      <div className="warehouse-name">
                        <h4>{wh.warehouse_name}</h4>
                        <p className="warehouse-total">
                          Total: {wh.total.toLocaleString()}
                        </p>
                      </div>
                      <div className="warehouse-breakdown">
                        <div className="breakdown-bar">
                          <div
                            className="available-part"
                            style={{
                              width: `${wh.total > 0 ? (wh.available / wh.total) * 100 : 0}%`,
                            }}
                            title={`Available: ${wh.available}`}
                          ></div>
                          <div
                            className="reserved-part"
                            style={{
                              width: `${wh.total > 0 ? (wh.reserved / wh.total) * 100 : 0}%`,
                            }}
                            title={`Reserved: ${wh.reserved}`}
                          ></div>
                        </div>
                        <div className="breakdown-legend">
                          <span className="available">
                            Available: {wh.available.toLocaleString()}
                          </span>
                          <span className="reserved">
                            Reserved: {wh.reserved.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Recent Movements */}
          {dashboard.recent_movements && dashboard.recent_movements.length > 0 && (
            <Card className="recent-movements">
              <CardHeader>
                <h3>Recent Movements</h3>
                <a href="#" className="see-all-link">
                  View All →
                </a>
              </CardHeader>
              <CardBody>
                <div className="movements-list">
                  {dashboard.recent_movements.slice(0, 5).map((movement) => (
                    <div key={movement.id} className="movement-item">
                      <div className="movement-type">
                        {movement.movement_type === 'IN' ? (
                          <span className="badge-in">📥 IN</span>
                        ) : (
                          <span className="badge-out">📤 OUT</span>
                        )}
                      </div>
                      <div className="movement-info">
                        <p className="movement-ref">
                          {movement.reference_type}: {movement.reference_id}
                        </p>
                        <p className="movement-time">
                          {new Date(movement.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="movement-qty">
                        <span className={movement.movement_type === 'IN' ? 'positive' : 'negative'}>
                          {movement.movement_type === 'IN' ? '+' : '−'}
                          {Math.abs(movement.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

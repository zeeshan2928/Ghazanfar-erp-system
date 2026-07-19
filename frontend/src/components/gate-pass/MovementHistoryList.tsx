import React, { useEffect, useState } from 'react';
import { useGatePassStore } from '../../stores/gatePassStore';
import { Card, CardBody } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { GatePass } from '../../types/gate-pass';
import './gate-pass.css';

interface MovementHistoryListProps {
  warehouseId: number;
}

export const MovementHistoryList: React.FC<MovementHistoryListProps> = ({ warehouseId }) => {
  const { gatePasses, loading, error, fetchGatePasses } = useGatePassStore();
  const [historyItems, setHistoryItems] = useState<GatePass[]>([]);

  useEffect(() => {
    // Fetch confirmed/dispatched gate passes for history
    const loadHistory = async () => {
      // In a real scenario, we might want to fetch both CONFIRMED and DISPATCHED
      // For now, let's fetch CONFIRMED
      await fetchGatePasses(warehouseId, { status: 'CONFIRMED', take: 20 });
    };
    loadHistory();
  }, [warehouseId, fetchGatePasses]);

  useEffect(() => {
    // Filter locally to ensure we only show confirmed/dispatched
    const filtered = gatePasses.filter(
      (gp) => gp.status === 'CONFIRMED' || gp.status === 'DISPATCHED'
    );
    setHistoryItems(filtered);
  }, [gatePasses]);

  if (loading && historyItems.length === 0) {
    return (
      <div className="gate-pass-list-container">
        <div className="list-header">
          <h1>Activity History</h1>
          <p className="subtitle">Recent stock movements</p>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gate-pass-list-container">
      <div className="list-header">
        <h1>Activity History</h1>
        <p className="subtitle">Recent stock movements</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
        </div>
      )}

      {historyItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No recent activity</h3>
          <p>You have not confirmed any gate passes recently.</p>
        </div>
      ) : (
        <div className="gate-passes-list">
          {historyItems.map((gatePass) => (
            <Card key={gatePass.id} className="gate-pass-card history-card">
              <CardBody>
                <div className="gate-pass-header">
                  <div>
                    <h3 className="gate-pass-number">{gatePass.gate_pass_number}</h3>
                    <p className="bill-number">Date: {new Date(gatePass.updatedAt || gatePass.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge variant="success">Completed</Badge>
                </div>

                <div className="customer-info">
                  <p className="customer-name">{gatePass.bill.customer.name}</p>
                </div>

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
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

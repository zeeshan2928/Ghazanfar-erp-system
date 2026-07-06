import React, { useState } from 'react';
import { useGatePassStore } from '../../stores/gatePassStore';
import { GatePass, GatePassItem } from '../../types/gate-pass';
import { Card, CardBody, CardHeader } from '../shared/Card';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import './gate-pass.css';

interface PickingInterfaceProps {
  gatePass: GatePass;
  onConfirm: () => void;
  onClose: () => void;
}

export const PickingInterface: React.FC<PickingInterfaceProps> = ({
  gatePass,
  onConfirm,
  onClose,
}) => {
  const { loading, confirmGatePass } = useGatePassStore();
  const [items, setItems] = useState<Map<number, number>>(
    new Map(gatePass.items.map((item) => [item.id, item.picked_quantity]))
  );
  const [showShortageForm, setShowShortageForm] = useState<number | null>(null);
  const [shortageNotes, setShortageNotes] = useState<string>('');

  const totalItems = gatePass.items.length;
  const pickedItems = gatePass.items.filter((item) => items.get(item.id)! > 0).length;
  const pickProgress = ((pickedItems / totalItems) * 100).toFixed(0);

  const handlePickItem = (itemId: number, quantity: number) => {
    setItems((prev) => {
      const updated = new Map(prev);
      updated.set(itemId, Math.max(0, Math.min(quantity, gatePass.items.find(i => i.id === itemId)?.quantity || 0)));
      return updated;
    });
  };

  const handleReportShortage = async (item: GatePassItem) => {
    // Would open shortage reporting form
    setShowShortageForm(item.id);
  };

  const handleConfirm = async () => {
    const pickedItemsData = Array.from(items.entries()).map(([itemId, quantity]) => ({
      itemId,
      pickedQuantity: quantity,
    }));

    await confirmGatePass(gatePass.id, pickedItemsData);
    onConfirm();
  };

  return (
    <div className="picking-interface">
      {/* Header */}
      <div className="picking-header">
        <button className="back-btn" onClick={onClose}>
          ← Back
        </button>
        <div className="picking-title">
          <h2>{gatePass.gate_pass_number}</h2>
          <p>Order: {gatePass.bill.bill_number}</p>
        </div>
      </div>

      {/* Customer Info Bar */}
      <Card className="customer-bar">
        <CardBody>
          <div className="customer-details">
            <div>
              <h4>{gatePass.bill.customer.name}</h4>
              {gatePass.bill.customer.phone && (
                <p className="phone">☎ {gatePass.bill.customer.phone}</p>
              )}
            </div>
            <div className="order-amount">
              {(gatePass.bill.total_amount / 100).toLocaleString('en-PK', {
                style: 'currency',
                currency: 'PKR',
              })}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Progress */}
      <div className="picking-progress">
        <div className="progress-stat">
          <span className="label">Items Picked</span>
          <span className="value">
            {pickedItems} of {totalItems}
          </span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${pickProgress}%` }}></div>
        </div>
        <div className="progress-percentage">{pickProgress}%</div>
      </div>

      {/* Items List */}
      <div className="picking-items">
        <h3 className="section-title">Items to Pick</h3>

        {gatePass.items.map((item) => {
          const picked = items.get(item.id) || 0;
          const required = item.quantity;
          const isComplete = picked >= required;
          const isShortage = picked > 0 && picked < required;

          return (
            <Card key={item.id} className={`picking-item ${isComplete ? 'complete' : ''} ${isShortage ? 'shortage' : ''}`}>
              <CardBody>
                <div className="item-header">
                  <div className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={isComplete}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handlePickItem(item.id, required);
                        } else {
                          handlePickItem(item.id, 0);
                        }
                      }}
                    />
                  </div>
                  <div className="item-info">
                    <h4 className="product-name">{item.billLine?.product.name || 'Unknown'}</h4>
                    <p className="product-sku">SKU: {item.billLine?.product.sku || 'N/A'}</p>
                  </div>
                  {isComplete && <Badge variant="success">✓ Complete</Badge>}
                  {isShortage && <Badge variant="warning">Partial</Badge>}
                </div>

                <div className="item-quantities">
                  <div className="quantity-group">
                    <label>Required:</label>
                    <span className="qty-value">{required}</span>
                  </div>
                  <div className="quantity-group">
                    <label>Picked:</label>
                    <div className="qty-input-group">
                      <button
                        className="qty-btn"
                        onClick={() => handlePickItem(item.id, Math.max(0, picked - 1))}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={required}
                        value={picked}
                        onChange={(e) =>
                          handlePickItem(item.id, parseInt(e.target.value) || 0)
                        }
                        className="qty-input"
                      />
                      <button
                        className="qty-btn"
                        onClick={() => handlePickItem(item.id, Math.min(required, picked + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {isShortage && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleReportShortage(item)}
                    className="shortage-btn"
                  >
                    ⚠ Report Shortage
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Shortage Form Modal (simplified) */}
      {showShortageForm !== null && (
        <div className="modal-overlay">
          <Card className="shortage-modal">
            <CardHeader>
              <h3>Report Shortage</h3>
            </CardHeader>
            <CardBody>
              <p>Additional notes about this shortage:</p>
              <textarea
                value={shortageNotes}
                onChange={(e) => setShortageNotes(e.target.value)}
                placeholder="Describe the issue..."
                className="shortage-notes"
              />
              <div className="modal-actions">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowShortageForm(null);
                    setShortageNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button variant="danger">Submit Shortage</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="picking-actions">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={handleConfirm}
          loading={loading}
          disabled={pickedItems === 0}
        >
          ✓ Confirm Picked Items
        </Button>
      </div>
    </div>
  );
};

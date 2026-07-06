import React, { useState } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { Card, CardBody, CardHeader } from '../shared/Card';
import { Button } from '../shared/Button';
import './inventory.css';

interface StockAdjustmentFormProps {
  warehouseId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type AdjustmentType = 'ADD' | 'REMOVE' | 'CORRECT';
type ReasonType =
  | 'PURCHASE'
  | 'DAMAGE'
  | 'THEFT'
  | 'AUDIT'
  | 'CORRECTION'
  | 'RETURN'
  | 'OTHER';

const REASON_OPTIONS: Record<ReasonType, string> = {
  PURCHASE: 'Purchase Order Received',
  DAMAGE: 'Damaged Stock',
  THEFT: 'Missing/Theft',
  AUDIT: 'Physical Audit',
  CORRECTION: 'Inventory Correction',
  RETURN: 'Customer Return',
  OTHER: 'Other',
};

export const StockAdjustmentForm: React.FC<StockAdjustmentFormProps> = ({
  warehouseId,
  onSuccess,
  onCancel,
}) => {
  const { adjustStock, loading, error, clearError } = useInventoryStore();

  const [formData, setFormData] = useState({
    product_id: '',
    adjustment_type: 'ADD' as AdjustmentType,
    quantity: '',
    reason: 'PURCHASE' as ReasonType,
    reference: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_id) {
      newErrors.product_id = 'Product is required';
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (!formData.reason) {
      newErrors.reason = 'Reason is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await adjustStock({
        warehouse_id: warehouseId,
        product_id: parseInt(formData.product_id),
        adjustment_type: formData.adjustment_type,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stock-adjustment-form">
      {/* Header */}
      <div className="form-header">
        <h2>Stock Adjustment</h2>
        <p>Add or remove stock from inventory</p>
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

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="form-content">
            {/* Type Selector */}
            <div className="form-group">
              <label className="form-label">Type of Adjustment</label>
              <div className="type-buttons">
                <button
                  type="button"
                  className={`type-btn ${formData.adjustment_type === 'ADD' ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, adjustment_type: 'ADD' }))}
                >
                  📥 Add Stock
                </button>
                <button
                  type="button"
                  className={`type-btn ${formData.adjustment_type === 'REMOVE' ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, adjustment_type: 'REMOVE' }))}
                >
                  📤 Remove Stock
                </button>
                <button
                  type="button"
                  className={`type-btn ${formData.adjustment_type === 'CORRECT' ? 'active' : ''}`}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, adjustment_type: 'CORRECT' }))
                  }
                >
                  🔄 Correction
                </button>
              </div>
            </div>

            {/* Product Selection */}
            <div className="form-group">
              <label className="form-label" htmlFor="product_id">
                Product *
              </label>
              <select
                id="product_id"
                name="product_id"
                value={formData.product_id}
                onChange={handleInputChange}
                className={`form-input ${errors.product_id ? 'error' : ''}`}
              >
                <option value="">Select a product...</option>
                <option value="1">Product A (SKU-001)</option>
                <option value="2">Product B (SKU-002)</option>
                <option value="3">Product C (SKU-003)</option>
              </select>
              {errors.product_id && (
                <span className="error-message">{errors.product_id}</span>
              )}
            </div>

            {/* Quantity */}
            <div className="form-group">
              <label className="form-label" htmlFor="quantity">
                Quantity *
              </label>
              <div className="quantity-input-group">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: Math.max(0, parseInt(prev.quantity || '0') - 1).toString(),
                    }))
                  }
                >
                  −
                </button>
                <input
                  id="quantity"
                  type="number"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="0"
                  className={`form-input qty-input ${errors.quantity ? 'error' : ''}`}
                />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: (parseInt(prev.quantity || '0') + 1).toString(),
                    }))
                  }
                >
                  +
                </button>
              </div>
              {errors.quantity && (
                <span className="error-message">{errors.quantity}</span>
              )}
            </div>

            {/* Reason */}
            <div className="form-group">
              <label className="form-label" htmlFor="reason">
                Reason *
              </label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className={`form-input ${errors.reason ? 'error' : ''}`}
              >
                {Object.entries(REASON_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.reason && (
                <span className="error-message">{errors.reason}</span>
              )}
            </div>

            {/* Reference */}
            <div className="form-group">
              <label className="form-label" htmlFor="reference">
                Reference (Optional)
              </label>
              <input
                id="reference"
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleInputChange}
                placeholder="e.g., PO-2026-001"
                className="form-input"
              />
              <span className="help-text">PO number, bill number, or reference ID</span>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="notes">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional details..."
                rows={3}
                className="form-input"
              />
            </div>

            {/* Actions */}
            <div className="form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="success" loading={submitting}>
                ✓ Confirm Adjustment
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

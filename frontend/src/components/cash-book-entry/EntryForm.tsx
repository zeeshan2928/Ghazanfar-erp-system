import React, { useState, FormEvent, ChangeEvent } from 'react';
import { CashBookEntry, useCashBookEntryStore } from '../../stores/cash-book/entryStore';
import { useCashBookEntryAPI } from '../../services/cash-book/entryApiIntegration';
import './entry-form.css';

interface EntryFormProps {
  initialEntry?: CashBookEntry | null;
  onSuccess?: (entry: CashBookEntry) => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  'SALES_RECEIPT',
  'PURCHASE_PAYMENT',
  'OPERATING_EXPENSE',
  'LOAN_PAYMENT',
  'LOAN_RECEIVED',
  'EQUIPMENT',
  'OTHER_INCOME',
  'OTHER_EXPENSE',
];

const PAYMENT_METHODS = ['CASH', 'CHEQUE', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CREDIT'];

export function EntryForm({ initialEntry, onSuccess, onCancel }: EntryFormProps): JSX.Element {
  const store = useCashBookEntryStore();
  const api = useCashBookEntryAPI();
  const isEditing = Boolean(initialEntry);

  const [formData, setFormData] = useState({
    date: initialEntry?.date.split('T')[0] || new Date().toISOString().split('T')[0],
    amount: initialEntry?.amount || '',
    description: initialEntry?.description || '',
    category: initialEntry?.category || 'SALES_RECEIPT',
    paymentMethod: initialEntry?.paymentMethod || 'CASH',
    referenceNumber: initialEntry?.referenceNumber || '',
    notes: initialEntry?.notes || '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const errors: Record<string, string> = {};

  if (touched.date && !formData.date) {
    errors.date = 'Date is required';
  }

  if (touched.amount) {
    if (!formData.amount) {
      errors.amount = 'Amount is required';
    } else if (Number(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
  }

  if (touched.description && !formData.description.trim()) {
    errors.description = 'Description is required';
  }

  if (touched.referenceNumber && !formData.referenceNumber.trim()) {
    errors.referenceNumber = 'Reference number is required';
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setServerError(null);

    // Mark all fields as touched for validation
    setTouched({
      date: true,
      amount: true,
      description: true,
      referenceNumber: true,
    });

    // Check if there are errors
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = {
      date: formData.date,
      amount: Math.round(Number(formData.amount) * 100), // Convert to paisa
      description: formData.description.trim(),
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      referenceNumber: formData.referenceNumber.trim(),
      notes: formData.notes.trim() || undefined,
    };

    if (isEditing && initialEntry) {
      const result = await api.updateEntry(initialEntry.id, payload);
      if (result) {
        onSuccess?.(result);
      } else if (store.error) {
        setServerError(store.error);
      }
    } else {
      const result = await api.createEntry(payload);
      if (result) {
        // Clear form for next entry
        setFormData({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          description: '',
          category: 'SALES_RECEIPT',
          paymentMethod: 'CASH',
          referenceNumber: '',
          notes: '',
        });
        setTouched({});
        onSuccess?.(result);
      } else if (store.error) {
        setServerError(store.error);
      }
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form className="entry-form" onSubmit={handleSubmit} noValidate>
      {(serverError || store.error) && (
        <div className="entry-form__error-banner">
          <strong>Error:</strong> {serverError || store.error}
        </div>
      )}

      {!api.isOnline && (
        <div className="entry-form__offline-banner">
          📱 Offline mode - entries will sync when connection restored
        </div>
      )}

      <div className="entry-form__group">
        <label htmlFor="date" className="entry-form__label">
          Date <span className="entry-form__required">*</span>
        </label>
        <input
          id="date"
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`entry-form__input ${touched.date && errors.date ? 'entry-form__input--error' : ''}`}
          required
          disabled={store.isLoading}
        />
        {touched.date && errors.date && (
          <span className="entry-form__error-text">{errors.date}</span>
        )}
      </div>

      <div className="entry-form__row">
        <div className="entry-form__group">
          <label htmlFor="amount" className="entry-form__label">
            Amount (Rs.) <span className="entry-form__required">*</span>
          </label>
          <input
            id="amount"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`entry-form__input ${touched.amount && errors.amount ? 'entry-form__input--error' : ''}`}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            disabled={store.isLoading}
          />
          {touched.amount && errors.amount && (
            <span className="entry-form__error-text">{errors.amount}</span>
          )}
        </div>

        <div className="entry-form__group">
          <label htmlFor="category" className="entry-form__label">
            Category <span className="entry-form__required">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="entry-form__select"
            disabled={store.isLoading}
            required
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="entry-form__row">
        <div className="entry-form__group">
          <label htmlFor="paymentMethod" className="entry-form__label">
            Payment Method <span className="entry-form__required">*</span>
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            className="entry-form__select"
            disabled={store.isLoading}
            required
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="entry-form__group">
          <label htmlFor="referenceNumber" className="entry-form__label">
            Reference # <span className="entry-form__required">*</span>
          </label>
          <input
            id="referenceNumber"
            type="text"
            name="referenceNumber"
            value={formData.referenceNumber}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`entry-form__input ${touched.referenceNumber && errors.referenceNumber ? 'entry-form__input--error' : ''}`}
            placeholder="Cheque #, Transaction ID"
            required
            disabled={store.isLoading}
          />
          {touched.referenceNumber && errors.referenceNumber && (
            <span className="entry-form__error-text">{errors.referenceNumber}</span>
          )}
        </div>
      </div>

      <div className="entry-form__group">
        <label htmlFor="description" className="entry-form__label">
          Description <span className="entry-form__required">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`entry-form__textarea ${touched.description && errors.description ? 'entry-form__textarea--error' : ''}`}
          placeholder="What is this payment for?"
          rows={3}
          disabled={store.isLoading}
          required
        />
        {touched.description && errors.description && (
          <span className="entry-form__error-text">{errors.description}</span>
        )}
      </div>

      <div className="entry-form__group">
        <label htmlFor="notes" className="entry-form__label">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="entry-form__textarea"
          placeholder="Additional notes..."
          rows={2}
          disabled={store.isLoading}
        />
      </div>

      <div className="entry-form__actions">
        <button
          type="submit"
          className="entry-form__button entry-form__button--primary"
          disabled={store.isLoading || hasErrors}
        >
          {store.isLoading ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="entry-form__button entry-form__button--secondary"
            onClick={onCancel}
            disabled={store.isLoading}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

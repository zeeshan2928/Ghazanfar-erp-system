import React, { useRef } from 'react';
import { GatePass } from '../../types/gate-pass';
import '../styles/print-label.css';

interface PrintLabelProps {
  gatePass: GatePass;
  onClose: () => void;
}

export const PrintLabel: React.FC<PrintLabelProps> = ({ gatePass, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gate Pass Label - ${gatePass.gate_pass_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            .label {
              width: 4in;
              height: 6in;
              padding: 0.25in;
              border: 1px solid #000;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .label-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 0.1in; }
            .label-header h1 { font-size: 18px; font-weight: bold; }
            .label-content { flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .label-row { display: flex; justify-content: space-between; margin: 0.1in 0; font-size: 12px; }
            .label-row label { font-weight: bold; }
            .barcode { text-align: center; margin: 0.2in 0; font-family: 'Code128', monospace; font-size: 24px; }
            .label-footer { text-align: center; border-top: 1px solid #000; padding-top: 0.1in; font-size: 10px; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const generateCode128 = (text: string): string => {
    // Simplified Code128 representation for display
    return text.split('').map((_, i) => (i % 2 === 0 ? '█' : ' ')).join('');
  };

  const itemCount = gatePass.items.length;
  const totalQty = gatePass.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="print-label-container">
      {/* Preview */}
      <div className="print-preview">
        <div className="preview-label" ref={printRef}>
          <div className="label-header">
            <h1>GATE PASS</h1>
            <p>{gatePass.gate_pass_number}</p>
          </div>

          <div className="label-content">
            <div className="label-section">
              <div className="label-row">
                <span className="label-key">Bill:</span>
                <span className="label-value">{gatePass.bill.bill_number}</span>
              </div>
              <div className="label-row">
                <span className="label-key">Customer:</span>
                <span className="label-value">{gatePass.bill.customer.name}</span>
              </div>
            </div>

            <div className="label-section">
              <div className="label-row">
                <span className="label-key">Items:</span>
                <span className="label-value">{itemCount}</span>
              </div>
              <div className="label-row">
                <span className="label-key">Qty:</span>
                <span className="label-value">{totalQty}</span>
              </div>
            </div>

            <div className="barcode-section">
              <p className="barcode-text">{generateCode128(gatePass.gate_pass_number)}</p>
              <p className="barcode-number">{gatePass.gate_pass_number}</p>
            </div>

            <div className="label-section">
              <div className="label-row">
                <span className="label-key">Amount:</span>
                <span className="label-value">
                  {(gatePass.bill.total_amount / 100).toFixed(0)} PKR
                </span>
              </div>
              <div className="label-row">
                <span className="label-key">Date:</span>
                <span className="label-value">
                  {new Date(gatePass.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="label-footer">
            <p>Warehouse: {gatePass.warehouse?.name || 'Main'}</p>
            <p>{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="print-actions">
        <button className="print-btn primary" onClick={handlePrint}>
          🖨️ Print Label
        </button>
        <button className="print-btn secondary" onClick={onClose}>
          Close
        </button>
      </div>

      {/* Tips */}
      <div className="print-tips">
        <h3>Print Tips:</h3>
        <ul>
          <li>Use 4"x6" thermal printer paper</li>
          <li>Set printer to 100% scale (no scaling)</li>
          <li>Ensure barcode is clearly visible</li>
          <li>Print multiple copies if needed</li>
        </ul>
      </div>
    </div>
  );
};

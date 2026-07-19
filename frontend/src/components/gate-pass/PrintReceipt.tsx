import React, { useRef } from 'react';
import { GatePass } from '../../types/gate-pass';
import '../styles/print-label.css'; // We'll reuse some CSS or add new ones

interface PrintReceiptProps {
  gatePass: GatePass;
  onClose: () => void;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ gatePass, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '', 'height=800,width=400');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${gatePass.gate_pass_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 12px;
              color: #000;
              background: #fff;
              width: 80mm; /* Standard thermal receipt width */
              margin: 0 auto;
              padding: 5mm;
            }
            .receipt-header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .receipt-header h1 { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .receipt-info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .receipt-info p { margin: 2px 0; }
            .item-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .item-table th, .item-table td { text-align: left; padding: 3px 0; }
            .item-table th { border-bottom: 1px dashed #000; font-weight: normal; }
            .item-table .qty { text-align: right; }
            .totals { border-top: 1px dashed #000; padding-top: 5px; margin-bottom: 15px; }
            .totals-row { display: flex; justify-content: space-between; font-weight: bold; }
            .barcode-section { text-align: center; margin: 15px 0; }
            .barcode { font-family: 'Code128', monospace; font-size: 32px; letter-spacing: 0; }
            .barcode-text { font-size: 10px; margin-top: 5px; }
            .receipt-footer { text-align: center; font-size: 10px; margin-top: 20px; }
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
    return text.split('').map((_, i) => (i % 2 === 0 ? '█' : '│')).join('');
  };

  return (
    <div className="print-label-container">
      {/* Preview */}
      <div className="print-preview" style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <div 
          className="preview-receipt" 
          ref={printRef}
          style={{ width: '80mm', background: '#fff', padding: '5mm', margin: '0 auto', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          <div className="receipt-header">
            <h1>GHAZANFAR ERP</h1>
            <p>Gate Pass Receipt</p>
          </div>

          <div className="receipt-info">
            <p><strong>GP#:</strong> {gatePass.gate_pass_number}</p>
            <p><strong>Bill#:</strong> {gatePass.bill.bill_number}</p>
            <p><strong>Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p><strong>Customer:</strong> {gatePass.bill.customer.name}</p>
          </div>

          <table className="item-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="qty">Qty</th>
              </tr>
            </thead>
            <tbody>
              {gatePass.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ paddingRight: '10px' }}>{item.product.name}</td>
                  <td className="qty">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div className="totals-row">
              <span>Total Items:</span>
              <span>{gatePass.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
          </div>

          <div className="barcode-section">
            <div className="barcode">{generateCode128(gatePass.gate_pass_number)}</div>
            <div className="barcode-text">{gatePass.gate_pass_number}</div>
          </div>

          <div className="receipt-footer">
            <p>Warehouse: {gatePass.warehouse?.name || 'Main'}</p>
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="print-actions">
        <button className="print-btn primary" onClick={handlePrint}>
          🖨️ Print Receipt (80mm)
        </button>
        <button className="print-btn secondary" onClick={onClose}>
          Close
        </button>
      </div>
      
      <div className="print-tips">
        <h3>Print Tips:</h3>
        <ul>
          <li>Use 80mm thermal receipt printer</li>
          <li>Set margins to 'None' in print dialog</li>
        </ul>
      </div>
    </div>
  );
};

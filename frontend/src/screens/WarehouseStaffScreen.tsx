import React, { useEffect, useState } from 'react';
import { GatePassList } from '../components/gate-pass/GatePassList';
import { PickingInterface } from '../components/gate-pass/PickingInterface';
import { QRScanner } from '../components/gate-pass/QRScanner';
import { PrintLabel } from '../components/gate-pass/PrintLabel';
import { BottomNavigation } from '../components/navigation/BottomNavigation';
import { useGatePassStore } from '../stores/gatePassStore';
import { GatePass } from '../types/gate-pass';
import './warehouse-staff-screen.css';

type ScreenMode = 'list' | 'picking' | 'scanner' | 'print' | 'inventory' | 'history';

interface WarehouseStaffScreenProps {
  warehouseId?: number;
  userId?: number;
}

export const WarehouseStaffScreen: React.FC<WarehouseStaffScreenProps> = ({
  warehouseId = 1,
  userId = 1,
}) => {
  const { selectedGatePass, selectGatePass } = useGatePassStore();
  const [currentScreen, setCurrentScreen] = useState<ScreenMode>('list');
  const [showScanner, setShowScanner] = useState(false);
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const [gatePassForPrint, setGatePassForPrint] = useState<GatePass | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Simulate getting pending count
  useEffect(() => {
    setPendingCount(Math.floor(Math.random() * 12) + 1);
  }, []);

  const handleSelectGatePass = (gatePass: GatePass) => {
    selectGatePass(gatePass);
    setCurrentScreen('picking');
  };

  const handleScanQR = (data: string) => {
    console.log('Scanned:', data);
    // Parse barcode and find product
    // This would integrate with product lookup
    setShowScanner(false);
    // Show product selected feedback
  };

  const handlePrintLabel = () => {
    if (selectedGatePass) {
      setGatePassForPrint(selectedGatePass);
      setShowPrintLabel(true);
    }
  };

  const handleTabChange = (tabId: string) => {
    setCurrentScreen(tabId as ScreenMode);
    selectGatePass(null);
  };

  return (
    <div className="warehouse-staff-screen">
      {/* Main Content */}
      <div className="screen-content">
        {/* Picking Screen */}
        {currentScreen === 'picking' && selectedGatePass ? (
          <div className="picking-container">
            <PickingInterface
              gatePass={selectedGatePass}
              onConfirm={() => {
                setCurrentScreen('list');
                selectGatePass(null);
              }}
              onClose={() => {
                setCurrentScreen('list');
                selectGatePass(null);
              }}
            />

            {/* Quick Actions */}
            <div className="picking-quick-actions">
              <button
                className="quick-action-btn"
                onClick={() => setShowScanner(true)}
                title="Scan product barcode"
              >
                📱 Scan QR
              </button>
              <button
                className="quick-action-btn"
                onClick={handlePrintLabel}
                title="Print gate pass label"
              >
                🖨️ Print
              </button>
              <button
                className="quick-action-btn"
                onClick={() => {
                  const phone = selectedGatePass.bill.customer.phone;
                  if (phone) window.open(`tel:${phone}`);
                }}
                title="Call customer"
              >
                ☎️ Call
              </button>
            </div>
          </div>
        ) : currentScreen === 'list' ? (
          <GatePassList
            warehouseId={warehouseId}
            onSelectGatePass={handleSelectGatePass}
          />
        ) : currentScreen === 'inventory' ? (
          <div className="placeholder-screen">
            <div className="placeholder-icon">📊</div>
            <h2>Inventory Management</h2>
            <p>Quick inventory check and stock status</p>
            <p className="coming-soon">(Available in next phase)</p>
          </div>
        ) : currentScreen === 'history' ? (
          <div className="placeholder-screen">
            <div className="placeholder-icon">📋</div>
            <h2>Activity History</h2>
            <p>View your picking history and completed tasks</p>
            <p className="coming-soon">(Available in next phase)</p>
          </div>
        ) : currentScreen === 'settings' ? (
          <div className="placeholder-screen">
            <div className="placeholder-icon">⚙️</div>
            <h2>Settings</h2>
            <p>Preferences and user settings</p>
            <p className="coming-soon">(Available in next phase)</p>
          </div>
        ) : null}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleScanQR}
          onClose={() => setShowScanner(false)}
          placeholder="Scan product barcode"
        />
      )}

      {/* Print Label Modal */}
      {showPrintLabel && gatePassForPrint && (
        <div className="modal-overlay">
          <div className="modal-content">
            <PrintLabel
              gatePass={gatePassForPrint}
              onClose={() => {
                setShowPrintLabel(false);
                setGatePassForPrint(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={currentScreen}
        onTabChange={handleTabChange}
        items={[
          { id: 'list', label: 'Picking', icon: '📦', badge: pendingCount },
          { id: 'inventory', label: 'Inventory', icon: '📊' },
          { id: 'history', label: 'History', icon: '📋' },
          { id: 'settings', label: 'Settings', icon: '⚙️' },
        ]}
      />
    </div>
  );
};

export default WarehouseStaffScreen;

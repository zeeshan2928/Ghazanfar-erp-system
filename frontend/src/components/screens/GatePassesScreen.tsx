import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { GatePassDashboard } from '../GatePassDashboard';

export function GatePassesScreen() {
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

  useEffect(() => {
    apiClient.getWarehouses().then((res) => {
      const list = Array.isArray(res) ? res : res.data || [];
      setWarehouses(list);
      if (list.length > 0) setWarehouseId(list[0].id);
    });
  }, []);

  if (warehouseId === null) return <p style={{ padding: 20 }}>Loading warehouses...</p>;

  return (
    <div>
      <div style={{ padding: '20px 20px 0' }}>
        <label>Warehouse: </label>
        <select value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))}>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      <GatePassDashboard warehouseId={warehouseId} />
    </div>
  );
}

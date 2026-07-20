import { useState } from 'react';
import { inventoryApi } from '../api/resources';
import {
  PageHeader, Card, Field, Badge, BloodBadge, Alert, Empty,
  BLOOD_GROUPS, formatDate
} from '../components/Shared';

export default function InventoryPage() {
  const [bankId, setBankId] = useState('');
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    bloodGroup: 'O+', unitsAvailable: 10, lowStockThreshold: 10,
    expiryDate: '', batchNumber: '', storageLocation: ''
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const loadAll = async (id) => {
    setError('');
    try {
      const [s, a, list] = await Promise.all([
        inventoryApi.summary(id),
        inventoryApi.alerts(id),
        inventoryApi.list({ bloodBank: id })
      ]);
      setSummary(s.data);
      setAlerts(a.data);
      setItems(list.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLoad = (e) => {
    e.preventDefault();
    if (bankId) loadAll(bankId);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await inventoryApi.add({ ...form, bloodBank: bankId });
      setNotice('Stock added.');
      loadAll(bankId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConsume = async (id) => {
    const units = prompt('How many units to issue?');
    if (!units) return;
    setError('');
    try {
      const res = await inventoryApi.consume(id, Number(units));
      setNotice(res.message);
      loadAll(bankId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Blood Inventory"
        subtitle="Manage stock by group and batch, with automatic low-stock and expiry alerts."
      />

      <Alert message={error} onDismiss={() => setError('')} />
      <Alert type="success" message={notice} onDismiss={() => setNotice('')} />

      <Card title="Select Blood Bank">
        <form onSubmit={handleLoad} className="form-row">
          <Field label="Blood Bank ID">
            <input value={bankId} onChange={(e) => setBankId(e.target.value)} required />
          </Field>
          <div style={{ alignSelf: 'flex-end', paddingBottom: 12 }}>
            <button type="submit">Load</button>
          </div>
        </form>
      </Card>

      {alerts && (
        <Card title={`Alerts (${alerts.alertCount})`}>
          <div className="grid grid-3">
            <div>
              <h3>Low Stock ({alerts.lowStock.length})</h3>
              {alerts.lowStock.length === 0 ? <span className="muted">None</span> :
                alerts.lowStock.map((a) => (
                  <div key={a.bloodGroup} style={{ marginBottom: 6 }}>
                    <BloodBadge group={a.bloodGroup} />{' '}
                    <span className="muted">
                      {a.totalUnits}/{a.threshold} — short by {a.shortfall}
                    </span>
                  </div>
                ))}
            </div>
            <div>
              <h3>Expiring Soon ({alerts.expiringSoon.length})</h3>
              {alerts.expiringSoon.length === 0 ? <span className="muted">None</span> :
                alerts.expiringSoon.map((a) => (
                  <div key={a.inventoryId} style={{ marginBottom: 6 }}>
                    <BloodBadge group={a.bloodGroup} />{' '}
                    <Badge type="warn">{a.daysUntilExpiry} days</Badge>{' '}
                    <span className="muted">{a.batchNumber}</span>
                  </div>
                ))}
            </div>
            <div>
              <h3>Expired ({alerts.expired.length})</h3>
              {alerts.expired.length === 0 ? <span className="muted">None</span> :
                alerts.expired.map((a) => (
                  <div key={a.inventoryId} style={{ marginBottom: 6 }}>
                    <BloodBadge group={a.bloodGroup} />{' '}
                    <Badge type="bad">expired</Badge>{' '}
                    <span className="muted">{a.batchNumber}</span>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}

      {summary && (
        <Card title="Stock Summary">
          <table>
            <thead>
              <tr><th>Group</th><th>Units</th><th>Threshold</th><th>Batches</th><th>Status</th></tr>
            </thead>
            <tbody>
              {Object.entries(summary).map(([group, v]) => (
                <tr key={group}>
                  <td><BloodBadge group={group} /></td>
                  <td><b>{v.totalUnits}</b></td>
                  <td className="muted">{v.threshold}</td>
                  <td className="muted">{v.batches}</td>
                  <td>
                    {v.isLowStock
                      ? <Badge type="bad">Low stock</Badge>
                      : <Badge type="ok">Sufficient</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {bankId && (
        <div className="grid grid-2">
          <Card title="Add Stock">
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <Field label="Blood Group">
                  <select value={form.bloodGroup} onChange={set('bloodGroup')}>
                    {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Units">
                  <input type="number" min="0" value={form.unitsAvailable}
                    onChange={set('unitsAvailable')} required />
                </Field>
                <Field label="Threshold">
                  <input type="number" min="0" value={form.lowStockThreshold}
                    onChange={set('lowStockThreshold')} />
                </Field>
              </div>
              <div className="form-row">
                <Field label="Expiry Date">
                  <input type="date" value={form.expiryDate}
                    onChange={set('expiryDate')} required />
                </Field>
                <Field label="Batch Number">
                  <input value={form.batchNumber} onChange={set('batchNumber')} />
                </Field>
                <Field label="Storage">
                  <input value={form.storageLocation} onChange={set('storageLocation')} />
                </Field>
              </div>
              <button type="submit">Add Stock</button>
            </form>
          </Card>

          <Card title={`Batches (${items.length})`}>
            {items.length === 0 ? <Empty>No stock recorded.</Empty> : (
              <table>
                <thead>
                  <tr><th>Group</th><th>Units</th><th>Batch</th><th>Expires</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i._id}>
                      <td><BloodBadge group={i.bloodGroup} /></td>
                      <td>{i.unitsAvailable}</td>
                      <td className="muted">{i.batchNumber || '—'}</td>
                      <td>
                        {formatDate(i.expiryDate)}<br />
                        {i.isExpired
                          ? <Badge type="bad">expired</Badge>
                          : <span className="muted">{i.daysUntilExpiry} days</span>}
                      </td>
                      <td>
                        <button className="small secondary"
                          onClick={() => handleConsume(i._id)}>Issue</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { donationApi } from '../api/resources';
import {
  PageHeader, Card, Field, Alert, Empty, BloodBadge, formatDate
} from '../components/Shared';

export default function DonationsPage() {
  const [donorId, setDonorId] = useState('');
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    donorId: '', unitsDonated: 1, locationName: '', notes: ''
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const loadHistory = async (id) => {
    setError('');
    try {
      const res = await donationApi.historyFor(id);
      setHistory(res);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLookup = (e) => {
    e.preventDefault();
    if (donorId) loadHistory(donorId);
  };

  const handleLog = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await donationApi.create({
        donorId: form.donorId,
        unitsDonated: Number(form.unitsDonated),
        locationName: form.locationName,
        notes: form.notes
      });
      setNotice('Donation recorded. The donor\'s eligibility has been updated.');
      setForm((f) => ({ ...f, notes: '' }));
      if (form.donorId === donorId) loadHistory(donorId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Donation History"
        subtitle="Log donations and view a donor's record. Logging a donation updates the donor's next-eligible date automatically."
      />

      <Alert message={error} onDismiss={() => setError('')} />
      <Alert type="success" message={notice} onDismiss={() => setNotice('')} />

      <div className="grid grid-2">
        <Card title="Log a Donation">
          <form onSubmit={handleLog}>
            <Field label="Donor ID">
              <input value={form.donorId} onChange={set('donorId')} required />
            </Field>
            <Field label="Units Donated">
              <input type="number" step="0.5" min="0.5"
                value={form.unitsDonated} onChange={set('unitsDonated')} required />
            </Field>
            <Field label="Location">
              <input value={form.locationName} onChange={set('locationName')}
                placeholder="Dhaka Medical College Blood Bank" />
            </Field>
            <Field label="Notes">
              <input value={form.notes} onChange={set('notes')} />
            </Field>
            <button type="submit">Record Donation</button>
          </form>
        </Card>

        <Card title="View History">
          <form onSubmit={handleLookup}>
            <Field label="Donor ID">
              <input value={donorId} onChange={(e) => setDonorId(e.target.value)} required />
            </Field>
            <button type="submit">Load History</button>
          </form>

          {history && (
            <div style={{ marginTop: 16 }}>
              <h3>Statistics</h3>
              <div className="muted">
                {history.stats.totalDonations} donation(s) ·{' '}
                {history.stats.totalUnits} unit(s) ·{' '}
                Last on {formatDate(history.stats.lastDonation)}
              </div>
            </div>
          )}
        </Card>
      </div>

      {history && (
        <Card title={`Records (${history.count})`}>
          {history.count === 0 ? (
            <Empty>No donations recorded for this donor.</Empty>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Group</th><th>Units</th><th>Location</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {history.data.map((r) => (
                  <tr key={r._id}>
                    <td>{formatDate(r.donationDate)}</td>
                    <td><BloodBadge group={r.bloodGroup} /></td>
                    <td>{r.unitsDonated}</td>
                    <td>{r.locationName || '—'}</td>
                    <td className="muted">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
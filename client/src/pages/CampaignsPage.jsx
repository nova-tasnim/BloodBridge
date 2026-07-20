import { useState, useEffect } from 'react';
import { campaignApi } from '../api/resources';
import {
  PageHeader, Card, Field, Badge, BloodBadge, Alert, Empty, Loading,
  BLOOD_GROUPS, formatDate
} from '../components/Shared';

const STATUS_BADGE = {
  upcoming: 'warn', ongoing: 'ok', completed: 'neutral', cancelled: 'bad'
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [registrations, setRegistrations] = useState(null);
  const [regResult, setRegResult] = useState(null);

  const [form, setForm] = useState({
    organizer: '', title: '', description: '', venue: '',
    lat: '23.7808', lng: '90.4203', address: '',
    startDate: '', endDate: '', targetUnits: 100, contactPhone: ''
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await campaignApi.list();
      setCampaigns(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaigns(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await campaignApi.create({
        organizer: form.organizer,
        title: form.title,
        description: form.description,
        venue: form.venue,
        location: {
          coordinates: [Number(form.lng), Number(form.lat)],
          address: form.address
        },
        startDate: form.startDate,
        endDate: form.endDate,
        targetUnits: Number(form.targetUnits),
        contactPhone: form.contactPhone
      });
      setNotice('Campaign created.');
      setForm((f) => ({ ...f, title: '', description: '', venue: '' }));
      loadCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegister = async (campaignId) => {
    const donorId = prompt('Donor ID to register:');
    if (!donorId) return;
    setError('');
    setRegResult(null);
    try {
      const res = await campaignApi.register(campaignId, donorId);
      setRegResult(res.data);
      setNotice(res.message);
      loadCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewRegistrations = async (campaignId) => {
    setError('');
    try {
      const res = await campaignApi.registrations(campaignId);
      setRegistrations(res);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Blood Drives"
        subtitle="Create donation campaigns and register donors. Registration reports each donor's current eligibility."
      />

      <Alert message={error} onDismiss={() => setError('')} />
      <Alert type="success" message={notice} onDismiss={() => setNotice('')} />

      {regResult && (
        <Card title={`Registered — ${regResult.donorName}`}>
          <BloodBadge group={regResult.bloodGroup} />{' '}
          {regResult.currentlyEligible
            ? <Badge type="ok">Eligible to donate</Badge>
            : <Badge type="warn">Registered, but not currently eligible</Badge>}
          {regResult.eligibilityNotes.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {regResult.eligibilityNotes.map((n, i) => (
                <li key={i} style={{ fontSize: 14 }}>{n}</li>
              ))}
            </ul>
          )}
          {regResult.nextEligibleDate && (
            <div className="muted">
              Next eligible: {formatDate(regResult.nextEligibleDate)}
            </div>
          )}
          <button className="secondary small" style={{ marginTop: 10 }}
            onClick={() => setRegResult(null)}>Close</button>
        </Card>
      )}

      <Card title="Create Blood Drive">
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <Field label="Organizer ID">
              <input value={form.organizer} onChange={set('organizer')} required />
            </Field>
            <Field label="Title">
              <input value={form.title} onChange={set('title')} required />
            </Field>
          </div>
          <Field label="Description">
            <input value={form.description} onChange={set('description')} />
          </Field>
          <div className="form-row">
            <Field label="Venue">
              <input value={form.venue} onChange={set('venue')} required />
            </Field>
            <Field label="Area">
              <input value={form.address} onChange={set('address')} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Latitude">
              <input value={form.lat} onChange={set('lat')} required />
            </Field>
            <Field label="Longitude">
              <input value={form.lng} onChange={set('lng')} required />
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.startDate} onChange={set('startDate')} required />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.endDate} onChange={set('endDate')} required />
            </Field>
            <Field label="Target Units">
              <input type="number" value={form.targetUnits} onChange={set('targetUnits')} />
            </Field>
          </div>
          <button type="submit">Create Drive</button>
        </form>
      </Card>

      <Card title={`Campaigns (${campaigns.length})`}>
        {loading ? <Loading /> : campaigns.length === 0 ? (
          <Empty>No campaigns yet.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Venue</th><th>Dates</th><th>Status</th>
                <th>Registered</th><th>Progress</th><th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id}>
                  <td>
                    <b>{c.title}</b><br />
                    <span className="muted">{c.description}</span>
                  </td>
                  <td>{c.venue}</td>
                  <td className="muted">
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                  </td>
                  <td><Badge type={STATUS_BADGE[c.status]}>{c.status}</Badge></td>
                  <td>{c.registeredCount}</td>
                  <td style={{ minWidth: 90 }}>
                    {c.unitsCollected}/{c.targetUnits}
                    <div className="score-bar">
                      <span style={{ width: `${c.progressPercent}%` }} />
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="small" onClick={() => handleRegister(c._id)}>
                      Register
                    </button>{' '}
                    <button className="small secondary"
                      onClick={() => handleViewRegistrations(c._id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {registrations && (
        <Card title={`Registrations (${registrations.count})`}>
          {registrations.count === 0 ? <Empty>No one has registered yet.</Empty> : (
            <table>
              <thead>
                <tr><th>Donor</th><th>Group</th><th>Donations</th><th>Registered</th><th>Attended</th></tr>
              </thead>
              <tbody>
                {registrations.data.map((r) => (
                  <tr key={r._id}>
                    <td><b>{r.donor?.name}</b><br /><span className="muted">{r.donor?.phone}</span></td>
                    <td><BloodBadge group={r.donor?.bloodGroup} /></td>
                    <td>{r.donor?.totalDonations}</td>
                    <td className="muted">{formatDate(r.registeredAt)}</td>
                    <td>
                      {r.attended
                        ? <Badge type="ok">Attended</Badge>
                        : <Badge type="neutral">Pending</Badge>}
                    </td>
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
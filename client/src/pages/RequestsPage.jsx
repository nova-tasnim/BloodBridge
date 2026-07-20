import { useState, useEffect } from 'react';
import { requestApi } from '../api/resources';
import {
  PageHeader, Card, Field, Badge, BloodBadge, Alert, Empty, Loading,
  BLOOD_GROUPS, formatDate
} from '../components/Shared';

const URGENCY_BADGE = { critical: 'bad', urgent: 'warn', routine: 'neutral' };
const STATUS_BADGE = {
  pending: 'neutral', matched: 'warn', accepted: 'warn',
  fulfilled: 'ok', cancelled: 'bad', expired: 'bad'
};

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [matchRadius, setMatchRadius] = useState(15);
  const [showExcluded, setShowExcluded] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    requester: '',
    patientName: '',
    bloodGroup: 'A+',
    unitsNeeded: 1,
    urgency: 'routine',
    hospitalName: '',
    lat: '23.7808',
    lng: '90.4203',
    address: '',
    contactPhone: '',
    notes: ''
  });

  const loadRequests = async (status = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await requestApi.list(status ? { status } : {});
      setRequests(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await requestApi.create({
        requester: form.requester,
        patientName: form.patientName,
        bloodGroup: form.bloodGroup,
        unitsNeeded: Number(form.unitsNeeded),
        urgency: form.urgency,
        hospitalName: form.hospitalName,
        location: {
          coordinates: [Number(form.lng), Number(form.lat)],
          address: form.address
        },
        contactPhone: form.contactPhone,
        notes: form.notes
      });
      setNotice('Blood request created.');
      setForm((f) => ({ ...f, patientName: '', notes: '', contactPhone: '' }));
      loadRequests(filterStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFindMatches = async (requestId) => {
    setError('');
    setMatchResult(null);
    try {
      const res = await requestApi.matches(requestId, {
        radius: matchRadius,
        includeIneligible: 'true'
      });
      setMatchResult(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRunMatching = async (requestId) => {
    setError('');
    try {
      const res = await requestApi.runMatching(requestId, { radius: matchRadius });
      setNotice(res.message);
      setMatchResult(res.data);
      loadRequests(filterStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Blood Requests"
        subtitle="Create requests and run the donor-matching engine to find ranked, eligible donors."
      />

      <Alert message={error} onDismiss={() => setError('')} />
      <Alert type="success" message={notice} onDismiss={() => setNotice('')} />

      <div className="grid grid-2">
        <Card title="Create Request">
          <form onSubmit={handleCreate}>
            <Field label="Requester User ID">
              <input value={form.requester} onChange={set('requester')}
                placeholder="Paste a user _id" required />
            </Field>
            <div className="form-row">
              <Field label="Patient Name">
                <input value={form.patientName} onChange={set('patientName')} required />
              </Field>
              <Field label="Blood Group">
                <select value={form.bloodGroup} onChange={set('bloodGroup')}>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            </div>
            <div className="form-row">
              <Field label="Units Needed">
                <input type="number" min="1" value={form.unitsNeeded}
                  onChange={set('unitsNeeded')} required />
              </Field>
              <Field label="Urgency">
                <select value={form.urgency} onChange={set('urgency')}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
            </div>
            <Field label="Hospital">
              <input value={form.hospitalName} onChange={set('hospitalName')} />
            </Field>
            <div className="form-row">
              <Field label="Latitude">
                <input value={form.lat} onChange={set('lat')} required />
              </Field>
              <Field label="Longitude">
                <input value={form.lng} onChange={set('lng')} required />
              </Field>
            </div>
            <Field label="Area">
              <input value={form.address} onChange={set('address')} placeholder="Shahbagh, Dhaka" />
            </Field>
            <Field label="Contact Phone">
              <input value={form.contactPhone} onChange={set('contactPhone')} />
            </Field>
            <button type="submit">Create Request</button>
          </form>
        </Card>

        <Card title="Matching Settings">
          <Field label="Search Radius (km)">
            <input type="number" value={matchRadius}
              onChange={(e) => setMatchRadius(e.target.value)} />
          </Field>
          <p className="muted">
            The engine resolves compatible blood groups, queries available donors
            within this radius, filters them through the eligibility rule engine,
            then ranks the survivors on a weighted score.
          </p>
          <Field label="Filter list by status">
            <select value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); loadRequests(e.target.value); }}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="matched">Matched</option>
              <option value="accepted">Accepted</option>
              <option value="fulfilled">Fulfilled</option>
            </select>
          </Field>
        </Card>
      </div>

      <Card title={`Requests (${requests.length})`}>
        {loading ? <Loading /> : requests.length === 0 ? (
          <Empty>No blood requests yet.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patient</th><th>Group</th><th>Units</th><th>Urgency</th>
                <th>Hospital</th><th>Status</th><th>Waiting</th><th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>
                    <b>{r.patientName}</b><br />
                    <span className="muted">{r.location?.address}</span>
                  </td>
                  <td><BloodBadge group={r.bloodGroup} /></td>
                  <td>{r.unitsFulfilled}/{r.unitsNeeded}</td>
                  <td><Badge type={URGENCY_BADGE[r.urgency]}>{r.urgency}</Badge></td>
                  <td>{r.hospitalName || '—'}</td>
                  <td><Badge type={STATUS_BADGE[r.status]}>{r.status}</Badge></td>
                  <td>{r.hoursWaiting}h</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="small secondary"
                      onClick={() => handleFindMatches(r._id)}>Find Matches</button>{' '}
                    <button className="small"
                      onClick={() => handleRunMatching(r._id)}>Run & Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {matchResult && (
        <Card title={`Matching Results — ${matchResult.request.patientName} (${matchResult.request.bloodGroup})`}>
          <div className="grid grid-3" style={{ marginBottom: 16 }}>
            <div>
              <h3>Compatible Groups</h3>
              {matchResult.searchCriteria.compatibleGroups.map((g) => (
                <span key={g} style={{ marginRight: 4 }}><BloodBadge group={g} /></span>
              ))}
            </div>
            <div>
              <h3>Score Weights</h3>
              <div className="muted">
                {Object.entries(matchResult.searchCriteria.scoreWeights)
                  .map(([k, v]) => `${k} ${v}`).join(' · ')}
              </div>
            </div>
            <div>
              <h3>Summary</h3>
              <div className="muted">
                {matchResult.summary.candidatesFound} candidates ·{' '}
                {matchResult.summary.eligibleMatches} eligible ·{' '}
                {matchResult.summary.excludedByEligibility} excluded
              </div>
            </div>
          </div>

          {matchResult.matches.length === 0 ? (
            <Empty>No eligible donors found within {matchResult.searchCriteria.radiusKm} km.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Donor</th><th>Group</th><th>Distance</th>
                  <th>Score</th><th>Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {matchResult.matches.map((m) => (
                  <tr key={m.donorId}>
                    <td><span className="rank">{m.rank}</span></td>
                    <td><b>{m.name}</b><br /><span className="muted">{m.area} · {m.phone}</span></td>
                    <td><BloodBadge group={m.bloodGroup} /></td>
                    <td>{m.distanceKm} km</td>
                    <td style={{ minWidth: 90 }}>
                      <b>{m.score}</b>
                      <div className="score-bar"><span style={{ width: `${m.score}%` }} /></div>
                    </td>
                    <td>
                      <div className="breakdown">
                        <span>compat <b>{m.breakdown.compatibility}</b></span>
                        <span>prox <b>{m.breakdown.proximity}</b></span>
                        <span>recency <b>{m.breakdown.recency}</b></span>
                        <span>reliab <b>{m.breakdown.reliability}</b></span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {matchResult.excluded && matchResult.excluded.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button className="secondary small"
                onClick={() => setShowExcluded((s) => !s)}>
                {showExcluded ? 'Hide' : 'Show'} excluded donors ({matchResult.excluded.length})
              </button>
              {showExcluded && (
                <table style={{ marginTop: 10 }}>
                  <thead>
                    <tr><th>Donor</th><th>Group</th><th>Score</th><th>Excluded Because</th></tr>
                  </thead>
                  <tbody>
                    {matchResult.excluded.map((d) => (
                      <tr key={d.donorId}>
                        <td>{d.name}</td>
                        <td><BloodBadge group={d.bloodGroup} /></td>
                        <td className="muted">{d.score}</td>
                        <td>
                          {d.ineligibilityReasons.map((r, i) => (
                            <div key={i} style={{ fontSize: 13 }}>{r}</div>
                          ))}
                          <span className="muted">
                            Next eligible: {formatDate(d.nextEligibleDate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
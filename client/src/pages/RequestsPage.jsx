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
const RESPONSE_BADGE = {
  pending: 'neutral', accepted: 'warn', declined: 'bad', completed: 'ok'
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

  // Feature 9 state
  const [timeline, setTimeline] = useState(null);
  const [respondForm, setRespondForm] = useState({ donorId: '', reason: '' });
  const [fulfilForm, setFulfilForm] = useState({ donorId: '', unitsDonated: 1, notes: '' });

  const [form, setForm] = useState({
    requester: '', patientName: '', bloodGroup: 'A+', unitsNeeded: 1,
    urgency: 'routine', hospitalName: '', lat: '23.7808', lng: '90.4203',
    address: '', contactPhone: '', notes: ''
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

  const refreshTimeline = async (id) => {
    try {
      const res = await requestApi.timeline(id);
      setTimeline(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
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
    setError(''); setMatchResult(null);
    try {
      const res = await requestApi.matches(requestId, {
        radius: matchRadius, includeIneligible: 'true'
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
      if (timeline?.requestId === requestId) refreshTimeline(requestId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleManage = async (requestId) => {
    setError('');
    setRespondForm({ donorId: '', reason: '' });
    setFulfilForm({ donorId: '', unitsDonated: 1, notes: '' });
    await refreshTimeline(requestId);
  };

  const handleTransition = async (status) => {
    setError(''); setNotice('');
    try {
      const res = await requestApi.changeStatus(timeline.requestId, status);
      setNotice(res.message);
      await refreshTimeline(timeline.requestId);
      loadRequests(filterStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRespond = async (decision) => {
    if (!respondForm.donorId) { setError('Donor ID is required to respond.'); return; }
    setError(''); setNotice('');
    try {
      const res = await requestApi.respond(
        timeline.requestId, respondForm.donorId, decision, respondForm.reason
      );
      setNotice(res.message);
      setRespondForm({ donorId: '', reason: '' });
      await refreshTimeline(timeline.requestId);
      loadRequests(filterStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFulfil = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      const res = await requestApi.fulfil(
        timeline.requestId,
        fulfilForm.donorId,
        Number(fulfilForm.unitsDonated),
        fulfilForm.notes
      );
      setNotice(res.message);
      setFulfilForm({ donorId: '', unitsDonated: 1, notes: '' });
      await refreshTimeline(timeline.requestId);
      loadRequests(filterStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Blood Requests"
        subtitle="Create requests, run the matching engine, and move requests through their lifecycle."
      />

      <Alert message={error} onDismiss={() => setError('')} />
      <Alert type="success" message={notice} onDismiss={() => setNotice('')} />

      <div className="grid grid-2">
        <Card title="Create Request">
          <form onSubmit={handleCreate}>
            <Field label="Requester User ID">
              <input value={form.requester} onChange={set('requester')} required />
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
              <input value={form.address} onChange={set('address')} />
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
              <option value="cancelled">Cancelled</option>
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
                <th>Status</th><th>Waiting</th><th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>
                    <b>{r.patientName}</b><br />
                    <span className="muted">{r.hospitalName || r.location?.address}</span>
                  </td>
                  <td><BloodBadge group={r.bloodGroup} /></td>
                  <td>
                    {r.unitsFulfilled}/{r.unitsNeeded}
                    <div className="score-bar">
                      <span style={{ width: `${(r.unitsFulfilled / r.unitsNeeded) * 100}%` }} />
                    </div>
                  </td>
                  <td><Badge type={URGENCY_BADGE[r.urgency]}>{r.urgency}</Badge></td>
                  <td><Badge type={STATUS_BADGE[r.status]}>{r.status}</Badge></td>
                  <td>{r.hoursWaiting}h</td>
                  <td>
                    <button className="small secondary"
                      onClick={() => handleFindMatches(r._id)}>Matches</button>{' '}
                    <button className="small secondary"
                      onClick={() => handleRunMatching(r._id)}>Run</button>{' '}
                    <button className="small"
                      onClick={() => handleManage(r._id)}>Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Feature 9: lifecycle panel ─────────────────── */}
      {timeline && (
        <Card title={`Lifecycle — ${timeline.patientName}`}>
          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            <div>
              <h3>Current Status</h3>
              <Badge type={STATUS_BADGE[timeline.currentStatus]}>
                {timeline.currentStatus}
              </Badge>
              {timeline.isTerminal && (
                <div className="muted" style={{ marginTop: 6 }}>
                  Terminal state — no further transitions permitted.
                </div>
              )}
            </div>
            <div>
              <h3>Progress</h3>
              <div>
                <b>{timeline.unitsFulfilled}</b> of {timeline.unitsNeeded} units
                <span className="muted"> · {timeline.unitsRemaining} remaining</span>
              </div>
              <div className="score-bar">
                <span style={{ width: `${(timeline.unitsFulfilled / timeline.unitsNeeded) * 100}%` }} />
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                Waiting {timeline.hoursWaiting}h · created {formatDate(timeline.createdAt)}
              </div>
            </div>
            <div>
              <h3>Responses</h3>
              <div className="muted">
                {timeline.responseSummary.total} invited ·{' '}
                {timeline.responseSummary.pending} pending ·{' '}
                {timeline.responseSummary.accepted} accepted ·{' '}
                {timeline.responseSummary.declined} declined ·{' '}
                {timeline.responseSummary.completed} completed
              </div>
            </div>
          </div>

          <h3>Permitted Transitions</h3>
          {timeline.allowedNext.length === 0 ? (
            <p className="muted" style={{ marginTop: 0 }}>
              None. This request has reached a terminal state.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {timeline.allowedNext.map((s) => (
                <button key={s} className="small secondary"
                  onClick={() => handleTransition(s)}>
                  → {s}
                </button>
              ))}
            </div>
          )}
          <p className="muted" style={{ marginTop: -10, marginBottom: 18 }}>
            Only transitions declared legal by the server's state machine are offered.
          </p>

          {!timeline.isTerminal && (
            <div className="grid grid-2">
              <div>
                <h3>Record a Donor Response</h3>
                <Field label="Donor ID">
                  <input value={respondForm.donorId}
                    onChange={(e) => setRespondForm((f) => ({ ...f, donorId: e.target.value }))} />
                </Field>
                <Field label="Decline Reason (optional)">
                  <input value={respondForm.reason}
                    onChange={(e) => setRespondForm((f) => ({ ...f, reason: e.target.value }))} />
                </Field>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="small" onClick={() => handleRespond('accepted')}>Accept</button>
                  <button className="small secondary" onClick={() => handleRespond('declined')}>Decline</button>
                </div>
              </div>

              <div>
                <h3>Record a Donation</h3>
                <form onSubmit={handleFulfil}>
                  <Field label="Donor ID">
                    <input value={fulfilForm.donorId}
                      onChange={(e) => setFulfilForm((f) => ({ ...f, donorId: e.target.value }))}
                      required />
                  </Field>
                  <div className="form-row">
                    <Field label="Units">
                      <input type="number" step="0.5" min="0.5"
                        value={fulfilForm.unitsDonated}
                        onChange={(e) => setFulfilForm((f) => ({ ...f, unitsDonated: e.target.value }))}
                        required />
                    </Field>
                    <Field label="Notes">
                      <input value={fulfilForm.notes}
                        onChange={(e) => setFulfilForm((f) => ({ ...f, notes: e.target.value }))} />
                    </Field>
                  </div>
                  <button type="submit" className="small">Record Donation</button>
                </form>
              </div>
            </div>
          )}

          {timeline.responses.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h3>Invited Donors</h3>
              <table>
                <thead>
                  <tr><th>Donor</th><th>Group</th><th>Score</th><th>Response</th><th>Responded</th></tr>
                </thead>
                <tbody>
                  {timeline.responses.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <b>{r.donor?.name}</b><br />
                        <span className="muted">{r.donor?.phone}</span>
                      </td>
                      <td><BloodBadge group={r.donor?.bloodGroup} /></td>
                      <td className="muted">{r.matchScore || '—'}</td>
                      <td>
                        <Badge type={RESPONSE_BADGE[r.status]}>{r.status}</Badge>
                        {r.declineReason && (
                          <div className="muted">{r.declineReason}</div>
                        )}
                      </td>
                      <td className="muted">
                        {r.respondedAt ? formatDate(r.respondedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button className="secondary small" style={{ marginTop: 16 }}
            onClick={() => setTimeline(null)}>Close</button>
        </Card>
      )}

      {/* ── Feature 8: matching results ────────────────── */}
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
                <tr><th>#</th><th>Donor</th><th>Group</th><th>Distance</th><th>Score</th><th>Breakdown</th></tr>
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
              <button className="secondary small" onClick={() => setShowExcluded((s) => !s)}>
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
                          <span className="muted">Next eligible: {formatDate(d.nextEligibleDate)}</span>
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
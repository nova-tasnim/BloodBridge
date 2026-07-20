import { useState, useEffect } from 'react';
import { queueApi } from '../api/resources';
import {
  PageHeader, Card, Field, Badge, BloodBadge, Alert, Empty, Loading,
  BLOOD_GROUPS, formatDate
} from '../components/Shared';

const URGENCY_BADGE = { critical: 'bad', urgent: 'warn', routine: 'neutral' };
const STATUS_BADGE = { pending: 'neutral', matched: 'warn', accepted: 'warn' };

export default function QueuePage() {
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ urgency: '', bloodGroup: '', status: '' });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = async (params = filters) => {
    setError('');
    try {
      const cleaned = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '')
      );
      const res = await queueApi.get(cleaned);
      setQueue(res.data);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Priority is computed server-side on every read, so polling shows
  // scores climbing as requests age.
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(), 30000);
    return () => clearInterval(id);
  }, [autoRefresh, filters]);

  const set = (key) => (e) => {
    const next = { ...filters, [key]: e.target.value };
    setFilters(next);
    load(next);
  };

  const maxScore = queue?.queue?.[0]?.priorityScore || 1;

  return (
    <div className="page">
      <PageHeader
        title="Emergency Queue"
        subtitle="Active requests ranked by a live priority score combining urgency, time waited, deadline proximity, and outstanding units."
      />

      <Alert message={error} onDismiss={() => setError('')} />

      {queue && (
        <div className="grid grid-3">
          <Card title="Queue Summary">
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
                  {queue.summary.totalInQueue}
                </div>
                <div className="muted">in queue</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
                  {queue.summary.unitsOutstanding}
                </div>
                <div className="muted">units outstanding</div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge type="bad">{queue.summary.critical} critical</Badge>
              <Badge type="warn">{queue.summary.urgent} urgent</Badge>
              <Badge type="neutral">{queue.summary.routine} routine</Badge>
              {queue.summary.overdue > 0 && (
                <Badge type="bad">{queue.summary.overdue} overdue</Badge>
              )}
            </div>
          </Card>

          <Card title="Filters">
            <div className="form-row">
              <Field label="Urgency">
                <select value={filters.urgency} onChange={set('urgency')}>
                  <option value="">All</option>
                  <option value="critical">Critical</option>
                  <option value="urgent">Urgent</option>
                  <option value="routine">Routine</option>
                </select>
              </Field>
              <Field label="Blood Group">
                <select value={filters.bloodGroup} onChange={set('bloodGroup')}>
                  <option value="">Any</option>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Status">
              <select value={filters.status} onChange={set('status')}>
                <option value="">All active</option>
                <option value="pending">Pending</option>
                <option value="matched">Matched</option>
                <option value="accepted">Accepted</option>
              </select>
            </Field>
          </Card>

          <Card title="Scoring Model">
            <div className="muted" style={{ lineHeight: 1.8 }}>
              Urgency — critical {queue.weights.urgency.critical} ·
              urgent {queue.weights.urgency.urgent} ·
              routine {queue.weights.urgency.routine}<br />
              Waiting — {queue.weights.waitPointsPerHour} pts/hour,
              capped at {queue.weights.maxWaitPoints}<br />
              Deadline — overdue {queue.weights.deadlineBonus.overdue} ·
              &lt;6h {queue.weights.deadlineBonus.within6h} ·
              &lt;24h {queue.weights.deadlineBonus.within24h}<br />
              Unmet units — {queue.weights.unmetUnitPoints} pts per unit
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="small secondary" onClick={() => load()}>Refresh</button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                <input type="checkbox" style={{ width: 'auto' }}
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)} />
                Auto every 30s
              </label>
            </div>
            {lastRefreshed && (
              <div className="muted" style={{ marginTop: 6 }}>
                Last refreshed {lastRefreshed.toLocaleTimeString()}
              </div>
            )}
          </Card>
        </div>
      )}

      <Card title={`Priority Queue (${queue?.queue.length ?? 0})`}>
        {loading ? <Loading /> : !queue || queue.queue.length === 0 ? (
          <Empty>No active requests in the queue.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th><th>Patient</th><th>Group</th><th>Urgency</th>
                <th>Units</th><th>Waiting</th><th>Deadline</th>
                <th>Priority</th><th>Breakdown</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.queue.map((r) => (
                <tr key={r.requestId}>
                  <td><span className="rank">{r.position}</span></td>
                  <td>
                    <b>{r.patientName}</b>
                    {r.isSOS && <> <Badge type="bad">SOS</Badge></>}
                    <br />
                    <span className="muted">{r.hospitalName || r.area}</span>
                  </td>
                  <td><BloodBadge group={r.bloodGroup} /></td>
                  <td><Badge type={URGENCY_BADGE[r.urgency]}>{r.urgency}</Badge></td>
                  <td>
                    {r.unitsFulfilled}/{r.unitsNeeded}
                    <div className="muted">{r.unitsRemaining} short</div>
                  </td>
                  <td>{r.hoursWaiting}h</td>
                  <td>
                    {r.isOverdue
                      ? <Badge type="bad">overdue</Badge>
                      : <span className="muted">{r.deadlineStatus}</span>}
                    {r.requiredBy && (
                      <div className="muted">{formatDate(r.requiredBy)}</div>
                    )}
                  </td>
                  <td style={{ minWidth: 96 }}>
                    <b style={{ fontSize: 15 }}>{r.priorityScore}</b>
                    <div className="score-bar">
                      <span style={{ width: `${(r.priorityScore / maxScore) * 100}%` }} />
                    </div>
                  </td>
                  <td>
                    <div className="breakdown">
                      <span>urg <b>{r.breakdown.urgency}</b></span>
                      <span>wait <b>{r.breakdown.waiting}</b></span>
                      <span>due <b>{r.breakdown.deadline}</b></span>
                      <span>units <b>{r.breakdown.unmetUnits}</b></span>
                    </div>
                  </td>
                  <td><Badge type={STATUS_BADGE[r.status] || 'neutral'}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
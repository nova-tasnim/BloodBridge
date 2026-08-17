import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { queueApi } from '../api/resources';
import {
  PageHeader,
  Card,
  Field,
  Badge,
  BloodBadge,
  Alert,
  Empty,
  Loading,
  BLOOD_GROUPS,
  formatDate
} from '../components/Shared';

const URGENCY_BADGE = {
  critical: 'bad',
  urgent: 'warn',
  routine: 'neutral'
};

const STATUS_BADGE = {
  pending: 'neutral',
  matched: 'warn',
  accepted: 'warn'
};

export default function QueuePage() {
  const { t } = useTranslation();

  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    urgency: '',
    bloodGroup: '',
    status: ''
  });
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

  useEffect(() => {
    load();
  }, []);

  // Priority is computed server-side on every read, so polling shows
  // scores climbing as requests age.
  useEffect(() => {
    if (!autoRefresh) return;

    const id = setInterval(() => load(), 30000);

    return () => clearInterval(id);
  }, [autoRefresh, filters]);

  const set = (key) => (e) => {
    const next = {
      ...filters,
      [key]: e.target.value
    };

    setFilters(next);
    load(next);
  };

  const maxScore = queue?.queue?.[0]?.priorityScore || 1;

  return (
    <div className="page">
      <PageHeader
        title={t('queue.title')}
        subtitle={t('queue.subtitle')}
      />

      <Alert
        message={error}
        onDismiss={() => setError('')}
      />

      {queue && (
        <div className="grid grid-3">
          {/* Queue Summary */}
          <Card title={t('queue.summary')}>
            <div
              style={{
                display: 'flex',
                gap: 18,
                flexWrap: 'wrap'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}
                >
                  {queue.summary.totalInQueue}
                </div>

                <div className="muted">
                  {t('queue.inQueue')}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}
                >
                  {queue.summary.unitsOutstanding}
                </div>

                <div className="muted">
                  {t('queue.unitsOutstanding')}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap'
              }}
            >
              <Badge type="bad">
                {queue.summary.critical} {t('queue.critical')}
              </Badge>

              <Badge type="warn">
                {queue.summary.urgent} {t('queue.urgent')}
              </Badge>

              <Badge type="neutral">
                {queue.summary.routine} {t('queue.routine')}
              </Badge>

              {queue.summary.overdue > 0 && (
                <Badge type="bad">
                  {queue.summary.overdue} {t('queue.overdue')}
                </Badge>
              )}
            </div>
          </Card>

          {/* Filters */}
          <Card title={t('queue.filters')}>
            <div className="form-row">
              <Field label={t('queue.urgency')}>
                <select
                  value={filters.urgency}
                  onChange={set('urgency')}
                >
                  <option value="">
                    {t('queue.all')}
                  </option>

                  <option value="critical">
                    {t('queue.criticalLabel')}
                  </option>

                  <option value="urgent">
                    {t('queue.urgentLabel')}
                  </option>

                  <option value="routine">
                    {t('queue.routineLabel')}
                  </option>
                </select>
              </Field>

              <Field label={t('queue.bloodGroup')}>
                <select
                  value={filters.bloodGroup}
                  onChange={set('bloodGroup')}
                >
                  <option value="">
                    {t('queue.any')}
                  </option>

                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={t('queue.status')}>
              <select
                value={filters.status}
                onChange={set('status')}
              >
                <option value="">
                  {t('queue.allActive')}
                </option>

                <option value="pending">
                  {t('queue.pending')}
                </option>

                <option value="matched">
                  {t('queue.matched')}
                </option>

                <option value="accepted">
                  {t('queue.accepted')}
                </option>
              </select>
            </Field>
          </Card>

          {/* Scoring Model */}
          <Card title={t('queue.scoringModel')}>
            <div
              className="muted"
              style={{ lineHeight: 1.8 }}
            >
              {t('queue.urgencyLabel')} —{' '}
              {t('queue.criticalLabel').toLowerCase()}{' '}
              {queue.weights.urgency.critical} ·{' '}
              {t('queue.urgentLabel').toLowerCase()}{' '}
              {queue.weights.urgency.urgent} ·{' '}
              {t('queue.routineLabel').toLowerCase()}{' '}
              {queue.weights.urgency.routine}
              <br />

              {t('queue.waiting')} —{' '}
              {queue.weights.waitPointsPerHour}{' '}
              {t('queue.pointsPerHour')},{' '}
              {t('queue.cappedAt')}{' '}
              {queue.weights.maxWaitPoints}
              <br />

              {t('queue.deadline')} —{' '}
              {t('queue.overdue')} {queue.weights.deadlineBonus.overdue} ·{' '}
              {t('queue.within6h')} {queue.weights.deadlineBonus.within6h} ·{' '}
              {t('queue.within24h')} {queue.weights.deadlineBonus.within24h}
              <br />

              {t('queue.unmetUnits')} —{' '}
              {queue.weights.unmetUnitPoints}{' '}
              {t('queue.pointsPerUnit')}
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}
            >
              <button
                className="small secondary"
                onClick={() => load()}
              >
                {t('queue.refresh')}
              </button>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5
                }}
              >
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={autoRefresh}
                  onChange={(e) =>
                    setAutoRefresh(e.target.checked)
                  }
                />

                {t('queue.autoRefresh')}
              </label>
            </div>

            {lastRefreshed && (
              <div
                className="muted"
                style={{ marginTop: 6 }}
              >
                {t('queue.lastRefreshed')}{' '}
                {lastRefreshed.toLocaleTimeString()}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Priority Queue */}
      <Card
        title={`${t('queue.priorityQueue')} (${
          queue?.queue.length ?? 0
        })`}
      >
        {loading ? (
          <Loading />
        ) : !queue || queue.queue.length === 0 ? (
          <Empty>
            {t('queue.empty')}
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('queue.rank')}</th>
                <th>{t('queue.patient')}</th>
                <th>{t('queue.group')}</th>
                <th>{t('queue.urgency')}</th>
                <th>{t('queue.units')}</th>
                <th>{t('queue.waiting')}</th>
                <th>{t('queue.deadline')}</th>
                <th>{t('queue.priority')}</th>
                <th>{t('queue.breakdown')}</th>
                <th>{t('queue.status')}</th>
              </tr>
            </thead>

            <tbody>
              {queue.queue.map((r) => (
                <tr key={r.requestId}>
                  <td>
                    <span className="rank">
                      {r.position}
                    </span>
                  </td>

                  <td>
                    <b>{r.patientName}</b>

                    {r.isSOS && (
                      <>
                        {' '}
                        <Badge type="bad">
                          {t('queue.sos')}
                        </Badge>
                      </>
                    )}

                    <br />

                    <span className="muted">
                      {r.hospitalName || r.area}
                    </span>
                  </td>

                  <td>
                    <BloodBadge group={r.bloodGroup} />
                  </td>

                  <td>
                    <Badge
                      type={
                        URGENCY_BADGE[r.urgency]
                      }
                    >
                      {t(`common.${r.urgency}`)}
                    </Badge>
                  </td>

                  <td>
                    {r.unitsFulfilled}/{r.unitsNeeded}

                    <div className="muted">
                      {r.unitsRemaining}{' '}
                      {t('queue.short')}
                    </div>
                  </td>

                  <td>
                    {r.hoursWaiting}h
                  </td>

                  <td>
                    {r.isOverdue ? (
                      <Badge type="bad">
                        {t('queue.overdue')}
                      </Badge>
                    ) : (
                      <span className="muted">
                        {r.deadlineStatus}
                      </span>
                    )}

                    {r.requiredBy && (
                      <div className="muted">
                        {formatDate(r.requiredBy)}
                      </div>
                    )}
                  </td>

                  <td style={{ minWidth: 96 }}>
                    <b style={{ fontSize: 15 }}>
                      {r.priorityScore}
                    </b>

                    <div className="score-bar">
                      <span
                        style={{
                          width: `${
                            (r.priorityScore /
                              maxScore) *
                            100
                          }%`
                        }}
                      />
                    </div>
                  </td>

                  <td>
                    <div className="breakdown">
                      <span>
                        {t('queue.breakdownUrgency')}{' '}
                        <b>
                          {r.breakdown.urgency}
                        </b>
                      </span>

                      <span>
                        {t('queue.breakdownWaiting')}{' '}
                        <b>
                          {r.breakdown.waiting}
                        </b>
                      </span>

                      <span>
                        {t('queue.breakdownDeadline')}{' '}
                        <b>
                          {r.breakdown.deadline}
                        </b>
                      </span>

                      <span>
                        {t('queue.breakdownUnits')}{' '}
                        <b>
                          {r.breakdown.unmetUnits}
                        </b>
                      </span>
                    </div>
                  </td>

                  <td>
                    <Badge
                      type={
                        STATUS_BADGE[r.status] ||
                        'neutral'
                      }
                    >
                      {t(`common.${r.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
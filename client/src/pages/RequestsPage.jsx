import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { requestApi } from '../api/resources';
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
  accepted: 'warn',
  fulfilled: 'ok',
  cancelled: 'bad',
  expired: 'bad'
};

const RESPONSE_BADGE = {
  pending: 'neutral',
  accepted: 'warn',
  declined: 'bad',
  completed: 'ok'
};

export default function RequestsPage() {
  const { t } = useTranslation();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [matchRadius, setMatchRadius] = useState(15);
  const [showExcluded, setShowExcluded] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const [timeline, setTimeline] = useState(null);
  const [respondForm, setRespondForm] = useState({
    donorId: '',
    reason: ''
  });

  const [fulfilForm, setFulfilForm] = useState({
    donorId: '',
    unitsDonated: 1,
    notes: ''
  });

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

  useEffect(() => {
    loadRequests();
  }, []);

  const set = (key) => (e) => {
    setForm((f) => ({
      ...f,
      [key]: e.target.value
    }));
  };

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

      setNotice(t('requests.createdSuccess'));

      setForm((f) => ({
        ...f,
        patientName: '',
        notes: '',
        contactPhone: ''
      }));

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
      const res = await requestApi.runMatching(requestId, {
        radius: matchRadius
      });

      setNotice(res.message);
      setMatchResult(res.data);

      loadRequests(filterStatus);

      if (timeline?.requestId === requestId) {
        refreshTimeline(requestId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleManage = async (requestId) => {
    setError('');

    setRespondForm({
      donorId: '',
      reason: ''
    });

    setFulfilForm({
      donorId: '',
      unitsDonated: 1,
      notes: ''
    });

    await refreshTimeline(requestId);
  };

  const handleTransition = async (status) => {
    setError('');
    setNotice('');

    try {
      const res = await requestApi.changeStatus(
        timeline.requestId,
        status
      );

      setNotice(res.message);

      await refreshTimeline(timeline.requestId);
      loadRequests(filterStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRespond = async (decision) => {
    if (!respondForm.donorId) {
      setError(t('requests.donorIdRequired'));
      return;
    }

    setError('');
    setNotice('');

    try {
      const res = await requestApi.respond(
        timeline.requestId,
        respondForm.donorId,
        decision,
        respondForm.reason
      );

      setNotice(res.message);

      setRespondForm({
        donorId: '',
        reason: ''
      });

      await refreshTimeline(timeline.requestId);
      loadRequests(filterStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFulfil = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    try {
      const res = await requestApi.fulfil(
        timeline.requestId,
        fulfilForm.donorId,
        Number(fulfilForm.unitsDonated),
        fulfilForm.notes
      );

      setNotice(res.message);

      setFulfilForm({
        donorId: '',
        unitsDonated: 1,
        notes: ''
      });

      await refreshTimeline(timeline.requestId);
      loadRequests(filterStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={t('requests.title')}
        subtitle={t('requests.subtitle')}
      />

      <Alert
        message={error}
        onDismiss={() => setError('')}
      />

      <Alert
        type="success"
        message={notice}
        onDismiss={() => setNotice('')}
      />

      <div className="grid grid-2">
        <Card title={t('requests.createRequest')}>
          <form onSubmit={handleCreate}>
            <Field label={t('requests.requesterUserId')}>
              <input
                value={form.requester}
                onChange={set('requester')}
                required
              />
            </Field>

            <div className="form-row">
              <Field label={t('requests.patientName')}>
                <input
                  value={form.patientName}
                  onChange={set('patientName')}
                  required
                />
              </Field>

              <Field label={t('requests.bloodGroup')}>
                <select
                  value={form.bloodGroup}
                  onChange={set('bloodGroup')}
                >
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="form-row">
              <Field label={t('requests.unitsNeeded')}>
                <input
                  type="number"
                  min="1"
                  value={form.unitsNeeded}
                  onChange={set('unitsNeeded')}
                  required
                />
              </Field>

              <Field label={t('requests.urgency')}>
                <select
                  value={form.urgency}
                  onChange={set('urgency')}
                >
                  <option value="routine">
                    {t('common.routine')}
                  </option>
                  <option value="urgent">
                    {t('common.urgent')}
                  </option>
                  <option value="critical">
                    {t('common.critical')}
                  </option>
                </select>
              </Field>
            </div>

            <Field label={t('requests.hospital')}>
              <input
                value={form.hospitalName}
                onChange={set('hospitalName')}
              />
            </Field>

            <div className="form-row">
              <Field label={t('requests.latitude')}>
                <input
                  value={form.lat}
                  onChange={set('lat')}
                  required
                />
              </Field>

              <Field label={t('requests.longitude')}>
                <input
                  value={form.lng}
                  onChange={set('lng')}
                  required
                />
              </Field>
            </div>

            <Field label={t('requests.area')}>
              <input
                value={form.address}
                onChange={set('address')}
              />
            </Field>

            <Field label={t('requests.contactPhone')}>
              <input
                value={form.contactPhone}
                onChange={set('contactPhone')}
              />
            </Field>

            <button type="submit">
              {t('requests.createRequest')}
            </button>
          </form>
        </Card>

        <Card title={t('requests.matchingSettings')}>
          <Field label={t('requests.searchRadius')}>
            <input
              type="number"
              value={matchRadius}
              onChange={(e) => setMatchRadius(e.target.value)}
            />
          </Field>

          <p className="muted">
            {t('requests.matchingDescription')}
          </p>

          <Field label={t('requests.filterByStatus')}>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                loadRequests(e.target.value);
              }}
            >
              <option value="">
                {t('requests.all')}
              </option>
              <option value="pending">
                {t('common.pending')}
              </option>
              <option value="matched">
                {t('common.matched')}
              </option>
              <option value="accepted">
                {t('common.accepted')}
              </option>
              <option value="fulfilled">
                {t('common.fulfilled')}
              </option>
              <option value="cancelled">
                {t('requests.cancelled')}
              </option>
            </select>
          </Field>
        </Card>
      </div>

      <Card
        title={`${t('requests.requests')} (${requests.length})`}
      >
        {loading ? (
          <Loading />
        ) : requests.length === 0 ? (
          <Empty>
            {t('requests.noRequests')}
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('requests.patient')}</th>
                <th>{t('requests.group')}</th>
                <th>{t('requests.units')}</th>
                <th>{t('requests.urgency')}</th>
                <th>{t('requests.status')}</th>
                <th>{t('requests.waiting')}</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>
                    <b>{r.patientName}</b>
                    <br />
                    <span className="muted">
                      {r.hospitalName || r.location?.address}
                    </span>
                  </td>

                  <td>
                    <BloodBadge group={r.bloodGroup} />
                  </td>

                  <td>
                    {r.unitsFulfilled}/{r.unitsNeeded}

                    <div className="score-bar">
                      <span
                        style={{
                          width: `${(
                            (r.unitsFulfilled / r.unitsNeeded) *
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </td>

                  <td>
                    <Badge
                      type={URGENCY_BADGE[r.urgency]}
                    >
                      {t(`common.${r.urgency}`)}
                    </Badge>
                  </td>

                  <td>
                    <Badge
                      type={STATUS_BADGE[r.status]}
                    >
                      {t(`common.${r.status}`, {
                        defaultValue: r.status
                      })}
                    </Badge>
                  </td>

                  <td>
                    {r.hoursWaiting}
                    {t('requests.hoursShort')}
                  </td>

                  <td>
                    <button
                      className="small secondary"
                      onClick={() =>
                        handleFindMatches(r._id)
                      }
                    >
                      {t('requests.matches')}
                    </button>{' '}

                    <button
                      className="small secondary"
                      onClick={() =>
                        handleRunMatching(r._id)
                      }
                    >
                      {t('requests.run')}
                    </button>{' '}

                    <button
                      className="small"
                      onClick={() =>
                        handleManage(r._id)
                      }
                    >
                      {t('requests.manage')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {timeline && (
        <Card
          title={`${t('requests.lifecycle')} — ${timeline.patientName}`}
        >
          <div
            className="grid grid-3"
            style={{ marginBottom: 18 }}
          >
            <div>
              <h3>{t('requests.currentStatus')}</h3>

              <Badge
                type={STATUS_BADGE[timeline.currentStatus]}
              >
                {t(`common.${timeline.currentStatus}`, {
                  defaultValue: timeline.currentStatus
                })}
              </Badge>

              {timeline.isTerminal && (
                <div
                  className="muted"
                  style={{ marginTop: 6 }}
                >
                  {t('requests.terminalState')}
                </div>
              )}
            </div>

            <div>
              <h3>{t('requests.progress')}</h3>

              <div>
                <b>{timeline.unitsFulfilled}</b>{' '}
                {t('requests.of')}{' '}
                {timeline.unitsNeeded}{' '}
                {t('requests.units')}
                <span className="muted">
                  {' · '}
                  {timeline.unitsRemaining}{' '}
                  {t('requests.remaining')}
                </span>
              </div>

              <div className="score-bar">
                <span
                  style={{
                    width: `${
                      (timeline.unitsFulfilled /
                        timeline.unitsNeeded) *
                      100
                    }%`
                  }}
                />
              </div>

              <div
                className="muted"
                style={{ marginTop: 4 }}
              >
                {t('requests.waiting')}{' '}
                {timeline.hoursWaiting}
                {t('requests.hoursShort')}
                {' · '}
                {t('requests.created')}{' '}
                {formatDate(timeline.createdAt)}
              </div>
            </div>

            <div>
              <h3>{t('requests.responses')}</h3>

              <div className="muted">
                {timeline.responseSummary.total}{' '}
                {t('requests.invited')}
                {' · '}
                {timeline.responseSummary.pending}{' '}
                {t('requests.pending')}
                {' · '}
                {timeline.responseSummary.accepted}{' '}
                {t('requests.accepted')}
                {' · '}
                {timeline.responseSummary.declined}{' '}
                {t('requests.declined')}
                {' · '}
                {timeline.responseSummary.completed}{' '}
                {t('requests.completed')}
              </div>
            </div>
          </div>

          <h3>{t('requests.permittedTransitions')}</h3>

          {timeline.allowedNext.length === 0 ? (
            <p
              className="muted"
              style={{ marginTop: 0 }}
            >
              {t('requests.noTransitions')}
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 18
              }}
            >
              {timeline.allowedNext.map((s) => (
                <button
                  key={s}
                  className="small secondary"
                  onClick={() =>
                    handleTransition(s)
                  }
                >
                  → {t(`common.${s}`, {
                    defaultValue: s
                  })}
                </button>
              ))}
            </div>
          )}

          <p
            className="muted"
            style={{
              marginTop: -10,
              marginBottom: 18
            }}
          >
            {t('requests.transitionDescription')}
          </p>

          {!timeline.isTerminal && (
            <div className="grid grid-2">
              <div>
                <h3>{t('requests.recordDonorResponse')}</h3>

                <Field label={t('requests.donorId')}>
                  <input
                    value={respondForm.donorId}
                    onChange={(e) =>
                      setRespondForm((f) => ({
                        ...f,
                        donorId: e.target.value
                      }))
                    }
                  />
                </Field>

                <Field
                  label={t('requests.declineReason')}
                >
                  <input
                    value={respondForm.reason}
                    onChange={(e) =>
                      setRespondForm((f) => ({
                        ...f,
                        reason: e.target.value
                      }))
                    }
                  />
                </Field>

                <div
                  style={{
                    display: 'flex',
                    gap: 8
                  }}
                >
                  <button
                    className="small"
                    onClick={() =>
                      handleRespond('accepted')
                    }
                  >
                    {t('requests.accept')}
                  </button>

                  <button
                    className="small secondary"
                    onClick={() =>
                      handleRespond('declined')
                    }
                  >
                    {t('requests.decline')}
                  </button>
                </div>
              </div>

              <div>
                <h3>{t('requests.recordDonation')}</h3>

                <form onSubmit={handleFulfil}>
                  <Field label={t('requests.donorId')}>
                    <input
                      value={fulfilForm.donorId}
                      onChange={(e) =>
                        setFulfilForm((f) => ({
                          ...f,
                          donorId: e.target.value
                        }))
                      }
                      required
                    />
                  </Field>

                  <div className="form-row">
                    <Field label={t('requests.units')}>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={fulfilForm.unitsDonated}
                        onChange={(e) =>
                          setFulfilForm((f) => ({
                            ...f,
                            unitsDonated: e.target.value
                          }))
                        }
                        required
                      />
                    </Field>

                    <Field label={t('requests.notes')}>
                      <input
                        value={fulfilForm.notes}
                        onChange={(e) =>
                          setFulfilForm((f) => ({
                            ...f,
                            notes: e.target.value
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <button
                    type="submit"
                    className="small"
                  >
                    {t('requests.recordDonation')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {timeline.responses.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h3>{t('requests.invitedDonors')}</h3>

              <table>
                <thead>
                  <tr>
                    <th>{t('requests.donor')}</th>
                    <th>{t('requests.group')}</th>
                    <th>{t('requests.score')}</th>
                    <th>{t('requests.response')}</th>
                    <th>{t('requests.responded')}</th>
                  </tr>
                </thead>

                <tbody>
                  {timeline.responses.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <b>{r.donor?.name}</b>
                        <br />
                        <span className="muted">
                          {r.donor?.phone}
                        </span>
                      </td>

                      <td>
                        <BloodBadge
                          group={r.donor?.bloodGroup}
                        />
                      </td>

                      <td className="muted">
                        {r.matchScore || '—'}
                      </td>

                      <td>
                        <Badge
                          type={
                            RESPONSE_BADGE[r.status]
                          }
                        >
                          {t(`requests.${r.status}`, {
                            defaultValue: r.status
                          })}
                        </Badge>

                        {r.declineReason && (
                          <div className="muted">
                            {r.declineReason}
                          </div>
                        )}
                      </td>

                      <td className="muted">
                        {r.respondedAt
                          ? formatDate(r.respondedAt)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="secondary small"
            style={{ marginTop: 16 }}
            onClick={() => setTimeline(null)}
          >
            {t('requests.close')}
          </button>
        </Card>
      )}

      {matchResult && (
        <Card
          title={`${t('requests.matchingResults')} — ${
            matchResult.request.patientName
          } (${matchResult.request.bloodGroup})`}
        >
          <div
            className="grid grid-3"
            style={{ marginBottom: 16 }}
          >
            <div>
              <h3>{t('requests.compatibleGroups')}</h3>

              {matchResult.searchCriteria.compatibleGroups.map(
                (g) => (
                  <span
                    key={g}
                    style={{ marginRight: 4 }}
                  >
                    <BloodBadge group={g} />
                  </span>
                )
              )}
            </div>

            <div>
              <h3>{t('requests.scoreWeights')}</h3>

              <div className="muted">
                {Object.entries(
                  matchResult.searchCriteria.scoreWeights
                )
                  .map(([k, v]) => `${k} ${v}`)
                  .join(' · ')}
              </div>
            </div>

            <div>
              <h3>{t('requests.summary')}</h3>

              <div className="muted">
                {matchResult.summary.candidatesFound}{' '}
                {t('requests.candidates')}
                {' · '}
                {matchResult.summary.eligibleMatches}{' '}
                {t('requests.eligible')}
                {' · '}
                {matchResult.summary.excludedByEligibility}{' '}
                {t('requests.excluded')}
              </div>
            </div>
          </div>

          {matchResult.matches.length === 0 ? (
            <Empty>
              {t('requests.noEligibleDonors', {
                radius:
                  matchResult.searchCriteria.radiusKm
              })}
            </Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('requests.donor')}</th>
                  <th>{t('requests.group')}</th>
                  <th>{t('requests.distance')}</th>
                  <th>{t('requests.score')}</th>
                  <th>{t('requests.breakdown')}</th>
                </tr>
              </thead>

              <tbody>
                {matchResult.matches.map((m) => (
                  <tr key={m.donorId}>
                    <td>
                      <span className="rank">
                        {m.rank}
                      </span>
                    </td>

                    <td>
                      <b>{m.name}</b>
                      <br />
                      <span className="muted">
                        {m.area} · {m.phone}
                      </span>
                    </td>

                    <td>
                      <BloodBadge
                        group={m.bloodGroup}
                      />
                    </td>

                    <td>
                      {m.distanceKm} km
                    </td>

                    <td style={{ minWidth: 90 }}>
                      <b>{m.score}</b>

                      <div className="score-bar">
                        <span
                          style={{
                            width: `${m.score}%`
                          }}
                        />
                      </div>
                    </td>

                    <td>
                      <div className="breakdown">
                        <span>
                          {t('requests.compatibility')}{' '}
                          <b>
                            {m.breakdown.compatibility}
                          </b>
                        </span>

                        <span>
                          {t('requests.proximity')}{' '}
                          <b>
                            {m.breakdown.proximity}
                          </b>
                        </span>

                        <span>
                          {t('requests.recency')}{' '}
                          <b>
                            {m.breakdown.recency}
                          </b>
                        </span>

                        <span>
                          {t('requests.reliability')}{' '}
                          <b>
                            {m.breakdown.reliability}
                          </b>
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {matchResult.excluded &&
            matchResult.excluded.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button
                  className="secondary small"
                  onClick={() =>
                    setShowExcluded((s) => !s)
                  }
                >
                  {showExcluded
                    ? t('requests.hide')
                    : t('requests.show')}{' '}
                  {t('requests.excludedDonors')} (
                  {matchResult.excluded.length})
                </button>

                {showExcluded && (
                  <table
                    style={{ marginTop: 10 }}
                  >
                    <thead>
                      <tr>
                        <th>{t('requests.donor')}</th>
                        <th>{t('requests.group')}</th>
                        <th>{t('requests.score')}</th>
                        <th>
                          {t('requests.excludedBecause')}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {matchResult.excluded.map((d) => (
                        <tr key={d.donorId}>
                          <td>{d.name}</td>

                          <td>
                            <BloodBadge
                              group={d.bloodGroup}
                            />
                          </td>

                          <td className="muted">
                            {d.score}
                          </td>

                          <td>
                            {d.ineligibilityReasons.map(
                              (reason, i) => (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: 13
                                  }}
                                >
                                  {reason}
                                </div>
                              )
                            )}

                            <span className="muted">
                              {t(
                                'requests.nextEligible'
                              )}{' '}
                              {formatDate(
                                d.nextEligibleDate
                              )}
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
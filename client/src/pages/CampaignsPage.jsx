import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { campaignApi } from '../api/resources';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader,
  Card,
  Field,
  Badge,
  BloodBadge,
  Alert,
  Empty,
  Loading,
  formatDate
} from '../components/Shared';

const STATUS_BADGE = {
  upcoming: 'warn',
  ongoing: 'ok',
  completed: 'neutral',
  cancelled: 'bad'
};

export default function CampaignsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [registrations, setRegistrations] = useState(null);
  const [regResult, setRegResult] = useState(null);

  const [form, setForm] = useState({
    organizer: '',
    title: '',
    description: '',
    venue: '',
    lat: '23.7808',
    lng: '90.4203',
    address: '',
    startDate: '',
    endDate: '',
    targetUnits: 100,
    contactPhone: ''
  });

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    try {
      await campaignApi.create({
        ...(user?.role === 'Admin' && form.organizer ? { organizer: form.organizer } : {}),
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
      setNotice(t('campaigns.createdSuccess'));

      setForm((f) => ({
        ...f,
        title: '',
        description: '',
        venue: ''
      }));

      loadCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegister = async (campaignId) => {
    if (user?.role !== 'Donor' && user?.role !== 'Admin') {
      setError(t('campaigns.donorLoginRequired', { defaultValue: 'You must be logged in as a Donor to register for a campaign.' }));
      return;
    }

    setError('');
    setRegResult(null);

    try {
      const res = await campaignApi.register(campaignId);

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
        title={t('campaigns.title')}
        subtitle={t('campaigns.subtitle')}
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

      {regResult && (
        <Card title={`${t('campaigns.registered')} — ${regResult.donorName}`}>
          <BloodBadge group={regResult.bloodGroup} />{' '}

          {regResult.currentlyEligible ? (
            <Badge type="ok">
              {t('campaigns.eligible')}
            </Badge>
          ) : (
            <Badge type="warn">
              {t('campaigns.registeredNotEligible')}
            </Badge>
          )}

          {regResult.eligibilityNotes.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {regResult.eligibilityNotes.map((n, i) => (
                <li key={i} style={{ fontSize: 14 }}>
                  {n}
                </li>
              ))}
            </ul>
          )}

          {regResult.nextEligibleDate && (
            <div className="muted">
              {t('campaigns.nextEligible')}:{' '}
              {formatDate(regResult.nextEligibleDate)}
            </div>
          )}

          <button
            className="secondary small"
            style={{ marginTop: 10 }}
            onClick={() => setRegResult(null)}
          >
            {t('campaigns.close')}
          </button>
        </Card>
      )}

      <Card title={t('campaigns.createBloodDrive')}>
        <form onSubmit={handleCreate}>
          {user?.role === 'Admin' ? (
            <Field label={t('campaigns.organizerId')}>
              <input
                value={form.organizer}
                onChange={set('organizer')}
                placeholder="Admin override: enter organizer User ID"
              />
            </Field>
          ) : (
            <div style={{ marginBottom: 16, fontSize: 14 }} className="muted">
              {t('campaigns.organizingAs', { defaultValue: 'Organizing campaign as:' })}{' '}
              <b>{user?.name}</b>{' '}
              <span className="badge neutral" style={{ marginLeft: 6 }}>
                {user?.role}
              </span>
            </div>
          )}

          <div className="form-row">
            <Field label={t('campaigns.titleField')}>
              <input
                value={form.title}
                onChange={set('title')}
                required
              />
            </Field>
          </div>

          <Field label={t('campaigns.description')}>
            <input
              value={form.description}
              onChange={set('description')}
            />
          </Field>

          <div className="form-row">
            <Field label={t('campaigns.venue')}>
              <input
                value={form.venue}
                onChange={set('venue')}
                required
              />
            </Field>

            <Field label={t('campaigns.area')}>
              <input
                value={form.address}
                onChange={set('address')}
              />
            </Field>
          </div>

          <div className="form-row">
            <Field label={t('campaigns.latitude')}>
              <input
                value={form.lat}
                onChange={set('lat')}
                required
              />
            </Field>

            <Field label={t('campaigns.longitude')}>
              <input
                value={form.lng}
                onChange={set('lng')}
                required
              />
            </Field>

            <Field label={t('campaigns.startDate')}>
              <input
                type="date"
                value={form.startDate}
                onChange={set('startDate')}
                required
              />
            </Field>

            <Field label={t('campaigns.endDate')}>
              <input
                type="date"
                value={form.endDate}
                onChange={set('endDate')}
                required
              />
            </Field>

            <Field label={t('campaigns.targetUnits')}>
              <input
                type="number"
                value={form.targetUnits}
                onChange={set('targetUnits')}
              />
            </Field>
          </div>

          <button type="submit">
            {t('campaigns.createDrive')}
          </button>
        </form>
      </Card>

      <Card title={`${t('campaigns.campaigns')} (${campaigns.length})`}>
        {loading ? (
          <Loading />
        ) : campaigns.length === 0 ? (
          <Empty>
            {t('campaigns.noCampaigns')}
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('campaigns.tableTitle')}</th>
                <th>{t('campaigns.tableVenue')}</th>
                <th>{t('campaigns.tableDates')}</th>
                <th>{t('campaigns.tableStatus')}</th>
                <th>{t('campaigns.registered')}</th>
                <th>{t('campaigns.progress')}</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id}>
                  <td>
                    <b>{c.title}</b>
                    <br />
                    <span className="muted">
                      {c.description}
                    </span>
                  </td>

                  <td>{c.venue}</td>

                  <td className="muted">
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                  </td>

                  <td>
                    <Badge type={STATUS_BADGE[c.status]}>
                      {t(`campaigns.status.${c.status}`)}
                    </Badge>
                  </td>

                  <td>{c.registeredCount}</td>

                  <td style={{ minWidth: 90 }}>
                    {c.unitsCollected}/{c.targetUnits}

                    <div className="score-bar">
                      <span
                        style={{
                          width: `${c.progressPercent}%`
                        }}
                      />
                    </div>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="small"
                      onClick={() => handleRegister(c._id)}
                    >
                      {t('campaigns.register')}
                    </button>{' '}

                    <button
                      className="small secondary"
                      onClick={() =>
                        handleViewRegistrations(c._id)
                      }
                    >
                      {t('campaigns.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {registrations && (
        <Card
          title={`${t('campaigns.registrations')} (${registrations.count})`}
        >
          {registrations.count === 0 ? (
            <Empty>
              {t('campaigns.noRegistrations')}
            </Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('campaigns.donor')}</th>
                  <th>{t('campaigns.group')}</th>
                  <th>{t('campaigns.donations')}</th>
                  <th>{t('campaigns.registeredDate')}</th>
                  <th>{t('campaigns.attended')}</th>
                </tr>
              </thead>

              <tbody>
                {registrations.data.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <b>{r.donor?.name}</b>
                      <br />
                      <span className="muted">
                        {r.donor?.phone}
                      </span>
                    </td>

                    <td>
                      <BloodBadge group={r.donor?.bloodGroup} />
                    </td>

                    <td>{r.donor?.totalDonations}</td>

                    <td className="muted">
                      {formatDate(r.registeredAt)}
                    </td>

                    <td>
                      {r.attended ? (
                        <Badge type="ok">
                          {t('campaigns.attendedYes')}
                        </Badge>
                      ) : (
                        <Badge type="neutral">
                          {t('campaigns.pending')}
                        </Badge>
                      )}
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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { donationApi } from '../api/resources';
import {
  PageHeader, Card, Field, Alert, Empty, BloodBadge, formatDate
} from '../components/Shared';

export default function DonationsPage() {
  const { t } = useTranslation();

  const [donorId, setDonorId] = useState('');
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    donorId: '',
    unitsDonated: 1,
    locationName: '',
    notes: ''
  });

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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

    if (donorId) {
      loadHistory(donorId);
    }
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

      setNotice(t('donations.recordedSuccess'));

      setForm((f) => ({
        ...f,
        notes: ''
      }));

      if (form.donorId === donorId) {
        loadHistory(donorId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={t('donations.title')}
        subtitle={t('donations.subtitle')}
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
        <Card title={t('donations.logDonation')}>
          <form onSubmit={handleLog}>
            <Field label={t('donations.donorId')}>
              <input
                value={form.donorId}
                onChange={set('donorId')}
                required
              />
            </Field>

            <Field label={t('donations.unitsDonated')}>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={form.unitsDonated}
                onChange={set('unitsDonated')}
                required
              />
            </Field>

            <Field label={t('donations.location')}>
              <input
                value={form.locationName}
                onChange={set('locationName')}
                placeholder={t('donations.locationPlaceholder')}
              />
            </Field>

            <Field label={t('donations.notes')}>
              <input
                value={form.notes}
                onChange={set('notes')}
              />
            </Field>

            <button type="submit">
              {t('donations.recordDonation')}
            </button>
          </form>
        </Card>

        <Card title={t('donations.viewHistory')}>
          <form onSubmit={handleLookup}>
            <Field label={t('donations.donorId')}>
              <input
                value={donorId}
                onChange={(e) => setDonorId(e.target.value)}
                required
              />
            </Field>

            <button type="submit">
              {t('donations.loadHistory')}
            </button>
          </form>

          {history && (
            <div style={{ marginTop: 16 }}>
              <h3>{t('donations.statistics')}</h3>

              <div className="muted">
                {history.stats.totalDonations}{' '}
                {t('donations.donationCount')} ·{' '}

                {history.stats.totalUnits}{' '}
                {t('donations.unitCount')} ·{' '}

                {t('donations.lastOn')}{' '}
                {formatDate(history.stats.lastDonation)}
              </div>
            </div>
          )}
        </Card>
      </div>

      {history && (
        <Card title={`${t('donations.records')} (${history.count})`}>
          {history.count === 0 ? (
            <Empty>
              {t('donations.noDonations')}
            </Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('donations.date')}</th>
                  <th>{t('donations.group')}</th>
                  <th>{t('donations.units')}</th>
                  <th>{t('donations.location')}</th>
                  <th>{t('donations.notes')}</th>
                </tr>
              </thead>

              <tbody>
                {history.data.map((r) => (
                  <tr key={r._id}>
                    <td>{formatDate(r.donationDate)}</td>

                    <td>
                      <BloodBadge group={r.bloodGroup} />
                    </td>

                    <td>{r.unitsDonated}</td>

                    <td>
                      {r.locationName || '—'}
                    </td>

                    <td className="muted">
                      {r.notes || '—'}
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
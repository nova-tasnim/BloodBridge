import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { donorApi } from '../api/resources';
import Hero from '../components/Hero';
import {
  InspirationBanner,
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

export default function DonorsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const directoryRef = useRef(null);

  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  const [filters, setFilters] = useState({
    bloodGroup: '',
    isAvailable: '',
    gender: '',
    minWeight: '',
    name: '',
    lat: '',
    lng: '',
    radius: ''
  });

  const loadDonors = async (params = {}) => {
    setLoading(true);
    setError('');

    try {
      const cleaned = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null)
      );

      const res = await donorApi.list(cleaned);

      setDonors(res.data);
      setAppliedFilters(res.appliedFilters);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadDonors(filters);
  };

  const handleReset = () => {
    const blank = {
      bloodGroup: '',
      isAvailable: '',
      gender: '',
      minWeight: '',
      name: '',
      lat: '',
      lng: '',
      radius: ''
    };

    setFilters(blank);
    loadDonors();
  };

  const handleToggle = async (donor) => {
    try {
      await donorApi.toggleAvailability(
        donor._id,
        !donor.isAvailable
      );

      setDonors((prev) =>
        prev.map((d) =>
          d._id === donor._id
            ? { ...d, isAvailable: !d.isAvailable }
            : d
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEligibility = async (donorId) => {
    setError('');

    try {
      const res = await donorApi.eligibility(donorId);
      setEligibility(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (key) => (e) =>
    setFilters((f) => ({
      ...f,
      [key]: e.target.value
    }));

  return (
    <div className="page">
      <Hero
        onPrimaryAction={() => navigate('/requests')}
        onSecondaryAction={() =>
          directoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      />

      <div ref={directoryRef}>
        <PageHeader
          title={t('donors.title')}
          subtitle={t('donors.subtitle')}
        />

        <InspirationBanner />
      </div>

      <Alert
        message={error}
        onDismiss={() => setError('')}
      />

      {/* Search & Filter */}
      <Card title={t('donors.searchFilter')}>
        <form onSubmit={handleSearch}>
          <div className="form-row">

            <Field label={t('donors.bloodGroup')}>
              <select
                value={filters.bloodGroup}
                onChange={set('bloodGroup')}
              >
                <option value="">
                  {t('donors.any')}
                </option>

                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('donors.availability')}>
              <select
                value={filters.isAvailable}
                onChange={set('isAvailable')}
              >
                <option value="">
                  {t('donors.any')}
                </option>

                <option value="true">
                  {t('donors.available')}
                </option>

                <option value="false">
                  {t('donors.unavailable')}
                </option>
              </select>
            </Field>

            <Field label={t('donors.gender')}>
              <select
                value={filters.gender}
                onChange={set('gender')}
              >
                <option value="">
                  {t('donors.any')}
                </option>

                <option value="male">
                  {t('donors.male')}
                </option>

                <option value="female">
                  {t('donors.female')}
                </option>

                <option value="other">
                  {t('donors.other')}
                </option>
              </select>
            </Field>

            <Field label={t('donors.minWeight')}>
              <input
                type="number"
                value={filters.minWeight}
                onChange={set('minWeight')}
                placeholder="50"
              />
            </Field>

            <Field label={t('donors.nameContains')}>
              <input
                value={filters.name}
                onChange={set('name')}
                placeholder={t('donors.namePlaceholder')}
              />
            </Field>

          </div>

          <div className="form-row">

            <Field label={t('donors.latitude')}>
              <input
                value={filters.lat}
                onChange={set('lat')}
                placeholder="23.7808"
              />
            </Field>

            <Field label={t('donors.longitude')}>
              <input
                value={filters.lng}
                onChange={set('lng')}
                placeholder="90.4203"
              />
            </Field>

            <Field label={t('donors.radius')}>
              <input
                type="number"
                value={filters.radius}
                onChange={set('radius')}
                placeholder="5"
              />
            </Field>

          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 4
            }}
          >
            <button type="submit">
              {t('donors.search')}
            </button>

            <button
              type="button"
              className="secondary"
              onClick={handleReset}
            >
              {t('donors.reset')}
            </button>
          </div>
        </form>

        {appliedFilters && (
          <div
            className="muted"
            style={{ marginTop: 12 }}
          >
            <b>{t('donors.querySent')}</b>{' '}
            <code>
              {JSON.stringify(appliedFilters)}
            </code>
          </div>
        )}
      </Card>

      {/* Eligibility */}
      {eligibility && (
        <Card
          title={`${t('donors.eligibility')} — ${eligibility.donorName}`}
        >
          <div style={{ marginBottom: 10 }}>
            {eligibility.eligible ? (
              <Badge type="ok">
                {t('donors.eligible')}
              </Badge>
            ) : (
              <Badge type="bad">
                {t('donors.notEligible')}
              </Badge>
            )}
          </div>

          {eligibility.reasons.length > 0 && (
            <ul
              style={{
                margin: '0 0 10px',
                paddingLeft: 20
              }}
            >
              {eligibility.reasons.map((reason, index) => (
                <li
                  key={index}
                  style={{ fontSize: 14 }}
                >
                  {reason}
                </li>
              ))}
            </ul>
          )}

          <div className="muted">
            {t('donors.age')} {eligibility.age}
            {' · '}
            {t('donors.requiredInterval')}{' '}
            {eligibility.requiredIntervalDays} {t('donors.days')}
            {' · '}
            {t('donors.daysSinceLastDonation')}{' '}
            {eligibility.daysSinceLastDonation ?? '—'}
            {' · '}
            {t('donors.nextEligible')}{' '}
            {formatDate(eligibility.nextEligibleDate)}
          </div>

          <button
            className="secondary small"
            style={{ marginTop: 10 }}
            onClick={() => setEligibility(null)}
          >
            {t('donors.close')}
          </button>
        </Card>
      )}

      {/* Donor List */}
      <Card
        title={`${t('donors.donors')} (${donors.length})`}
      >
        {loading ? (
          <Loading />
        ) : donors.length === 0 ? (
          <Empty>
            {t('donors.noMatch')}
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('donors.name')}</th>
                <th>{t('donors.group')}</th>
                <th>{t('donors.age')}</th>
                <th>{t('donors.weight')}</th>
                <th>{t('donors.area')}</th>
                <th>{t('donors.donations')}</th>
                <th>{t('donors.lastDonated')}</th>
                <th>{t('donors.availability')}</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {donors.map((donor) => (
                <tr key={donor._id}>
                  <td>
                    <b>{donor.name}</b>
                    <br />
                    <span className="muted">
                      {donor.phone}
                    </span>
                  </td>

                  <td>
                    <BloodBadge
                      group={donor.bloodGroup}
                    />
                  </td>

                  <td>
                    {donor.age ?? '—'}
                  </td>

                  <td>
                    {donor.weightKg} kg
                  </td>

                  <td>
                    {donor.location?.address ?? '—'}
                  </td>

                  <td>
                    {donor.totalDonations}
                  </td>

                  <td>
                    {formatDate(donor.lastDonationDate)}
                  </td>

                  <td>
                    <button
                      className={
                        donor.isAvailable
                          ? 'small'
                          : 'small secondary'
                      }
                      onClick={() => handleToggle(donor)}
                    >
                      {donor.isAvailable
                        ? t('donors.available')
                        : t('donors.unavailable')}
                    </button>
                  </td>

                  <td>
                    <button
                      className="small secondary"
                      onClick={() =>
                        handleEligibility(donor._id)
                      }
                    >
                      {t('donors.check')}
                    </button>
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
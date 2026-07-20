import { useState, useEffect } from 'react';
import { donorApi } from '../api/resources';
import {
  PageHeader, Card, Field, Badge, BloodBadge, Alert, Empty, Loading,
  BLOOD_GROUPS, formatDate
} from '../components/Shared';

export default function DonorsPage() {
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

  useEffect(() => { loadDonors(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadDonors(filters);
  };

  const handleReset = () => {
    const blank = {
      bloodGroup: '', isAvailable: '', gender: '',
      minWeight: '', name: '', lat: '', lng: '', radius: ''
    };
    setFilters(blank);
    loadDonors();
  };

  const handleToggle = async (donor) => {
    try {
      await donorApi.toggleAvailability(donor._id, !donor.isAvailable);
      setDonors((prev) =>
        prev.map((d) =>
          d._id === donor._id ? { ...d, isAvailable: !d.isAvailable } : d
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
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="page">
      <PageHeader
        title="Donors"
        subtitle="Search and filter registered donors, check eligibility, and manage availability."
      />

      <Alert message={error} onDismiss={() => setError('')} />

      <Card title="Search & Filter">
        <form onSubmit={handleSearch}>
          <div className="form-row">
            <Field label="Blood Group">
              <select value={filters.bloodGroup} onChange={set('bloodGroup')}>
                <option value="">Any</option>
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Availability">
              <select value={filters.isAvailable} onChange={set('isAvailable')}>
                <option value="">Any</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </Field>
            <Field label="Gender">
              <select value={filters.gender} onChange={set('gender')}>
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Min Weight (kg)">
              <input type="number" value={filters.minWeight} onChange={set('minWeight')} placeholder="50" />
            </Field>
            <Field label="Name contains">
              <input value={filters.name} onChange={set('name')} placeholder="e.g. rahman" />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Latitude">
              <input value={filters.lat} onChange={set('lat')} placeholder="23.7808" />
            </Field>
            <Field label="Longitude">
              <input value={filters.lng} onChange={set('lng')} placeholder="90.4203" />
            </Field>
            <Field label="Radius (km)">
              <input type="number" value={filters.radius} onChange={set('radius')} placeholder="5" />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="submit">Search</button>
            <button type="button" className="secondary" onClick={handleReset}>Reset</button>
          </div>
        </form>

        {appliedFilters && (
          <div className="muted" style={{ marginTop: 12 }}>
            <b>Query sent to MongoDB:</b>{' '}
            <code>{JSON.stringify(appliedFilters)}</code>
          </div>
        )}
      </Card>

      {eligibility && (
        <Card title={`Eligibility — ${eligibility.donorName}`}>
          <div style={{ marginBottom: 10 }}>
            {eligibility.eligible
              ? <Badge type="ok">Eligible to donate</Badge>
              : <Badge type="bad">Not currently eligible</Badge>}
          </div>
          {eligibility.reasons.length > 0 && (
            <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
              {eligibility.reasons.map((r, i) => (
                <li key={i} style={{ fontSize: 14 }}>{r}</li>
              ))}
            </ul>
          )}
          <div className="muted">
            Age {eligibility.age} · Required interval {eligibility.requiredIntervalDays} days ·
            Days since last donation {eligibility.daysSinceLastDonation ?? '—'} ·
            Next eligible {formatDate(eligibility.nextEligibleDate)}
          </div>
          <button className="secondary small" style={{ marginTop: 10 }}
            onClick={() => setEligibility(null)}>Close</button>
        </Card>
      )}

      <Card title={`Donors (${donors.length})`}>
        {loading ? <Loading /> : donors.length === 0 ? (
          <Empty>No donors match these filters.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>Age</th>
                <th>Weight</th>
                <th>Area</th>
                <th>Donations</th>
                <th>Last Donated</th>
                <th>Available</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {donors.map((d) => (
                <tr key={d._id}>
                  <td><b>{d.name}</b><br /><span className="muted">{d.phone}</span></td>
                  <td><BloodBadge group={d.bloodGroup} /></td>
                  <td>{d.age ?? '—'}</td>
                  <td>{d.weightKg} kg</td>
                  <td>{d.location?.address ?? '—'}</td>
                  <td>{d.totalDonations}</td>
                  <td>{formatDate(d.lastDonationDate)}</td>
                  <td>
                    <button
                      className={d.isAvailable ? 'small' : 'small secondary'}
                      onClick={() => handleToggle(d)}
                    >
                      {d.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                  <td>
                    <button className="small secondary"
                      onClick={() => handleEligibility(d._id)}>
                      Check
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
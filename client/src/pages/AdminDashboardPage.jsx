import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/resources';

export default function AdminDashboardPage() {
  const { t } = useTranslation();

  const [overview, setOverview] = useState(null);
  const [retention, setRetention] = useState(null);
  const [trends, setTrends] = useState(null);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        overviewData,
        retentionData,
        trendsData,
        pendingData,
        usersData
      ] = await Promise.all([
        adminApi.overview(),
        adminApi.donorRetention(),
        adminApi.shortageTrends(),
        adminApi.pendingVerifications(),
        adminApi.users({
          search,
          role,
          page: 1,
          limit: 20
        })
      ]);

      setOverview(overviewData);
      setRetention(retentionData);
      setTrends(trendsData);
      setPending(pendingData);
      setUsers(usersData.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSearch = async () => {
    try {
      const result = await adminApi.users({
        search,
        role,
        page: 1,
        limit: 20
      });

      setUsers(result.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const deactivateUser = async (userId) => {
    const confirmed = window.confirm(
      t('admin.confirmDeactivate')
    );

    if (!confirmed) return;

    try {
      await adminApi.deactivateUser(userId);

      setUsers((current) =>
        current.map((user) =>
          user._id === userId
            ? { ...user, isActive: false }
            : user
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const verifyInstitution = async (userId) => {
    try {
      await adminApi.verifyInstitution(userId);

      setPending((current) =>
        current.filter((user) => user._id !== userId)
      );
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-loading">
          {t('admin.loading')}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{t('admin.title')}</h1>
          <p>{t('admin.subtitle')}</p>
        </div>

        <button
          className="admin-refresh"
          onClick={loadDashboard}
        >
          {t('admin.refresh')}
        </button>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {/* Overview */}
      {overview && (
        <section className="admin-stats">
          <StatCard
            title={t('admin.overview.totalDonors')}
            value={overview.totalDonors}
          />

          <StatCard
            title={t('admin.overview.totalPatients')}
            value={overview.totalPatients}
          />

          <StatCard
            title={t('admin.overview.hospitals')}
            value={overview.totalHospitals}
          />

          <StatCard
            title={t('admin.overview.bloodBanks')}
            value={overview.totalBloodBanks}
          />

          <StatCard
            title={t('admin.overview.allRequests')}
            value={overview.totalRequestsAllTime}
          />

          <StatCard
            title={t('admin.overview.thisMonth')}
            value={overview.totalRequestsThisMonth}
          />

          <StatCard
            title={t('admin.overview.fulfillmentRate')}
            value={overview.fulfillmentRate}
          />
        </section>
      )}

      {/* Retention */}
      {retention && (
        <section className="admin-card">
          <div className="section-title">
            <h2>{t('admin.retention.title')}</h2>
          </div>

          <div className="retention-grid">
            <Metric
              label={t('admin.retention.donorsWithDonations')}
              value={retention.totalDonorsWithDonations}
            />

            <Metric
              label={t('admin.retention.oneTimeDonors')}
              value={retention.oneTimeDonors}
            />

            <Metric
              label={t('admin.retention.repeatDonors')}
              value={retention.repeatDonors}
            />

            <Metric
              label={t('admin.retention.highlyActive')}
              value={retention.highlyActiveDonors}
            />

            <Metric
              label={t('admin.retention.retentionRate')}
              value={retention.retentionRate}
            />
          </div>
        </section>
      )}

      {/* Pending verification */}
      <section className="admin-card">
        <div className="section-title">
          <div>
            <h2>{t('admin.verifications.title')}</h2>
            <p>{t('admin.verifications.subtitle')}</p>
          </div>

          <span className="admin-badge">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="empty-state">
            {t('admin.verifications.empty')}
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.table.name')}</th>
                  <th>{t('admin.table.email')}</th>
                  <th>{t('admin.table.role')}</th>
                  <th>{t('admin.table.created')}</th>
                  <th>{t('admin.table.action')}</th>
                </tr>
              </thead>

              <tbody>
                {pending.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      {new Date(
                        user.createdAt
                      ).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="action-button verify"
                        onClick={() =>
                          verifyInstitution(user._id)
                        }
                      >
                        {t('admin.verifications.verify')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* User management */}
      <section className="admin-card">
        <div className="section-title">
          <div>
            <h2>{t('admin.users.title')}</h2>
            <p>{t('admin.users.subtitle')}</p>
          </div>
        </div>

        <div className="user-filters">
          <input
            type="text"
            placeholder={t('admin.users.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">
              {t('admin.users.allRoles')}
            </option>
            <option value="Donor">
              {t('admin.roles.donor')}
            </option>
            <option value="Patient">
              {t('admin.roles.patient')}
            </option>
            <option value="Hospital">
              {t('admin.roles.hospital')}
            </option>
            <option value="BloodBank">
              {t('admin.roles.bloodBank')}
            </option>
          </select>

          <button
            className="admin-search"
            onClick={handleSearch}
          >
            {t('admin.users.search')}
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.table.name')}</th>
                <th>{t('admin.table.email')}</th>
                <th>{t('admin.table.role')}</th>
                <th>{t('admin.table.bloodGroup')}</th>
                <th>{t('admin.table.status')}</th>
                <th>{t('admin.table.available')}</th>
                <th>{t('admin.table.action')}</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.bloodGroup || '-'}</td>

                  <td>
                    <span
                      className={
                        user.isActive
                          ? 'status active'
                          : 'status inactive'
                      }
                    >
                      {user.isActive
                        ? t('admin.status.active')
                        : t('admin.status.inactive')}
                    </span>
                  </td>

                  <td>
                    {user.role === 'Donor'
                      ? user.isAvailable
                        ? t('admin.common.yes')
                        : t('admin.common.no')
                      : '-'}
                  </td>

                  <td>
                    {user.isActive ? (
                      <button
                        className="action-button deactivate"
                        onClick={() =>
                          deactivateUser(user._id)
                        }
                      >
                        {t('admin.users.deactivate')}
                      </button>
                    ) : (
                      <span className="disabled-label">
                        {t('admin.users.deactivated')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      {t('admin.users.noUsers')}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shortage trends */}
      {trends && (
        <section className="admin-card">
          <div className="section-title">
            <h2>{t('admin.trends.title')}</h2>
          </div>

          <div className="trend-grid">
            {trends.byBloodGroup?.map((item) => (
              <div
                className="trend-item"
                key={item._id}
              >
                <strong>{item._id}</strong>

                <span>
                  {item.totalRequests}{' '}
                  {t('admin.trends.requests')}
                </span>

                <div className="trend-statuses">
                  {item.statusBreakdown?.map((status) => (
                    <small key={status.status}>
                      {status.status}: {status.count}
                    </small>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="admin-stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
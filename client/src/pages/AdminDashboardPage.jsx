import { useEffect, useState } from 'react';
import { adminApi } from '../api/resources';

export default function AdminDashboardPage() {
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
      'Are you sure you want to deactivate this user?'
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
        <div className="admin-loading">Loading admin dashboard...</div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Monitor and manage the BloodBridge platform.</p>
        </div>

        <button
          className="admin-refresh"
          onClick={loadDashboard}
        >
          Refresh
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
            title="Total Donors"
            value={overview.totalDonors}
          />

          <StatCard
            title="Total Patients"
            value={overview.totalPatients}
          />

          <StatCard
            title="Hospitals"
            value={overview.totalHospitals}
          />

          <StatCard
            title="Blood Banks"
            value={overview.totalBloodBanks}
          />

          <StatCard
            title="All Requests"
            value={overview.totalRequestsAllTime}
          />

          <StatCard
            title="This Month"
            value={overview.totalRequestsThisMonth}
          />

          <StatCard
            title="Fulfillment Rate"
            value={overview.fulfillmentRate}
          />
        </section>
      )}

      {/* Retention */}
      {retention && (
        <section className="admin-card">
          <div className="section-title">
            <h2>Donor Retention</h2>
          </div>

          <div className="retention-grid">
            <Metric
              label="Donors with Donations"
              value={retention.totalDonorsWithDonations}
            />

            <Metric
              label="One-Time Donors"
              value={retention.oneTimeDonors}
            />

            <Metric
              label="Repeat Donors"
              value={retention.repeatDonors}
            />

            <Metric
              label="Highly Active"
              value={retention.highlyActiveDonors}
            />

            <Metric
              label="Retention Rate"
              value={retention.retentionRate}
            />
          </div>
        </section>
      )}

      {/* Pending verification */}
      <section className="admin-card">
        <div className="section-title">
          <div>
            <h2>Pending Verifications</h2>
            <p>Hospitals and blood banks awaiting verification.</p>
          </div>

          <span className="admin-badge">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="empty-state">
            No pending verifications.
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {pending.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="action-button verify"
                        onClick={() =>
                          verifyInstitution(user._id)
                        }
                      >
                        Verify
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
            <h2>User Management</h2>
            <p>Search, filter and manage platform users.</p>
          </div>
        </div>

        <div className="user-filters">
          <input
            type="text"
            placeholder="Search name or email..."
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
            <option value="">All roles</option>
            <option value="Donor">Donor</option>
            <option value="Patient">Patient</option>
            <option value="Hospital">Hospital</option>
            <option value="BloodBank">Blood Bank</option>
          </select>

          <button
            className="admin-search"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Blood Group</th>
                <th>Status</th>
                <th>Available</th>
                <th>Action</th>
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
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td>
                    {user.role === 'Donor'
                      ? user.isAvailable
                        ? 'Yes'
                        : 'No'
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
                        Deactivate
                      </button>
                    ) : (
                      <span className="disabled-label">
                        Deactivated
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      No users found.
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
            <h2>Blood Request Trends</h2>
          </div>

          <div className="trend-grid">
            {trends.byBloodGroup?.map((item) => (
              <div
                className="trend-item"
                key={item._id}
              >
                <strong>{item._id}</strong>

                <span>
                  {item.totalRequests} requests
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
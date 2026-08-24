import {
  useEffect,
  useState
} from 'react';

import {
  useTranslation
} from 'react-i18next';

import {
  badgeApi
} from '../api/resources';

import {
  useAuth
} from '../context/AuthContext';

import {
  PageHeader,
  Card,
  Badge,
  BloodBadge,
  Alert,
  Empty,
  Loading,
  formatDate
} from '../components/Shared';

export default function LeaderboardPage() {
  const { t } =
    useTranslation();

  const { user } =
    useAuth();

  const [
    leaderboard,
    setLeaderboard
  ] =
    useState([]);

  const [
    myStats,
    setMyStats
  ] =
    useState(null);

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    error,
    setError
  ] =
    useState('');

  /*
   * Native Donor:
   * publicId / donorPublicId
   *
   * Patient-donor:
   * donorProfile.publicId / donorPublicId
   */
  const donorIdentifier =
    user?.donorPublicId ||
    user?.publicId ||
    user?.donorProfile
      ?.publicId ||
    null;

  const hasDonorCapability =
    user?.role ===
      'Donor' ||
    (
      user?.role ===
        'Patient' &&
      Boolean(
        user?.donorProfile
      )
    );

  const loadData =
    async () => {
      setLoading(true);
      setError('');

      try {
        const leaderboardData =
          await badgeApi
            .leaderboard();

        setLeaderboard(
          Array.isArray(
            leaderboardData
          )
            ? leaderboardData
            : leaderboardData
                ?.data ||
              []
        );

        if (
          hasDonorCapability &&
          donorIdentifier
        ) {
          const own =
            await badgeApi
              .donor(
                donorIdentifier
              );

          setMyStats(
            own?.data ||
            own
          );
        } else {
          setMyStats(null);
        }
      } catch (err) {
        setError(
          err.message ||
          'Unable to load leaderboard'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();
  }, [
    donorIdentifier,
    hasDonorCapability
  ]);

  if (loading) {
    return (
      <div className="page">
        <Loading />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={t(
          'leaderboard.title',
          {
            defaultValue:
              'Donor Leaderboard'
          }
        )}
        subtitle={t(
          'leaderboard.subtitle',
          {
            defaultValue:
              'Achievements are calculated from approved donations only.'
          }
        )}
      />

      <Alert
        message={error}
        onDismiss={() =>
          setError('')
        }
      />

      {hasDonorCapability &&
        myStats && (
          <Card
            title={t(
              'leaderboard.myProgress',
              {
                defaultValue:
                  'My Donor Progress'
              }
            )}
          >
            <div className="grid grid-3">
              <div>
                <span className="muted">
                  Approved Donations
                </span>

                <h2>
                  {
                    myStats
                      .donationCount
                  }
                </h2>
              </div>

              <div>
                <span className="muted">
                  Units Donated
                </span>

                <h2>
                  {
                    myStats
                      .unitsDonated
                  }
                </h2>
              </div>

              <div>
                <span className="muted">
                  Lives Saved
                </span>

                <h2>
                  {
                    myStats
                      .livesSaved
                  }
                </h2>
              </div>
            </div>

            <p>
              <b>
                Donor ID:
              </b>{' '}
              {
                myStats
                  .donor
                  ?.publicId
              }
            </p>

            <p>
              <b>
                Last approved donation:
              </b>{' '}
              {formatDate(
                myStats
                  .lastApprovedDonationDate
              )}
            </p>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap:
                  'wrap'
              }}
            >
              {myStats
                .badges
                ?.length ? (
                myStats
                  .badges
                  .map(
                    (badge) => (
                      <Badge
                        key={
                          badge._id ||
                          badge.name
                        }
                        type="ok"
                      >
                        🏅{' '}
                        {
                          badge.name
                        }
                      </Badge>
                    )
                  )
              ) : (
                <span className="muted">
                  Complete your first
                  approved donation to
                  earn a badge.
                </span>
              )}
            </div>
          </Card>
        )}

      {!hasDonorCapability &&
        user?.role ===
          'Patient' && (
          <Card title="Donor Achievements">
            <p className="muted">
              You can view the
              leaderboard now. Register
              as a blood donor to start
              earning badges.
            </p>
          </Card>
        )}

      <Card
        title={t(
          'leaderboard.rankings',
          {
            defaultValue:
              'Community Rankings'
          }
        )}
      >
        {leaderboard.length ===
        0 ? (
          <Empty>
            No approved donations
            have been recorded yet.
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  Rank
                </th>

                <th>
                  Donor
                </th>

                <th>
                  Blood
                </th>

                <th>
                  Type
                </th>

                <th>
                  Approved Donations
                </th>

                <th>
                  Units
                </th>

                <th>
                  Lives Saved
                </th>

                <th>
                  Badges
                </th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map(
                (
                  donor,
                  index
                ) => (
                  <tr
                    key={
                      donor._id
                    }
                  >
                    <td>
                      <b>
                        #
                        {
                          index +
                          1
                        }
                      </b>
                    </td>

                    <td>
                      <b>
                        {
                          donor.name
                        }
                      </b>

                      <br />

                      <span className="muted">
                        {
                          donor.publicId
                        }
                      </span>
                    </td>

                    <td>
                      <BloodBadge
                        group={
                          donor.bloodGroup
                        }
                      />
                    </td>

                    <td>
                      <Badge type="neutral">
                        {donor.donorType ===
                        'patient-donor'
                          ? 'Patient + Donor'
                          : 'Donor'}
                      </Badge>
                    </td>

                    <td>
                      {
                        donor
                          .donationCount
                      }
                    </td>

                    <td>
                      {
                        donor
                          .unitsDonated
                      }
                    </td>

                    <td>
                      {
                        donor
                          .livesSaved
                      }
                    </td>

                    <td>
                      <div
                        style={{
                          display:
                            'flex',
                          gap: 4,
                          flexWrap:
                            'wrap'
                        }}
                      >
                        {donor.badges
                          ?.length ? (
                          donor.badges.map(
                            (
                              badge
                            ) => (
                              <Badge
                                key={
                                  badge._id ||
                                  badge.name
                                }
                                type="ok"
                              >
                                {
                                  badge.name
                                }
                              </Badge>
                            )
                          )
                        ) : (
                          <span className="muted">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
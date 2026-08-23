import {
  Fragment,
  useEffect,
  useState
} from 'react';

import {
  useTranslation
} from 'react-i18next';

import {
  donationsApi
} from '../api/resources';

import {
  useAuth
} from '../context/AuthContext';

import FeedbackPanel from '../components/FeedbackPanel';

import {
  PageHeader,
  Card,
  Field,
  Alert,
  Empty,
  BloodBadge,
  Badge,
  formatDate
} from '../components/Shared';

export default function DonationsPage() {
  const { t } =
    useTranslation();

  const { user } =
    useAuth();

  /*
  |--------------------------------------------------------------------------
  | Capability calculation
  |--------------------------------------------------------------------------
  */

  const isNativeDonor =
    user?.role === 'Donor';

  const isPatientDonor =
    user?.role === 'Patient' &&
    Boolean(
      user?.donorProfile
    );

  const canSelfDonate =
    isNativeDonor ||
    isPatientDonor;

  const canViewOwnHistory =
    canSelfDonate;

  /*
   * Your capability matrix:
   *
   * Native Donor        ❌
   * Patient             ✅
   * Patient donor       ✅
   * Hospital            ✅
   * BloodBank           ✅
   * Admin               ✅
   */
  const canLookupOtherDonor =
    [
      'Patient',
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(
      user?.role
    );

  /*
   * Only institutions/admin log for someone else.
   */
  const canLogForOther =
    [
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(
      user?.role
    );

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [ownHistory, setOwnHistory] =
    useState(null);

  const [
    lookupHistory,
    setLookupHistory
  ] =
    useState(null);

  const [
    lookupDonorId,
    setLookupDonorId
  ] =
    useState('');

  const [
    lookupTarget,
    setLookupTarget
  ] =
    useState(null);

  const [error, setError] =
    useState('');

  const [notice, setNotice] =
    useState('');

  const [
    openFeedbackId,
    setOpenFeedbackId
  ] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Self-donation form
  |--------------------------------------------------------------------------
  */

  const [
    selfForm,
    setSelfForm
  ] =
    useState({
      unitsDonated: 1,
      locationName: '',
      notes: ''
    });

  /*
  |--------------------------------------------------------------------------
  | Institution/Admin form
  |--------------------------------------------------------------------------
  */

  const [
    staffForm,
    setStaffForm
  ] =
    useState({
      donorId: '',
      unitsDonated: 1,
      locationName: '',
      notes: ''
    });

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const extractError = (
    err,
    fallback
  ) =>
    err?.response?.data?.message ||
    err?.message ||
    fallback;

  const setSelf =
    (key) =>
    (e) => {
      setSelfForm(
        (previous) => ({
          ...previous,

          [key]:
            e.target.value
        })
      );
    };

  const setStaff =
    (key) =>
    (e) => {
      setStaffForm(
        (previous) => ({
          ...previous,

          [key]:
            e.target.value
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Own history
  |--------------------------------------------------------------------------
  */

  const loadMyHistory =
    async () => {
      setError('');

      try {
        const res =
          await donationsApi
            .getMyHistory();

        setOwnHistory(
          res || null
        );
      } catch (err) {
        setOwnHistory(null);

        setError(
          extractError(
            err,
            'Failed to load your donation history'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Another donor's history
  |--------------------------------------------------------------------------
  */

  const loadLookupHistory =
    async (donorId) => {
      const cleanId =
        String(
          donorId || ''
        ).trim();

      if (!cleanId) {
        return;
      }

      setError('');

      try {
        const res =
          await donationsApi
            .getDonorHistory(
              cleanId
            );

        setLookupHistory(
          res || null
        );

        setLookupTarget(
          res?.donor || {
            publicId:
              cleanId
          }
        );
      } catch (err) {
        setLookupHistory(null);
        setLookupTarget(null);

        setError(
          extractError(
            err,
            'Failed to load donor history'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Automatically load own history
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      canViewOwnHistory
    ) {
      loadMyHistory();
    } else {
      setOwnHistory(null);
    }
  }, [
    user?._id,
    canViewOwnHistory
  ]);

  /*
  |--------------------------------------------------------------------------
  | Lookup submit
  |--------------------------------------------------------------------------
  */

  const handleLookup =
    async (e) => {
      e.preventDefault();

      setNotice('');

      await loadLookupHistory(
        lookupDonorId
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Self-log donation
  |--------------------------------------------------------------------------
  */

  const handleSelfLog =
    async (e) => {
      e.preventDefault();

      setError('');
      setNotice('');

      try {
        const payload = {
          unitsDonated:
            Number(
              selfForm.unitsDonated
            ),

          locationName:
            selfForm.locationName,

          notes:
            selfForm.notes
        };

        /*
         * No donorId.
         *
         * Backend identifies current donor from token.
         */
        const res =
          await donationsApi.create(
            payload
          );

        setNotice(
          res?.message ||
          'Donation recorded successfully'
        );

        setSelfForm({
          unitsDonated: 1,
          locationName: '',
          notes: ''
        });

        await loadMyHistory();
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to record donation'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Hospital/BloodBank/Admin log for another donor
  |--------------------------------------------------------------------------
  */

  const handleStaffLog =
    async (e) => {
      e.preventDefault();

      setError('');
      setNotice('');

      const targetId =
        staffForm.donorId.trim();

      if (!targetId) {
        setError(
          'Donor ID is required'
        );

        return;
      }

      try {
        const payload = {
          donorId:
            targetId,

          unitsDonated:
            Number(
              staffForm.unitsDonated
            ),

          locationName:
            staffForm.locationName,

          notes:
            staffForm.notes
        };

        const res =
          await donationsApi.create(
            payload
          );

        setNotice(
          res?.message ||
          'Donation recorded successfully'
        );

        setStaffForm({
          donorId: '',
          unitsDonated: 1,
          locationName: '',
          notes: ''
        });

        /*
         * Show updated target history automatically.
         */
        if (
          canLookupOtherDonor
        ) {
          setLookupDonorId(
            targetId
          );

          await loadLookupHistory(
            targetId
          );
        }
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to record donation'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | History rendering helpers
  |--------------------------------------------------------------------------
  */

  const getRecords =
    (history) =>
      Array.isArray(
        history?.data
      )
        ? history.data
        : [];

  const getRecordCount =
    (history) => {
      const records =
        getRecords(history);

      return typeof history?.count ===
        'number'
        ? history.count
        : records.length;
    };

  /*
  |--------------------------------------------------------------------------
  | History panel
  |--------------------------------------------------------------------------
  */

  const renderHistorySummary =
    (
      history,
      options = {}
    ) => {
      if (!history) {
        return null;
      }

      const {
        allowFeedback = false
      } =
        options;

      const records =
        getRecords(history);

      const recordCount =
        getRecordCount(
          history
        );

      return (
        <>
          <div
            style={{
              marginTop: 16
            }}
          >
            <h3>
              {t(
                'donations.statistics'
              )}
            </h3>

            <div className="muted">
              {history.stats
                ?.totalDonations ??
                recordCount}{' '}

              {t(
                'donations.donationCount'
              )}

              {' · '}

              {history.stats
                ?.totalUnits ??
                0}{' '}

              {t(
                'donations.unitCount'
              )}

              {history.stats
                ?.lastDonation && (
                <>
                  {' · '}

                  {t(
                    'donations.lastOn'
                  )}{' '}

                  {formatDate(
                    history.stats
                      .lastDonation
                  )}
                </>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 18
            }}
          >
            {records.length ===
            0 ? (
              <Empty>
                {t(
                  'donations.noDonations'
                )}
              </Empty>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>
                      {t(
                        'donations.date'
                      )}
                    </th>

                    <th>
                      {t(
                        'donations.group'
                      )}
                    </th>

                    <th>
                      {t(
                        'donations.units'
                      )}
                    </th>

                    <th>
                      {t(
                        'donations.location'
                      )}
                    </th>

                    <th>
                      {t(
                        'donations.notes'
                      )}
                    </th>

                    <th>
                      Status
                    </th>

                    {allowFeedback && (
                      <th>
                        {t(
                          'feedback.actions'
                        )}
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {records.map(
                    (
                      record,
                      index
                    ) => {
                      const recordId =
                        record._id ||
                        record.publicId ||
                        `donation-${index}`;

                      const isVerified =
                        Boolean(
                          record.verifiedBy
                        );

                      const feedbackOpen =
                        openFeedbackId ===
                        recordId;

                      return (
                        <Fragment
                          key={
                            recordId
                          }
                        >
                          <tr>
                            <td>
                              {record.donationDate
                                ? formatDate(
                                    record.donationDate
                                  )
                                : '—'}
                            </td>

                            <td>
                              <BloodBadge
                                group={
                                  record.bloodGroup
                                }
                              />
                            </td>

                            <td>
                              {record.unitsDonated ??
                                '—'}
                            </td>

                            <td>
                              {record.locationName ||
                                '—'}
                            </td>

                            <td>
                              {record.notes ||
                                '—'}
                            </td>

                            <td>
                              {isVerified ? (
                                <Badge type="ok">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge type="neutral">
                                  Awaiting verification
                                </Badge>
                              )}
                            </td>

                            {allowFeedback && (
                              <td>
                                {isVerified ? (
                                  <button
                                    type="button"
                                    className="small secondary"
                                    onClick={() =>
                                      setOpenFeedbackId(
                                        feedbackOpen
                                          ? null
                                          : recordId
                                      )
                                    }
                                  >
                                    {feedbackOpen
                                      ? 'Close Feedback'
                                      : 'Give Feedback'}
                                  </button>
                                ) : (
                                  <span className="muted">
                                    Awaiting verification
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>

                          {allowFeedback &&
                            isVerified &&
                            feedbackOpen && (
                              <tr>
                                <td
                                  colSpan="7"
                                  className="bb-feedback-table-cell"
                                >
                                  <h3>
                                    {t(
                                      'feedback.donationTitle'
                                    )}
                                  </h3>

                                  <p className="muted">
                                    {t(
                                      'feedback.donationSubtitle'
                                    )}
                                  </p>

                                  <FeedbackPanel
                                    targetType="donation"
                                    targetId={
                                      record._id
                                    }
                                  />
                                </td>
                              </tr>
                            )}
                        </Fragment>
                      );
                    }
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      );
    };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="page">
      <PageHeader
        title={t(
          'donations.title'
        )}
        subtitle={t(
          'donations.subtitle'
        )}
      />

      <Alert
        message={error}
        onDismiss={() =>
          setError('')
        }
      />

      <Alert
        type="success"
        message={notice}
        onDismiss={() =>
          setNotice('')
        }
      />

      {/* --------------------------------------------------------------- */}
      {/* DONOR-CAPABLE USER                                             */}
      {/* --------------------------------------------------------------- */}

      {canSelfDonate && (
        <>
          <div className="grid grid-2">
            <Card
              title="Log My Donation"
            >
              <p
                className="muted"
                style={{
                  marginTop: 0
                }}
              >
                Logging donation for:{' '}

                <b>
                  {user?.name}
                </b>

                {(
                  user?.donorPublicId ||
                  user?.publicId ||
                  user?.donorProfile
                    ?.publicId
                ) && (
                  <>
                    {' · '}

                    {user?.donorPublicId ||
                      user?.publicId ||
                      user?.donorProfile
                        ?.publicId}
                  </>
                )}
              </p>

              <form
                onSubmit={
                  handleSelfLog
                }
              >
                <Field
                  label={t(
                    'donations.unitsDonated'
                  )}
                >
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={
                      selfForm.unitsDonated
                    }
                    onChange={
                      setSelf(
                        'unitsDonated'
                      )
                    }
                    required
                  />
                </Field>

                <Field
                  label={t(
                    'donations.location'
                  )}
                >
                  <input
                    value={
                      selfForm.locationName
                    }
                    onChange={
                      setSelf(
                        'locationName'
                      )
                    }
                    placeholder="Hospital or Blood Bank name"
                  />
                </Field>

                <Field
                  label={t(
                    'donations.notes'
                  )}
                >
                  <input
                    value={
                      selfForm.notes
                    }
                    onChange={
                      setSelf(
                        'notes'
                      )
                    }
                  />
                </Field>

                <button type="submit">
                  Record My Donation
                </button>
              </form>
            </Card>

            <Card
              title="My Donation History"
            >
              <p
                className="muted"
                style={{
                  marginTop: 0
                }}
              >
                Showing donation records associated with your donor profile.
              </p>

              <button
                type="button"
                className="secondary small"
                onClick={
                  loadMyHistory
                }
              >
                Refresh History
              </button>

              {renderHistorySummary(
                ownHistory,
                {
                  /*
                   * Only own donation history gets donation feedback.
                   */
                  allowFeedback:
                    true
                }
              )}
            </Card>
          </div>
        </>
      )}

      {/* --------------------------------------------------------------- */}
      {/* STAFF / ADMIN LOG FOR SOMEONE ELSE                             */}
      {/* --------------------------------------------------------------- */}

      {canLogForOther && (
        <Card
          title="Record Donation for a Donor"
        >
          <form
            onSubmit={
              handleStaffLog
            }
          >
            <Field label="Donor ID">
              <input
                value={
                  staffForm.donorId
                }
                onChange={
                  setStaff(
                    'donorId'
                  )
                }
                placeholder="DON-XXXXXX"
                required
              />
            </Field>

            <Field
              label={t(
                'donations.unitsDonated'
              )}
            >
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={
                  staffForm.unitsDonated
                }
                onChange={
                  setStaff(
                    'unitsDonated'
                  )
                }
                required
              />
            </Field>

            <Field
              label={t(
                'donations.location'
              )}
            >
              <input
                value={
                  staffForm.locationName
                }
                onChange={
                  setStaff(
                    'locationName'
                  )
                }
                placeholder="Hospital or Blood Bank name"
              />
            </Field>

            <Field
              label={t(
                'donations.notes'
              )}
            >
              <input
                value={
                  staffForm.notes
                }
                onChange={
                  setStaff(
                    'notes'
                  )
                }
              />
            </Field>

            <button type="submit">
              Record Verified Donation
            </button>
          </form>
        </Card>
      )}

      {/* --------------------------------------------------------------- */}
      {/* LOOKUP ANOTHER DONOR                                           */}
      {/* --------------------------------------------------------------- */}

      {canLookupOtherDonor && (
        <Card
          title="Look Up Donor History"
        >
          <form
            onSubmit={
              handleLookup
            }
          >
            <Field label="Donor ID">
              <input
                value={
                  lookupDonorId
                }
                onChange={(e) =>
                  setLookupDonorId(
                    e.target.value
                  )
                }
                placeholder="DON-XXXXXX"
                required
              />
            </Field>

            <button type="submit">
              Load History
            </button>
          </form>

          {lookupTarget && (
            <div
              className="muted"
              style={{
                marginTop: 14
              }}
            >
              Viewing:{' '}

              <b>
                {lookupTarget.name ||
                  lookupTarget.publicId}
              </b>

              {lookupTarget.name &&
                lookupTarget.publicId && (
                  <>
                    {' '}

                    (
                    {
                      lookupTarget.publicId
                    }
                    )
                  </>
                )}
            </div>
          )}

          {renderHistorySummary(
            lookupHistory,
            {
              /*
               * Looking at someone else's records does NOT give feedback
               * permission.
               */
              allowFeedback:
                false
            }
          )}
        </Card>
      )}

      {/* --------------------------------------------------------------- */}
      {/* PATIENT WITHOUT DONOR PROFILE                                  */}
      {/* --------------------------------------------------------------- */}

      {user?.role ===
        'Patient' &&
        !isPatientDonor && (
          <Card title="Donation Access">
            <p
              className="muted"
              style={{
                margin: 0
              }}
            >
              You are currently registered as a Patient only. Register as a blood donor from the Donors page to unlock your own donation logging and donation history.
            </p>
          </Card>
        )}
    </div>
  );
}
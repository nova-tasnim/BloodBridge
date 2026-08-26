import {
  Fragment,
  useEffect,
  useState
} from 'react';

import {
  useTranslation
} from 'react-i18next';

import {
  donationsApi,
  requestApi
} from '../api/resources';

import {
  useAuth
} from '../context/AuthContext';

import FeedbackPanel
  from '../components/FeedbackPanel';

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

const STATUS_BADGE = {
  pending:
    'warn',

  approved:
    'ok',

  rejected:
    'bad'
};

export default function DonationsPage() {
  const {
    t
  } =
    useTranslation();

  const {
    user
  } =
    useAuth();

  /*
  |--------------------------------------------------------------------------
  | Capabilities
  |--------------------------------------------------------------------------
  */

  const isNativeDonor =
    user?.role ===
    'Donor';

  const isPatientDonor =
    user?.role ===
      'Patient' &&
    Boolean(
      user?.donorProfile
    );

  const canSelfDonate =
    isNativeDonor ||
    isPatientDonor;

  const canLookupOtherDonor =
    [
      'Patient',
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(
      user?.role
    );

  const canLogForOther =
    [
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(
      user?.role
    );

  const isAdmin =
    user?.role ===
    'Admin';

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [
    ownHistory,
    setOwnHistory
  ] =
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

  const [
    campaigns,
    setCampaigns
  ] =
    useState([]);

  const [
    bloodRequests,
    setBloodRequests
  ] =
    useState([]);

  const [
    pendingApprovals,
    setPendingApprovals
  ] =
    useState([]);

  const [
    error,
    setError
  ] =
    useState('');

  const [
    notice,
    setNotice
  ] =
    useState('');

  const [
    openFeedbackId,
    setOpenFeedbackId
  ] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Self submission
  |--------------------------------------------------------------------------
  */

  const [
    selfForm,
    setSelfForm
  ] =
    useState({
      donationType:
        'regular',

      campaignId:
        '',

      bloodRequestId:
        '',

      donationDate:
        new Date()
          .toISOString()
          .slice(
            0,
            10
          ),

      unitsDonated:
        1,

      locationName:
        '',

      notes:
        ''
    });

  /*
  |--------------------------------------------------------------------------
  | Staff submission
  |--------------------------------------------------------------------------
  */

  const [
    staffForm,
    setStaffForm
  ] =
    useState({
      donorId:
        '',

      donationDate:
        new Date()
          .toISOString()
          .slice(
            0,
            10
          ),

      unitsDonated:
        1,

      locationName:
        '',

      notes:
        ''
    });

  const extractError =
    (
      err,
      fallback
    ) =>
      err?.response?.data
        ?.message ||
      err?.message ||
      fallback;

  /*
  |--------------------------------------------------------------------------
  | Load own history
  |--------------------------------------------------------------------------
  */

  const loadMyHistory =
    async () => {
      if (
        !canSelfDonate
      ) {
        return;
      }

      try {
        const res =
          await donationsApi
            .getMyHistory();

        setOwnHistory(
          res ||
          null
        );
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to load donation history'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Load registered campaigns
  |--------------------------------------------------------------------------
  */

  const loadMyCampaigns =
    async () => {
      if (
        !canSelfDonate
      ) {
        return;
      }

      try {
        const res =
          await donationsApi
            .myCampaigns();

        setCampaigns(
          Array.isArray(
            res?.data
          )
            ? res.data
            : []
        );
      } catch (err) {
        console.error(
          'Failed to load campaigns:',
          err
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Load active blood requests
  |--------------------------------------------------------------------------
  */

  const loadBloodRequests =
    async () => {
      if (
        !canSelfDonate
      ) {
        return;
      }

      try {
        const res =
          await requestApi
            .list();

        const list =
          Array.isArray(
            res?.data
          )
            ? res.data
            : Array.isArray(
                res
              )
              ? res
              : [];

        const active =
          list.filter(
            (request) =>
              request.isActive !==
                false &&
              ![
                'fulfilled',
                'cancelled',
                'expired'
              ].includes(
                request.status
              )
          );

        setBloodRequests(
          active
        );
      } catch (err) {
        console.error(
          'Failed to load blood requests:',
          err
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Admin queue
  |--------------------------------------------------------------------------
  */

  const loadPending =
    async () => {
      if (!isAdmin) {
        return;
      }

      try {
        const res =
          await donationsApi
            .pending();

        setPendingApprovals(
          Array.isArray(
            res?.data
          )
            ? res.data
            : []
        );
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to load pending donation approvals'
          )
        );
      }
    };

  useEffect(() => {
    if (
      canSelfDonate
    ) {
      loadMyHistory();
      loadMyCampaigns();
      loadBloodRequests();
    }

    if (isAdmin) {
      loadPending();
    }
  }, [
    user?._id,
    canSelfDonate,
    isAdmin
  ]);

  /*
  |--------------------------------------------------------------------------
  | Submit own donation
  |--------------------------------------------------------------------------
  */

  const handleSelfLog =
    async (
      e
    ) => {
      e.preventDefault();

      setError('');
      setNotice('');

      try {
        if (
          selfForm
            .donationType ===
            'campaign' &&
          !selfForm
            .campaignId
        ) {
          setError(
            'Please select a campaign.'
          );

          return;
        }

        if (
          selfForm
            .donationType ===
            'request' &&
          !selfForm
            .bloodRequestId
        ) {
          setError(
            'Please select a blood request.'
          );

          return;
        }

        const res =
          await donationsApi
            .create({
              donationType:
                selfForm
                  .donationType,

              campaignId:
                selfForm
                  .donationType ===
                    'campaign'
                  ? selfForm
                      .campaignId
                  : null,

              bloodRequestId:
                selfForm
                  .donationType ===
                    'request'
                  ? selfForm
                      .bloodRequestId
                  : null,

              donationDate:
                selfForm
                  .donationDate,

              unitsDonated:
                Number(
                  selfForm
                    .unitsDonated
                ),

              locationName:
                selfForm
                  .locationName,

              notes:
                selfForm
                  .notes
            });

        setNotice(
          res?.message ||
          'Donation submitted for Admin approval.'
        );

        setSelfForm({
          donationType:
            'regular',

          campaignId:
            '',

          bloodRequestId:
            '',

          donationDate:
            new Date()
              .toISOString()
              .slice(
                0,
                10
              ),

          unitsDonated:
            1,

          locationName:
            '',

          notes:
            ''
        });

        await Promise.all([
          loadMyHistory(),
          loadMyCampaigns(),
          loadBloodRequests()
        ]);
      } catch (err) {
        setError(
          extractError(
            err,
            'Unable to submit donation'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Staff/Admin log for another donor
  |--------------------------------------------------------------------------
  */

  const handleStaffLog =
    async (
      e
    ) => {
      e.preventDefault();

      setError('');
      setNotice('');

      try {
        const donorId =
          staffForm
            .donorId
            .trim();

        if (!donorId) {
          setError(
            'Donor ID is required.'
          );

          return;
        }

        const res =
          await donationsApi
            .create({
              donorId,

              donationType:
                'regular',

              donationDate:
                staffForm
                  .donationDate,

              unitsDonated:
                Number(
                  staffForm
                    .unitsDonated
                ),

              locationName:
                staffForm
                  .locationName,

              notes:
                staffForm
                  .notes
            });

        setNotice(
          res?.message ||
          'Donation submitted for Admin approval.'
        );

        setStaffForm({
          donorId:
            '',

          donationDate:
            new Date()
              .toISOString()
              .slice(
                0,
                10
              ),

          unitsDonated:
            1,

          locationName:
            '',

          notes:
            ''
        });

        if (isAdmin) {
          await loadPending();
        }
      } catch (err) {
        setError(
          extractError(
            err,
            'Unable to submit donation'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Lookup
  |--------------------------------------------------------------------------
  */

  const handleLookup =
    async (
      e
    ) => {
      e.preventDefault();

      setError('');

      try {
        const clean =
          lookupDonorId
            .trim();

        const res =
          await donationsApi
            .getDonorHistory(
              clean
            );

        setLookupHistory(
          res ||
          null
        );

        setLookupTarget(
          res?.donor ||
          null
        );
      } catch (err) {
        setLookupHistory(
          null
        );

        setLookupTarget(
          null
        );

        setError(
          extractError(
            err,
            'Unable to load donor history'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Admin approve
  |--------------------------------------------------------------------------
  */

  const handleApprove =
    async (
      record
    ) => {
      const confirmed =
        window.confirm(
          `Approve donation ${record.publicId}?`
        );

      if (!confirmed) {
        return;
      }

      setError('');
      setNotice('');

      try {
        const res =
          await donationsApi
            .approve(
              record._id
            );

        setNotice(
          res?.message ||
          'Donation approved.'
        );

        await loadPending();
      } catch (err) {
        setError(
          extractError(
            err,
            'Unable to approve donation'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Admin reject
  |--------------------------------------------------------------------------
  */

  const handleReject =
    async (
      record
    ) => {
      const reason =
        window.prompt(
          `Why are you rejecting ${record.publicId}?`,
          ''
        );

      if (
        reason ===
        null
      ) {
        return;
      }

      setError('');
      setNotice('');

      try {
        const res =
          await donationsApi
            .reject(
              record._id,
              reason
            );

        setNotice(
          res?.message ||
          'Donation rejected.'
        );

        await loadPending();
      } catch (err) {
        setError(
          extractError(
            err,
            'Unable to reject donation'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | History helpers
  |--------------------------------------------------------------------------
  */

  const recordsOf =
    (
      history
    ) =>
      Array.isArray(
        history?.data
      )
        ? history.data
        : [];

  const renderHistory =
    (
      history,
      {
        own =
          false
      } = {}
    ) => {
      if (!history) {
        return null;
      }

      const records =
        recordsOf(
          history
        );

      return (
        <div
          style={{
            marginTop:
              16
          }}
        >
          <h3>
            Verified Statistics
          </h3>

          <p className="muted">
            {history.stats
              ?.totalDonations ||
              0}{' '}
            approved donation(s)
            {' · '}
            {history.stats
              ?.totalUnits ||
              0}{' '}
            approved unit(s)

            {history.stats
              ?.lastDonation && (
              <>
                {' · '}
                Last verified:{' '}
                {formatDate(
                  history.stats
                    .lastDonation
                )}
              </>
            )}
          </p>

          {records.length ===
          0 ? (
            <Empty>
              No donation records found.
            </Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    Record
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Blood
                  </th>

                  <th>
                    Units
                  </th>

                  <th>
                    Campaign / Location
                  </th>

                  <th>
                    Status
                  </th>

                  {own && (
                    <th>
                      Feedback
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {records.map(
                  (
                    record
                  ) => {
                    const feedbackOpen =
                      openFeedbackId ===
                      record._id;

                    return (
                      <Fragment
                        key={
                          record._id
                        }
                      >
                        <tr>
                          <td>
                            <b>
                              {
                                record.publicId
                              }
                            </b>
                          </td>

                          <td>
                            {formatDate(
                              record.donationDate
                            )}
                          </td>

                          <td>
                            {record.donationType ===
                            'campaign'
                              ? 'Campaign'
                              : record.donationType ===
                                  'request'
                                ? 'Request'
                                : 'Regular'}
                          </td>

                          <td>
                            <BloodBadge
                              group={
                                record.bloodGroup
                              }
                            />
                          </td>

                          <td>
                            {
                              record.unitsDonated
                            }
                          </td>

                          <td>
                            {record.campaign
                              ?.title ||
                              record.locationName ||
                              record.bloodRequest
                                ?.patientName ||
                              '—'}
                          </td>

                          <td>
                            <Badge
                              type={
                                STATUS_BADGE[
                                  record.status
                                ] ||
                                'neutral'
                              }
                            >
                              {record.status ||
                                'pending'}
                            </Badge>

                            {record.status ===
                              'rejected' &&
                              record.rejectionReason && (
                                <div
                                  className="muted"
                                  style={{
                                    marginTop:
                                      4
                                  }}
                                >
                                  {
                                    record.rejectionReason
                                  }
                                </div>
                              )}
                          </td>

                          {own && (
                            <td>
                              {record.status ===
                              'approved' ? (
                                <button
                                  type="button"
                                  className="small secondary"
                                  onClick={() =>
                                    setOpenFeedbackId(
                                      feedbackOpen
                                        ? null
                                        : record._id
                                    )
                                  }
                                >
                                  {feedbackOpen
                                    ? 'Close'
                                    : 'Give Feedback'}
                                </button>
                              ) : (
                                <span className="muted">
                                  Approval required
                                </span>
                              )}
                            </td>
                          )}
                        </tr>

                        {own &&
                          record.status ===
                            'approved' &&
                          feedbackOpen && (
                            <tr>
                              <td
                                colSpan="8"
                              >
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
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="page">
      <PageHeader
        title={t(
          'donations.title'
        )}
        subtitle="Submit donations, track approval status, and view verified donation history."
      />

      <Alert
        message={
          error
        }
        onDismiss={() =>
          setError('')
        }
      />

      <Alert
        type="success"
        message={
          notice
        }
        onDismiss={() =>
          setNotice('')
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* DONOR SELF SUBMISSION                                        */}
      {/* ------------------------------------------------------------- */}

      {canSelfDonate && (
        <div className="grid grid-2">
          <Card title="Submit My Donation">
            <p
              className="muted"
              style={{
                marginTop:
                  0
              }}
            >
              Every donation is submitted as
              <b> Pending </b>
              and becomes official only after Admin approval.
            </p>

            <form
              onSubmit={
                handleSelfLog
              }
            >
              <Field label="Donation Type">
                <select
                  value={
                    selfForm
                      .donationType
                  }
                  onChange={(e) =>
                    setSelfForm(
                      (
                        current
                      ) => ({
                        ...current,

                        donationType:
                          e.target
                            .value,

                        campaignId:
                          '',

                        bloodRequestId:
                          ''
                      })
                    )
                  }
                >
                  <option value="regular">
                    Regular Donation
                  </option>

                  <option value="campaign">
                    Donation to a Campaign
                  </option>

                  <option value="request">
                    Donation to a Blood Request
                  </option>
                </select>
              </Field>

              {selfForm
                .donationType ===
                'campaign' && (
                <Field label="Registered Campaign">
                  <select
                    value={
                      selfForm
                        .campaignId
                    }
                    onChange={(e) =>
                      setSelfForm(
                        (
                          current
                        ) => ({
                          ...current,

                          campaignId:
                            e.target
                              .value
                        })
                      )
                    }
                    required
                  >
                    <option value="">
                      -- Select Campaign --
                    </option>

                    {campaigns.map(
                      (
                        item
                      ) => (
                        <option
                          key={
                            item.registrationId
                          }
                          value={
                            item
                              .campaign
                              ?._id ||
                            ''
                          }
                          disabled={
                            !item.canSubmit
                          }
                        >
                          {item
                            .campaign
                            ?.title ||
                            'Campaign'}

                          {' — '}

                          {item
                            .campaign
                            ?.venue ||
                            ''}

                          {item.existingSubmission
                            ? ` (${item.existingSubmission.status})`
                            : !item.canSubmit
                              ? ' (not currently open)'
                              : ''}
                        </option>
                      )
                    )}
                  </select>
                </Field>
              )}

              {selfForm
                .donationType ===
                'request' && (
                <Field label="Blood Request">
                  <select
                    value={
                      selfForm
                        .bloodRequestId
                    }
                    onChange={(e) =>
                      setSelfForm(
                        (
                          current
                        ) => ({
                          ...current,

                          bloodRequestId:
                            e.target
                              .value
                        })
                      )
                    }
                    required
                  >
                    <option value="">
                      -- Select Blood Request --
                    </option>

                    {bloodRequests.map(
                      (
                        request
                      ) => (
                        <option
                          key={
                            request._id
                          }
                          value={
                            request._id
                          }
                        >
                          {request.publicId ||
                            'Request'}

                          {' — '}

                          {request.bloodGroup}

                          {' — '}

                          {request.patientName}

                          {' — '}

                          {Math.max(
                            Number(
                              request.unitsNeeded
                            ) -
                            Number(
                              request.unitsFulfilled ||
                                0
                            ),
                            0
                          )}{' '}
                          unit(s) remaining
                        </option>
                      )
                    )}
                  </select>
                </Field>
              )}

              <Field label="Donation Date">
                <input
                  type="date"
                  value={
                    selfForm
                      .donationDate
                  }
                  onChange={(e) =>
                    setSelfForm(
                      (
                        current
                      ) => ({
                        ...current,

                        donationDate:
                          e.target
                            .value
                      })
                    )
                  }
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
                  min="0.5"
                  step="0.5"
                  value={
                    selfForm
                      .unitsDonated
                  }
                  onChange={(e) =>
                    setSelfForm(
                      (
                        current
                      ) => ({
                        ...current,

                        unitsDonated:
                          e.target
                            .value
                      })
                    )
                  }
                  required
                />
              </Field>

              {selfForm
                .donationType ===
                'regular' && (
                <Field
                  label={t(
                    'donations.location'
                  )}
                >
                  <input
                    value={
                      selfForm
                        .locationName
                    }
                    onChange={(e) =>
                      setSelfForm(
                        (
                          current
                        ) => ({
                          ...current,

                          locationName:
                            e.target
                              .value
                        })
                      )
                    }
                    placeholder="Hospital or Blood Bank"
                  />
                </Field>
              )}

              <Field
                label={t(
                  'donations.notes'
                )}
              >
                <input
                  value={
                    selfForm.notes
                  }
                  onChange={(e) =>
                    setSelfForm(
                      (
                        current
                      ) => ({
                        ...current,

                        notes:
                          e.target
                            .value
                      })
                    )
                  }
                />
              </Field>

              <button type="submit">
                Submit for Approval
              </button>
            </form>
          </Card>

          <Card title="My Donation History">
            <button
              type="button"
              className="secondary small"
              onClick={
                loadMyHistory
              }
            >
              Refresh History
            </button>

            {renderHistory(
              ownHistory,
              {
                own:
                  true
              }
            )}
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STAFF LOG                                                     */}
      {/* ------------------------------------------------------------- */}

      {canLogForOther && (
        <Card title="Log Donation for a Donor">
          <p className="muted">
            This submission will remain pending until an Admin approves it.
          </p>

          <form
            onSubmit={
              handleStaffLog
            }
          >
            <Field label="Donor ID">
              <input
                value={
                  staffForm
                    .donorId
                }
                onChange={(e) =>
                  setStaffForm(
                    (
                      current
                    ) => ({
                      ...current,

                      donorId:
                        e.target
                          .value
                    })
                  )
                }
                placeholder="DON-XXXXXX"
                required
              />
            </Field>

            <Field label="Donation Date">
              <input
                type="date"
                value={
                  staffForm
                    .donationDate
                }
                onChange={(e) =>
                  setStaffForm(
                    (
                      current
                    ) => ({
                      ...current,

                      donationDate:
                        e.target
                          .value
                    })
                  )
                }
                required
              />
            </Field>

            <Field label="Units">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={
                  staffForm
                    .unitsDonated
                }
                onChange={(e) =>
                  setStaffForm(
                    (
                      current
                    ) => ({
                      ...current,

                      unitsDonated:
                        e.target
                          .value
                    })
                  )
                }
                required
              />
            </Field>

            <Field label="Location">
              <input
                value={
                  staffForm
                    .locationName
                }
                onChange={(e) =>
                  setStaffForm(
                    (
                      current
                    ) => ({
                      ...current,

                      locationName:
                        e.target
                          .value
                    })
                  )
                }
              />
            </Field>

            <Field label="Notes">
              <input
                value={
                  staffForm.notes
                }
                onChange={(e) =>
                  setStaffForm(
                    (
                      current
                    ) => ({
                      ...current,

                      notes:
                        e.target
                          .value
                    })
                  )
                }
              />
            </Field>

            <button type="submit">
              Submit Donation
            </button>
          </form>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADMIN APPROVAL QUEUE                                          */}
      {/* ------------------------------------------------------------- */}

      {isAdmin && (
        <Card
          title={`Pending Donation Approvals (${pendingApprovals.length})`}
        >
          <button
            type="button"
            className="secondary small"
            onClick={
              loadPending
            }
            style={{
              marginBottom:
                12
            }}
          >
            Refresh
          </button>

          {pendingApprovals.length ===
          0 ? (
            <Empty>
              No donations are waiting for approval.
            </Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    Record
                  </th>

                  <th>
                    Donor
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Units
                  </th>

                  <th>
                    Campaign / Request
                  </th>

                  <th>
                    Submitted By
                  </th>

                  <th>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {pendingApprovals.map(
                  (
                    record
                  ) => {
                    const donor =
                      record.donor;

                    const publicId =
                      donor?.role ===
                        'Donor'
                        ? donor?.publicId
                        : donor
                            ?.donorProfile
                            ?.publicId;

                    return (
                      <tr
                        key={
                          record._id
                        }
                      >
                        <td>
                          <b>
                            {
                              record.publicId
                            }
                          </b>
                        </td>

                        <td>
                          <b>
                            {donor?.name ||
                              'Donor'}
                          </b>

                          <br />

                          <span className="muted">
                            {publicId ||
                              ''}
                          </span>
                        </td>

                        <td>
                          {
                            record.donationType
                          }
                        </td>

                        <td>
                          {formatDate(
                            record.donationDate
                          )}
                        </td>

                        <td>
                          {
                            record.unitsDonated
                          }
                        </td>

                        <td>
                          {record.campaign
                            ?.title ||
                            record.bloodRequest
                              ?.patientName ||
                            record.locationName ||
                            '—'}
                        </td>

                        <td>
                          {record
                            .submittedBy
                            ?.name ||
                            '—'}

                          <br />

                          <span className="muted">
                            {record
                              .submittedBy
                              ?.role ||
                              ''}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="small"
                            onClick={() =>
                              handleApprove(
                                record
                              )
                            }
                          >
                            Approve
                          </button>{' '}

                          <button
                            type="button"
                            className="small secondary"
                            onClick={() =>
                              handleReject(
                                record
                              )
                            }
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LOOKUP                                                        */}
      {/* ------------------------------------------------------------- */}

      {canLookupOtherDonor && (
        <Card title="Look Up Verified Donor History">
          <p className="muted">
            Only Admin-approved donations are shown when viewing another donor.
          </p>

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
            <p className="muted">
              Viewing:{' '}

              <b>
                {
                  lookupTarget.name
                }
              </b>

              {' · '}

              {
                lookupTarget.publicId
              }
            </p>
          )}

          {renderHistory(
            lookupHistory,
            {
              own:
                false
            }
          )}
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PLAIN PATIENT                                                 */}
      {/* ------------------------------------------------------------- */}

      {user?.role ===
        'Patient' &&
        !isPatientDonor && (
          <Card title="Donation Access">
            <p className="muted">
              Register as a blood donor from the Donors page to submit your own donations and access your donation history.
            </p>
          </Card>
        )}
    </div>
  );
}
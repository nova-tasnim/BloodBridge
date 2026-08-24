import {
  useEffect,
  useState
} from 'react';

import {
  useTranslation
} from 'react-i18next';

import {
  reminderApi
} from '../api/resources';

import {
  useAuth
} from '../context/AuthContext';

import {
  Alert,
  Badge,
  BloodBadge,
  Card,
  Empty,
  Loading,
  PageHeader,
  formatDate
} from '../components/Shared';


export default function ReminderPage() {
  const {
    t
  } =
    useTranslation();

  const {
    user
  } =
    useAuth();


  const [
    eligibility,
    setEligibility
  ] =
    useState(null);

  const [
    savedReminder,
    setSavedReminder
  ] =
    useState(null);

  const [
    dueReminders,
    setDueReminders
  ] =
    useState([]);

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    busy,
    setBusy
  ] =
    useState(false);

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


  /*
  |--------------------------------------------------------------------------
  | Universal donor capability
  |--------------------------------------------------------------------------
  */

  const hasDonorCapability =
    user?.role ===
      'Donor' ||
    (
      user?.role ===
        'Patient' &&
      Boolean(
        user
          ?.donorProfile
      )
    );


  const isStaff =
    [
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(
      user?.role
    );


  /*
   * IMPORTANT:
   *
   * Native Donor:
   * user.publicId
   *
   * Patient-donor:
   * user.donorProfile.publicId
   */
  const donorIdentifier =
    user?.role ===
      'Donor'
      ? (
          user?.publicId ||
          user?._id
        )
      :
      (
        user?.role ===
          'Patient' &&
        user?.donorProfile
      )
        ? (
            user
              .donorProfile
              .publicId ||
            user?._id
          )
        : null;


  /*
  |--------------------------------------------------------------------------
  | Load donor reminder
  |--------------------------------------------------------------------------
  */

  async function loadDonorData() {
    if (
      !hasDonorCapability ||
      !donorIdentifier
    ) {
      setEligibility(
        null
      );

      setSavedReminder(
        null
      );

      return;
    }

    const [
      eligibilityResponse,
      reminderResponse
    ] =
      await Promise.all([
        reminderApi
          .nextEligible(
            donorIdentifier
          ),

        reminderApi
          .current(
            donorIdentifier
          )
      ]);

    setEligibility(
      eligibilityResponse
    );

    setSavedReminder(
      reminderResponse
        ?.reminder ||
      null
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Load staff due reminders
  |--------------------------------------------------------------------------
  */

  async function loadStaffData() {
    if (!isStaff) {
      setDueReminders(
        []
      );

      return;
    }

    const response =
      await reminderApi
        .due();

    setDueReminders(
      Array.isArray(
        response
          ?.reminders
      )
        ? response.reminders
        : []
    );
  }


  async function loadPage() {
    setLoading(
      true
    );

    setError(
      ''
    );

    try {
      await Promise.all([
        loadDonorData(),
        loadStaffData()
      ]);
    } catch (err) {
      setError(
        err.message ||
        'Unable to load reminder information.'
      );
    } finally {
      setLoading(
        false
      );
    }
  }


  useEffect(
    () => {
      loadPage();
    },
    [
      donorIdentifier,
      hasDonorCapability,
      isStaff
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | Create / refresh own Reminder
  |--------------------------------------------------------------------------
  */

  async function handleCreateReminder() {
    if (
      !donorIdentifier
    ) {
      return;
    }

    setBusy(
      true
    );

    setError(
      ''
    );

    setNotice(
      ''
    );

    try {
      const response =
        await reminderApi
          .create(
            donorIdentifier
          );

      setSavedReminder(
        response
          ?.reminder ||
        null
      );

      setNotice(
        t(
          'reminders.savedSuccess',
          {
            defaultValue:
              'Donation eligibility reminder saved successfully.'
          }
        )
      );
    } catch (err) {
      setError(
        err.message ||
        'Unable to save reminder.'
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  /*
  |--------------------------------------------------------------------------
  | Staff sends reminder
  |--------------------------------------------------------------------------
  */

  async function handleSendReminder(
    reminderId
  ) {
    setBusy(
      true
    );

    setError(
      ''
    );

    setNotice(
      ''
    );

    try {
      await reminderApi
        .markSent(
          reminderId
        );

      setDueReminders(
        (previous) =>
          previous.filter(
            (item) =>
              String(
                item._id
              ) !==
              String(
                reminderId
              )
          )
      );

      setNotice(
        t(
          'reminders.markedSent',
          {
            defaultValue:
              'Reminder sent to the donor.'
          }
        )
      );
    } catch (err) {
      setError(
        err.message ||
        'Unable to send reminder.'
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  if (loading) {
    return (
      <div className="page">
        <Loading />
      </div>
    );
  }


  const nextDate =
    eligibility
      ?.nextEligibleDate;

  const hasFutureDate =
    nextDate &&
    new Date(
      nextDate
    ).getTime() >
      Date.now();


  return (
    <div className="page">

      <PageHeader
        title={t(
          'reminders.title',
          {
            defaultValue:
              'Donation Reminders'
          }
        )}

        subtitle={t(
          'reminders.subtitle',
          {
            defaultValue:
              'Track your next eligible donation date and manage upcoming reminders.'
          }
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


      {/* ================================================================
          DONOR / PATIENT-DONOR VIEW
      ================================================================= */}

      {hasDonorCapability && (
        <Card
          title={t(
            'reminders.myReminder',
            {
              defaultValue:
                'My Next Donation Reminder'
            }
          )}
        >

          <div className="grid grid-3">

            <div>
              <span className="muted">
                {t(
                  'reminders.status',
                  {
                    defaultValue:
                      'Eligibility Status'
                  }
                )}
              </span>

              <h3>
                <Badge
                  type={
                    eligibility
                      ?.isEligibleNow
                      ? 'ok'
                      : 'warn'
                  }
                >
                  {eligibility
                    ?.isEligibleNow
                    ? t(
                        'reminders.eligibleNow',
                        {
                          defaultValue:
                            'Eligible now'
                        }
                      )
                    : t(
                        'reminders.notEligibleYet',
                        {
                          defaultValue:
                            'Not eligible yet'
                        }
                      )}
                </Badge>
              </h3>
            </div>


            <div>
              <span className="muted">
                {t(
                  'reminders.nextEligibleDate',
                  {
                    defaultValue:
                      'Next eligible date'
                  }
                )}
              </span>

              <h3>
                {formatDate(
                  nextDate
                )}
              </h3>
            </div>


            <div>
              <span className="muted">
                {t(
                  'reminders.requiredInterval',
                  {
                    defaultValue:
                      'Required interval'
                  }
                )}
              </span>

              <h3>
                {eligibility
                  ?.requiredIntervalDays ??
                  '—'}{' '}
                {t(
                  'reminders.days',
                  {
                    defaultValue:
                      'days'
                  }
                )}
              </h3>
            </div>

          </div>


          {eligibility
            ?.reasons
            ?.length > 0 && (

            <div
              style={{
                marginBottom:
                  16
              }}
            >
              <strong>
                {t(
                  'reminders.currentReasons',
                  {
                    defaultValue:
                      'Current eligibility notes:'
                  }
                )}
              </strong>

              <ul>
                {eligibility
                  .reasons
                  .map(
                    (
                      reason,
                      index
                    ) => (
                      <li
                        key={
                          `${reason}-${index}`
                        }
                      >
                        {reason}
                      </li>
                    )
                  )}
              </ul>
            </div>
          )}


          {savedReminder ? (
            <div
              style={{
                marginBottom:
                  16
              }}
            >

              <p>
                <strong>
                  {t(
                    'reminders.savedDate',
                    {
                      defaultValue:
                        'Saved reminder date:'
                    }
                  )}
                </strong>{' '}

                {formatDate(
                  savedReminder
                    .nextEligibleDate
                )}
              </p>


              <p>
                <strong>
                  {t(
                    'reminders.deliveryState',
                    {
                      defaultValue:
                        'Reminder status:'
                    }
                  )}
                </strong>{' '}

                <Badge
                  type={
                    savedReminder
                      .reminderSent
                      ? 'ok'
                      : 'neutral'
                  }
                >
                  {savedReminder
                    .reminderSent
                    ? t(
                        'reminders.sent',
                        {
                          defaultValue:
                            'Sent'
                        }
                      )
                    : t(
                        'reminders.waiting',
                        {
                          defaultValue:
                            'Waiting'
                        }
                      )}
                </Badge>
              </p>

            </div>
          ) : (
            <p className="muted">
              {t(
                'reminders.noneSaved',
                {
                  defaultValue:
                    'No reminder has been saved for your account yet.'
                }
              )}
            </p>
          )}


          {hasFutureDate ? (
            <button
              type="button"

              disabled={busy}

              onClick={
                handleCreateReminder
              }
            >
              {savedReminder
                ? t(
                    'reminders.refreshReminder',
                    {
                      defaultValue:
                        'Refresh Reminder'
                    }
                  )
                : t(
                    'reminders.createReminder',
                    {
                      defaultValue:
                        'Create Reminder'
                    }
                  )}
            </button>
          ) : (
            <p className="muted">
              {t(
                'reminders.noFutureReminderNeeded',
                {
                  defaultValue:
                    'There is no future donation eligibility date requiring a reminder right now.'
                }
              )}
            </p>
          )}

        </Card>
      )}


      {/* ================================================================
          PLAIN PATIENT VIEW
      ================================================================= */}

      {user?.role ===
        'Patient' &&
        !hasDonorCapability && (

        <Card
          title={t(
            'reminders.patientTitle',
            {
              defaultValue:
                'Donation Reminder'
            }
          )}
        >
          <p className="muted">
            {t(
              'reminders.patientMessage',
              {
                defaultValue:
                  'Register as a blood donor first to calculate and save your next donation reminder.'
              }
            )}
          </p>
        </Card>
      )}


      {/* ================================================================
          STAFF / ADMIN VIEW
      ================================================================= */}

      {isStaff && (
        <Card
          title={t(
            'reminders.dueTitle',
            {
              defaultValue:
                'Reminders Due Within 7 Days'
            }
          )}
        >

          {dueReminders.length ===
          0 ? (

            <Empty>
              {t(
                'reminders.noneDue',
                {
                  defaultValue:
                    'No unsent reminders are currently due.'
                }
              )}
            </Empty>

          ) : (

            <table>

              <thead>
                <tr>
                  <th>
                    {t(
                      'reminders.donor',
                      {
                        defaultValue:
                          'Donor'
                      }
                    )}
                  </th>

                  <th>
                    {t(
                      'reminders.bloodGroup',
                      {
                        defaultValue:
                          'Blood Group'
                      }
                    )}
                  </th>

                  <th>
                    {t(
                      'reminders.nextEligibleDate',
                      {
                        defaultValue:
                          'Next Eligible Date'
                      }
                    )}
                  </th>

                  <th>
                    {t(
                      'reminders.contact',
                      {
                        defaultValue:
                          'Contact'
                      }
                    )}
                  </th>

                  <th>
                    {t(
                      'reminders.action',
                      {
                        defaultValue:
                          'Action'
                      }
                    )}
                  </th>
                </tr>
              </thead>


              <tbody>

                {dueReminders.map(
                  (item) => (

                    <tr
                      key={
                        item._id
                      }
                    >

                      <td>
                        <strong>
                          {item
                            .donor
                            ?.name ||
                            '—'}
                        </strong>

                        <br />

                        <span className="muted">
                          {item
                            .donor
                            ?.publicId ||
                            '—'}
                        </span>
                      </td>


                      <td>
                        {item
                          .donor
                          ?.bloodGroup ? (

                          <BloodBadge
                            group={
                              item
                                .donor
                                .bloodGroup
                            }
                          />

                        ) : '—'}
                      </td>


                      <td>
                        {formatDate(
                          item
                            .nextEligibleDate
                        )}
                      </td>


                      <td>
                        {item
                          .donor
                          ?.email ||

                          item
                            .donor
                            ?.phone ||

                          '—'}
                      </td>


                      <td>
                        <button
                          type="button"

                          className="small"

                          disabled={
                            busy
                          }

                          onClick={() =>
                            handleSendReminder(
                              item._id
                            )
                          }
                        >
                          {t(
                            'reminders.sendReminder',
                            {
                              defaultValue:
                                'Send Reminder'
                            }
                          )}
                        </button>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>
          )}

        </Card>
      )}

    </div>
  );
}
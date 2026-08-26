import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  requestApi,
  feedbackApi
} from '../api/resources';

import { useAuth } from '../context/AuthContext';

import FeedbackPanel from '../components/FeedbackPanel';

import {
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

/*
|--------------------------------------------------------------------------
| Badge mappings
|--------------------------------------------------------------------------
*/

const URGENCY_BADGE = {
  critical: 'bad',
  urgent: 'warn',
  routine: 'neutral'
};

const STATUS_BADGE = {
  pending: 'neutral',
  matched: 'warn',
  accepted: 'warn',
  fulfilled: 'ok',
  cancelled: 'bad',
  expired: 'bad'
};

const RESPONSE_BADGE = {
  pending: 'neutral',
  accepted: 'warn',
  declined: 'bad',
  completed: 'ok'
};

export default function RequestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Capability matrix
  |--------------------------------------------------------------------------
  */

  const isNativeDonor =
    user?.role === 'Donor';

  const isPatientDonor =
    user?.role === 'Patient' &&
    Boolean(user?.donorProfile);

  /*
   * Respond to matched blood request:
   *
   * Native Donor         
   * Patient donor        
               
   */
  const canRespondAsDonor =
    isNativeDonor ||
    isPatientDonor;

  /*
   * Create blood request:
   *
   * Donor                
   * Patient              
   * Patient donor        
   * Hospital             
         
   * Admin                
   */
  const canCreateRequest =
    [
      'Donor',
      'Patient',
      'Hospital',
      'Admin'
    ].includes(user?.role);

  /*
   * Persist/run matching:
   *
   * Hospital             
   * BloodBank            
   * Admin                
   */
  const canRunMatching =
    [
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(user?.role);

  /*
   * Confirm verified fulfillment:
   *
   * Hospital             
   * BloodBank            
   * Admin                
   */
  const canConfirmFulfillment =
    [
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(user?.role);

  const isRequestStaff =
    [
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(user?.role);

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [notice, setNotice] =
    useState('');

  const [matchResult, setMatchResult] =
    useState(null);

  const [matchRadius, setMatchRadius] =
    useState(15);/* 15 km*/ 

  const [showExcluded, setShowExcluded] =
    useState(false);

  const [filterStatus, setFilterStatus] =
    useState('');

  const [timeline, setTimeline] =
    useState(null);

  const [
    requesterFeedback,
    setRequesterFeedback
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Donor response form
  |--------------------------------------------------------------------------
  |
  | donorId remains here only to avoid unnecessary state restructuring.
  |
  | It is NOT sent to backend anymore.
  |--------------------------------------------------------------------------
  */

  const [respondForm, setRespondForm] =
    useState({
      donorId: '',
      reason: '',
      shareLocation: true
    });

  /*
  |--------------------------------------------------------------------------
  | Fulfillment form
  |--------------------------------------------------------------------------
  */

  const [fulfilForm, setFulfilForm] =
    useState({
      donorId: '',
      unitsDonated: 1,
      notes: ''
    });

  /*
  |--------------------------------------------------------------------------
  | Request creation form
  |--------------------------------------------------------------------------
  */

  const [form, setForm] =
    useState({
      requester: '',
      patientName: '',
      bloodGroup: 'A+',
      unitsNeeded: 1,
      urgency: 'routine',
      hospitalName: '',
      lat: '23.7808',
      lng: '90.4203',
      address: '',
      contactPhone: '',
      notes: '',
      isSOS: false
    });

  /*
  |--------------------------------------------------------------------------
  | Error helper
  |--------------------------------------------------------------------------
  */

  const extractError = (
    err,
    fallback = 'Something went wrong'
  ) => {
    return (
      err?.response?.data?.message ||
      err?.message ||
      fallback
    );
  };

  /*
  |----------------------------------------------------
  | Load requests
  |--------------------------------------------------------------------------
  */

  const loadRequests =
    async (status = '') => {
      setLoading(true);
      setError('');

      try {
        const res =
          await requestApi.list(
            status
              ? { status }
              : {}
          );

        const list =
          Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];

        setRequests(list);
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to load blood requests'
          )
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadRequests();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Form helper
  |--------------------------------------------------------------------------
  */

  const set =
    (key) =>
    (e) => {
      setForm((previous) => ({
        ...previous,
        [key]: e.target.value
      }));
    };

  /*
  |--------------------------------------------------------------------------
  | SOS
  |--------------------------------------------------------------------------
  */

  const toggleSOS = () => {
    setForm((previous) => ({
      ...previous,

      isSOS:
        !previous.isSOS,

      urgency:
        !previous.isSOS
          ? 'critical'
          : previous.urgency
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | Timeline
  |--------------------------------------------------------------------------
  */

  const refreshTimeline =
    async (id) => {
      setError('');

      try {
        const res =
          await requestApi.timeline(id);

        const timelineData =
          res?.data || res;

        setTimeline(
          timelineData
        );

        /*
         * Find requester reputation.
         */
        const request =
          requests.find(
            (item) =>
              String(item._id) ===
              String(id)
          );

        const requesterId =
          request?.requester?._id ||
          request?.requester;

        if (requesterId) {
          try {
            const feedbackRes =
              await feedbackApi
                .forRequester(
                  requesterId
                );

            setRequesterFeedback(
              feedbackRes?.data ||
              feedbackRes ||
              null
            );
          } catch (feedbackErr) {
            console.error(
              'Failed to load requester feedback:',
              feedbackErr
            );

            setRequesterFeedback(
              null
            );
          }
        } else {
          setRequesterFeedback(
            null
          );
        }
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to load request timeline'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Create blood request
  const handleCreate = async (e) => {
 1. prevents browser refresh
2. clears old errors/notices
3. prepares request data
4. calls requestApi.create(...)
5. displays success/error
6. reloads requests
  */

  const handleCreate =
    async (e) => {
      e.preventDefault();

      setError('');
      setNotice('');

      try {
        await requestApi.create({
          /*
           * Admin may optionally specify requester.
           */
          ...(
            user?.role === 'Admin' &&
            form.requester
              ? {
                  requester:
                    form.requester
                }
              : {}
          ),

          patientName:
            form.patientName,

          bloodGroup:
            form.bloodGroup,

          unitsNeeded:
            Number(
              form.unitsNeeded
            ),

          urgency:
            form.urgency,

          hospitalName:
            form.hospitalName,

          location: {
            coordinates: [
              Number(form.lng),
              Number(form.lat)
            ],

            address:
              form.address
          },

          contactPhone:
            form.contactPhone,

          notes:
            form.notes,

          isSOS:
            form.isSOS
        });

        setNotice(
          t(
            'requests.createdSuccess',
            {
              defaultValue:
                'Blood request submitted successfully'
            }
          )
        );

        setForm(
          (previous) => ({
            ...previous,

            patientName: '',
            notes: '',
            contactPhone: '',
            isSOS: false
          })
        );

        await loadRequests(
          filterStatus
        );
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to create blood request'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Preview matching
  |--------------------------------------------------------------------------
  */

  const handleFindMatches =
    async (requestId) => {
      setError('');
      setMatchResult(null);

      try {
        const res =
          await requestApi.matches(
            requestId,
            {
              radius:
                matchRadius,

              includeIneligible:
                'true'
            }
          );

        setMatchResult(
          res?.data || res
        );
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to find donor matches'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Persist/run matching
  |--------------------------------------------------------------------------
  */

  const handleRunMatching =
    async (requestId) => {
      setError('');
      setNotice('');

      if (!canRunMatching) {
        setError(
          'You are not authorized to run donor matching.'
        );

        return;
      }

      try {
        const res =
          await requestApi
            .runMatching(
              requestId,
              {
                radius:
                  matchRadius
              }
            );

        setNotice(
          res?.message ||
          'Matching completed'
        );

        setMatchResult(
          res?.data || res
        );

        await loadRequests(
          filterStatus
        );

        if (
          timeline?.requestId ===
          requestId
        ) {
          await refreshTimeline(
            requestId
          );
        }
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to run donor matching'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Manage request
  |--------------------------------------------------------------------------
  */

  const handleManage =
    async (requestId) => {
      setError('');
      setNotice('');

      setRespondForm({
        donorId: '',
        reason: '',
        shareLocation: true
      });

      setFulfilForm({
        donorId: '',
        unitsDonated: 1,
        notes: ''
      });

      await refreshTimeline(
        requestId
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Lifecycle transition
  |--------------------------------------------------------------------------
  */

  const handleTransition =
    async (status) => {
      if (!timeline) {
        return;
      }

      setError('');
      setNotice('');

      try {
        const res =
          await requestApi
            .changeStatus(
              timeline.requestId,
              status
            );

        setNotice(
          res?.message ||
          `Status changed to ${status}`
        );

        await refreshTimeline(
          timeline.requestId
        );

        await loadRequests(
          filterStatus
        );
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to change request status'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Donor response
  |--------------------------------------------------------------------------
  |
  | Important:
  |
  | No donorId is supplied.
  |
  | Backend identifies authenticated donor:
  |
  | Nova:
  | role = Donor
  |
  | Kader:
  | role = Patient + donorProfile
  |--------------------------------------------------------------------------
  */

  const handleRespond =
    async (decision) => {
      if (
        !canRespondAsDonor
      ) {
        setError(
          'Blood donor registration is required to respond to a matched request.'
        );

        return;
      }

      if (!timeline) {
        return;
      }

      setError('');
      setNotice('');

      try {
        const payload = {
          decision,

          reason:
            respondForm.reason,

          shareLocation:
            Boolean(
              respondForm
                .shareLocation
            )
        };

        const res =
          await requestApi.respond(
            timeline.requestId,
            payload
          );

        setNotice(
          res?.message ||
          `Request ${decision}`
        );

        setRespondForm({
          donorId: '',
          reason: '',
          shareLocation: true
        });

        await refreshTimeline(
          timeline.requestId
        );

        await loadRequests(
          filterStatus
        );
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to respond to request'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Confirm fulfillment
  |--------------------------------------------------------------------------
  */

  const handleFulfil =
    async (e) => {
      e.preventDefault();

      if (
        !canConfirmFulfillment
      ) {
        setError(
          'You are not authorized to verify request fulfillment.'
        );

        return;
      }

      if (
        !fulfilForm.donorId
      ) {
        setError(
          t(
            'requests.selectDonorFulfill',
            {
              defaultValue:
                'Please select or specify the donor who fulfilled the request'
            }
          )
        );

        return;
      }

      if (!timeline) {
        return;
      }

      setError('');
      setNotice('');

      try {
        const res =
          await requestApi.fulfil(
            timeline.requestId,
            fulfilForm.donorId,
            Number(
              fulfilForm
                .unitsDonated
            ),
            fulfilForm.notes
          );

        setNotice(
          res?.message ||
          'Donation fulfillment confirmed'
        );

        setFulfilForm({
          donorId: '',
          unitsDonated: 1,
          notes: ''
        });

        await refreshTimeline(
          timeline.requestId
        );

        await loadRequests(
          filterStatus
        );
      } catch (err) {
        setError(
          extractError(
            err,
            'Failed to confirm fulfillment'
          )
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Accepted donors for fulfillment
  |--------------------------------------------------------------------------
  */

  const acceptedResponses =
    timeline?.responses?.filter(
      (response) =>
        response.status ===
          'accepted' ||
        response.status ===
          'completed'
    ) || [];

  /*
  |--------------------------------------------------------------------------
  | Selected request
  |--------------------------------------------------------------------------
  */

  const selectedRequest =
    timeline
      ? requests.find(
          (request) =>
            String(
              request._id
            ) ===
            String(
              timeline.requestId
            )
        )
      : null;

  const selectedRequesterId =
    selectedRequest
      ?.requester?._id ||
    selectedRequest
      ?.requester ||
    timeline?.requester;

  /*
  |--------------------------------------------------------------------------
  | Request review capability
  |--------------------------------------------------------------------------
  */

  const canReviewRequest =
    timeline?.currentStatus ===
      'fulfilled' &&
    (
      String(
        selectedRequesterId
      ) ===
        String(
          user?._id
        ) ||
      user?.role === 'Admin'
    );

  /*
  |--------------------------------------------------------------------------
  | Lifecycle transitions visible in UI
  |--------------------------------------------------------------------------
  |
  | Request owner:
  | cancellation only
  |
  | Staff:
  | operational state transitions
  |
  | Fulfilled:
  | NEVER manually shown
  |--------------------------------------------------------------------------
  */

  const selectedRequestOwner =
    Boolean(
      selectedRequesterId &&
      user?._id &&
      String(
        selectedRequesterId
      ) ===
        String(
          user._id
        )
    );

  const visibleTransitions =
    isRequestStaff
      ? (
          timeline
            ?.allowedNext ||
          []
        ).filter(
          (status) =>
            status !==
            'fulfilled'
        )
      : selectedRequestOwner
        ? (
            timeline
              ?.allowedNext ||
            []
          ).filter(
            (status) =>
              status ===
              'cancelled'
          )
        : [];
  /*
|--------------------------------------------------------------------------
| Timeline visibility
|--------------------------------------------------------------------------
*/

const canViewTimeline =
  (request) => {
    const requesterId =
      request
        ?.requester
        ?._id ||
      request
        ?.requester;

    const ownsRequest =
      requesterId &&
      user?._id &&
      String(
        requesterId
      ) ===
        String(
          user._id
        );

    const staff =
      [
        'Hospital',
        'BloodBank',
        'Admin'
      ].includes(
        user?.role
      );

    const matched =
      Array.isArray(
        request
          ?.matchedDonors
      ) &&
      request
        .matchedDonors
        .some(
          (donor) => {
            const donorId =
              donor?._id ||
              donor;

            return (
              String(
                donorId
              ) ===
              String(
                user?._id
              )
            );
          }
        );

    return (
      ownsRequest ||
      staff ||
      matched
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
          'requests.title'
        )}
        subtitle={t(
          'requests.subtitle'
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

      {/* ------------------------------------------------------------- */}
      {/* CREATE REQUEST + MATCHING SETTINGS                            */}
      {/* ------------------------------------------------------------- */}

      <div className="grid grid-2">
        {canCreateRequest && (
          <Card
            title={t(
              'requests.createRequest'
            )}
          >
            <form
              onSubmit={
                handleCreate
              }
            >
              <button
                type="button"
                className={`bb-sos-toggle ${
                  form.isSOS
                    ? 'active'
                    : ''
                }`}
                onClick={
                  toggleSOS
                }
              >
                <span className="bb-sos-icon">
                  🚨
                </span>

                <span>
                  {form.isSOS
                    ? t(
                        'requests.sosActive'
                      )
                    : t(
                        'requests.sosToggle'
                      )}
                </span>
              </button>

              {form.isSOS && (
                <p className="bb-sos-note">
                  {t(
                    'requests.sosNote'
                  )}
                </p>
              )}

              {user?.role ===
              'Admin' ? (
                <Field
                  label={t(
                    'requests.requesterUserId'
                  )}
                >
                  <input
                    value={
                      form.requester
                    }
                    onChange={
                      set(
                        'requester'
                      )
                    }
                    placeholder={
                      user?._id ||
                      ''
                    }
                  />
                </Field>
              ) : (
                <div
                  style={{
                    marginBottom:
                      16,
                    fontSize: 14
                  }}
                  className="muted"
                >
                  {t(
                    'requests.creatingAs',
                    {
                      defaultValue:
                        'Posting request as:'
                    }
                  )}{' '}

                  <b>
                    {user?.name ||
                      'Authenticated User'}
                  </b>{' '}

                  <span
                    className="badge neutral"
                    style={{
                      marginLeft: 6
                    }}
                  >
                    {user?.role}
                  </span>
                </div>
              )}

              <div className="form-row">
                <Field
                  label={t(
                    'requests.patientName'
                  )}
                >
                  <input
                    value={
                      form.patientName
                    }
                    onChange={
                      set(
                        'patientName'
                      )
                    }
                    required
                  />
                </Field>

                <Field
                  label={t(
                    'requests.bloodGroup'
                  )}
                >
                  <select
                    value={
                      form.bloodGroup
                    }
                    onChange={
                      set(
                        'bloodGroup'
                      )
                    }
                  >
                    {BLOOD_GROUPS.map(
                      (group) => (
                        <option
                          key={
                            group
                          }
                          value={
                            group
                          }
                        >
                          {group}
                        </option>
                      )
                    )}
                  </select>
                </Field>
              </div>

              <div className="form-row">
                <Field
                  label={t(
                    'requests.unitsNeeded'
                  )}
                >
                  <input
                    type="number"
                    min="1"
                    value={
                      form.unitsNeeded
                    }
                    onChange={
                      set(
                        'unitsNeeded'
                      )
                    }
                    required
                  />
                </Field>

                <Field
                  label={t(
                    'requests.urgency'
                  )}
                >
                  <select
                    value={
                      form.urgency
                    }
                    onChange={
                      set(
                        'urgency'
                      )
                    }
                    disabled={
                      form.isSOS
                    }
                  >
                    <option value="routine">
                      {t(
                        'common.routine'
                      )}
                    </option>

                    <option value="urgent">
                      {t(
                        'common.urgent'
                      )}
                    </option>

                    <option value="critical">
                      {t(
                        'common.critical'
                      )}
                    </option>
                  </select>
                </Field>
              </div>

              <Field
                label={t(
                  'requests.hospital'
                )}
              >
                <input
                  value={
                    form.hospitalName
                  }
                  onChange={
                    set(
                      'hospitalName'
                    )
                  }
                />
              </Field>

              <div className="form-row">
                <Field
                  label={t(
                    'requests.latitude'
                  )}
                >
                  <input
                    value={
                      form.lat
                    }
                    onChange={
                      set('lat')
                    }
                    required
                  />
                </Field>

                <Field
                  label={t(
                    'requests.longitude'
                  )}
                >
                  <input
                    value={
                      form.lng
                    }
                    onChange={
                      set('lng')
                    }
                    required
                  />
                </Field>
              </div>

              <Field
                label={t(
                  'requests.area'
                )}
              >
                <input
                  value={
                    form.address
                  }
                  onChange={
                    set(
                      'address'
                    )
                  }
                />
              </Field>

              <Field
                label={t(
                  'requests.contactPhone'
                )}
              >
                <input
                  value={
                    form.contactPhone
                  }
                  onChange={
                    set(
                      'contactPhone'
                    )
                  }
                />
              </Field>

              <Field
                label={t(
                  'requests.notes'
                )}
              >
                <input
                  value={
                    form.notes
                  }
                  onChange={
                    set(
                      'notes'
                    )
                  }
                />
              </Field>

              <button type="submit">
                {t(
                  'requests.createRequest'
                )}
              </button>
            </form>
          </Card>
        )}

        <Card
          title={t(
            'requests.matchingSettings'
          )}
        >
          <Field
            label={t(
              'requests.searchRadius'
            )}
          >
            <input
              type="number"
              value={
                matchRadius
              }
              onChange={(e) =>
                setMatchRadius(
                  e.target.value
                )
              }
            />
          </Field>

          <p className="muted">
            {t(
              'requests.matchingDescription'
            )}
          </p>

          <Field
            label={t(
              'requests.filterByStatus'
            )}
          >
            <select
              value={
                filterStatus
              }
              onChange={(e) => {
                const value =
                  e.target.value;

                setFilterStatus(
                  value
                );

                loadRequests(
                  value
                );
              }}
            >
              <option value="">
                {t(
                  'requests.all'
                )}
              </option>

              <option value="pending">
                {t(
                  'common.pending'
                )}
              </option>

              <option value="matched">
                {t(
                  'common.matched'
                )}
              </option>

              <option value="accepted">
                {t(
                  'common.accepted'
                )}
              </option>

              <option value="fulfilled">
                {t(
                  'common.fulfilled'
                )}
              </option>

              <option value="cancelled">
                {t(
                  'requests.cancelled'
                )}
              </option>

              <option value="expired">
                {t(
                  'common.expired',
                  {
                    defaultValue:
                      'Expired'
                  }
                )}
              </option>
            </select>
          </Field>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* REQUEST TABLE                                                */}
      {/* ------------------------------------------------------------- */}

      <Card
        title={`${t(
          'requests.requests'
        )} (${requests.length})`}
      >
        {loading ? (
          <Loading />
        ) : requests.length ===
          0 ? (
          <Empty>
            {t(
              'requests.noRequests'
            )}
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  {t(
                    'requests.patient'
                  )}
                </th>

                <th>
                  {t(
                    'requests.group'
                  )}
                </th>

                <th>
                  {t(
                    'requests.units'
                  )}
                </th>

                <th>
                  {t(
                    'requests.urgency'
                  )}
                </th>

                <th>
                  {t(
                    'requests.status'
                  )}
                </th>

                <th>
                  {t(
                    'requests.waiting'
                  )}
                </th>

                <th></th>
              </tr>
            </thead>

            <tbody>
              {requests.map(
                (request) => (
                  <tr
                    key={
                      request._id
                    }
                  >
                    <td>
                      <b>
                        {
                          request.patientName
                        }
                      </b>

                      {request.publicId && (
                        <span
                          className="badge neutral"
                          style={{
                            marginLeft:
                              6,
                            fontSize:
                              11
                          }}
                        >
                          {
                            request.publicId
                          }
                        </span>
                      )}

                      <br />

                      <span className="muted">
                        {request.hospitalName ||
                          request.location
                            ?.address ||
                          '—'}
                      </span>
                    </td>

                    <td>
                      <BloodBadge
                        group={
                          request.bloodGroup
                        }
                      />
                    </td>

                    <td>
                      {request.unitsFulfilled}/
                      {
                        request.unitsNeeded
                      }

                      <div className="score-bar">
                        <span
                          style={{
                            width: `${
                              request.unitsNeeded
                                ? (
                                    request.unitsFulfilled /
                                    request.unitsNeeded
                                  ) *
                                  100
                                : 0
                            }%`
                          }}
                        />
                      </div>
                    </td>

                    <td>
                      <Badge
                        type={
                          URGENCY_BADGE[
                            request
                              .urgency
                          ]
                        }
                      >
                        {t(
                          `common.${request.urgency}`,
                          {
                            defaultValue:
                              request.urgency
                          }
                        )}
                      </Badge>
                    </td>

                    <td>
                      <Badge
                        type={
                          STATUS_BADGE[
                            request
                              .status
                          ]
                        }
                      >
                        {t(
                          `common.${request.status}`,
                          {
                            defaultValue:
                              request.status
                          }
                        )}
                      </Badge>
                    </td>

                    <td>
                      {request.hoursWaiting}
                      {t(
                        'requests.hoursShort'
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="small secondary"
                        onClick={() =>
                          handleFindMatches(
                            request._id
                          )
                        }
                      >
                        {t(
                          'requests.matches'
                        )}
                      </button>{' '}

                      {canRunMatching && (
                        <>
                          <button
                            type="button"
                            className="small secondary"
                            onClick={() =>
                              handleRunMatching(
                                request._id
                              )
                            }
                          >
                            {t(
                              'requests.run'
                            )}
                          </button>{' '}
                        </>
                      )}

                      <button
                        type="button"
                        className="small"
                        onClick={() =>
                          handleManage(
                            request._id
                          )
                        }
                      >
                        {t(
                          'requests.manage'
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

      {/* ------------------------------------------------------------- */}
      {/* REQUEST LIFECYCLE                                            */}
      {/* ------------------------------------------------------------- */}

      {timeline && (
        <Card
          title={`${t(
            'requests.lifecycle'
          )} — ${
            timeline.patientName ||
            ''
          } (${
            timeline.publicId ||
            ''
          })`}
        >
          <div
            className="grid grid-3"
            style={{
              marginBottom: 18
            }}
          >
            <div>
              <h3>
                {t(
                  'requests.currentStatus'
                )}
              </h3>

              <Badge
                type={
                  STATUS_BADGE[
                    timeline
                      .currentStatus
                  ]
                }
              >
                {t(
                  `common.${timeline.currentStatus}`,
                  {
                    defaultValue:
                      timeline.currentStatus
                  }
                )}
              </Badge>

              {timeline.isTerminal && (
                <div
                  className="muted"
                  style={{
                    marginTop: 6
                  }}
                >
                  {t(
                    'requests.terminalState'
                  )}
                </div>
              )}
            </div>

            <div>
              <h3>
                {t(
                  'requests.progress'
                )}
              </h3>

              <div>
                <b>
                  {
                    timeline.unitsFulfilled
                  }
                </b>{' '}

                {t(
                  'requests.of'
                )}{' '}

                {
                  timeline.unitsNeeded
                }{' '}

                {t(
                  'requests.units'
                )}

                <span className="muted">
                  {' · '}

                  {
                    timeline.unitsRemaining
                  }{' '}

                  {t(
                    'requests.remaining'
                  )}
                </span>
              </div>

              <div className="score-bar">
                <span
                  style={{
                    width: `${
                      timeline.unitsNeeded
                        ? (
                            timeline.unitsFulfilled /
                            timeline.unitsNeeded
                          ) *
                          100
                        : 0
                    }%`
                  }}
                />
              </div>

              <div
                className="muted"
                style={{
                  marginTop: 4
                }}
              >
                {t(
                  'requests.waiting'
                )}{' '}

                {
                  timeline.hoursWaiting
                }

                {t(
                  'requests.hoursShort'
                )}

                {' · '}

                {t(
                  'requests.created'
                )}{' '}

                {formatDate(
                  timeline.createdAt
                )}
              </div>
            </div>

            <div>
              <h3>
                {t(
                  'requests.responses'
                )}
              </h3>

              <div className="muted">
                {timeline
                  .responseSummary
                  ?.total ||
                  0}{' '}

                {t(
                  'requests.invited'
                )}

                {' · '}

                {timeline
                  .responseSummary
                  ?.pending ||
                  0}{' '}

                {t(
                  'requests.pending'
                )}

                {' · '}

                {timeline
                  .responseSummary
                  ?.accepted ||
                  0}{' '}

                {t(
                  'requests.accepted'
                )}

                {' · '}

                {timeline
                  .responseSummary
                  ?.declined ||
                  0}{' '}

                {t(
                  'requests.declined'
                )}

                {' · '}

                {timeline
                  .responseSummary
                  ?.completed ||
                  0}{' '}

                {t(
                  'requests.completed'
                )}
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* REQUESTER REPUTATION                                     */}
          {/* --------------------------------------------------------- */}

          {requesterFeedback && (
            <div
              style={{
                marginBottom: 18
              }}
            >
              <h3>
                {t(
                  'feedback.requesterReputation',
                  {
                    defaultValue:
                      'Requester Reputation'
                  }
                )}
              </h3>

              <div className="muted">
                <strong>
                  {requesterFeedback
                    .averageRating
                    ? `${requesterFeedback.averageRating}/5`
                    : t(
                        'feedback.noRating'
                      )}
                </strong>

                {' · '}

                {t(
                  'feedback.reviewCount',
                  {
                    count:
                      requesterFeedback
                        .totalReviews
                  }
                )}
              </div>

              {requesterFeedback
                .reviews?.length >
                0 && (
                <div
                  className="bb-feedback-list"
                  style={{
                    marginTop: 8
                  }}
                >
                  {requesterFeedback.reviews.map(
                    (review) => (
                      <article
                        className="bb-feedback-review"
                        key={
                          review._id
                        }
                      >
                        <div className="bb-feedback-review-head">
                          <strong>
                            {review.userId
                              ?.name ||
                              t(
                                'feedback.user'
                              )}
                          </strong>

                          <span>
                            {
                              review.rating
                            }
                            /5
                          </span>
                        </div>

                        {review.comment && (
                          <p>
                            {
                              review.comment
                            }
                          </p>
                        )}
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* PERMITTED TRANSITIONS                                    */}
          {/* --------------------------------------------------------- */}

          <h3>
            {t(
              'requests.permittedTransitions'
            )}
          </h3>

          {visibleTransitions.length ===
          0 ? (
            <p
              className="muted"
              style={{
                marginTop: 0
              }}
            >
              {t(
                'requests.noTransitions'
              )}
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap:
                  'wrap',
                marginBottom:
                  18
              }}
            >
              {visibleTransitions.map(
                (status) => (
                  <button
                    type="button"
                    key={
                      status
                    }
                    className="small secondary"
                    onClick={() =>
                      handleTransition(
                        status
                      )
                    }
                  >
                    →{' '}
                    {t(
                      `common.${status}`,
                      {
                        defaultValue:
                          status
                      }
                    )}
                  </button>
                )
              )}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* NON-TERMINAL ACTIONS                                     */}
          {/* --------------------------------------------------------- */}

          {!timeline.isTerminal && (
            <div className="grid grid-2">
              {/* ----------------------------------------------------- */}
              {/* DONOR RESPONSE                                       */}
              {/* ----------------------------------------------------- */}

              {canRespondAsDonor && (
                <div>
                  <h3>
                    {t(
                      'requests.recordDonorResponse'
                    )}
                  </h3>

                  <div
                    style={{
                      marginBottom:
                        14,
                      fontSize: 13
                    }}
                    className="muted"
                  >
                    {t(
                      'requests.respondingAs',
                      {
                        defaultValue:
                          'Responding as:'
                      }
                    )}{' '}

                    <b>
                      {user?.name}
                    </b>

                    {(user?.donorPublicId ||
                      user?.publicId ||
                      user
                        ?.donorProfile
                        ?.publicId) && (
                      <>
                        {' · '}

                        {user?.donorPublicId ||
                          user?.publicId ||
                          user
                            ?.donorProfile
                            ?.publicId}
                      </>
                    )}
                  </div>

                  <Field
                    label={t(
                      'requests.declineReason'
                    )}
                  >
                    <input
                      value={
                        respondForm.reason
                      }
                      onChange={(e) =>
                        setRespondForm(
                          (
                            previous
                          ) => ({
                            ...previous,

                            reason:
                              e
                                .target
                                .value
                          })
                        )
                      }
                      placeholder="Optional notes or reason for decline"
                    />
                  </Field>

                  <div
                    style={{
                      marginBottom:
                        14
                    }}
                  >
                    <label
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: 6,
                        fontSize:
                          13,
                        cursor:
                          'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          respondForm
                            .shareLocation
                        }
                        onChange={(e) =>
                          setRespondForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              shareLocation:
                                e
                                  .target
                                  .checked
                            })
                          )
                        }
                      />

                      {t(
                        'requests.shareApproxLocation',
                        {
                          defaultValue:
                            'Share my approximate area coordinates with requester'
                        }
                      )}
                    </label>
                  </div>

                  <div
                    style={{
                      display:
                        'flex',
                      gap: 8
                    }}
                  >
                    {canViewTimeline(
                      request
                    ) && (
                      <button
                        type="button"
                        className="small"
                        onClick={() =>
                          handleManage(
                            request._id
                          )
                        }
                      >
                        {t(
                          'requests.manage'
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      className="small secondary"
                      onClick={() =>
                        handleRespond(
                          'declined'
                        )
                      }
                    >
                      {t(
                        'requests.decline'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------- */}
              {/* VERIFIED FULFILLMENT                                 */}
              {/* ----------------------------------------------------- */}

              {canConfirmFulfillment && (
                <div>
                  <h3>
                    {t(
                      'requests.recordDonation',
                      {
                        defaultValue:
                          'Confirm Fulfilled Donation'
                      }
                    )}
                  </h3>

                  <form
                    onSubmit={
                      handleFulfil
                    }
                  >
                    <Field
                      label={t(
                        'requests.donor'
                      )}
                    >
                      {acceptedResponses.length >
                      0 ? (
                        <select
                          value={
                            fulfilForm.donorId
                          }
                          onChange={(e) =>
                            setFulfilForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                donorId:
                                  e
                                    .target
                                    .value
                              })
                            )
                          }
                          required
                        >
                          <option value="">
                            --{' '}
                            {t(
                              'requests.selectAcceptedDonor',
                              {
                                defaultValue:
                                  'Select Responded Donor'
                              }
                            )}{' '}
                            --
                          </option>

                          {acceptedResponses.map(
                            (
                              response
                            ) => (
                              <option
                                key={
                                  response
                                    .donor
                                    ?._id ||
                                  response._id
                                }
                                value={
                                  response
                                    .donor
                                    ?._id ||
                                  ''
                                }
                              >
                                {response
                                  .donor
                                  ?.name ||
                                  'Donor'}

                                {' ('}

                                {response
                                  .donor
                                  ?.bloodGroup ||
                                  ''}

                                {')'}

                                {response
                                  .donor
                                  ?.publicId
                                  ? ` — ${response.donor.publicId}`
                                  : ''}
                              </option>
                            )
                          )}
                        </select>
                      ) : (
                        <input
                          value={
                            fulfilForm.donorId
                          }
                          onChange={(e) =>
                            setFulfilForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                donorId:
                                  e
                                    .target
                                    .value
                              })
                            )
                          }
                          placeholder="Enter Donor ID (DON-XXXXXX)"
                          required
                        />
                      )}
                    </Field>

                    <div className="form-row">
                      <Field
                        label={t(
                          'requests.units'
                        )}
                      >
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={
                            fulfilForm
                              .unitsDonated
                          }
                          onChange={(e) =>
                            setFulfilForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                unitsDonated:
                                  e
                                    .target
                                    .value
                              })
                            )
                          }
                          required
                        />
                      </Field>

                      <Field
                        label={t(
                          'requests.notes'
                        )}
                      >
                        <input
                          value={
                            fulfilForm.notes
                          }
                          onChange={(e) =>
                            setFulfilForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                notes:
                                  e
                                    .target
                                    .value
                              })
                            )
                          }
                          placeholder="Optional fulfillment notes"
                        />
                      </Field>
                    </div>

                    <button
                      type="submit"
                      className="small"
                    >
                      {t(
                        'requests.recordDonation',
                        {
                          defaultValue:
                            'Confirm Fulfillment'
                        }
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* DONOR RESPONSES                                          */}
          {/* --------------------------------------------------------- */}

          {timeline.responses &&
            timeline.responses
              .length > 0 && (
              <div
                style={{
                  marginTop: 18
                }}
              >
                <h3>
                  {t(
                    'requests.invitedDonors',
                    {
                      defaultValue:
                        'Donor Responses & Coordination'
                    }
                  )}
                </h3>

                <table>
                  <thead>
                    <tr>
                      <th>
                        {t(
                          'requests.donor'
                        )}
                      </th>

                      <th>
                        {t(
                          'requests.group'
                        )}
                      </th>

                      <th>
                        {t(
                          'requests.score'
                        )}
                      </th>

                      <th>
                        {t(
                          'requests.response'
                        )}
                      </th>

                      <th>
                        {t(
                          'requests.responded'
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {timeline.responses.map(
                      (
                        response
                      ) => (
                        <tr
                          key={
                            response._id
                          }
                        >
                          <td>
                            <b>
                              {response
                                .donor
                                ?.name ||
                                'Donor'}
                            </b>

                            {response
                              .donor
                              ?.publicId && (
                              <span
                                className="badge neutral"
                                style={{
                                  marginLeft:
                                    6,
                                  fontSize:
                                    10
                                }}
                              >
                                {
                                  response
                                    .donor
                                    .publicId
                                }
                              </span>
                            )}

                            <br />

                            <span className="muted">
                              {response
                                .donor
                                ?.phone ||
                                'Contact masked'}

                              {response.shareLocation && (
                                <span
                                  style={{
                                    color:
                                      '#047481',
                                    marginLeft:
                                      6,
                                    fontWeight:
                                      500
                                  }}
                                >
                                  {' '}
                                  •{' '}

                                  {t(
                                    'requests.locationShared',
                                    {
                                      defaultValue:
                                        'Area Shared'
                                    }
                                  )}
                                </span>
                              )}
                            </span>
                          </td>

                          <td>
                            <BloodBadge
                              group={
                                response
                                  .donor
                                  ?.bloodGroup
                              }
                            />
                          </td>

                          <td className="muted">
                            {response.matchScore ||
                              '—'}
                          </td>

                          <td>
                            <Badge
                              type={
                                RESPONSE_BADGE[
                                  response
                                    .status
                                ]
                              }
                            >
                              {t(
                                `requests.${response.status}`,
                                {
                                  defaultValue:
                                    response.status
                                }
                              )}
                            </Badge>

                            {response.declineReason && (
                              <div className="muted">
                                {
                                  response.declineReason
                                }
                              </div>
                            )}
                          </td>

                          <td className="muted">
                            {response.respondedAt
                              ? formatDate(
                                  response.respondedAt
                                )
                              : '—'}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

          {/* --------------------------------------------------------- */}
          {/* REQUEST FEEDBACK                                         */}
          {/* --------------------------------------------------------- */}

          {canReviewRequest && (
            <div
              className="bb-feedback-section"
              style={{
                marginTop: 18
              }}
            >
              <h3>
                {t(
                  'feedback.requestTitle',
                  {
                    defaultValue:
                      'Rate this request experience'
                  }
                )}
              </h3>

              <p className="muted">
                {t(
                  'feedback.requestSubtitle'
                )}
              </p>

              <FeedbackPanel
                targetType="request"
                targetId={
                  timeline.requestId
                }
              />
            </div>
          )}

          <button
            type="button"
            className="secondary small"
            style={{
              marginTop: 16
            }}
            onClick={() =>
              setTimeline(null)
            }
          >
            {t(
              'requests.close'
            )}
          </button>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MATCHING RESULTS                                             */}
      {/* ------------------------------------------------------------- */}

      {matchResult && (
        <Card
          title={`${t(
            'requests.matchingResults'
          )} — ${
            matchResult.request
              ?.patientName ||
            ''
          } (${
            matchResult.request
              ?.bloodGroup ||
            ''
          })`}
        >
          <div
            className="grid grid-3"
            style={{
              marginBottom: 16
            }}
          >
            <div>
              <h3>
                {t(
                  'requests.compatibleGroups'
                )}
              </h3>

              {matchResult
                .searchCriteria
                ?.compatibleGroups
                ?.map(
                  (group) => (
                    <span
                      key={
                        group
                      }
                      style={{
                        marginRight:
                          4
                      }}
                    >
                      <BloodBadge
                        group={
                          group
                        }
                      />
                    </span>
                  )
                )}
            </div>

            <div>
              <h3>
                {t(
                  'requests.scoreWeights'
                )}
              </h3>

              <div className="muted">
                {matchResult
                  .searchCriteria
                  ?.scoreWeights &&
                  Object.entries(
                    matchResult
                      .searchCriteria
                      .scoreWeights
                  )
                    .map(
                      ([
                        key,
                        value
                      ]) =>
                        `${key} ${value}`
                    )
                    .join(
                      ' · '
                    )}
              </div>
            </div>

            <div>
              <h3>
                {t(
                  'requests.summary'
                )}
              </h3>

              <div className="muted">
                {matchResult
                  .summary
                  ?.candidatesFound ||
                  0}{' '}

                {t(
                  'requests.candidates'
                )}

                {' · '}

                {matchResult
                  .summary
                  ?.eligibleMatches ||
                  0}{' '}

                {t(
                  'requests.eligible'
                )}

                {' · '}

                {matchResult
                  .summary
                  ?.excludedByEligibility ||
                  0}{' '}

                {t(
                  'requests.excluded'
                )}
              </div>
            </div>
          </div>

          {!matchResult.matches ||
          matchResult.matches.length ===
            0 ? (
            <Empty>
              {t(
                'requests.noEligibleDonors',
                {
                  radius:
                    matchResult
                      .searchCriteria
                      ?.radiusKm ||
                    matchRadius
                }
              )}
            </Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>

                  <th>
                    {t(
                      'requests.donor'
                    )}
                  </th>

                  <th>
                    {t(
                      'requests.group'
                    )}
                  </th>

                  <th>
                    {t(
                      'requests.distance'
                    )}
                  </th>

                  <th>
                    {t(
                      'requests.score'
                    )}
                  </th>

                  <th>
                    {t(
                      'requests.breakdown'
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>
                {matchResult.matches.map(
                  (match) => (
                    <tr
                      key={
                        match.donorId
                      }
                    >
                      <td>
                        <span className="rank">
                          {
                            match.rank
                          }
                        </span>
                      </td>

                      <td>
                        <b>
                          {
                            match.name
                          }
                        </b>

                        {match.publicId && (
                          <>
                            {' '}

                            <span
                              className="badge neutral"
                              style={{
                                fontSize:
                                  10
                              }}
                            >
                              {
                                match.publicId
                              }
                            </span>
                          </>
                        )}

                        <br />

                        <span className="muted">
                          {match.area ||
                            '—'}

                          {' · '}

                          {match.phone ||
                            'Contact masked'}
                        </span>
                      </td>

                      <td>
                        <BloodBadge
                          group={
                            match.bloodGroup
                          }
                        />
                      </td>

                      <td>
                        {match.distanceKm !=
                        null
                          ? `${match.distanceKm} km`
                          : '—'}
                      </td>

                      <td
                        style={{
                          minWidth:
                            90
                        }}
                      >
                        <b>
                          {
                            match.score
                          }
                        </b>

                        <div className="score-bar">
                          <span
                            style={{
                              width: `${Math.min(
                                Number(
                                  match.score
                                ) ||
                                  0,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </td>

                      <td>
                        <div className="breakdown">
                          <span>
                            {t(
                              'requests.compatibility'
                            )}{' '}

                            <b>
                              {match
                                .breakdown
                                ?.compatibility ??
                                '—'}
                            </b>
                          </span>

                          <span>
                            {t(
                              'requests.proximity'
                            )}{' '}

                            <b>
                              {match
                                .breakdown
                                ?.proximity ??
                                '—'}
                            </b>
                          </span>

                          <span>
                            {t(
                              'requests.recency'
                            )}{' '}

                            <b>
                              {match
                                .breakdown
                                ?.recency ??
                                '—'}
                            </b>
                          </span>

                          <span>
                            {t(
                              'requests.reliability'
                            )}{' '}

                            <b>
                              {match
                                .breakdown
                                ?.reliability ??
                                '—'}
                            </b>
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}

          {matchResult.excluded &&
            matchResult.excluded
              .length > 0 && (
              <div
                style={{
                  marginTop: 16
                }}
              >
                <button
                  type="button"
                  className="secondary small"
                  onClick={() =>
                    setShowExcluded(
                      (
                        previous
                      ) =>
                        !previous
                    )
                  }
                >
                  {showExcluded
                    ? t(
                        'requests.hide'
                      )
                    : t(
                        'requests.show'
                      )}{' '}

                  {t(
                    'requests.excludedDonors'
                  )}{' '}

                  (
                  {
                    matchResult
                      .excluded
                      .length
                  }
                  )
                </button>

                {showExcluded && (
                  <table
                    style={{
                      marginTop:
                        10
                    }}
                  >
                    <thead>
                      <tr>
                        <th>
                          {t(
                            'requests.donor'
                          )}
                        </th>

                        <th>
                          {t(
                            'requests.group'
                          )}
                        </th>

                        <th>
                          {t(
                            'requests.score'
                          )}
                        </th>

                        <th>
                          {t(
                            'requests.excludedBecause'
                          )}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {matchResult.excluded.map(
                        (
                          donor
                        ) => (
                          <tr
                            key={
                              donor.donorId
                            }
                          >
                            <td>
                              {
                                donor.name
                              }

                              {donor.publicId && (
                                <>
                                  {' '}

                                  <span
                                    className="badge neutral"
                                    style={{
                                      fontSize:
                                        10
                                    }}
                                  >
                                    {
                                      donor.publicId
                                    }
                                  </span>
                                </>
                              )}
                            </td>

                            <td>
                              <BloodBadge
                                group={
                                  donor.bloodGroup
                                }
                              />
                            </td>

                            <td className="muted">
                              {
                                donor.score
                              }
                            </td>

                            <td>
                              {donor
                                .ineligibilityReasons
                                ?.map(
                                  (
                                    reason,
                                    index
                                  ) => (
                                    <div
                                      key={
                                        index
                                      }
                                      style={{
                                        fontSize:
                                          13
                                      }}
                                    >
                                      {
                                        reason
                                      }
                                    </div>
                                  )
                                )}

                              <span className="muted">
                                {t(
                                  'requests.nextEligible'
                                )}{' '}

                                {formatDate(
                                  donor.nextEligibleDate
                                )}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
        </Card>
      )}
    </div>
  );
}
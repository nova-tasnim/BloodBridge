import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { donorApi } from '../api/resources';
import { useAuth } from '../context/AuthContext';

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

const GENDERS = ['male', 'female', 'other'];

export default function DonorsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    user,
    updateUser
  } = useAuth();

  const directoryRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [donors, setDonors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [notice, setNotice] = useState('');

  const [appliedFilters, setAppliedFilters] = useState(null);

  const [eligibility, setEligibility] = useState(null);

  const [
    showBecomeDonorModal,
    setShowBecomeDonorModal
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Become-donor form
  |--------------------------------------------------------------------------
  |
  | Phase 2 still temporarily accepts gender + weight from this form.
  |
  | Later we will move these fields into normal Patient signup so the
  | second registration form becomes much smaller.
  |--------------------------------------------------------------------------
  */

  const [becomeDonorForm, setBecomeDonorForm] = useState({
    bloodGroup:
      user?.bloodGroup || 'O+',

    dateOfBirth:
      user?.dateOfBirth
        ? String(user.dateOfBirth).slice(0, 10)
        : '',

    gender:
      user?.gender || 'male',

    weightKg:
      user?.weightKg || 60,

    shareLocationConsent:
      true
  });

  /*
  |--------------------------------------------------------------------------
  | Directory filters
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Load donor directory
  |--------------------------------------------------------------------------
  */

  const loadDonors = async (params = {}) => {
    setLoading(true);
    setError('');

    try {
      const cleaned =
        Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) =>
              value !== '' &&
              value !== null &&
              value !== undefined
          )
        );

      const res =
        await donorApi.list(cleaned);

      /*
       * Support both possible API response formats:
       *
       * {
       *   data: [...]
       * }
       *
       * OR directly [...]
       */

      const list =
        Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

      setDonors(list);

      setAppliedFilters(
        res?.appliedFilters || null
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load donors'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Initial directory load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDonors();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Keep temporary registration form synced with logged-in Patient
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user) {
      return;
    }

    setBecomeDonorForm((previous) => ({
      ...previous,

      bloodGroup:
        user.bloodGroup ||
        previous.bloodGroup,

      dateOfBirth:
        user.dateOfBirth
          ? String(user.dateOfBirth).slice(0, 10)
          : previous.dateOfBirth,

      gender:
        user.gender ||
        previous.gender,

      weightKg:
        user.weightKg ||
        previous.weightKg
    }));
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const handleSearch = (e) => {
    e.preventDefault();

    setEligibility(null);
    setNotice('');

    loadDonors(filters);
  };

  /*
  |--------------------------------------------------------------------------
  | Reset search
  |--------------------------------------------------------------------------
  */

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

    setEligibility(null);
    setAppliedFilters(null);
    setError('');

    loadDonors();
  };

  /*
  |--------------------------------------------------------------------------
  | Can current user manage this donor's availability?
  |--------------------------------------------------------------------------
  |
  | Admin:
  |   can manage everyone.
  |
  | Native Donor:
  |   can manage own availability.
  |
  | Patient + donorProfile:
  |   can manage own availability.
  |
  | Ordinary Patient / Hospital / BloodBank:
  |   cannot manage donor availability.
  |--------------------------------------------------------------------------
  */
const canManageAvailability = (donor) => {
  if (!user || !donor) {
    return false;
  }

  /*
   * Admin can manage any donor.
   */
  if (user.role === 'Admin') {
    return true;
  }

  /*
   * Determine donor capability reliably.
   *
   * Native Donor:
   * role === 'Donor'
   *
   * Patient donor:
   * role === 'Patient' && donorProfile exists
   *
   * We intentionally do NOT depend only on user.canDonate,
   * because some existing login responses do not serialize
   * that virtual for native Donors.
   */
  const currentUserCanDonate =
    user.role === 'Donor' ||
    (
      user.role === 'Patient' &&
      Boolean(user.donorProfile)
    );

  if (
    !currentUserCanDonate ||
    !user._id
  ) {
    return false;
  }

  /*
   * A donor can modify only their own availability.
   */
  return (
    String(donor._id) ===
    String(user._id)
  );
};

  /*
  |--------------------------------------------------------------------------
  | Toggle availability
  |--------------------------------------------------------------------------
  */

  const handleToggle = async (donor) => {
    setError('');
    setNotice('');

    if (!canManageAvailability(donor)) {
      setError(
        'You can only manage your own donor availability.'
      );

      return;
    }

    try {
      const identifier =
        donor.publicId ||
        donor._id;

      const nextAvailability =
        !donor.isAvailable;

      const res =
        await donorApi.toggleAvailability(
          identifier,
          nextAvailability
        );

      /*
       * Prefer server truth when available.
       */
      const serverAvailability =
        typeof res?.data?.isAvailable === 'boolean'
          ? res.data.isAvailable
          : nextAvailability;

      setDonors((previous) =>
        previous.map((item) =>
          String(item._id) ===
          String(donor._id)
            ? {
                ...item,
                isAvailable:
                  serverAvailability
              }
            : item
        )
      );

      /*
       * If this is the logged-in donor, also update bb_user /
       * AuthContext so other pages immediately know the new status.
       */
      if (
        String(donor._id) ===
        String(user?._id)
      ) {
        if (user.role === 'Donor') {
          updateUser({
            isAvailable:
              serverAvailability
          });
        } else if (
          user.role === 'Patient' &&
          user.donorProfile
        ) {
          updateUser({
            donorProfile: {
              ...user.donorProfile,
              isAvailable:
                serverAvailability
            }
          });
        }
      }

      setNotice(
        res?.message ||
        (
          serverAvailability
            ? 'You are now available for blood donation.'
            : 'You are now unavailable for blood donation.'
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to update donor availability'
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Check donor eligibility
  |--------------------------------------------------------------------------
  */

  const handleEligibility =
    async (donorIdentifier) => {
      setError('');
      setNotice('');
      setEligibility(null);

      try {
        const res =
          await donorApi.eligibility(
            donorIdentifier
          );

        setEligibility(
          res?.data || res
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          err?.message ||
          'Unable to check donor eligibility'
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Patient → donor-capable Patient
  |--------------------------------------------------------------------------
  */

  const handleBecomeDonorSubmit =
    async (e) => {
      e.preventDefault();

      setError('');
      setNotice('');

      try {
        const res =
          await donorApi.becomeDonor(
            becomeDonorForm
          );

        const updatedUser =
          res?.data || null;

        /*
         * Keep role = Patient.
         *
         * Backend response should contain:
         *
         * donorProfile: {...}
         * canDonate: true
         * donorPublicId: DON-XXXXXX
         */
        if (updatedUser) {
          updateUser(updatedUser);
        }

        setNotice(
          res?.message ||
          t(
            'donors.registeredAsDonor',
            {
              defaultValue:
                'Successfully registered as a blood donor!'
            }
          )
        );

        setShowBecomeDonorModal(
          false
        );

        await loadDonors();
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          err?.message ||
          'Unable to register as a donor'
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Filter field helper
  |--------------------------------------------------------------------------
  */

  const set = (key) => (e) => {
    setFilters((previous) => ({
      ...previous,
      [key]:
        e.target.value
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | Who may register as donor?
  |--------------------------------------------------------------------------
  |
  | Patient without donorProfile:
  | YES
  |
  | Native Donor:
  | NO
  |
  | Patient + donorProfile:
  | NO
  |
  | Hospital:
  | NO
  |
  | BloodBank:
  | NO
  |
  | Admin:
  | NO
  |--------------------------------------------------------------------------
  */

  const isEligibleToRegisterAsDonor =
    Boolean(
      user &&
      user.role === 'Patient' &&
      !user.donorProfile
    );

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="page">
      <Hero
        onPrimaryAction={() =>
          navigate('/requests')
        }
        onSecondaryAction={() =>
          directoryRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      />

      <div ref={directoryRef}>
        <PageHeader
          title={t('donors.title')}
          subtitle={t('donors.subtitle')}
        />

        <InspirationBanner />
      </div>

      {/* Error */}
      <Alert
        message={error}
        onDismiss={() =>
          setError('')
        }
      />

      {/* Success */}
      <Alert
        type="success"
        message={notice}
        onDismiss={() =>
          setNotice('')
        }
      />

      {/* --------------------------------------------------------------- */}
      {/* PATIENT → DONOR REGISTRATION                                   */}
      {/* --------------------------------------------------------------- */}

      {isEligibleToRegisterAsDonor && (
        <Card
          title={t(
            'donors.becomeDonorTitle',
            {
              defaultValue:
                'Join the Life-Saving Network'
            }
          )}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14
                }}
              >
                {t(
                  'donors.becomeDonorPrompt',
                  {
                    defaultValue:
                      'Are you eligible to donate blood? Register your donor profile today to start saving lives when urgent requests arise.'
                  }
                )}
              </p>
            </div>

            <button
              type="button"
              className="btn-primary small"
              onClick={() =>
                setShowBecomeDonorModal(
                  true
                )
              }
            >
              {t(
                'donors.becomeDonorButton',
                {
                  defaultValue:
                    'Register as Blood Donor'
                }
              )}
            </button>
          </div>
        </Card>
      )}

      {/* --------------------------------------------------------------- */}
      {/* DONOR REGISTRATION FORM                                        */}
      {/* --------------------------------------------------------------- */}

      {showBecomeDonorModal && (
        <Card
          title={t(
            'donors.donorRegistrationForm',
            {
              defaultValue:
                'Donor Profile Registration'
            }
          )}
        >
          <form
            onSubmit={
              handleBecomeDonorSubmit
            }
          >
            <p className="muted">
               Blood group, date of birth,
               gender and weight are reused
               from your Patient account.
               Existing saved information
               cannot be changed during donor
               registration.
            </p>
            <div className="form-row">
              <Field
                label={t(
                  'donors.bloodGroup'
                )}
              >
                  <select
                    value={
                      becomeDonorForm.bloodGroup
                    }
                    onChange={(e) =>
                      setBecomeDonorForm(
                        (previous) => ({
                          ...previous,
                  
                          bloodGroup:
                            e.target.value
                        })
                      )
                    }
                    disabled={
                      Boolean(
                        user?.bloodGroup
                      )
                    }
                    required
                  >
                  {BLOOD_GROUPS.map(
                    (group) => (
                      <option
                        key={group}
                        value={group}
                      >
                        {group}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label={t(
                  'donors.gender'
                )}
              >
                  <select
                    value={
                      becomeDonorForm.gender
                    }
                    onChange={(e) =>
                      setBecomeDonorForm(
                        (previous) => ({
                          ...previous,
                  
                          gender:
                            e.target.value
                        })
                      )
                    }
                    disabled={
                      Boolean(
                        user?.gender
                      )
                    }
                    required
                  >
                  {GENDERS.map(
                    (gender) => (
                      <option
                        key={gender}
                        value={gender}
                      >
                        {t(
                          `donors.${gender}`,
                          {
                            defaultValue:
                              gender
                          }
                        )}
                      </option>
                    )
                  )}
                </select>
              </Field>
            </div>

            <div className="form-row">
              <Field
                label={t(
                  'donors.dateOfBirth',
                  {
                    defaultValue:
                      'Date of Birth'
                  }
                )}
              >
              <input
                type="date"
                value={
                  becomeDonorForm.dateOfBirth
                }
                onChange={(e) =>
                  setBecomeDonorForm(
                    (previous) => ({
                      ...previous,
              
                      dateOfBirth:
                        e.target.value
                    })
                  )
                }
                disabled={
                  Boolean(
                    user?.dateOfBirth
                  )
                }
                required
              />
              </Field>

              <Field
                label={t(
                  'donors.weightKg',
                  {
                    defaultValue:
                      'Weight (kg)'
                  }
                )}
              >
              <input
                type="number"
                min="45"
                value={
                  becomeDonorForm.weightKg
                }
                onChange={(e) =>
                  setBecomeDonorForm(
                    (previous) => ({
                      ...previous,
              
                      weightKg:
                        e.target.value
                    })
                  )
                }
                disabled={
                  user?.weightKg !==
                    undefined &&
                  user?.weightKg !==
                    null
                }
                required
              />
              </Field>
            </div>

            <div
              style={{
                marginBottom: 14
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    becomeDonorForm.shareLocationConsent
                  }
                  onChange={(e) =>
                    setBecomeDonorForm(
                      (previous) => ({
                        ...previous,

                        shareLocationConsent:
                          e.target.checked
                      })
                    )
                  }
                />

                {t(
                  'donors.consentLocationSharing',
                  {
                    defaultValue:
                      'I consent to sharing my approximate area with requesters when I volunteer to donate'
                  }
                )}
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8
              }}
            >
              <button
                type="submit"
                className="small"
              >
                {t(
                  'donors.submitRegistration',
                  {
                    defaultValue:
                      'Save Donor Profile'
                  }
                )}
              </button>

              <button
                type="button"
                className="secondary small"
                onClick={() =>
                  setShowBecomeDonorModal(
                    false
                  )
                }
              >
                {t(
                  'common.cancel',
                  {
                    defaultValue:
                      'Cancel'
                  }
                )}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* --------------------------------------------------------------- */}
      {/* SEARCH & FILTER                                                 */}
      {/* --------------------------------------------------------------- */}

      <Card
        title={t(
          'donors.searchFilter'
        )}
      >
        <form
          onSubmit={handleSearch}
        >
          <div className="form-row">
            <Field
              label={t(
                'donors.bloodGroup'
              )}
            >
              <select
                value={
                  filters.bloodGroup
                }
                onChange={
                  set('bloodGroup')
                }
              >
                <option value="">
                  {t('donors.any')}
                </option>

                {BLOOD_GROUPS.map(
                  (group) => (
                    <option
                      key={group}
                      value={group}
                    >
                      {group}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field
              label={t(
                'donors.availability'
              )}
            >
              <select
                value={
                  filters.isAvailable
                }
                onChange={
                  set('isAvailable')
                }
              >
                <option value="">
                  {t('donors.any')}
                </option>

                <option value="true">
                  {t(
                    'donors.available'
                  )}
                </option>

                <option value="false">
                  {t(
                    'donors.unavailable'
                  )}
                </option>
              </select>
            </Field>

            <Field
              label={t(
                'donors.gender'
              )}
            >
              <select
                value={
                  filters.gender
                }
                onChange={
                  set('gender')
                }
              >
                <option value="">
                  {t('donors.any')}
                </option>

                <option value="male">
                  {t(
                    'donors.male'
                  )}
                </option>

                <option value="female">
                  {t(
                    'donors.female'
                  )}
                </option>

                <option value="other">
                  {t(
                    'donors.other'
                  )}
                </option>
              </select>
            </Field>

            <Field
              label={t(
                'donors.minWeight'
              )}
            >
              <input
                type="number"
                value={
                  filters.minWeight
                }
                onChange={
                  set('minWeight')
                }
                placeholder="50"
              />
            </Field>

            <Field
              label={t(
                'donors.nameContains'
              )}
            >
              <input
                value={
                  filters.name
                }
                onChange={
                  set('name')
                }
                placeholder={t(
                  'donors.namePlaceholder'
                )}
              />
            </Field>
          </div>

          <div className="form-row">
            <Field
              label={t(
                'donors.latitude'
              )}
            >
              <input
                value={filters.lat}
                onChange={set('lat')}
                placeholder="23.7808"
              />
            </Field>

            <Field
              label={t(
                'donors.longitude'
              )}
            >
              <input
                value={filters.lng}
                onChange={set('lng')}
                placeholder="90.4203"
              />
            </Field>

            <Field
              label={t(
                'donors.radius'
              )}
            >
              <input
                type="number"
                value={
                  filters.radius
                }
                onChange={
                  set('radius')
                }
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
              {t(
                'donors.search'
              )}
            </button>

            <button
              type="button"
              className="secondary"
              onClick={handleReset}
            >
              {t(
                'donors.reset'
              )}
            </button>
          </div>
        </form>

        {appliedFilters && (
          <div
            className="muted"
            style={{
              marginTop: 12
            }}
          >
            <b>
              {t(
                'donors.querySent'
              )}
            </b>{' '}

            <code>
              {JSON.stringify(
                appliedFilters
              )}
            </code>
          </div>
        )}
      </Card>

      {/* --------------------------------------------------------------- */}
      {/* ELIGIBILITY RESULT                                              */}
      {/* --------------------------------------------------------------- */}

      {eligibility && (
        <Card
          title={`${t(
            'donors.eligibility'
          )} — ${
            eligibility.donorName ||
            ''
          } (${
            eligibility.publicId ||
            ''
          })`}
        >
          <div
            style={{
              marginBottom: 10
            }}
          >
            {eligibility.eligible ? (
              <Badge type="ok">
                {t(
                  'donors.eligible'
                )}
              </Badge>
            ) : (
              <Badge type="bad">
                {t(
                  'donors.notEligible'
                )}
              </Badge>
            )}
          </div>

          {eligibility.reasons &&
            eligibility.reasons.length >
              0 && (
              <ul
                style={{
                  margin:
                    '0 0 10px',
                  paddingLeft: 20
                }}
              >
                {eligibility.reasons.map(
                  (
                    reason,
                    index
                  ) => (
                    <li
                      key={index}
                      style={{
                        fontSize: 14
                      }}
                    >
                      {reason}
                    </li>
                  )
                )}
              </ul>
            )}

          <div className="muted">
            {t(
              'donors.age'
            )}{' '}
            {eligibility.age ?? '—'}

            {' · '}

            {t(
              'donors.requiredInterval'
            )}{' '}

            {eligibility.requiredIntervalDays ??
              '—'}{' '}

            {t(
              'donors.days'
            )}

            {' · '}

            {t(
              'donors.daysSinceLastDonation'
            )}{' '}

            {eligibility.daysSinceLastDonation ??
              '—'}

            {' · '}

            {t(
              'donors.nextEligible'
            )}{' '}

            {formatDate(
              eligibility.nextEligibleDate
            )}
          </div>

          <button
            type="button"
            className="secondary small"
            style={{
              marginTop: 10
            }}
            onClick={() =>
              setEligibility(null)
            }
          >
            {t(
              'donors.close'
            )}
          </button>
        </Card>
      )}

      {/* --------------------------------------------------------------- */}
      {/* DONOR DIRECTORY                                                 */}
      {/* --------------------------------------------------------------- */}

      <Card
        title={`${t(
          'donors.donors'
        )} (${donors.length})`}
      >
        {loading ? (
          <Loading />
        ) : donors.length === 0 ? (
          <Empty>
            {t(
              'donors.noMatch'
            )}
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  {t(
                    'donors.name'
                  )}
                </th>

                <th>
                  {t(
                    'donors.group'
                  )}
                </th>

                <th>
                  {t(
                    'donors.age'
                  )}
                </th>

                <th>
                  {t(
                    'donors.weight'
                  )}
                </th>

                <th>
                  {t(
                    'donors.area'
                  )}
                </th>

                <th>
                  {t(
                    'donors.donations'
                  )}
                </th>

                <th>
                  {t(
                    'donors.lastDonated'
                  )}
                </th>

                <th>
                  {t(
                    'donors.availability'
                  )}
                </th>

                <th>
                  {t(
                    'donors.eligibility',
                    {
                      defaultValue:
                        'Eligibility'
                    }
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {donors.map(
                (donor) => (
                  <tr
                    key={
                      donor._id
                    }
                  >
                    <td>
                      <b>
                        {donor.name}
                      </b>

                      {donor.publicId && (
                        <span
                          className="badge neutral"
                          style={{
                            marginLeft: 6,
                            fontSize: 10
                          }}
                        >
                          {
                            donor.publicId
                          }
                        </span>
                      )}

                      <br />

                      <span className="muted">
                        {donor.phone ||
                          'Contact masked'}
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
                      {donor.age ??
                        '—'}
                    </td>

                    <td>
                      {donor.weightKg !=
                      null
                        ? `${donor.weightKg} kg`
                        : '—'}
                    </td>

                    <td>
                      {donor.location
                        ?.address ||
                        '—'}
                    </td>

                    <td>
                      {donor.totalDonations ||
                        0}
                    </td>

                    <td>
                      {formatDate(
                        donor.lastDonationDate
                      )}
                    </td>

                    <td>
                      {canManageAvailability(
                        donor
                      ) ? (
                        <button
                          type="button"
                          className={
                            donor.isAvailable
                              ? 'small'
                              : 'small secondary'
                          }
                          onClick={() =>
                            handleToggle(
                              donor
                            )
                          }
                        >
                          {donor.isAvailable
                            ? t(
                                'donors.available'
                              )
                            : t(
                                'donors.unavailable'
                              )}
                        </button>
                      ) : (
                        <Badge
                          type={
                            donor.isAvailable
                              ? 'ok'
                              : 'neutral'
                          }
                        >
                          {donor.isAvailable
                            ? t(
                                'donors.available'
                              )
                            : t(
                                'donors.unavailable'
                              )}
                        </Badge>
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="small secondary"
                        onClick={() =>
                          handleEligibility(
                            donor.publicId ||
                              donor._id
                          )
                        }
                      >
                        {t(
                          'donors.check'
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
    </div>
  );
}
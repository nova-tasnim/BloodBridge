import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Field, Alert, BLOOD_GROUPS } from '../components/Shared';

// Admin is intentionally excluded from public self-registration —
// admin accounts should be created directly/seeded, not opened to
// anyone who fills out this form.
const REGISTERABLE_ROLES = ['Donor', 'Patient', 'Hospital', 'BloodBank'];

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'Donor',
  bloodGroup: 'A+',
  dateOfBirth: '',
  gender: 'male',
  weightKg: '',
  medicalCondition: '',
  guardianContact: '',
  registrationNumber: '',
  hospitalType: 'private',
  licenseNumber: '',
  operatingHours: '',
  contactPerson: ''
};

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function buildPayload() {
    const base = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      role: form.role
    };

    if (form.role === 'Donor') {
      return {
        ...base,
        bloodGroup: form.bloodGroup,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        weightKg: Number(form.weightKg)
      };
    }

    if (
      form.role ===
      'Patient'
    ) {
      return {
        ...base,
    
        bloodGroup:
          form.bloodGroup,
    
        dateOfBirth:
          form.dateOfBirth,
    
        gender:
          form.gender,
    
        weightKg:
          Number(
            form.weightKg
          ),
    
        medicalCondition:
          form.medicalCondition,
    
        guardianContact:
          form.guardianContact
      };
    }

    if (form.role === 'Hospital') {
      return {
        ...base,
        registrationNumber: form.registrationNumber,
        hospitalType: form.hospitalType,
        contactPerson: form.contactPerson
      };
    }

    if (form.role === 'BloodBank') {
      return {
        ...base,
        licenseNumber: form.licenseNumber,
        operatingHours: form.operatingHours,
        contactPerson: form.contactPerson
      };
    }

    return base;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(buildPayload());
      navigate('/donors', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
      <Card title={t('auth.registerTitle')}>
        <Alert message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <Field label={t('auth.role')}>
            <select value={form.role} onChange={set('role')}>
              {REGISTERABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`auth.roles.${r}`)}
                </option>
              ))}
            </select>
          </Field>

          <div className="form-row">
            <Field label={t('auth.name')}>
              <input value={form.name} onChange={set('name')} required />
            </Field>
            <Field label={t('auth.email')}>
              <input type="email" value={form.email} onChange={set('email')} required />
            </Field>
          </div>

          <div className="form-row">
            <Field label={t('auth.phone')}>
              <input value={form.phone} onChange={set('phone')} required />
            </Field>
            <Field label={t('auth.password')}>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                minLength={6}
                required
              />
            </Field>
          </div>

          {form.role === 'Donor' && (
            <>
              <div className="form-row">
                <Field label={t('auth.bloodGroup')}>
                  <select value={form.bloodGroup} onChange={set('bloodGroup')}>
                    {BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('auth.gender')}>
                  <select value={form.gender} onChange={set('gender')}>
                    <option value="male">{t('donors.male')}</option>
                    <option value="female">{t('donors.female')}</option>
                    <option value="other">{t('donors.other')}</option>
                  </select>
                </Field>
              </div>
              <div className="form-row">
                <Field label={t('auth.dateOfBirth')}>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={set('dateOfBirth')}
                    required
                  />
                </Field>
                <Field label={t('auth.weightKg')}>
                  <input
                    type="number"
                    min="0"
                    value={form.weightKg}
                    onChange={set('weightKg')}
                    required
                  />
                </Field>
              </div>
            </>
          )}

          {form.role ===
            'Patient' && (
            <>
              <div className="form-row">
                <Field
                  label={
                    t(
                      'auth.bloodGroup'
                    )
                  }
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
                    required
                  >
                    {BLOOD_GROUPS.map(
                      (g) => (
                        <option
                          key={g}
                          value={g}
                        >
                          {g}
                        </option>
                      )
                    )}
                  </select>
                </Field>
          
                <Field
                  label={
                    t(
                      'auth.dateOfBirth'
                    )
                  }
                >
                  <input
                    type="date"
                    value={
                      form.dateOfBirth
                    }
                    onChange={
                      set(
                        'dateOfBirth'
                      )
                    }
                    required
                  />
                </Field>
              </div>
          
              <div className="form-row">
                <Field
                  label={
                    t(
                      'auth.gender'
                    )
                  }
                >
                  <select
                    value={
                      form.gender
                    }
                    onChange={
                      set(
                        'gender'
                      )
                    }
                    required
                  >
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
                  label={
                    t(
                      'auth.weightKg'
                    )
                  }
                >
                  <input
                    type="number"
                    min="0"
                    value={
                      form.weightKg
                    }
                    onChange={
                      set(
                        'weightKg'
                      )
                    }
                    required
                  />
                </Field>
              </div>
          
              <Field
                label={
                  t(
                    'auth.medicalCondition'
                  )
                }
              >
                <input
                  value={
                    form.medicalCondition
                  }
                  onChange={
                    set(
                      'medicalCondition'
                    )
                  }
                />
              </Field>
          
              <Field
                label={
                  t(
                    'auth.guardianContact'
                  )
                }
              >
                <input
                  value={
                    form.guardianContact
                  }
                  onChange={
                    set(
                      'guardianContact'
                    )
                  }
                />
              </Field>
            </>
          )}

          {form.role === 'Hospital' && (
            <>
              <Field label={t('auth.registrationNumber')}>
                <input
                  value={form.registrationNumber}
                  onChange={set('registrationNumber')}
                  required
                />
              </Field>
              <div className="form-row">
                <Field label={t('auth.hospitalType')}>
                  <select value={form.hospitalType} onChange={set('hospitalType')}>
                    <option value="government">{t('auth.hospitalTypes.government')}</option>
                    <option value="private">{t('auth.hospitalTypes.private')}</option>
                    <option value="clinic">{t('auth.hospitalTypes.clinic')}</option>
                  </select>
                </Field>
                <Field label={t('auth.contactPerson')}>
                  <input value={form.contactPerson} onChange={set('contactPerson')} />
                </Field>
              </div>
            </>
          )}

          {form.role === 'BloodBank' && (
            <>
              <Field label={t('auth.licenseNumber')}>
                <input
                  value={form.licenseNumber}
                  onChange={set('licenseNumber')}
                  required
                />
              </Field>
              <div className="form-row">
                <Field label={t('auth.operatingHours')}>
                  <input value={form.operatingHours} onChange={set('operatingHours')} />
                </Field>
                <Field label={t('auth.contactPerson')}>
                  <input value={form.contactPerson} onChange={set('contactPerson')} />
                </Field>
              </div>
            </>
          )}

          <button type="submit" disabled={loading}>
            {loading ? t('common.loading') : t('auth.register')}
          </button>
        </form>

        <p className="bb-auth-switch">
          {t('auth.haveAccount')} <Link to="/login">{t('auth.loginLink')}</Link>
        </p>
      </Card>
  );
}
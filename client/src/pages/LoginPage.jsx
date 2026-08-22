import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Field, Alert } from '../components/Shared';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(form.email, form.password);
      const redirectTo = location.state?.from?.pathname;
      navigate(user.role === 'Admin' ? '/admin' : redirectTo || '/donors', {
        replace: true
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
      <Card title={t('auth.loginTitle')}>
        <Alert message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <Field label={t('auth.email')}>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
            />
          </Field>

          <Field label={t('auth.password')}>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
            />
          </Field>

          <button type="submit" disabled={loading}>
            {loading ? t('common.loading') : t('auth.login')}
          </button>
        </form>

        <p className="bb-auth-switch">
          {t('auth.noAccount')} <Link to="/register">{t('auth.registerLink')}</Link>
        </p>
      </Card>
  );
}
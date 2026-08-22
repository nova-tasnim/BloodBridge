import { useTranslation } from 'react-i18next';

/**
 * Full-screen "locked door" shell for /login and /register.
 * Rendered instead of the normal Navbar + LiveStatsBar chrome,
 * so an unauthenticated visitor never sees internal page links
 * or live platform data before signing in.
 */
export default function AuthLayout({ children }) {
  const { t } = useTranslation();

  return (
    <div className="bb-auth-shell">
      <div className="bb-auth-brandpanel">
        <div className="bb-auth-brand">
          <span className="bb-auth-logo-dot" />
          BloodBridge
        </div>

        <h2>{t('authLayout.headline')}</h2>
        <p className="bb-auth-tagline">{t('authLayout.tagline')}</p>

        <blockquote className="bb-auth-quote">
          {t('authLayout.quote')}
        </blockquote>
      </div>

      <div className="bb-auth-formpanel">
        {children}
      </div>
    </div>
  );
}
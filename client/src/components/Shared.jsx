import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
export function Navbar() {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="brand">BloodBridge</div>

      <nav>
        <NavLink to="/donors">{t('nav.donors')}</NavLink>
        <NavLink to="/donations">{t('nav.donations')}</NavLink>
        <NavLink to="/requests">{t('nav.requests')}</NavLink>
        <NavLink to="/queue">{t('nav.queue')}</NavLink>
        {['BloodBank', 'Hospital', 'Admin'].includes(user?.role) && (
          <NavLink to="/inventory">{t('nav.inventory')}</NavLink>
        )}
        <NavLink to="/campaigns">{t('nav.campaigns')}</NavLink>
        <NavLink to="/map">{t('nav.map')}</NavLink>
        {user?.role === 'Admin' && (
          <NavLink to="/admin">{t('nav.admin')}</NavLink>
        )}
      </nav>

      <div className="bb-navbar-actions">
        <NotificationBell />
        <LanguageToggle />

        {isAuthenticated ? (
          <div className="bb-user-chip">
            <span className="bb-user-role">{t(`auth.roles.${user.role}`)}</span>
            <span className="bb-user-name">{user.name}</span>
            <button className="bb-logout-btn" onClick={handleLogout}>
              {t('auth.logout')}
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="bb-login-link">
            {t('auth.login')}
          </NavLink>
        )}
      </div>
    </header>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function Card({ title, children }) {
  return (
    <section className="card">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Badge({ type = 'neutral', children }) {
  return (
    <span className={`badge ${type}`}>
      {children}
    </span>
  );
}

export function BloodBadge({ group }) {
  return (
    <span className="badge blood">
      {group}
    </span>
  );
}

export function Alert({ type = 'error', message, onDismiss }) {
  if (!message) return null;

  return (
    <div className={`alert ${type}`} onClick={onDismiss}>
      {message}
    </div>
  );
}

export function InspirationBanner() {
  const { t } = useTranslation();

  const quotes = t('inspiration.quotes', {
    returnObjects: true
  });

  const safeQuotes = Array.isArray(quotes) ? quotes : [];

  const [index, setIndex] = useState(() =>
    safeQuotes.length > 0
      ? Math.floor(Math.random() * safeQuotes.length)
      : 0
  );

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (safeQuotes.length <= 1) return;

    const interval = setInterval(() => {
      setVisible(false);

      setTimeout(() => {
        setIndex((currentIndex) =>
          (currentIndex + 1) % safeQuotes.length
        );
        setVisible(true);
      }, 300);
    }, 6000);

    return () => clearInterval(interval);
  }, [safeQuotes.length]);

  // Reset quote index when language changes
  useEffect(() => {
    if (safeQuotes.length > 0) {
      setIndex(Math.floor(Math.random() * safeQuotes.length));
      setVisible(true);
    }
  }, [t('inspiration.quotes')]);

  if (safeQuotes.length === 0) {
    return null;
  }

  const quote = safeQuotes[index] || safeQuotes[0];

  return (
    <div className="inspiration-banner">
      <div className="inspiration-icon">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
               2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
               C13.09 3.81 14.76 3 16.5 3
               19.58 3 22 5.42 22 8.5
               c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className={`inspiration-text ${visible ? 'in' : 'out'}`}>
        <span className="inspiration-quote">
          {quote.text}
        </span>

        <span className="inspiration-tag">
          {quote.tag}
        </span>
      </div>
    </div>
  );
}

export function Empty({ children }) {
  const { t } = useTranslation();

  return (
    <div className="empty">
      {children || t('common.noData')}
    </div>
  );
}

export function Loading() {
  const { t } = useTranslation();

  return (
    <div className="empty">
      {t('common.loading')}
    </div>
  );
}

export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-'
];

export function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
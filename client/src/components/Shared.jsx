import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
export function Navbar() {
  return (
    <header className="navbar">
      <div className="brand">BloodBridge</div>
      <nav>
        <NavLink to="/donors">Donors</NavLink>
        <NavLink to="/donations">Donations</NavLink>
        <NavLink to="/requests">Requests</NavLink>
        <NavLink to="/queue">Queue</NavLink>
        <NavLink to="/inventory">Inventory</NavLink>
        <NavLink to="/campaigns">Campaigns</NavLink>
      </nav>
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
  return <span className={`badge ${type}`}>{children}</span>;
}

export function BloodBadge({ group }) {
  return <span className="badge blood">{group}</span>;
}

export function Alert({ type = 'error', message, onDismiss }) {
  if (!message) return null;
  return (
    <div className={`alert ${type}`} onClick={onDismiss}>
      {message}
    </div>
  );
}
const DONATION_QUOTES = [
  { text: "One donation can supply blood for up to three patients in need.", tag: "Impact" },
  { text: "Somewhere in Dhaka right now, a hospital is waiting for exactly your blood type.", tag: "Urgency" },
  { text: "Blood cannot be manufactured — it only exists because someone chose to give it.", tag: "Reality" },
  { text: "A donor's fifteen minutes can be the reason a family doesn't lose someone today.", tag: "Perspective" },
  { text: "Every 90 to 120 days, your body quietly rebuilds what it gave. Someone else's body can't wait that long without it.", tag: "Biology" },
  { text: "Rare blood types depend entirely on donors who show up, not on supply chains.", tag: "Scarcity" },
  { text: "The best time to become a donor was years ago. The second best time is today.", tag: "Encouragement" }
];

export function InspirationBanner() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * DONATION_QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % DONATION_QUOTES.length);
        setVisible(true);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const quote = DONATION_QUOTES[index];

  return (
    <div className="inspiration-banner">
      <div className="inspiration-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="currentColor"/>
        </svg>
      </div>
      <div className={`inspiration-text ${visible ? 'in' : 'out'}`}>
        <span className="inspiration-quote">{quote.text}</span>
        <span className="inspiration-tag">{quote.tag}</span>
      </div>
    </div>
  );
}

export function Empty({ children = 'Nothing to show yet.' }) {
  return <div className="empty">{children}</div>;
}

export function Loading() {
  return <div className="empty">Loading…</div>;
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
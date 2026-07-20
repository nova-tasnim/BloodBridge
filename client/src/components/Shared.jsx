import { NavLink } from 'react-router-dom';

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
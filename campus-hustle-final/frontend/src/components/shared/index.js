// frontend/src/components/shared/index.js
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ label = 'Loading…' }) => (
  <div className="spinner-wrap">
    <div className="spinner" />
    <span>{label}</span>
  </div>
);

// ── Alert ─────────────────────────────────────────────────────────────────────
const ALERT_ICONS = { error: '⚠️', success: '✅', info: 'ℹ️', warning: '⚠️' };

export const Alert = ({ type = 'info', message }) => {
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`} role="alert">
      <span>{ALERT_ICONS[type]}</span>
      <span>{message}</span>
    </div>
  );
};

// ── EmptyState ────────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = '📭', title, subtitle, action }) => (
  <div className="empty-state">
    <div className="icon">{icon}</div>
    <h3>{title}</h3>
    {subtitle && <p>{subtitle}</p>}
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, className = '', hover = false, style = {}, onClick }) => (
  <div
    className={`card ${hover ? 'card-hover' : ''} ${className}`}
    style={style}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    {children}
  </div>
);

// ── Button ────────────────────────────────────────────────────────────────────
export const Button = ({
  children, variant = 'primary', size = '',
  disabled, style = {}, className = '', type = 'button', onClick,
}) => (
  <button
    type={type}
    className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`}
    disabled={disabled}
    style={style}
    onClick={onClick}
  >
    {children}
  </button>
);

// ── Global Nav ────────────────────────────────────────────────────────────────
export const GlobalNav = () => {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : '';

  return (
    <nav className="global-nav">
      <Link to="/" className="nav-logo">
        <img src="/logo.svg" alt="" className="nav-logo-mark" />
        Hustle<span>Grad</span>
      </Link>
      <div className="nav-links">
        <Link to="/marketplace" className={`nav-link ${isActive('/marketplace')}`}>Browse</Link>
        <Link to="/contact" className={`nav-link ${isActive('/contact')}`}>Contact</Link>
        {user ? (
          <>
            <Link
              to={user.is_admin ? '/admin' : '/dashboard'}
              className={`nav-link ${isActive(user.is_admin ? '/admin' : '/dashboard')}`}
            >
              {user.is_admin ? '🛡️ Admin' : '📊 Dashboard'}
            </Link>
            <Link to="/messages" className={`nav-link ${isActive('/messages')}`}>💬 Messages</Link>
            <Button variant="neutral" size="sm" onClick={logout}>Sign Out</Button>
          </>
        ) : (
          <>
            <Link to="/login"    className="nav-link">Sign In</Link>
            <Button size="sm" onClick={() => navigate('/register')}>Register</Button>
          </>
        )}
      </div>
    </nav>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ children, variant = 'neutral' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

// ── StarRating (display only) ─────────────────────────────────────────────────
export const StarRating = ({ value, onChange, size = '1.3rem' }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => onChange?.(s)}
        style={{
          background: 'none', border: 'none', padding: 0,
          cursor: onChange ? 'pointer' : 'default',
          fontSize: size,
          color: s <= value ? '#f59e0b' : '#e2e8f0',
          transition: 'color 0.15s, transform 0.15s',
          lineHeight: 1,
        }}
        onMouseEnter={e => onChange && (e.currentTarget.style.transform = 'scale(1.25)')}
        onMouseLeave={e => onChange && (e.currentTarget.style.transform = 'scale(1)')}
      >
        ★
      </button>
    ))}
  </div>
);

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider = () => <hr className="divider" />;

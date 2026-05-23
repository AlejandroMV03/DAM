import { useEffect, useState } from 'react';
import { TOAST_EVENT } from '../utils/toast';

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <section className={`surface-card ${className}`}>{children}</section>;
}

export function Button({ children, className = '', variant = 'primary', size = '', ...props }) {
  const variantClass = variant === 'ghost' ? 'button--ghost' : variant === 'danger' ? 'button--danger' : '';
  const sizeClass = size === 'small' ? 'button--small' : '';
  return (
    <button type="button" className={`button ${variantClass} ${sizeClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function StatCard({ label, value, hint, className = '' }) {
  return (
    <Card className={`metric stat-card ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </Card>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Alert({ type = 'info', children }) {
  if (!children) return null;

  return <div className={`alert alert--${type}`}>{children}</div>;
}

export function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}

export function Spinner({ label = 'Cargando informacion...' }) {
  return (
    <div className="loader-state" role="status" aria-live="polite">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <Skeleton className="skeleton--line skeleton--short" />
          <Skeleton className="skeleton--line skeleton--strong" />
          <Skeleton className="skeleton--line" />
        </div>
      ))}
    </div>
  );
}

export function Modal({ open, eyebrow, title, children, actions, onClose, compact = false }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop modal-backdrop--soft" role="dialog" aria-modal="true">
      <Card className={`modal-card modal-card--standard ${compact ? 'modal-card--compact' : ''}`}>
        <div className="modal-card__header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {onClose && (
            <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
              x
            </button>
          )}
        </div>
        <div className="modal-card__body">{children}</div>
        {actions && <div className="modal-card__actions">{actions}</div>}
      </Card>
    </div>
  );
}

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const manejarToast = (event) => {
      const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const toastItem = { id, type: event.detail?.type || 'info', message: event.detail?.message || '' };
      setToasts((actuales) => [...actuales, toastItem].slice(-4));
      window.setTimeout(() => {
        setToasts((actuales) => actuales.filter((item) => item.id !== id));
      }, 3800);
    };

    window.addEventListener(TOAST_EVENT, manejarToast);
    return () => window.removeEventListener(TOAST_EVENT, manejarToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((item) => (
        <div className={`toast toast--${item.type}`} key={item.id}>
          <span>{item.message}</span>
          <button
            type="button"
            onClick={() => setToasts((actuales) => actuales.filter((toastItem) => toastItem.id !== item.id))}
            aria-label="Cerrar mensaje"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}

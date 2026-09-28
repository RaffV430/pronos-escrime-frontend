import { useState } from 'react';
import API from '../api';
import { LegalLinks } from './LegalPages';
import TwoFactorSettings from './TwoFactorSettings';

export default function AccountSettings({ user, onDeleted }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState({ busy: false, error: '' });
  const remove = async (e) => {
    e.preventDefault();
    setStatus({ busy: true, error: '' });
    try {
      await API.delete('/auth/account', { data: { password, confirm } });
      onDeleted();
    } catch (err) {
      setStatus({ busy: false, error: err.response?.data?.error || 'Suppression impossible. Réessayez.' });
    }
  };
  return (
    <section className="feature-panel">
      <p className="eyebrow">MON COMPTE</p>
      <h1>{user.name || user.username}</h1>
      <p>
        Adresse e-mail : <strong>{user.email}</strong>
      </p>
      <p className="muted">
        Vos données sont décrites dans la politique de confidentialité. <LegalLinks />
      </p>

      {user.isAdmin && <TwoFactorSettings />}

      <details className="danger-zone">
        <summary>Supprimer mon compte</summary>
        {user.isAdmin ? (
          <p>Un compte administrateur ne peut pas être supprimé depuis l’application.</p>
        ) : (
          <form onSubmit={remove} className="auth-form">
            <p>
              La suppression est <strong>définitive</strong> : vos pronostics, points, abonnements aux notifications et
              participations aux ligues sont effacés. Les ligues que vous avez créées sont confiées au plus ancien
              membre.
            </p>
            {status.error && (
              <p role="alert" className="form-error">
                {status.error}
              </p>
            )}
            <label>
              Mot de passe
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Tapez SUPPRIMER pour confirmer
              <input required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <button type="submit" className="button-danger" disabled={status.busy || confirm !== 'SUPPRIMER'}>
              {status.busy ? 'Suppression…' : 'Supprimer définitivement mon compte'}
            </button>
          </form>
        )}
      </details>
    </section>
  );
}

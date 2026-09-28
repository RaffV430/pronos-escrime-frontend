import { useState } from 'react';
import API from '../api';

const errorOf = (e, fallback) => e.response?.data?.error || fallback;

// Changement de mot de passe et déconnexion des autres appareils.
export default function SessionSettings() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState({ busy: false, error: '', done: '' });
  const keep = (data) => {
    if (data.token) localStorage.setItem('token', data.token);
    setStatus({ busy: false, error: '', done: data.message });
  };
  const change = async (e) => {
    e.preventDefault();
    if (next !== confirm)
      return setStatus({ busy: false, error: 'Les deux nouveaux mots de passe diffèrent.', done: '' });
    setStatus({ busy: true, error: '', done: '' });
    try {
      keep((await API.post('/auth/change-password', { currentPassword: current, newPassword: next })).data);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setStatus({ busy: false, error: errorOf(err, 'Modification impossible.'), done: '' });
    }
  };
  const logoutOthers = async () => {
    setStatus({ busy: true, error: '', done: '' });
    try {
      keep((await API.post('/auth/logout-others')).data);
    } catch (err) {
      setStatus({ busy: false, error: errorOf(err, 'Déconnexion impossible.'), done: '' });
    }
  };
  return (
    <section className="two-factor">
      <h2>Sécurité</h2>
      <p className="muted">Vous restez connecté 30 jours sur chaque appareil, renouvelés à chaque visite.</p>
      {status.error && (
        <p role="alert" className="form-error">
          {status.error}
        </p>
      )}
      {status.done && <p role="status">{status.done}</p>}
      <details>
        <summary>Changer mon mot de passe</summary>
        <form onSubmit={change} className="auth-form">
          <label>
            Mot de passe actuel
            <input
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            Nouveau mot de passe (10 caractères minimum)
            <input
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </label>
          <label>
            Confirmer le nouveau mot de passe
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button type="submit" disabled={status.busy}>
            Enregistrer le nouveau mot de passe
          </button>
        </form>
      </details>
      <p>
        <button className="button-secondary" onClick={logoutOthers} disabled={status.busy}>
          Déconnecter mes autres appareils
        </button>
      </p>
    </section>
  );
}

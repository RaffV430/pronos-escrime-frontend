import { useState } from 'react';
import API from '../api';

const message = (e, fallback) => e.response?.data?.error || fallback;

export function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ busy: false, done: '', error: '' });
  const submit = async (e) => {
    e.preventDefault();
    setStatus({ busy: true, done: '', error: '' });
    try {
      const { data } = await API.post('/auth/forgot-password', { email });
      setStatus({ busy: false, done: data.message, error: '' });
    } catch (err) {
      setStatus({ busy: false, done: '', error: message(err, 'Envoi impossible. Réessayez dans quelques minutes.') });
    }
  };
  return (
    <>
      <h2>Mot de passe oublié</h2>
      {status.done ? (
        <p role="status">{status.done}</p>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <p className="muted">
            Saisissez l’adresse e-mail de votre compte : nous vous envoyons un lien valable 30 minutes.
          </p>
          {status.error && (
            <p role="alert" className="form-error">
              {status.error}
            </p>
          )}
          <input
            type="email"
            aria-label="Adresse e-mail"
            placeholder="Adresse e-mail"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={status.busy}>
            {status.busy ? 'Envoi…' : 'Recevoir le lien'}
          </button>
        </form>
      )}
      <p>
        <button className="button-link" onClick={onBack}>
          Retour à la connexion
        </button>
      </p>
    </>
  );
}

export function ResetPassword({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState({ busy: false, done: '', error: '' });
  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setStatus({ busy: false, done: '', error: 'Les deux mots de passe diffèrent.' });
    setStatus({ busy: true, done: '', error: '' });
    try {
      const { data } = await API.post('/auth/reset-password', { token, password });
      setStatus({ busy: false, done: data.message, error: '' });
    } catch (err) {
      setStatus({ busy: false, done: '', error: message(err, 'Réinitialisation impossible. Réessayez.') });
    }
  };
  return (
    <>
      <h2>Nouveau mot de passe</h2>
      {status.done ? (
        <>
          <p role="status">{status.done}</p>
          <button onClick={onDone}>Se connecter</button>
        </>
      ) : (
        <form onSubmit={submit} className="auth-form">
          {status.error && (
            <p role="alert" className="form-error">
              {status.error}
            </p>
          )}
          <input
            type="password"
            aria-label="Nouveau mot de passe"
            placeholder="Nouveau mot de passe (10 caractères minimum)"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            aria-label="Confirmer le mot de passe"
            placeholder="Confirmer le mot de passe"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button type="submit" disabled={status.busy}>
            {status.busy ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
          <button type="button" className="button-link" onClick={onDone}>
            Annuler
          </button>
        </form>
      )}
    </>
  );
}

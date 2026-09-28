import { useEffect, useState } from 'react';
import API from '../api';

const errorOf = (e, fallback) => e.response?.data?.error || fallback;

// Double authentification des administrateurs (application TOTP).
export default function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(null);
  const [setup, setSetup] = useState(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ busy: false, error: '', done: '' });

  useEffect(() => {
    API.get('/auth/me')
      .then(({ data }) => setEnabled(Boolean(data.twoFactorEnabled)))
      .catch(() => setEnabled(false));
  }, []);

  const run = async (fn, fallback) => {
    setStatus({ busy: true, error: '', done: '' });
    try {
      await fn();
    } catch (e) {
      setStatus({ busy: false, error: errorOf(e, fallback), done: '' });
    }
  };
  const start = () =>
    run(async () => {
      const { data } = await API.post('/auth/2fa/setup');
      setSetup(data);
      setCode('');
      const QRCode = await import('qrcode');
      setQr(await QRCode.toDataURL(data.otpauthUrl, { margin: 1, width: 200 }));
      setStatus({ busy: false, error: '', done: '' });
    }, 'Préparation impossible.');
  const enable = (e) => {
    e.preventDefault();
    run(async () => {
      await API.post('/auth/2fa/enable', { code });
      setEnabled(true);
      setSetup(null);
      setQr('');
      setCode('');
      setStatus({ busy: false, error: '', done: 'Double authentification activée.' });
    }, 'Activation impossible.');
  };
  const disable = (e) => {
    e.preventDefault();
    run(async () => {
      await API.post('/auth/2fa/disable', { password, code });
      setEnabled(false);
      setPassword('');
      setCode('');
      setStatus({ busy: false, error: '', done: 'Double authentification désactivée.' });
    }, 'Désactivation impossible.');
  };

  if (enabled === null) return null;
  return (
    <section className="two-factor">
      <h2>Double authentification</h2>
      <p className="muted">
        Recommandée pour les comptes administrateurs : à la connexion, un code à 6 chiffres de votre application (Google
        Authenticator, Microsoft Authenticator, 1Password…) est demandé après le mot de passe.
      </p>
      {status.error && (
        <p role="alert" className="form-error">
          {status.error}
        </p>
      )}
      {status.done && <p role="status">{status.done}</p>}
      {enabled ? (
        <form onSubmit={disable} className="auth-form">
          <p>
            <span className="status-pill saved">Active</span>
          </p>
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
            Code actuel
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button type="submit" className="button-secondary" disabled={status.busy}>
            Désactiver
          </button>
        </form>
      ) : setup ? (
        <form onSubmit={enable} className="auth-form">
          <p>1. Scannez ce QR code avec votre application, ou saisissez la clé à la main.</p>
          {qr && <img className="two-factor-qr" src={qr} alt="QR code de configuration" width="200" height="200" />}
          <p>
            Clé : <code className="two-factor-secret">{setup.secret.match(/.{1,4}/g).join(' ')}</code>
          </p>
          <label>
            2. Code affiché par l’application
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button type="submit" disabled={status.busy}>
            Activer
          </button>
        </form>
      ) : (
        <button onClick={start} disabled={status.busy}>
          Configurer la double authentification
        </button>
      )}
    </section>
  );
}

import ClubProfile from './ClubProfile';
import { useState } from 'react';
import API from '../api';
import { LegalLinks } from './LegalPages';
import TwoFactorSettings from './TwoFactorSettings';
import SessionSettings from './SessionSettings';
import ThemeSettings from './ThemeSettings';

// Page publique d'un tournoi : le joueur choisit d'apparaître (pseudo abrégé) dans son classement.
function PublicListing({ initial }) {
  const [on, setOn] = useState(initial !== false);
  const [state, setState] = useState({ busy: false, message: '', error: '' });
  const change = async (value) => {
    setOn(value);
    setState({ busy: true, message: '', error: '' });
    try {
      const { data } = await API.put('/auth/me/public-listing', { publicListing: value });
      setOn(data.publicListing);
      setState({ busy: false, message: 'Choix enregistré.', error: '' });
    } catch (err) {
      setOn(!value);
      setState({ busy: false, message: '', error: err.response?.data?.error || 'Enregistrement impossible.' });
    }
  };
  return (
    <section aria-labelledby="public-listing-title">
      <h2 id="public-listing-title">Page publique des tournois</h2>
      <label className="checkbox-line">
        <input type="checkbox" checked={on} disabled={state.busy} onChange={(e) => change(e.target.checked)} />{' '}
        Apparaître dans le classement des pronostiqueurs de la page publique (pseudo abrégé, par exemple « Raffaele V.
        »)
      </label>
      <p className="muted">
        Cette page se consulte sans compte. Décoché, votre rang et vos points y restent, sous le nom « Pronostiqueur
        anonyme ». Les classements internes de l’application ne changent pas.
      </p>
      {state.message && <p role="status">{state.message}</p>}
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
    </section>
  );
}

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
  const [exporting, setExporting] = useState('');
  // Droit d'accès (RGPD) : téléchargement de toutes les données du compte en JSON.
  const exportData = async () => {
    setExporting('busy');
    try {
      const { data } = await API.get('/me/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pronos-escrime-mes-donnees.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExporting('');
    } catch {
      setExporting('Téléchargement impossible. Réessayez.');
    }
  };
  return (
    <section className="feature-panel">
      <p className="eyebrow">MON COMPTE</p>
      <h1>{user.name || user.username}</h1>
      <ClubProfile key={user.id} />
      <p>
        Adresse e-mail : <strong>{user.email}</strong>
      </p>
      <p className="muted">
        Vos données sont décrites dans la politique de confidentialité. <LegalLinks />
      </p>
      <p>
        <button type="button" className="button-secondary" onClick={exportData} disabled={exporting === 'busy'}>
          {exporting === 'busy' ? 'Préparation…' : 'Télécharger mes données'}
        </button>
        {exporting && exporting !== 'busy' && (
          <span role="alert" className="form-error">
            {' '}
            {exporting}
          </span>
        )}
      </p>

      <ThemeSettings />

      <PublicListing initial={user.publicListing} />

      <SessionSettings />

      {user.isAdmin && <TwoFactorSettings />}

      <details className="danger-zone">
        <summary>Supprimer mon compte</summary>
        {user.isAdmin ? (
          <p>Un compte administrateur ne peut pas être supprimé depuis l’application.</p>
        ) : (
          <form onSubmit={remove} className="auth-form">
            <p>
              La suppression est <strong>définitive</strong> : vos pronostics, points, abonnements aux notifications et
              participations aux délégations et clubs sont effacés. Les délégations et clubs que vous avez créés sont
              confiés au plus ancien membre.
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

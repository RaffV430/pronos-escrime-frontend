import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { withCount } from '../lib/plural';
import { clearInvitation } from '../lib/invitation';

// Encadré de l'accueil pour une personne arrivée par un lien d'invitation, avant connexion.
export default function InvitationBanner({ code, onRegister, onLogin, onInvalid }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const invalid = useRef(onInvalid);
  useEffect(() => {
    invalid.current = onInvalid;
  }, [onInvalid]);
  useEffect(() => {
    const c = new AbortController();
    API.get(`/public/invitations/${code}`, { signal: c.signal })
      .then(({ data }) => setInfo(data))
      .catch((e) => {
        if (c.signal.aborted) return;
        if ([400, 404].includes(e.response?.status)) {
          clearInvitation();
          invalid.current?.();
        }
        setError(e.response?.data?.error || 'Invitation indisponible pour le moment.');
      });
    return () => c.abort();
  }, [code]);
  if (error)
    return (
      <section className="invitation-banner is-error" role="status">
        <p>{error}</p>
      </section>
    );
  if (!info) return null;
  return (
    <section className="invitation-banner" aria-labelledby="invitation-title">
      <p className="eyebrow">INVITATION</p>
      <h2 id="invitation-title">Rejoignez « {info.name} »</h2>
      <p className="muted">
        {[info.kind === 'CLUB' ? 'Club' : 'Groupe d’amis', info.tournament?.name, withCount(info.members, 'membre')]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p>Créez votre compte ou connectez-vous : vous rejoindrez le groupe automatiquement.</p>
      <p className="landing-ctas">
        <button type="button" onClick={onRegister}>
          Créer un compte
        </button>
        <button type="button" className="button-secondary" onClick={onLogin}>
          J’ai déjà un compte
        </button>
      </p>
    </section>
  );
}

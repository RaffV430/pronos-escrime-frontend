import { useEffect, useState } from 'react';
import API from '../api';
import ClubChoice from './ClubChoice';
import ClubPresentation from './ClubPresentation';
export default function ClubProfile({ prompt = false }) {
  const [profile, setProfile] = useState(null),
    [value, setValue] = useState(null),
    [editing, setEditing] = useState(false),
    [dismissed, setDismissed] = useState(false),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    API.get('/clubs/me', { signal: c.signal })
      .then(({ data }) => {
        setProfile(data);
        setValue(data.club ? { clubId: data.club.id } : data.clubChoiceAt ? { none: true } : null);
      })
      .catch(() => {
        if (!c.signal.aborted) setError('Le rattachement au club est indisponible. Réessayez.');
      });
    return () => c.abort();
  }, [revision]);
  useEffect(() => {
    if (profile?.clubRequest?.status !== 'PENDING' || editing) return;
    const timer = setInterval(() => setRevision((n) => n + 1), 60000);
    return () => clearInterval(timer);
  }, [profile?.clubRequest?.status, editing]);
  useEffect(() => {
    window.dispatchEvent(new Event('club-profile-changed'));
  }, [profile?.club?.id, profile?.clubRequest?.status]);
  async function save(e) {
    e.preventDefault();
    if (!value) {
      setError('Choisissez un club ou « sans club ».');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await API.put('/clubs/me', value);
      setProfile(data);
      setEditing(false);
      setMessage(
        data.clubRequest?.status === 'PENDING'
          ? 'Demande de club envoyée à l’administration.'
          : value.name && data.clubRequest?.status === 'REJECTED'
            ? 'Demande refusée automatiquement. Le motif est indiqué ci-dessous et un e-mail est programmé.'
            : data.club
              ? 'Club enregistré : vous avez rejoint son groupe dans Délégations.'
              : 'Choix enregistré.',
      );
      window.dispatchEvent(new Event('club-profile-changed'));
    } catch (e) {
      setError(e.response?.data?.error || 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }
  async function request(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await API.post('/clubs/me/responsibility', { reason });
      setRevision((n) => n + 1);
      setMessage('Demande envoyée à l’administration.');
    } catch (e) {
      setError(e.response?.data?.error || 'Demande impossible.');
    } finally {
      setBusy(false);
    }
  }
  if (prompt && (dismissed || profile?.clubChoiceAt)) return null;
  if (!profile)
    return error ? (
      <p role="alert">
        {error}{' '}
        <button
          onClick={() => {
            setError('');
            setRevision((n) => n + 1);
          }}
        >
          Réessayer
        </button>
      </p>
    ) : null;
  const choose = editing || !profile.clubChoiceAt;
  return (
    <section className="account-club-panel feature-panel">
      <h2>{choose ? 'À quel club es-tu rattaché ?' : 'Mon club'}</h2>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {profile.clubRequest?.status === 'PENDING' && (
        <p role="status">
          Demande « {profile.clubRequest.name} » en attente de validation. Vous restez sans club / accompagnant.
        </p>
      )}
      {profile.clubRequest?.status === 'REJECTED' && (
        <p role="status">
          Demande « {profile.clubRequest.name} » refusée : {profile.clubRequest.reason}
        </p>
      )}
      {choose ? (
        <form onSubmit={save}>
          <ClubChoice value={value} onChange={setValue} disabled={busy} />
          <p className="muted">
            Vos favoris et pronostics sont conservés. Un changement de club conserve les classements passés.
          </p>
          <button disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer mon choix'}</button>
          {prompt && (
            <button type="button" className="button-link" onClick={() => setDismissed(true)}>
              Plus tard
            </button>
          )}
          {editing && (
            <button type="button" className="button-link" onClick={() => setEditing(false)}>
              Annuler
            </button>
          )}
        </form>
      ) : (
        <>
          <p>
            <strong>{profile.club?.name || 'Sans club / accompagnant'}</strong>
            {profile.club?.status === 'PENDING' ? ' · à vérifier' : ''}
          </p>
          <button
            className="button-link"
            onClick={() => {
              setMessage('');
              setEditing(true);
            }}
          >
            Modifier mon club
          </button>
          {profile.club && (
            <>
              <p>Vous êtes membre du groupe de ce club dans Délégations.</p>
              {profile.responsibility?.status === 'APPROVED' ? (
                <div>
                  <p>
                    Vous êtes responsable de ce club. Les invitations se partagent depuis Délégations. Les autres
                    responsables sont nommés par l’administration.
                  </p>
                  <ClubPresentation club={profile.club} />
                </div>
              ) : profile.responsibility?.status === 'PENDING' ? (
                <p role="status">Votre demande de rôle de responsable attend la validation d’un administrateur.</p>
              ) : (
                <details>
                  <summary>Demander à devenir responsable</summary>
                  <form onSubmit={request}>
                    <label>
                      Votre fonction au club et votre motivation
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        minLength={5}
                        maxLength={1000}
                        required
                      />
                    </label>
                    <button disabled={busy}>Envoyer la demande</button>
                  </form>
                </details>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import API from '../api';
import { pollWhileVisible } from '../lib/polling';
export default function AdminFtlDiscovery({ onPrepare }) {
  const [rows, setRows] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      setRows((await API.get('/admin/ftl/discovered-events')).data);
      setError('');
    } catch {
      setError('Chargement des nouvelles épreuves impossible.');
    }
  };
  useEffect(() => {
    load();
    return pollWhileVisible(load, 30000, { follow: false });
  }, []);
  const ignore = async (t, e) => {
    setBusy(true);
    try {
      await API.post(`/admin/ftl/discovered-events/${t.tournamentId}/${encodeURIComponent(e.eventId)}/ignore`);
      await load();
      setMessage('Épreuve ignorée.');
      window.dispatchEvent(new Event('pronos:admin-alerts-changed'));
    } catch {
      setError('Impossible d’ignorer cette épreuve.');
    } finally {
      setBusy(false);
    }
  };
  const checkNow = async (t) => {
    setMessage('Contrôle en cours…');
    setBusy(true);
    setError('');
    try {
      await API.post(`/admin/ftl/discovered-events/${t.tournamentId}/check`, {}, { timeout: 95000 });
      await load();
      setMessage('Contrôle effectué.');
      window.dispatchEvent(new Event('pronos:admin-alerts-changed'));
    } catch (e) {
      setMessage('');
      setError(e.response?.data?.error || 'Contrôle impossible.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="feature-panel">
      <h2>Nouvelles épreuves FTL et Engarde à vérifier</h2>
      <p>
        Contrôle toutes les heures des tournois suivis autour de leurs dates de compétition. Aucune épreuve n’est
        ajoutée sans votre choix.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!rows.length && !error && <p>Aucune nouvelle épreuve en attente.</p>}
      <button onClick={load} disabled={busy}>
        Actualiser les alertes
      </button>
      {rows.map((t) => (
        <article className="feature-panel" key={t.tournamentId}>
          <h3>{t.name || `Tournoi ${t.tournamentId}`}</h3>
          <button disabled={busy} onClick={() => checkNow(t)}>
            Contrôler maintenant
          </button>
          {!t.events.length && !t.error && <p>Aucune nouvelle épreuve en attente pour ce tournoi.</p>}
          {t.lastCheckedAt && <p>Dernier contrôle : {new Date(t.lastCheckedAt).toLocaleString('fr-FR')}</p>}
          {t.error && <p role="alert">{t.error}</p>}
          {t.events.map((e) => (
            <article key={e.eventId}>
              <h4>{e.event}</h4>
              <p>
                {e.date} · {e.time || 'Horaire non publié'} · {e.timezone}
              </p>
              {!e.present && (
                <p>Cette épreuve n’était plus visible au dernier contrôle. Vérifiez la source avant de l’ajouter.</p>
              )}
              {e.delivery?.pending && <p>L’envoi de cette alerte n’a pas encore été confirmé.</p>}
              {e.delivery?.disabled && <p>Les envois d’alerte sont désactivés sur cet environnement.</p>}
              {e.delivery && (
                <p>
                  Alertes administrateurs : {e.delivery.mail || 0} e-mail(s), {e.delivery.push || 0} notification(s)
                  acceptés.
                  {e.delivery.uncertain || e.delivery.mailFailed || e.delivery.pushFailed
                    ? ' Certains envois ont échoué ou restent incertains ; ils ne sont pas répétés automatiquement.'
                    : ''}
                </p>
              )}
              <button disabled={busy || !e.present} onClick={() => onPrepare({ ...e, sourceUrl: t.sourceUrl })}>
                Préparer cette épreuve
              </button>
              <button disabled={busy} onClick={() => ignore(t, e)}>
                Ignorer cette épreuve
              </button>
            </article>
          ))}
        </article>
      ))}
    </section>
  );
}

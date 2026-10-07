import { useEffect, useState } from 'react';
import API from '../api';
import { calendarDates, calendarLink, GENDERS } from '../lib/calendar';
import { publicPath } from '../lib/routes';

// Administration : surveillance automatique du calendrier sur FencingTimeLive et engarde-service.
export default function CalendarWatch() {
  const [data, setData] = useState(null);
  const [state, setState] = useState({ busy: false, message: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    API.get('/admin/calendar', { signal: c.signal })
      .then(({ data }) => setData(data))
      .catch(() => !c.signal.aborted && setState({ busy: false, message: 'État du calendrier indisponible.' }));
    return () => c.abort();
  }, [revision]);
  const run = async () => {
    setState({ busy: true, message: '' });
    try {
      const { data: r } = await API.post('/admin/calendar/watch', null, { timeout: 120000 });
      const added = r.added?.length
        ? `Ajouté : ${r.added.map((a) => `${a.name} (${a.events.join(', ')})`).join(' · ')}.`
        : 'Aucune nouvelle épreuve publiée pour l’instant.';
      setState({
        busy: false,
        message: `${r.checked} épreuves vérifiées. ${added}${r.problems?.length ? ` À vérifier : ${r.problems.join(' · ')}` : ''}`,
      });
      setRevision((n) => n + 1);
    } catch (e) {
      setState({ busy: false, message: e.response?.data?.error || 'Vérification impossible. Réessayez.' });
    }
  };
  const next = (data?.events || []).slice(0, 12);
  const last = data?.last;
  return (
    <details className="feature-panel calendar-watch">
      <summary>
        Calendrier : ajout automatique des épreuves{' '}
        {data && (
          <span className="sync-health-summary">
            {data.events.filter((e) => e.tournamentId).length} / {data.events.length} déjà sur l’appli
          </span>
        )}
      </summary>
      <p className="muted">
        Toutes les 3 heures, les épreuves du calendrier qui commencent dans les deux mois sont recherchées sur
        FencingTimeLive et engarde-service. Dès qu’un tournoi est publié, ses épreuves de fleuret correspondantes sont
        ajoutées et vous êtes prévenu.
        {last &&
          ` Dernier passage : ${new Date(last.createdAt).toLocaleString('fr-FR')} (${last.after?.checked ?? 0} épreuves vérifiées).`}
      </p>
      <button type="button" onClick={run} disabled={state.busy}>
        {state.busy ? 'Recherche en cours…' : 'Vérifier maintenant'}
      </button>
      {state.message && <p role="status">{state.message}</p>}
      <ul className="calendar-watch-list">
        {next.map((e) => (
          <li key={e.id}>
            <span>
              {calendarDates(e.start, e.end)} · <strong>{e.city || 'Lieu à préciser'}</strong> ·{' '}
              {GENDERS[e.gender]?.icon} {e.categories.join(', ')}
            </span>
            {e.tournamentId ? (
              <a href={calendarLink(e, publicPath)}>✅ sur l’appli</a>
            ) : (
              <span className="muted">⏳ en attente de publication</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

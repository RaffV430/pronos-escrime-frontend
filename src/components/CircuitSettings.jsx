import { useEffect, useState } from 'react';
import API from '../api';
import { eventNameFr } from '../lib/eventName';

// Administration des circuits : nom, tournois concernés, nombre de pires résultats retirés.
export default function CircuitSettings() {
  const [circuits, setCircuits] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState({});
  const [eventError, setEventError] = useState('');
  const [retry, setRetry] = useState(0);
  const selectedIds = [...new Set(circuits.flatMap(c => c.tournamentIds))].sort((a, b) => a - b).join(',');
  useEffect(() => {
    const controller = new AbortController();
    setEventError('');
    Promise.all(selectedIds.split(',').filter(Boolean).map(async id => {
      const { data } = await API.get(`/podium/competitions/${id}`, { signal: controller.signal });
      return [id, data];
    })).then(entries => { if (!controller.signal.aborted) setEvents(Object.fromEntries(entries)); })
      .catch(() => { if (!controller.signal.aborted) setEventError('Impossible de charger les épreuves. Réessayez avant d’enregistrer.'); });
    return () => controller.abort();
  }, [selectedIds, retry]);
  const [state, setState] = useState({ busy: false, message: '', error: '' });
  useEffect(() => {
    const c = new AbortController();
    Promise.all([API.get('/admin/circuits', { signal: c.signal }), API.get('/tournaments', { signal: c.signal })])
      .then(([a, b]) => {
        setCircuits(a.data);
        setTournaments(b.data);
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  const update = (i, patch) => setCircuits((list) => list.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const save = async () => {
    setState({ busy: true, message: '', error: '' });
    try {
      const { data } = await API.put('/admin/circuits', { circuits });
      setCircuits(data);
      setState({ busy: false, error: '', message: 'Circuits enregistrés.' });
    } catch (e) {
      setState({ busy: false, message: '', error: e.response?.data?.error || 'Enregistrement impossible.' });
    }
  };
  return (
    <details className="feature-panel circuits-admin">
      <summary>Circuits (classements cumulés)</summary>
      <p className="muted">
        Un circuit additionne les points sur tous les tournois retenus, ou seulement sur les épreuves choisies (ex. M17 ou M20). Les plus
        mauvais résultats peuvent être retirés. Le classement apparaît dans Classements → Circuit.
      </p>
      {eventError && <p role="alert">{eventError} <button onClick={() => setRetry(v => v + 1)}>Réessayer</button></p>}
      {circuits.map((c, i) => (
        <fieldset key={c.id || `new-${i}`} className="circuit-edit">
          <legend>Circuit {i + 1}</legend>
          <label>
            Nom
            <input value={c.name} maxLength={60} onChange={(e) => update(i, { name: e.target.value })} />
          </label>
          <div className="circuit-tournaments" role="group" aria-label="Tournois du circuit">
            {tournaments.map(t => {
              const included = c.tournamentIds.includes(t.id);
              const chosen = c.competitionIdsByTournament?.[t.id];
              const roster = events[t.id];
              const selectEvents = ids => update(i, { competitionIdsByTournament: { ...c.competitionIdsByTournament, [t.id]: ids } });
              return <div key={t.id} className="circuit-tournament-choice">
                <label className="checkbox-line"><input type="checkbox" checked={included} onChange={e => {
                  const selections = { ...c.competitionIdsByTournament }; delete selections[t.id];
                  update(i, { tournamentIds: e.target.checked ? [...c.tournamentIds, t.id] : c.tournamentIds.filter(x => x !== t.id), competitionIdsByTournament: selections });
                }} />{t.name}{t.archivedAt ? ' (archivé)' : ''}</label>
                {included && <div className="circuit-event-selection">
                  <label>Épreuves de {t.name}<select value={chosen ? 'selected' : 'all'} disabled={!roster} onChange={e => {
                    if (e.target.value === 'selected') selectEvents(roster.map(event => event.id));
                    else { const selections = { ...c.competitionIdsByTournament }; delete selections[t.id]; update(i, { competitionIdsByTournament: selections }); }
                  }}><option value="all">Toutes les épreuves</option><option value="selected">Choisir les épreuves</option></select></label>
                  {!roster && <p role="status">Chargement des épreuves…</p>}
                  {chosen && <div role="group" aria-label={`Épreuves retenues pour ${t.name}`}>
                    {roster?.map(event => <label key={event.id} className="checkbox-line"><input type="checkbox" checked={chosen.includes(event.id)} onChange={e => selectEvents(e.target.checked ? [...chosen, event.id] : chosen.filter(id => id !== event.id))} />{eventNameFr(event.name)}</label>)}
                    {!chosen.length && <p role="alert">Sélectionnez au moins une épreuve ou retirez ce tournoi du circuit.</p>}
                  </div>}
                </div>}
              </div>;
            })}
          </div>
          <label>
            Plus mauvais résultats retirés
            <input
              type="number"
              min="0"
              max={Math.max(0, c.tournamentIds.length - 1)}
              value={c.dropWorst}
              onChange={(e) => update(i, { dropWorst: Number(e.target.value) || 0 })}
            />
          </label>
          <button type="button" className="button-link" onClick={() => setCircuits((l) => l.filter((_, k) => k !== i))}>
            Supprimer ce circuit
          </button>
        </fieldset>
      ))}
      <p>
        <button
          type="button"
          className="button-secondary"
          onClick={() => setCircuits((l) => [...l, { name: '', tournamentIds: [], dropWorst: 0 }])}
        >
          Ajouter un circuit
        </button>{' '}
        <button type="button" onClick={save} disabled={state.busy || Boolean(eventError) || circuits.some(c => c.tournamentIds.some(id => !events[id]) || Object.values(c.competitionIdsByTournament || {}).some(ids => !ids.length))}>
          {state.busy ? 'Enregistrement…' : 'Enregistrer les circuits'}
        </button>
      </p>
      {state.message && <p role="status">{state.message}</p>}
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
    </details>
  );
}

import { useEffect, useState } from 'react';
import API from '../api';

// Administration des circuits : nom, tournois concernés, nombre de pires résultats retirés.
export default function CircuitSettings() {
  const [circuits, setCircuits] = useState([]);
  const [tournaments, setTournaments] = useState([]);
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
        Un circuit additionne les points de chaque joueur sur plusieurs tournois (ex. « Circuit national »). Les plus
        mauvais résultats peuvent être retirés. Le classement apparaît dans Classements → Circuit.
      </p>
      {circuits.map((c, i) => (
        <fieldset key={c.id || `new-${i}`} className="circuit-edit">
          <legend>Circuit {i + 1}</legend>
          <label>
            Nom
            <input value={c.name} maxLength={60} onChange={(e) => update(i, { name: e.target.value })} />
          </label>
          <div className="circuit-tournaments" role="group" aria-label="Tournois du circuit">
            {tournaments.map((t) => (
              <label key={t.id} className="checkbox-line">
                <input
                  type="checkbox"
                  checked={c.tournamentIds.includes(t.id)}
                  onChange={(e) =>
                    update(i, {
                      tournamentIds: e.target.checked
                        ? [...c.tournamentIds, t.id]
                        : c.tournamentIds.filter((x) => x !== t.id),
                    })
                  }
                />{' '}
                {t.name}
                {t.archivedAt ? ' (archivé)' : ''}
              </label>
            ))}
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
        <button type="button" onClick={save} disabled={state.busy}>
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

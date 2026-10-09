import { useState } from 'react';
import API from '../api';
export default function FencerAffiliationAdministration() {
  const [query, setQuery] = useState(''),
    [rows, setRows] = useState([]),
    [selected, setSelected] = useState(null),
    [history, setHistory] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function search(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSelected(null);
    try {
      setRows((await API.get('/admin/fencer-affiliations', { params: { q: query } })).data);
    } catch (e) {
      setError(e.response?.data?.error || 'Recherche impossible.');
    } finally {
      setBusy(false);
    }
  }
  async function choose(row) {
    setSelected({ ...row, reason: '' });
    setHistory([]);
    setError('');
    try {
      setHistory((await API.get(`/admin/fencer-affiliations/${row.id}/history`)).data);
    } catch {
      setError('Historique indisponible.');
    }
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await API.put(`/admin/fencer-affiliations/${selected.id}`, {
        club: selected.club,
        clubCode: selected.clubCode,
        locked: selected.locked,
        revision: selected.revision,
        reason: selected.reason,
      });
      setRows(rows.map((r) => (r.id === data.id ? data : r)));
      await choose(data);
      setMessage('Affiliation enregistrée.');
    } catch (e) {
      setError(e.response?.data?.error || 'Modification impossible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="feature-panel">
      <h2>Clubs des tireurs</h2>
      <p>Les nouvelles sources officielles actualisent le club. Le verrouillage reste facultatif.</p>
      <form onSubmit={search}>
        <label>
          Rechercher un tireur
          <input value={query} minLength={2} maxLength={160} required onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button disabled={busy}>Rechercher</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <button disabled={busy} onClick={() => choose(r)}>
              {r.name} · {r.club || 'Club non renseigné'}
              {r.locked ? ' · Verrouillé' : ''}
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <form onSubmit={save}>
          <h3>{selected.name}</h3>
          <label>
            Club
            <input
              value={selected.club}
              required
              maxLength={160}
              onChange={(e) => setSelected({ ...selected, club: e.target.value })}
            />
          </label>
          <label>
            Code fédéral du club
            <input
              value={selected.clubCode}
              maxLength={40}
              onChange={(e) => setSelected({ ...selected, clubCode: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={selected.locked}
              onChange={(e) => setSelected({ ...selected, locked: e.target.checked })}
            />
            Verrouiller les mises à jour automatiques
          </label>
          <label>
            Motif de la correction
            <input
              required
              minLength={5}
              maxLength={1000}
              value={selected.reason}
              onChange={(e) => setSelected({ ...selected, reason: e.target.value })}
            />
          </label>
          <button disabled={busy}>Enregistrer</button>
          <h4>Historique</h4>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                {new Date(h.observedAt).toLocaleString('fr-FR')} · {h.club} ·{' '}
                {h.status === 'LOCKED'
                  ? 'Conservé sans application (verrouillé)'
                  : h.status === 'STALE'
                    ? 'Source antérieure'
                    : 'Appliqué'}{' '}
                ·{' '}
                {h.sourceUrl === 'MANUAL'
                  ? 'Correction manuelle'
                  : h.sourceUrl.startsWith('FFE_RANKING:')
                    ? 'Classement FFE'
                    : new URL(h.sourceUrl).hostname}
              </li>
            ))}
          </ul>
        </form>
      )}
    </section>
  );
}

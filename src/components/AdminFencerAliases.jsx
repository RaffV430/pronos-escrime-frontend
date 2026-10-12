import { useCallback, useEffect, useState } from 'react';
import API from '../api';
import './AdminReviews.css';

// Orthographes d'un même tireur (accents, nom composé, faute de saisie) : reliées, elles forment un
// seul historique (fiche du tireur, « Toutes ses épreuves », parcours de Mes tireurs).
export default function AdminFencerAliases() {
  const [groups, setGroups] = useState(null);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    try {
      setGroups((await API.get('/admin/fencer-aliases')).data);
    } catch (e) {
      setMessage(e.response?.data?.error || 'Liste indisponible.');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn, done) => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
      setMessage(done);
      await load();
    } catch (e) {
      setMessage(e.response?.data?.error || 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="feature-panel">
      <h3>Orthographes d’un même tireur</h3>
      <p className="muted">
        Un tireur inscrit sous deux orthographes (accents, nom composé, erreur de saisie) a un historique coupé en deux.
        Reliez les deux noms, tels qu’ils apparaissent dans les poules ou le tableau.
      </p>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await API.post('/admin/fencer-aliases', { a, b });
            setA('');
            setB('');
          }, 'Orthographes reliées : un seul historique pour ce tireur.');
        }}
      >
        <label>
          Nom 1
          <input value={a} required minLength={3} maxLength={120} onChange={(e) => setA(e.target.value)} />
        </label>
        <label>
          Nom 2
          <input value={b} required minLength={3} maxLength={120} onChange={(e) => setB(e.target.value)} />
        </label>
        <button disabled={busy}>Relier</button>
      </form>
      {message && <p role="status">{message}</p>}
      {groups === null ? (
        <p className="muted">Chargement…</p>
      ) : groups.length === 0 ? (
        <p className="muted">Aucune orthographe reliée.</p>
      ) : (
        <ul className="admin-review-list">
          {groups.map((g) => (
            <li key={g.names.join('|')}>
              <strong>{g.names.join(' = ')}</strong>
              <div className="admin-review-actions">
                {g.names.map((n) => (
                  <button
                    key={n}
                    className="button-secondary"
                    disabled={busy}
                    onClick={() =>
                      run(() => API.delete('/admin/fencer-aliases', { params: { name: n } }), `« ${n} » détaché.`)
                    }
                  >
                    Détacher « {n} »
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import API from '../api';

// Journal des actions d'administration (hors contrôles automatiques).
export default function AdminJournal() {
  const [audit, setAudit] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setAudit((await API.get('/admin/audit')).data);
    } catch (e) {
      setError(e.response?.data?.error || 'Journal indisponible.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="feature-panel">
      <h2>Journal des 100 dernières actions</h2>
      <p className="muted">Hors contrôles automatiques des sites officiels.</p>
      {error && <p role="alert">{error}</p>}
      <button onClick={load} disabled={busy}>
        Actualiser le journal
      </button>
      {audit.map((a) => (
        <article className="prediction-summary" key={a.id}>
          <strong>{a.action}</strong> · {a.targetType} #{a.targetId}
          <p>
            {new Date(a.createdAt).toLocaleString('fr-FR')} · Administrateur #{a.actorId}
          </p>
          {a.after && (
            <dl>
              {Object.entries(a.after).map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {{
                      userId: 'Joueur',
                      points: 'Points',
                      reason: 'Motif',
                      competitionId: 'Épreuve',
                      tournamentId: 'Tournoi',
                      winner: 'Vainqueur',
                      isLocked: 'Verrouillé',
                      manualUnlock: 'Réouverture manuelle',
                      bonus: 'Bonus',
                      name: 'Nom',
                      matchId: 'Match',
                      closesAt: 'Clôture',
                    }[k] || k}
                  </dt>
                  <dd>{String(v ?? '—')}</dd>
                </div>
              ))}
            </dl>
          )}
        </article>
      ))}
    </section>
  );
}

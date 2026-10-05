import { useEffect, useState } from 'react';
import API from '../api';
import VenuePicker from './VenuePicker';

const dayLabel = (d) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

// Correction du lieu, de la date de l'épreuve et du jour de chaque phase (poules, tours de tableau).
// Pris en compte au prochain contrôle ; une case vide rend la main au calcul automatique.
export default function ScheduleSettings({ competitionId }) {
  const [data, setData] = useState(null);
  const [venue, setVenue] = useState({ city: '', timezone: '' });
  const [date, setDate] = useState('');
  const [days, setDays] = useState({});
  const [state, setState] = useState({ busy: false, message: '', error: '' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !competitionId) return;
    const c = new AbortController();
    API.get(`/admin/competitions/${competitionId}/schedule`, { signal: c.signal })
      .then(({ data }) => {
        setData(data);
        setVenue({ city: data.city || '', timezone: data.timezone || '' });
        setDate(data.date || '');
        setDays(Object.fromEntries(data.phases.map((p) => [p.key, p.forced || ''])));
      })
      .catch(() => !c.signal.aborted && setState((s) => ({ ...s, error: 'Lieu et dates indisponibles.' })));
    return () => c.abort();
  }, [open, competitionId]);

  const save = async (e) => {
    e.preventDefault();
    setState({ busy: true, message: '', error: '' });
    try {
      await API.put(`/admin/competitions/${competitionId}/schedule`, {
        city: venue.city || '',
        timezone: venue.timezone || '',
        date,
        phaseDays: days,
      });
      setState({ busy: false, error: '', message: 'Enregistré : pris en compte au prochain contrôle.' });
    } catch (err) {
      setState({ busy: false, message: '', error: err.response?.data?.error || 'Enregistrement impossible.' });
    }
  };

  return (
    <details className="feature-panel schedule-settings" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Lieu, date et jour des phases</summary>
      {open && !data && !state.error && <p className="muted">Chargement…</p>}
      {data && (
        <form onSubmit={save}>
          <p className="muted">
            À utiliser si l’app se trompe de jour pour un tour (épreuve sur plusieurs jours) ou si le lieu est inconnu.
            Laissez une case vide pour garder le calcul automatique.
          </p>
          <VenuePicker value={venue} onChange={setVenue} disabled={state.busy} />
          <label>
            Date de début de l’épreuve
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={state.busy} />
          </label>
          {data.phases.length > 0 && (
            <fieldset>
              <legend>Jour de chaque phase</legend>
              {data.phases.map((p) => (
                <label key={p.key} className="schedule-phase">
                  <span>
                    {p.label}
                    <small className="muted"> · actuellement : {p.day ? dayLabel(p.day) : 'horaire inconnu'}</small>
                  </span>
                  <input
                    type="date"
                    value={days[p.key] || ''}
                    disabled={state.busy}
                    onChange={(e) => setDays((d) => ({ ...d, [p.key]: e.target.value }))}
                  />
                </label>
              ))}
            </fieldset>
          )}
          <button type="submit" disabled={state.busy}>
            {state.busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {state.message && <p role="status">{state.message}</p>}
        </form>
      )}
      {state.error && <p role="alert">{state.error}</p>}
    </details>
  );
}

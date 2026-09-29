import { useState } from 'react';
import API from '../api';
import VenuePicker from './VenuePicker';
import { parisTime, venueTime } from '../lib/venue.js';
export default function FtlSetup({ competitionId, tournamentId }) {
  const [form, setForm] = useState({
      sourceUrl: '',
      date: '',
      city: '',
      timezone: '',
      offset: '',
      format: 'TEAM',
      name: '',
      destination: 'current',
    }),
    [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const change = (k, v) => {
    setForm((old) => ({ ...old, [k]: v }));
    setPreview(null);
    setMessage('');
  };
  const inspect = async (e) => {
    e.preventDefault();
    if (!form.timezone) {
      setMessage('Choisissez la ville du lieu de compétition dans la liste proposée.');
      return;
    }
    setBusy(true);
    setMessage('');
    setPreview(null);
    try {
      const { sourceUrl, date, city, timezone, format, name, destination } = form;
      setPreview(
        (
          await API.post(
            '/admin/ftl/preview',
            { sourceUrl, date, city, timezone, format, name, destination },
            { timeout: 95000 },
          )
        ).data,
      );
    } catch (e) {
      setMessage(e.response?.data?.error || 'Source non vérifiable. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { data } = await API.post('/admin/ftl/configure', {
        previewId: preview.previewId,
        name: form.name,
        ...(form.destination === 'current'
          ? { competitionId }
          : form.destination === 'tournament'
            ? { tournamentId }
            : {}),
      });
      setPreview(null);
      setMessage(
        `Épreuve « ${data.name} » configurée. Rechargez la liste des tournois puis lancez le contrôle manuel pour charger les rencontres publiées.`,
      );
    } catch (e) {
      setMessage(e.response?.data?.error || 'Configuration non enregistrée.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="feature-panel">
      <summary>Configurer une épreuve FencingTimeLive</summary>
      <p>
        Préparez l’épreuve et tous ses engagés avant l’import des rencontres. Vérifiez le tournoi, l’arme, la catégorie,
        le genre et la date ci-dessous.
      </p>
      <form onSubmit={inspect}>
        <div className="form-grid">
          <label>
            Destination
            <select value={form.destination} onChange={(e) => change('destination', e.target.value)}>
              <option value="current">Configurer l’épreuve sélectionnée</option>
              <option value="tournament">Nouvelle épreuve dans ce tournoi</option>
              <option value="new">Nouveau tournoi et nouvelle épreuve</option>
            </select>
          </label>
          <label>
            Lien officiel des poules ou du tableau
            <input required type="url" value={form.sourceUrl} onChange={(e) => change('sourceUrl', e.target.value)} />
          </label>
          <label>
            Date locale de l’épreuve
            <input required type="date" value={form.date} onChange={(e) => change('date', e.target.value)} />
          </label>
          <VenuePicker
            value={form}
            disabled={busy}
            onChange={(venue) => {
              setForm((old) => ({ ...old, city: '', timezone: '', offset: '', ...venue }));
              setPreview(null);
              setMessage('');
            }}
          />
          <label>
            Format
            <select value={form.format} onChange={(e) => change('format', e.target.value)}>
              <option value="TEAM">Par équipes</option>
              <option value="INDIVIDUAL">Individuel</option>
            </select>
          </label>
          {form.destination !== 'current' && (
            <label>
              Nom affiché (facultatif)
              <input maxLength={200} value={form.name} onChange={(e) => change('name', e.target.value)} />
            </label>
          )}
        </div>
        <button disabled={busy}>{busy ? 'Vérification…' : 'Vérifier la source et les engagés'}</button>
      </form>
      {preview && (
        <section className="prediction-summary">
          <h3>{preview.tournament}</h3>
          <p>
            <strong>{preview.event}</strong> · {preview.eventTime}
          </p>
          <p>
            {preview.entries.length} engagés · {preview.city ? `${preview.city} · ` : ''}
            {preview.timezone}
            {preview.offset ? ` (${preview.offset})` : ''} · {preview.format === 'TEAM' ? 'Équipes' : 'Individuel'}
          </p>
          {preview.startsAt && (
            <p className="venue-check">
              Début : {venueTime(preview.startsAt, preview.timezone)} sur place, soit {parisTime(preview.startsAt)} à
              Paris. Si l’écart vous semble faux, corrigez la ville avant de confirmer.
            </p>
          )}
          <details>
            <summary>Vérifier la liste complète</summary>
            <ul>
              {preview.entries.map((e) => (
                <li key={e.id}>
                  {e.name} · {e.country}
                  {e.entryRanking ? ` · rang ${e.entryRanking}` : ''}
                  {e.active === false ? ' · retiré(e)' : ''}
                </li>
              ))}
            </ul>
          </details>
          <p>
            Les pronostics et les listes existantes seront préservés. Une divergence de composition bloque la
            modification.
          </p>
          <button disabled={busy} onClick={save}>
            Confirmer cette épreuve et ses engagés
          </button>
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}

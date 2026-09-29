import { useState } from 'react';
import API from '../api';
import VenuePicker from './VenuePicker';
import { parisTime } from '../lib/venue.js';
import { sourceOf } from '../lib/sources.js';
export default function FtlTournamentSetup({ onConfigured }) {
  const [sourceUrl, setSource] = useState(''),
    [venue, setVenue] = useState({ city: '', timezone: '', offset: '' }),
    [preview, setPreview] = useState(null),
    [selected, setSelected] = useState([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [result, setResult] = useState(null);
  const provider = sourceOf(sourceUrl);
  const inspect = async (e) => {
    e.preventDefault();
    // engarde-service fournit la ville du lieu : le fuseau est déduit (sauf à l'étranger, voir l'aperçu).
    if (!venue.timezone && provider !== 'engarde') {
      setMessage('Choisissez la ville du lieu de compétition dans la liste proposée.');
      return;
    }
    setBusy(true);
    setMessage('');
    setPreview(null);
    setResult(null);
    try {
      const { data } = await API.post(
        '/admin/ftl/tournament/preview',
        { sourceUrl, city: venue.city, timezone: venue.timezone },
        { timeout: 95000 },
      );
      if (!data.timezone) {
        setMessage('Lieu à l’étranger : choisissez sa ville, puis affichez à nouveau les épreuves.');
        return;
      }
      setPreview(data);
      setSelected(data.events.map((e) => e.eventId));
    } catch (e) {
      setMessage(e.response?.data?.error || 'Calendrier indisponible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { data } = await API.post(
        '/admin/ftl/tournament/configure',
        { previewId: preview.previewId, eventIds: selected },
        { timeout: 110000 },
      );
      setResult(data);
      setPreview(null);
      onConfigured?.();
    } catch (e) {
      setMessage(
        e.response?.data?.error ||
          'La préparation n’a pas pu être confirmée. Réessayez : les épreuves existantes seront conservées.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="feature-panel tournament-setup">
      <summary>Préparer un tournoi (FencingTimeLive ou engarde-service)</summary>
      <p>
        Un seul lien pour retrouver les épreuves individuelles et par équipes, puis choisir celles à proposer aux
        joueurs. Un tournoi peut être préparé avant la publication des engagés : le suivi automatique les importera dès
        leur mise en ligne.
      </p>
      <form onSubmit={inspect}>
        <div className="form-grid">
          <label>
            Lien du tournoi
            <input
              required
              type="url"
              placeholder="Lien SCHEDULE FencingTimeLive ou lien du tournoi engarde-service"
              value={sourceUrl}
              disabled={busy}
              onChange={(e) => {
                setSource(e.target.value);
                setPreview(null);
              }}
            />
          </label>
          {provider === 'engarde' && (
            <p className="setup-source">
              <span className="source-badge">engarde-service</span> Le lieu est lu sur la page du tournoi ; ne
              choisissez une ville que pour une compétition à l’étranger.
            </p>
          )}
          <VenuePicker
            value={venue}
            disabled={busy}
            onChange={(next) => {
              setVenue({ city: '', timezone: '', offset: '', ...next });
              setPreview(null);
              setMessage('');
            }}
          />
        </div>
        <button disabled={busy}>
          {busy ? 'Lecture des sources officielles…' : 'Afficher les épreuves du tournoi'}
        </button>
      </form>
      {preview && (
        <section className="prediction-summary">
          <h3>
            {preview.tournament}
            {preview.provider === 'engarde' && <span className="source-badge">engarde-service</span>}
          </h3>
          <p>
            {preview.events.length} épreuves · Horaires du lieu de compétition
            {preview.city ? ` · ${preview.city}` : ''} ({preview.timezone}
            {preview.offset ? `, ${preview.offset}` : ''})
          </p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={selected.length === preview.events.length}
              disabled={busy}
              onChange={(e) => setSelected(e.target.checked ? preview.events.map((x) => x.eventId) : [])}
            />{' '}
            Tout sélectionner
          </label>
          <div className="setup-event-list">
            {preview.events.map((e) => (
              <label className="setup-event check-row" key={e.eventId}>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={selected.includes(e.eventId)}
                  onChange={(v) =>
                    setSelected((old) =>
                      v.target.checked ? [...old, e.eventId] : old.filter((id) => id !== e.eventId),
                    )
                  }
                />
                <span>
                  <strong>{e.event}</strong>
                  <small>
                    {new Date(e.date + 'T12:00:00').toLocaleDateString('fr-FR')} · {e.time}
                    {e.startsAt ? ` (${parisTime(e.startsAt)} à Paris)` : ''} ·{' '}
                    {e.format === 'TEAM' ? 'Par équipes' : 'Individuel'}
                  </small>
                  <small>
                    {e.existingCompetitionId ? 'Déjà configurée · conservée' : 'À ajouter'}
                    {preview.provider === 'engarde' &&
                      ` · ${e.entries ? `${e.entries} engagés` : 'engagés pas encore publiés'}`}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <p>
            Les listes complètes d’engagés seront vérifiées. Les sources encore non publiées seront recherchées
            automatiquement jusqu’à leur mise en ligne.
          </p>
          <button disabled={busy || !selected.length} onClick={save}>
            {busy ? 'Préparation du tournoi…' : `Préparer ${selected.length} épreuve${selected.length > 1 ? 's' : ''}`}
          </button>
        </section>
      )}
      {result && (
        <section className="prediction-summary" role="status">
          <h3>{result.name} est prêt</h3>
          <ul>
            {result.events.map((e) => (
              <li key={e.competitionId}>
                {e.name} · {e.created ? 'ajoutée' : 'conservée'} · {e.entries} engagés
                {e.pending ? ' · publication officielle en attente' : ''}
              </li>
            ))}
          </ul>
          <p>
            Choisissez une épreuve puis utilisez « Actualiser les résultats » pour importer ses rencontres publiées.
          </p>
        </section>
      )}
      {message && <p role="alert">{message}</p>}
    </details>
  );
}

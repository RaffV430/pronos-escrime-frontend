import { useEffect, useState } from 'react';
import API from '../api';
export default function ClubChoice({ value, onChange, disabled = false }) {
  const [clubs, setClubs] = useState([]),
    [query, setQuery] = useState(''),
    [custom, setCustom] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError('');
    API.get('/clubs', { signal: c.signal })
      .then(({ data }) => setClubs(data))
      .catch(() => {
        if (!c.signal.aborted)
          setError(
            'La liste des clubs ne peut pas être chargée. Vous pouvez ajouter votre club ou continuer sans club.',
          );
      });
    return () => c.abort();
  }, [retry]);
  const normalized = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const results = clubs.filter((c) => normalized(`${c.name} ${c.shortName} ${c.city}`).includes(normalized(query)));
  return (
    <fieldset disabled={disabled} className="club-choice">
      <legend>Votre club</legend>
      <p>
        Choisir votre club vous fait rejoindre son groupe dans Délégations. Cela ne donne pas le rôle de responsable.
      </p>
      <label>
        Rechercher un club
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, abréviation ou ville" />
      </label>
      {error && (
        <p role="alert">
          {error}{' '}
          <button type="button" className="button-link" onClick={() => setRetry((n) => n + 1)}>
            Réessayer
          </button>
        </p>
      )}
      <label>
        Club
        <select
          value={value?.clubId || ''}
          onChange={(e) => {
            setCustom(false);
            onChange(e.target.value ? { clubId: Number(e.target.value) } : null);
          }}
        >
          <option value="">Choisir un club</option>
          {results.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.shortName && c.shortName !== c.name ? ` · ${c.shortName}` : ''}
              {c.status === 'PENDING' ? ' · à vérifier' : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="club-choice-actions">
        <button
          type="button"
          className="button-link"
          onClick={() => {
            setCustom(true);
            onChange({ name: '', city: '', shortName: '' });
          }}
        >
          Mon club n’est pas dans la liste
        </button>
        <button
          type="button"
          className="button-link"
          aria-pressed={value?.none === true}
          onClick={() => {
            setCustom(false);
            onChange({ none: true });
          }}
        >
          Sans club / accompagnant{value?.none ? ' ✓' : ''}
        </button>
      </div>
      {custom && (
        <div className="club-choice-custom">
          <label>
            Nom du club
            <input
              value={value?.name || ''}
              minLength={2}
              maxLength={120}
              required
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </label>
          <label>
            Ville
            <input
              value={value?.city || ''}
              minLength={2}
              maxLength={100}
              required
              onChange={(e) => onChange({ ...value, city: e.target.value })}
            />
          </label>
          <label>
            Abréviation (facultatif)
            <input
              value={value?.shortName || ''}
              maxLength={40}
              onChange={(e) => onChange({ ...value, shortName: e.target.value })}
            />
          </label>
          <p className="muted">
            Votre club sera utilisable immédiatement, avec la mention « à vérifier ». Cet ajout ne certifie pas une
            affiliation FFE.
          </p>
        </div>
      )}
      {value?.none && <p>Vous pourrez choisir un club plus tard dans Mon compte.</p>}
    </fieldset>
  );
}

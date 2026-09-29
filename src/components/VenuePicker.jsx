import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { venueLabel } from '../lib/venue.js';

// Choix du lieu de compétition par sa ville ; le fuseau horaire en est déduit par le serveur.
// value = { city, timezone } ; la saisie manuelle du fuseau reste possible si la recherche échoue.
export default function VenuePicker({ value, onChange, disabled }) {
  const [query, setQuery] = useState(value?.city || ''),
    [results, setResults] = useState([]),
    [searching, setSearching] = useState(false),
    [error, setError] = useState(''),
    [manual, setManual] = useState(false),
    request = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (manual || q.length < 2 || q === value?.city) {
      setResults([]);
      return undefined;
    }
    const id = ++request.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const { data } = await API.get('/admin/ftl/cities', { params: { q } });
        if (id === request.current) setResults(Array.isArray(data) ? data : []);
      } catch (e) {
        if (id === request.current) {
          setResults([]);
          setError(e.response?.data?.error || 'Recherche de ville indisponible. Saisissez le fuseau manuellement.');
        }
      } finally {
        if (id === request.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, manual, value?.city]);

  const pick = (c) => {
    const city = venueLabel(c);
    setQuery(city);
    setResults([]);
    onChange({ city, timezone: c.timezone, offset: c.offset });
  };

  if (manual)
    return (
      <label>
        Fuseau horaire IANA du lieu
        <input
          required
          value={value?.timezone || ''}
          placeholder="Europe/Budapest"
          disabled={disabled}
          onChange={(e) => onChange({ city: '', timezone: e.target.value.trim() })}
        />
        <button
          type="button"
          className="link-button"
          disabled={disabled}
          onClick={() => {
            setManual(false);
            onChange({ city: '', timezone: '' });
          }}
        >
          Rechercher plutôt une ville
        </button>
      </label>
    );

  return (
    <div className="venue-picker">
      <label>
        Ville du lieu de compétition
        <input
          required
          value={query}
          placeholder="Budapest, Paris, Tokyo…"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(query && !value?.timezone)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value?.timezone) onChange({ city: '', timezone: '' });
          }}
        />
      </label>
      {value?.timezone ? (
        <small className="venue-picker-chosen">
          Fuseau : {value.timezone}
          {value.offset ? ` (${value.offset})` : ''}
        </small>
      ) : (
        query.trim().length >= 2 && (
          <small>{searching ? 'Recherche…' : results.length ? 'Choisissez la ville ci-dessous.' : ''}</small>
        )
      )}
      {results.length > 0 && (
        <ul className="venue-picker-results" role="listbox">
          {results.map((c) => (
            <li key={`${c.name}|${c.region}|${c.country}|${c.timezone}`}>
              <button type="button" disabled={disabled} onClick={() => pick(c)}>
                <strong>{c.name}</strong>
                <span>{[c.region, c.country].filter(Boolean).join(', ')}</span>
                <small>
                  {c.timezone} · {c.offset}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <small role="alert">{error}</small>}
      <button
        type="button"
        className="link-button"
        disabled={disabled}
        onClick={() => {
          setManual(true);
          setResults([]);
          setError('');
        }}
      >
        Saisir le fuseau manuellement
      </button>
    </div>
  );
}

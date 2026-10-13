import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { groupSearchResults } from '../lib/searchResults';
import FencerProfile from './FencerProfile';
import { useFencerFollows } from '../lib/fencerFollows';
import { nestedDialogLayer } from './dialogBackdrop';
export default function GlobalSearch({ onClose, onNavigate, onOpenEvent }) {
  const ref = useRef(null),
    follows = useFencerFollows();
  const [query, setQuery] = useState(''),
    [type, setType] = useState('all'),
    [lists, setLists] = useState({ items: [], failed: false, ready: false }),
    [fencers, setFencers] = useState({ items: [], failed: false }),
    [athlete, setAthlete] = useState(null),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  // Épreuves, pronostiqueurs et délégations : chargés une seule fois à l'ouverture, puis filtrés sur l'appareil.
  useEffect(() => {
    const c = new AbortController();
    (async () => {
      const result = await Promise.allSettled([
        API.get('/public/tournaments', { signal: c.signal }),
        API.get('/matches/leaderboard', { signal: c.signal }),
        API.get('/community/leagues', { signal: c.signal }),
      ]);
      if (c.signal.aborted) return;
      const data = result.map((r) => (r.status === 'fulfilled' ? r.value.data : null));
      setLists({
        ready: true,
        failed: result.some((r) => r.status === 'rejected'),
        items: [
          ...(Array.isArray(data[0]) ? data[0] : []).flatMap((t) =>
            (t.competitions || []).map((event) => ({
              kind: 'event',
              key: `e:${event.id}`,
              name: `${t.name} · ${event.name}`,
              detail: 'Épreuve',
              event,
              tournament: t,
            })),
          ),
          ...(Array.isArray(data[1]) ? data[1] : []).map((p) => ({
            kind: 'player',
            key: `p:${p.id || p.userId}`,
            name: p.name || p.username || '',
            detail: 'Pronostiqueur',
          })),
          ...(Array.isArray(data[2]) ? data[2] : []).map((l) => ({
            kind: 'delegation',
            key: `l:${l.id}`,
            name: l.name,
            detail: 'Délégation',
          })),
        ],
      });
    })();
    return () => c.abort();
  }, []);
  // Tireurs : l'annuaire est trop grand pour être chargé en entier, il reste interrogé à chaque recherche.
  useEffect(() => {
    const c = new AbortController();
    if (query.trim().length < 2) {
      setFencers({ items: [], failed: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await API.get('/me/fencers/directory', { params: { query }, signal: c.signal });
        if (c.signal.aborted) return;
        setFencers({
          failed: false,
          items: (data?.results || []).map((a) => ({
            kind: 'fencer',
            key: `f:${a.affiliationId || `${a.competitionId}:${a.id}`}`,
            name: a.name,
            detail: [a.country || 'Pays non renseigné', a.club, a.ageCategory].filter(Boolean).join(' · '),
            athlete: a,
          })),
        });
      } catch {
        if (!c.signal.aborted) setFencers({ items: [], failed: true });
      }
      if (!c.signal.aborted) setLoading(false);
    }, 350);
    return () => {
      c.abort();
      clearTimeout(timer);
    };
  }, [query]);
  const items = query.trim().length < 2 ? [] : [...fencers.items, ...lists.items];
  const error =
    query.trim().length >= 2 && (fencers.failed || lists.failed)
      ? 'Certains résultats sont indisponibles. Réessayez si nécessaire.'
      : '';
  const matches = items
    .filter(
      (item) =>
        (type === 'all' || item.kind === type) &&
        item.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')),
    )
    .slice(0, 30);
  const open = (item) => {
    if (item.kind === 'fencer') setAthlete(item.athlete);
    else {
      onClose();
      if (item.kind === 'event')
        onOpenEvent({ event: item.event, tournament: item.tournament, mode: 'follow', match: null });
      else onNavigate(item.kind === 'player' ? 'leaderboard' : 'community');
    }
  };
  const renderItem = (item) => (
    <li key={item.key}>
      <button className="button-link" onClick={() => open(item)}>
        <strong>{item.name}</strong>
        <small>{item.detail}</small>
      </button>
      {item.kind === 'fencer' && (
        <button
          className="button-secondary"
          disabled={follows?.busy || !!item.athlete.favoriteId}
          onClick={async () => {
            const a = item.athlete;
            const done = a.affiliationId
              ? await follows.followProfile(a.affiliationId)
              : await follows.follow(a.id, a.competitionId);
            if (done)
              setFencers((old) => ({
                ...old,
                items: old.items.map((x) =>
                  x.key === item.key ? { ...x, athlete: { ...x.athlete, favoriteId: true } } : x,
                ),
              }));
          }}
        >
          {item.athlete.favoriteId ? '★ Suivi' : '☆ Suivre'}
        </button>
      )}
    </li>
  );
  return (
    <dialog
      ref={ref}
      className="result-dialog ux-global-search"
      aria-labelledby="ux-search-title"
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (
          e.target === e.currentTarget &&
          nestedDialogLayer({ x: e.clientX, y: e.clientY }, e.currentTarget.getBoundingClientRect(), null) === 'page'
        )
          onClose();
      }}
    >
      <h2 id="ux-search-title">Rechercher dans l’application</h2>
      <label>
        Tireur, épreuve, joueur, délégation
        <input
          autoFocus
          type="search"
          placeholder="Au moins 2 lettres…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="filter-row">
        {[
          ['all', 'Tout'],
          ['fencer', 'Tireurs'],
          ['event', 'Épreuves'],
          ['player', 'Joueurs'],
          ['delegation', 'Délégations'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={type === id} onClick={() => setType(id)}>
            {label}
          </button>
        ))}
      </div>
      {loading && <p role="status">Recherche…</p>}
      {error && <p role="status">{error}</p>}
      {!loading && query.length >= 2 && !matches.length && <p>Aucun résultat.</p>}
      <ul>
        {groupSearchResults(matches).map((group) =>
          group.length === 1 ? (
            renderItem(group[0])
          ) : (
            <li key={`group:${group[0].key}`} className="ux-search-group">
              <details>
                <summary>
                  <strong>{group[0].name}</strong> · {group.length} fiches à distinguer
                </summary>
                <p className="muted">
                  Plusieurs identités portent ce nom. Vérifiez le pays, le club et la catégorie avant de suivre une
                  fiche.
                </p>
                <ul>{group.map(renderItem)}</ul>
              </details>
            </li>
          ),
        )}
      </ul>
      {athlete && (
        <FencerProfile
          name={athlete.name}
          parentDialog={ref}
          onPageBackdrop={onClose}
          onClose={() => setAthlete(null)}
        />
      )}
      <button className="button-secondary" onClick={onClose}>
        Fermer
      </button>
    </dialog>
  );
}

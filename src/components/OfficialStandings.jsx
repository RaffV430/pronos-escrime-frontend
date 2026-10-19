import { useEffect, useState } from 'react';
import API from '../api';
import './OfficialStandings.css';
const COLUMNS = { ratio: 'V/M', indicator: 'Indice', touches: 'TD', group: 'Groupe' };
const sourceLink = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      ['engarde-service.com', 'www.engarde-service.com', 'www.fencingtimelive.com'].includes(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
};
export default function OfficialStandings({ competitionId, dataOverride }) {
  const [data, setData] = useState(dataOverride || null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    setSelected('');
    setSearch('');
    setError('');
    setData(dataOverride || null);
    if (dataOverride || !competitionId) return;
    const controller = new AbortController();
    API.get(`/public/competitions/${competitionId}/standings`, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setData(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Classements officiels momentanément indisponibles.');
      });
    return () => controller.abort();
  }, [competitionId, dataOverride]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Chargement des classements officiels…</p>;
  const lists = data.standings || [];
  const current = lists.find((s) => s.key === selected) || lists[0];
  if (!current)
    return (
      <p>
        Aucun classement officiel consultable pour le moment. Le classement final et les classements intermédiaires
        seront proposés lorsqu’ils seront disponibles sur les sources prises en charge.
      </p>
    );
  const query = search
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
  const rows = current.rows.filter((r) =>
    `${r.name} ${r.club}`
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase()
      .includes(query),
  );
  const columns = Object.entries(COLUMNS).filter(([key]) => current.rows.some((r) => r.stats?.[key]));
  const source = sourceLink(current.sourceUrl);
  const checked = Date.parse(current.checkedAt);
  return (
    <section className="official-standings" aria-label="Classements sportifs officiels">
      <div className="official-standings-controls">
        <label>
          Étape du classement{' '}
          <select value={current.key} onChange={(e) => setSelected(e.target.value)}>
            {lists.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rechercher un tireur ou un club{' '}
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <h4>{current.label}</h4>
      <p className="muted">
        {current.kind === 'final'
          ? 'Classement final vérifié.'
          : 'Ordre publié sur le site officiel après ce tour ; ce n’est pas le classement final.'}{' '}
        {source && (
          <a href={source} target="_blank" rel="noreferrer">
            Source officielle
          </a>
        )}
        {Number.isFinite(checked) && <> · Consulté le {new Date(checked).toLocaleString('fr-FR')}</>}
      </p>
      {current.stale && (
        <p role="status">
          La source est momentanément indisponible. La dernière lecture vérifiée est affichée avec sa date.
        </p>
      )}
      {data.warnings?.length > 0 && (
        <p role="status">
          Certains classements intermédiaires n’ont pas pu être vérifiés. Réessayez plus tard ou consultez la source
          officielle.
        </p>
      )}
      <p>
        {rows.length} tireur{rows.length > 1 ? 's' : ''} affiché{rows.length > 1 ? 's' : ''}
        {query && ` sur ${current.rows.length}`}
      </p>
      <div className="official-standings-scroll" role="region" aria-label={current.label} tabIndex="0">
        <table>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Tireur</th>
              <th scope="col">Club / pays</th>
              {columns.map(([key, label]) => (
                <th scope="col" key={key}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.entryId}>
                <td>
                  {r.place}
                  {r.tied ? ' ex æquo' : ''}
                </td>
                <th scope="row">{r.name}</th>
                <td>{r.club || '—'}</td>
                {columns.map(([key]) => (
                  <td key={key}>{r.stats?.[key] || '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>Aucun tireur ne correspond à cette recherche.</p>}
    </section>
  );
}
export function StandingsDisclosure({ competitionId }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="official-standings-disclosure" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Consulter les classements officiels de l’épreuve et des tours de poules</summary>
      {open && <OfficialStandings competitionId={competitionId} />}
    </details>
  );
}

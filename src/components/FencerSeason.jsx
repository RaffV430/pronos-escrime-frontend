import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import API from '../api';
import { Competition } from './FencerProfile';
import { closeOnBackdrop } from './dialogBackdrop';
import { downloadSeasonCsv } from '../lib/fencerSeasonExport';
import './Results.css';

const bilan = (w, l) => `${w} V – ${l} D`;
const seasonLabel = (s) => (s === 'all' ? 'Toutes les saisons' : `Saison ${s.replace('-', '–')}`);

// Toutes les épreuves d'un tireur suivi, saison par saison, avec export tableur et impression / PDF.
export default function FencerSeason({ favorite, onClose }) {
  const ref = useRef(null);
  const [season, setSeason] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    setError('');
    API.get(`/me/fencers/${favorite.id}/season`, { params: season ? { season } : {}, signal: c.signal })
      .then(({ data }) => setData(data))
      .catch((e) => !c.signal.aborted && setError(e.response?.data?.error || 'Saison indisponible.'));
    return () => c.abort();
  }, [favorite.id, season]);
  const s = data?.summary;
  const print = () => {
    // Toutes les épreuves dépliées sur la version imprimée, puis remises comme avant.
    const closed = [...(ref.current?.querySelectorAll('details:not([open])') || [])];
    closed.forEach((d) => (d.open = true));
    document.body.classList.add('printing-season');
    const done = () => {
      closed.forEach((d) => (d.open = false));
      document.body.classList.remove('printing-season');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };
  return createPortal(
    <dialog
      ref={ref}
      className="result-dialog fencer-profile fencer-season"
      aria-labelledby="fencer-season-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      <h2 id="fencer-season-title">{favorite.name}</h2>
      {data?.seasons?.length > 0 && (
        <label className="fencer-season-picker">
          Saison
          <select value={data.season || ''} onChange={(e) => setSeason(e.target.value)}>
            {data.seasons.map((x) => (
              <option key={x} value={x}>
                {seasonLabel(x)}
              </option>
            ))}
            {data.seasons.length > 1 && <option value="all">Toutes les saisons</option>}
          </select>
        </label>
      )}
      {error && <p className="muted">{error}</p>}
      {!data && !error && <p className="muted">Chargement…</p>}
      {data && (
        <>
          {s.competitions ? (
            <div className="fencer-season-stats">
              <div>
                <strong>{s.competitions}</strong>
                <small>épreuve{s.competitions > 1 ? 's' : ''}</small>
              </div>
              <div>
                <strong>{bilan(s.poolWins, s.poolLosses)}</strong>
                <small>en poules</small>
              </div>
              <div>
                <strong>{bilan(s.tableauWins, s.tableauLosses)}</strong>
                <small>en tableau</small>
              </div>
              <div>
                <strong>{s.best?.label || '—'}</strong>
                <small>meilleur résultat{s.podiums ? ` · ${s.podiums} podium${s.podiums > 1 ? 's' : ''}` : ''}</small>
              </div>
            </div>
          ) : (
            <p className="muted">Aucune épreuve disputée retrouvée pour ce tireur dans les compétitions suivies.</p>
          )}
          {data.competitions.map((c, i) => (
            <Competition key={c.competitionId} c={c} open={i === 0} />
          ))}
          <p className="muted fencer-season-note">
            Compétitions suivies par Pronos Escrime uniquement. Le tireur est reconnu par son nom, sa nation et son club
            : un homonyme d’un autre club n’est pas mélangé.
          </p>
        </>
      )}
      <div className="fencer-season-actions">
        {data?.competitions?.length > 0 && (
          <>
            <button type="button" className="button-secondary" onClick={() => downloadSeasonCsv(data)}>
              Export tableur
            </button>
            <button type="button" className="button-secondary" onClick={print}>
              Imprimer / PDF
            </button>
          </>
        )}
        <button type="button" className="button-secondary" onClick={() => ref.current?.close()}>
          Fermer
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

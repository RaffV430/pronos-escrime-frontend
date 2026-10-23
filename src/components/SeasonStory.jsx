import { useEffect, useRef, useState } from 'react';
import { renderSeasonStory } from '../lib/seasonStory';
import { shareSocialCard } from '../lib/challengeCard';
import { closeOnBackdrop } from './dialogBackdrop';
export default function SeasonStory({ summary: source, onClose }) {
  const [summary] = useState(() => ({ ...source, values: [...source.values] }));
  const [card, setCard] = useState(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const dialog = useRef(null);
  const current = card;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    let active = true,
      url = null;
    renderSeasonStory(summary)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [summary]);
  const share = async () => {
    if (!current) return;
    try {
      const file = new File([current.blob], 'pronos-ma-progression.png', { type: 'image/png' });
      if ((await shareSocialCard(file, summary)) === 'download') {
        const a = document.createElement('a');
        a.href = current.url;
        a.download = file.name;
        a.click();
        setMessage('Partage indisponible sur ce navigateur : image téléchargée.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') setMessage('Partage indisponible. Vous pouvez télécharger l’image.');
    }
  };
  return (
    <dialog
      ref={dialog}
      className="result-dialog ux-challenge-dialog"
      aria-labelledby="season-story-title"
      onClick={closeOnBackdrop}
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="ux-challenge-heading">
        <h2 id="season-story-title">Partager ma progression</h2>
        <button
          className="button-link"
          aria-label="Fermer la carte de progression"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <p>Cette carte contient les points de l’étape choisie et votre pseudo. Vérifiez-la avant de la partager.</p>
      {!current && !error && <p role="status">Préparation de la carte…</p>}
      {error && <p role="alert">{error}</p>}
      {current && (
        <img
          src={current.url}
          className="ux-challenge-image"
          alt={`Ma progression : ${summary.total} points après ${summary.event}, ${summary.gain} points sur ce tournoi.`}
        />
      )}
      <p>
        Choisissez Instagram, WhatsApp ou une autre application dans le menu du téléphone. Le lien accompagne
        automatiquement l’image quand la destination le permet.
      </p>
      <div className="ux-challenge-actions">
        <button disabled={!current} onClick={share}>
          Partager la carte
        </button>
        {current && (
          <a className="button-secondary" href={current.url} download="pronos-ma-progression.png">
            Télécharger l’image
          </a>
        )}
      </div>
      {message && <p role="status">{message}</p>}
    </dialog>
  );
}

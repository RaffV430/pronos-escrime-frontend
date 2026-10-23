import { useEffect, useRef, useState } from 'react';
import { challengeFor, renderChallengeCard, shareSocialCard } from '../lib/challengeCard';
import { closeOnBackdrop } from './dialogBackdrop';
export default function ChallengeCard({ match: sourceMatch, prediction: sourcePrediction, onClose }) {
  const [snapshot] = useState(() => ({
    match: { ...sourceMatch },
    prediction: sourcePrediction ? { ...sourcePrediction } : null,
    pageUrl: location.href,
  }));
  const { match, prediction, pageUrl } = snapshot;
  const dialog = useRef(null),
    [card, setCard] = useState(null),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const [reveal, setReveal] = useState(false);
  const sharedPrediction = reveal ? prediction : null;
  const currentCard = card?.reveal === reveal ? card : null;
  const challenge = challengeFor(match, sharedPrediction, pageUrl, reveal);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    let active = true,
      url = null;
    renderChallengeCard(
      snapshot.match,
      reveal ? snapshot.prediction : null,
      challengeFor(snapshot.match, reveal ? snapshot.prediction : null, snapshot.pageUrl, reveal),
    )
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setCard({ url, blob, reveal });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [snapshot, reveal]);
  const share = async () => {
    if (!currentCard) return;
    const file = new File([currentCard.blob], `pronos-defi-${match.id}.png`, { type: 'image/png' });
    try {
      if ((await shareSocialCard(file, challenge)) === 'download') {
        const a = document.createElement('a');
        a.href = currentCard.url;
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
      aria-labelledby="ux-challenge-title"
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onClick={closeOnBackdrop}
    >
      <div className="ux-challenge-heading">
        <h2 id="ux-challenge-title">Défier un ami</h2>
        <button className="button-link" aria-label="Fermer la carte de défi" onClick={() => dialog.current?.close()}>
          ×
        </button>
      </div>
      {prediction && (
        <label>
          <input
            type="checkbox"
            checked={reveal}
            onChange={(e) => {
              setReveal(e.target.checked);
              setMessage('');
              setError('');
            }}
          />{' '}
          Afficher mon pronostic sur la carte et dans le message
        </label>
      )}
      {!currentCard && !error && <p role="status">Préparation de la carte…</p>}
      {error && <p role="alert">{error}</p>}
      {currentCard && (
        <img
          src={currentCard.url}
          className="ux-challenge-image"
          alt={`${match.player1} contre ${match.player2}. ${challenge.text}. Image non cliquable.`}
        />
      )}
      <p className="ux-challenge-text">{challenge.text}</p>
      <a className="ux-challenge-link" href={challenge.url}>
        Ouvrir le match →
      </a>
      <p className="muted">
        Choisissez Instagram, WhatsApp ou une autre application dans le menu du téléphone. Le lien accompagne
        automatiquement l’image quand la destination le permet.
      </p>
      <div className="ux-challenge-actions">
        <button disabled={!currentCard} onClick={share}>
          Partager la carte
        </button>
        {currentCard && (
          <a className="button-secondary" href={currentCard.url} download={`pronos-defi-${match.id}.png`}>
            Télécharger l’image
          </a>
        )}
      </div>
      {message && <p role="status">{message}</p>}
    </dialog>
  );
}

import { useEffect, useRef, useState } from 'react';
import { challengeFor, renderChallengeCard } from '../lib/challengeCard';
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
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${challenge.text}\n${challenge.url}`);
      setMessage('Défi et lien copiés.');
    } catch {
      setMessage('Copie indisponible. Le lien reste accessible ci-dessous.');
    }
  };
  const share = async () => {
    const file = currentCard && new File([currentCard.blob], `pronos-defi-${match.id}.png`, { type: 'image/png' });
    try {
      if (file && navigator.canShare?.({ files: [file] }))
        await navigator.share({ title: challenge.title, text: `${challenge.text}\n${challenge.url}`, files: [file] });
      else if (navigator.share)
        await navigator.share({ title: challenge.title, text: challenge.text, url: challenge.url });
      else await copy();
    } catch (e) {
      if (e.name !== 'AbortError') setMessage('Partage indisponible. Téléchargez la carte et copiez le lien.');
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
          alt={`${match.player1} contre ${match.player2}. ${challenge.text}. QR code vers le match.`}
        />
      )}
      <p className="ux-challenge-text">{challenge.text}</p>
      <a className="ux-challenge-link" href={challenge.url}>
        Ouvrir le match →
      </a>
      <p className="muted">
        Le lien accompagne la carte et se trouve aussi dans son QR code.
        {challenge.local && ' Dans cet aperçu local, il fonctionne uniquement sur cet ordinateur.'}
      </p>
      <div className="ux-challenge-actions">
        <button disabled={!currentCard} onClick={share}>
          Partager la carte
        </button>
        <button className="button-secondary" onClick={copy}>
          Copier le lien
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

import { useEffect, useRef, useState } from 'react';
import { challengeFor, renderChallengeCard, challengeSharePayload } from '../lib/challengeCard';
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
  const [channel, setChannel] = useState('instagram');
  const sharedPrediction = reveal ? prediction : null;
  const currentCard = card?.reveal === reveal && card?.channel === channel ? card : null;
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
      channel,
    )
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setCard({ url, blob, reveal, channel });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [snapshot, reveal, channel]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        channel === 'instagram' ? challenge.url : challengeSharePayload(challenge, null, channel, false).text,
      );
      setMessage('Défi et lien copiés.');
    } catch {
      setMessage('Copie indisponible. Le lien reste accessible ci-dessous.');
    }
  };
  const share = async () => {
    const file = currentCard && new File([currentCard.blob], `pronos-defi-${match.id}.png`, { type: 'image/png' });
    try {
      if (navigator.share) {
        await navigator.share(
          challengeSharePayload(challenge, file, channel, Boolean(file && navigator.canShare?.({ files: [file] }))),
        );
        setMessage('Partage ouvert. Vérifiez que le lien est bien joint dans l’application choisie.');
      } else await copy();
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
      <div className="ux-challenge-actions" aria-label="Destination du partage">
        <button
          className="button-secondary"
          aria-pressed={channel === 'instagram'}
          onClick={() => {
            setChannel('instagram');
            setMessage('');
            setError('');
          }}
        >
          Story Instagram
        </button>
        <button
          className="button-secondary"
          aria-pressed={channel === 'whatsapp'}
          onClick={() => {
            setChannel('whatsapp');
            setMessage('');
            setError('');
          }}
        >
          WhatsApp
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
        {channel === 'instagram'
          ? 'Téléchargez ou partagez la carte dans Instagram, puis ajoutez un sticker « Lien » dans la zone réservée et collez le lien du match. Une image seule n’est pas cliquable.'
          : 'Choisissez WhatsApp dans le menu de partage. Le lien est joint dans le texte ; vérifiez sa présence avant d’envoyer. Certaines applications ne conservent que l’image : copiez alors le texte ci-dessous.'}
        {challenge.local && ' Attention : lien local, inaccessible hors de votre réseau.'}
      </p>
      <label style={{ display: 'block' }}>
        Texte et lien à joindre
        <textarea
          readOnly
          rows={4}
          style={{ width: '100%' }}
          value={challengeSharePayload(challenge, null, channel, false).text}
        />
      </label>
      <div className="ux-challenge-actions">
        <button disabled={!currentCard} onClick={share}>
          Partager la carte
        </button>
        <button className="button-secondary" onClick={copy}>
          {channel === 'instagram' ? 'Copier le lien du sticker' : 'Copier le texte et le lien'}
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

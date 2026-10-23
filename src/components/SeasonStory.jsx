import { useEffect, useRef, useState } from 'react';
import { renderSeasonStory } from '../lib/seasonStory';
import { challengeSharePayload } from '../lib/challengeCard';
import { closeOnBackdrop } from './dialogBackdrop';
export default function SeasonStory({ summary: source, onClose }) {
  const [summary] = useState(() => ({ ...source, values: [...source.values] }));
  const [channel, setChannel] = useState('instagram');
  const [card, setCard] = useState(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const dialog = useRef(null);
  const current = card?.channel === channel ? card : null;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    let active = true,
      url = null;
    renderSeasonStory(summary, channel)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url, channel });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [summary, channel]);
  const text = challengeSharePayload(summary, null, channel, false).text;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(channel === 'instagram' ? summary.url : text);
      setMessage('Copié. Aucun message envoyé.');
    } catch {
      setMessage('Copie indisponible : sélectionnez le texte ci-dessous.');
    }
  };
  const share = async () => {
    if (!current) return;
    try {
      const file = new File([current.blob], 'pronos-ma-progression.png', { type: 'image/png' });
      if (navigator.share)
        await navigator.share(
          challengeSharePayload(summary, file, channel, Boolean(navigator.canShare?.({ files: [file] }))),
        );
      else await copy();
    } catch (e) {
      if (e.name !== 'AbortError') setMessage('Partage indisponible. Téléchargez la carte et copiez le lien.');
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
      <div className="ux-challenge-actions" aria-label="Destination du partage">
        {[
          ['instagram', 'Story Instagram'],
          ['whatsapp', 'WhatsApp'],
        ].map(([id, label]) => (
          <button
            key={id}
            className="button-secondary"
            aria-pressed={channel === id}
            onClick={() => {
              setChannel(id);
              setError('');
              setMessage('');
            }}
          >
            {label}
          </button>
        ))}
      </div>
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
        {channel === 'instagram'
          ? 'Ajoutez l’image dans Instagram, puis un sticker « Lien » dans la zone réservée avec le lien copié.'
          : 'Choisissez WhatsApp dans le menu de partage. Vérifiez que le texte et le lien accompagnent l’image ; sinon copiez-les ci-dessous.'}{' '}
        Une image seule n’est pas cliquable.
      </p>
      <label style={{ display: 'block' }}>
        Texte et lien à joindre
        <textarea readOnly rows={4} style={{ width: '100%' }} value={text} />
      </label>
      <p>Le lien ouvre l’accueil de l’app, jamais votre espace personnel.</p>
      <div className="ux-challenge-actions">
        <button disabled={!current} onClick={share}>
          Partager la carte
        </button>
        <button className="button-secondary" onClick={copy}>
          {channel === 'instagram' ? 'Copier le lien du sticker' : 'Copier le texte et le lien'}
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

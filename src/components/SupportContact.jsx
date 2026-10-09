import { useState, useRef, useEffect } from 'react';
import API from '../api';
export default function SupportContact({ onClose }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  return (
    <>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else onClose();
        }}
        aria-labelledby="support-title"
        className="feature-panel support-dialog"
      >
        <h2 id="support-title">Signaler un problème</h2>
        {sent ? (
          <p role="status">
            Votre message a été envoyé à support@pronos-escrime.fr. Nous vous répondrons à l’adresse de votre compte.
          </p>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              try {
                await API.post('/support', { subject, message });
                setSent(true);
              } catch (e) {
                setError(
                  e.response?.data?.error || 'Envoi impossible. Réessayez ou écrivez à support@pronos-escrime.fr.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              Décrivez le souci rencontré. Seuls votre message, votre pseudo et l’adresse e-mail de votre compte seront
              transmis au support.
            </p>
            <label>
              Objet
              <input
                required
                minLength={3}
                maxLength={120}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              Description
              <textarea
                required
                minLength={10}
                maxLength={5000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={busy}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button disabled={busy}>{busy ? 'Envoi en cours…' : 'Envoyer au support'}</button>
          </form>
        )}
        <button className="button-secondary" onClick={onClose} disabled={busy}>
          Fermer
        </button>
      </dialog>
    </>
  );
}

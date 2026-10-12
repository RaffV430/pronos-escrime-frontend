import { useState } from 'react';

// Confirmation dans la page (à la place de la fenêtre grise du navigateur) : un bandeau avec le texte,
// « Confirmer » et « Annuler », affiché à l'endroit de l'action.
export function useInlineConfirm() {
  const [pending, setPending] = useState(null);
  const ask = (text, action) => setPending({ text, action });
  const node = pending ? (
    <div className="inline-confirm" role="alertdialog" aria-label="Confirmation">
      <span>{pending.text}</span>
      <button
        autoFocus
        onClick={() => {
          const { action } = pending;
          setPending(null);
          action();
        }}
      >
        Confirmer
      </button>
      <button className="button-secondary" onClick={() => setPending(null)}>
        Annuler
      </button>
    </div>
  ) : null;
  return { ask, node, pending: Boolean(pending) };
}

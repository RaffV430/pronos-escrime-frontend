import { useState } from 'react';
import API from '../api';

// Bouton « Partager » : image du résultat d'un tournoi (rang, points, vainqueurs, scores exacts).
export default function ShareResult({ tournamentId, playerName }) {
  const [state, setState] = useState('');
  const share = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // ne pas replier le tournoi
    setState('busy');
    try {
      const [{ data }, { shareCard }] = await Promise.all([
        API.get(`/me/summary/${tournamentId}`),
        import('../lib/shareCard.js'),
      ]);
      const done = await shareCard(data, playerName);
      setState(done === 'downloaded' ? 'Image téléchargée.' : '');
    } catch {
      setState('Partage impossible. Réessayez.');
    }
  };
  return (
    <span className="share-result">
      <button type="button" className="button-secondary" onClick={share} disabled={state === 'busy'}>
        {state === 'busy' ? '…' : 'Partager'}
      </button>
      {state && state !== 'busy' && (
        <small role="status" onClick={(e) => e.stopPropagation()}>
          {state}
        </small>
      )}
    </span>
  );
}

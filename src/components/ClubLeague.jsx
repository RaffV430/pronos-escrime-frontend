import { useState } from 'react';
import API from '../api';
import { useClub } from '../lib/club';

// Ligue du club du tournoi : rejoindre en un clic (reconduit automatiquement pour les tournois suivants).
export default function ClubLeague({ tournamentId, onJoined }) {
  const club = useClub();
  const [state, setState] = useState({ busy: false, message: '' });
  const league = club.leagues.find((l) => l.tournamentId === tournamentId);
  if (!club.name || !league) return null;
  const join = async () => {
    setState({ busy: true, message: '' });
    try {
      const { data } = await API.post(`/community/club/${tournamentId}/join`);
      setState({ busy: false, message: data.message });
      club.reload();
      onJoined?.();
    } catch (e) {
      setState({ busy: false, message: e.response?.data?.error || 'Inscription impossible. Réessayez.' });
    }
  };
  return (
    <aside className="club-league">
      <strong>★ Ligue du club « {club.name} »</strong>
      {league.member ? (
        <p>Vous en faites partie : vos points comptent pour le club. Vous restez inscrit(e) aux tournois suivants.</p>
      ) : league.open ? (
        <>
          <p>Faites gagner le club : vos points du tournoi s’ajoutent à ceux des autres membres.</p>
          <button onClick={join} disabled={state.busy}>
            {state.busy ? 'Inscription…' : 'Rejoindre la ligue du club'}
          </button>
        </>
      ) : (
        <p>Les inscriptions sont closes pour ce tournoi.</p>
      )}
      {state.message && <p role="status">{state.message}</p>}
    </aside>
  );
}

import { useState } from 'react';
import API from '../api';
import { useClub } from '../lib/club';

// Club de l'application : le rejoindre en un clic ; on y reste d'un tournoi à l'autre.
export default function ClubLeague({ onJoined }) {
  const club = useClub();
  const [state, setState] = useState({ busy: false, message: '' });
  if (!club.name || !club.league || club.league.member) return null;
  const join = async () => {
    setState({ busy: true, message: '' });
    try {
      const { data } = await API.post('/community/club/join');
      setState({ busy: false, message: data.message });
      club.reload();
      onJoined?.();
    } catch (e) {
      setState({ busy: false, message: e.response?.data?.error || 'Inscription impossible. Réessayez.' });
    }
  };
  return (
    <aside className="club-league">
      <strong>★ Club « {club.name} »</strong>
      <p>Faites gagner le club : vos points comptent pour lui à chaque tournoi, sans vous réinscrire.</p>
      <button onClick={join} disabled={state.busy}>
        {state.busy ? 'Inscription…' : 'Rejoindre le club'}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </aside>
  );
}

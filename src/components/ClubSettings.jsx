import { useEffect, useState } from 'react';
import API from '../api';
import { useClub } from '../lib/club';

// Administration : nom du club et tireurs mis en avant (★ et filtre « Nos tireurs »).
export default function ClubSettings() {
  const club = useClub();
  const [name, setName] = useState('');
  const [fencers, setFencers] = useState('');
  const [state, setState] = useState({ busy: false, message: '', error: '' });
  useEffect(() => {
    const c = new AbortController();
    API.get('/admin/club', { signal: c.signal })
      .then(({ data }) => {
        setName(data.name || '');
        setFencers((data.fencers || []).join('\n'));
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  const save = async (e) => {
    e.preventDefault();
    setState({ busy: true, message: '', error: '' });
    try {
      const { data } = await API.put('/admin/club', { name, fencers: fencers.split('\n') });
      setFencers(data.fencers.join('\n'));
      setState({
        busy: false,
        error: '',
        message: `Enregistré : ${data.fencers.length} tireur${data.fencers.length > 1 ? 's' : ''}${
          data.leaguesCreated
            ? `, ${data.leaguesCreated} ligue${data.leaguesCreated > 1 ? 's' : ''} du club créée${data.leaguesCreated > 1 ? 's' : ''}`
            : ''
        }.`,
      });
      club.reload();
    } catch (err) {
      setState({ busy: false, message: '', error: err.response?.data?.error || 'Enregistrement impossible.' });
    }
  };
  return (
    <details className="feature-panel">
      <summary>Club et « Nos tireurs »</summary>
      <form onSubmit={save} className="form-grid">
        <label>
          Nom du club
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cercle des Escrimeurs Parisiens"
          />
        </label>
        <label>
          Tireurs du club (un par ligne, « NOM Prénom » comme sur FencingTimeLive)
          <textarea rows={8} value={fencers} onChange={(e) => setFencers(e.target.value)} />
        </label>
        <p className="muted">
          Les tireurs listés sont signalés par ★ sur les matchs et les poules, avec un filtre « Nos tireurs ». Une ligue
          du club est créée pour chaque tournoi dès que son horaire est connu ; ses membres sont reconduits d’un tournoi
          à l’autre.
        </p>
        <button disabled={state.busy}>{state.busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        {state.message && <p role="status">{state.message}</p>}
        {state.error && (
          <p role="alert" className="form-error">
            {state.error}
          </p>
        )}
      </form>
    </details>
  );
}

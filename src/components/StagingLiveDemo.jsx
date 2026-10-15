import { useEffect, useState } from 'react';
import API from '../api';
export default function StagingLiveDemo({ onOpen }) {
  const [info, setInfo] = useState(null),
    [message, setMessage] = useState(''),
    [small, setSmall] = useState(false);
  const active = API.defaults.baseURL === 'https://pronos-escrime-refonte-test.onrender.com/api';
  useEffect(() => {
    if (active)
      API.get('/staging/live-demo')
        .then((r) => setInfo(r.data))
        .catch(() => setMessage('Préparation des matchs de test…'));
  }, [active]);
  if (!active) return null;
  return (
    <aside
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 150,
        maxWidth: 340,
        padding: 12,
        background: '#fff8df',
        color: '#13213a',
        border: '2px solid #b7791f',
        borderRadius: 12,
        boxShadow: '0 4px 20px #0002',
      }}
    >
      <strong>MAQUETTE · Données fictives</strong>{' '}
      <button onClick={() => setSmall(!small)} className="button-link">
        {small ? 'Afficher' : 'Réduire'}
      </button>
      {!small && (
        <>
          <p>
            Live simulé, sans FTL ni envoi externe. TEST ALPHA–BETA est verrouillé ; TEST GAMMA–DELTA reste ouvert
            jusqu’à son démarrage.
          </p>
          <button disabled={!info?.competitionId} onClick={() => onOpen(info)}>
            Ouvrir les matchs de test
          </button>{' '}
          <button
            disabled={!info?.competitionId || info.secondStarted}
            onClick={async () => {
              try {
                await API.post('/staging/live-demo/start-second', {});
                setInfo({ ...info, secondStarted: true });
                setMessage('Live de Gamma–Delta démarré : son pronostic va se fermer.');
              } catch {
                setMessage('Démarrage indisponible.');
              }
            }}
          >
            Démarrer le live de Gamma–Delta
          </button>
          {message && <p role="status">{message}</p>}
        </>
      )}
    </aside>
  );
}

import { useEffect, useState } from 'react';
import { MODE_EVENT, dataMode, lowConnection, setDataMode } from '../lib/connectionQuality';

const CHOICES = [
  [
    'auto',
    'Automatique (recommandé)',
    'S’active tout seul quand la connexion est lente, et s’arrête quand elle redevient bonne.',
  ],
  ['on', 'Toujours', 'Affichage allégé en permanence sur cet appareil.'],
  ['off', 'Jamais', 'Affichage complet, même quand la connexion est lente.'],
];

// Mon compte › Mode connexion faible (réglage de cet appareil).
export default function DataModeSettings() {
  const [mode, setMode] = useState(dataMode);
  const [active, setActive] = useState(lowConnection);
  useEffect(() => {
    const update = () => {
      setMode(dataMode());
      setActive(lowConnection());
    };
    window.addEventListener(MODE_EVENT, update);
    return () => window.removeEventListener(MODE_EVENT, update);
  }, []);
  return (
    <details className="feature-panel data-mode-settings">
      <summary>Mode connexion faible {active ? '· actif' : ''}</summary>
      <p className="muted">
        Pour les salles mal couvertes : affichage allégé (liste des matchs, pas de polices ni d’animations, détails
        secondaires masqués), actualisation espacée, et pronostics gardés puis envoyés automatiquement si le réseau
        coupe.
      </p>
      <fieldset>
        <legend>Sur cet appareil</legend>
        {CHOICES.map(([id, label, hint]) => (
          <label className="check-row" key={id}>
            <input
              type="radio"
              name="data-mode"
              checked={mode === id}
              onChange={() => {
                setDataMode(id);
                setMode(id);
              }}
            />
            <span>
              {label} <small className="muted">{hint}</small>
            </span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}

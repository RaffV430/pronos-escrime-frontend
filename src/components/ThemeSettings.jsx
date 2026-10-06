import { useState } from 'react';
import { setTheme, storedTheme } from '../lib/theme';

const CHOICES = [
  ['auto', 'Automatique', 'suit le réglage du téléphone ou de l’ordinateur'],
  ['light', 'Clair', null],
  ['dark', 'Sombre', null],
];

// Apparence de l'application, mémorisée sur cet appareil.
export default function ThemeSettings() {
  const [theme, setChoice] = useState(storedTheme);
  return (
    <section aria-labelledby="theme-title">
      <h2 id="theme-title">Apparence</h2>
      <div className="theme-choices" role="radiogroup" aria-labelledby="theme-title">
        {CHOICES.map(([value, label, hint]) => (
          <label key={value} className={`theme-choice${theme === value ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => {
                setChoice(value);
                setTheme(value);
              }}
            />
            <span>
              <strong>{label}</strong>
              {hint && <small>{hint}</small>}
            </span>
          </label>
        ))}
      </div>
      <p className="muted">Ce choix est enregistré sur cet appareil.</p>
    </section>
  );
}

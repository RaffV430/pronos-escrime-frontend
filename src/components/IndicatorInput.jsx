import { useEffect, useRef } from 'react';
import { indicatorError, toggleSign } from '../lib/indicator.js';

// Champ d'indice avec bouton ± (placé après le champ : un <label> englobant cible ainsi le champ) : utilisable avec le clavier numérique Android (sans touche « - »).
export default function IndicatorInput({ value, onChange, minimum, maximum, disabled, label, placeholder, form }) {
  const input = useRef(null);
  useEffect(() => {
    input.current?.setCustomValidity(indicatorError(value, minimum, maximum));
  }, [value, minimum, maximum]);
  return (
    <span className="indicator-input">
      <input
        ref={input}
        form={form}
        aria-label={label ? `Indice de ${label}` : 'Indice'}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9+\-−–]/g, '').slice(0, 4))}
        disabled={disabled}
      />
      <button
        type="button"
        className="indicator-sign"
        aria-label={`Changer le signe de l’indice${label ? ` (${label})` : ''}`}
        title="Changer le signe (+/−)"
        disabled={disabled}
        onClick={() => {
          onChange(toggleSign(value));
          input.current?.focus();
        }}
      >
        ±
      </button>
    </span>
  );
}

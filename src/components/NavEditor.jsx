// Personnaliser la barre de navigation (aperçu de la refonte) : choisir 3 à 5 onglets et leur ordre.
import { useEffect, useRef, useState } from 'react';
import { NAV_CATALOG, NAV_DEFAULT, NAV_MAX, NAV_MIN } from '../lib/navPrefs';

const LABEL = Object.fromEntries(NAV_CATALOG);

export default function NavEditor({ value, onSave, onClose }) {
  const [list, setList] = useState(value);
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.showModal?.();
  }, []);
  const toggle = (id) =>
    setList((old) => (old.includes(id) ? old.filter((x) => x !== id) : old.length < NAV_MAX ? [...old, id] : old));
  const move = (id, step) =>
    setList((old) => {
      const i = old.indexOf(id);
      const j = i + step;
      if (i < 0 || j < 0 || j >= old.length) return old;
      const next = [...old];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const hidden = NAV_CATALOG.map(([id]) => id).filter((id) => !list.includes(id));
  return (
    <dialog ref={dialog} className="nav-editor" aria-labelledby="nav-editor-title" onClose={onClose}>
      <h2 id="nav-editor-title">Personnaliser la barre</h2>
      <p className="muted">
        Choisissez de {NAV_MIN} à {NAV_MAX} onglets et leur ordre. Les autres restent dans le menu de votre compte. Sur
        mobile, Accueil est au centre ; avec 4 onglets, un bouton « Plus » complète la barre.
      </p>
      <ol className="nav-editor-list" aria-label="Onglets affichés">
        {list.map((id, i) => (
          <li key={id} className={id === 'home' ? 'is-locked' : undefined}>
            <span className="nav-editor-rank">{i + 1}</span>
            <strong>
              {LABEL[id]}
              {id === 'home' && <small>Toujours là · au centre sur mobile</small>}
            </strong>
            <button
              type="button"
              className="button-secondary"
              aria-label={`Monter ${LABEL[id]}`}
              disabled={i <= 1}
              onClick={() => move(id, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="button-secondary"
              aria-label={`Descendre ${LABEL[id]}`}
              disabled={id === 'home' || i === list.length - 1}
              onClick={() => move(id, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="button-secondary nav-editor-remove"
              aria-label={`Retirer ${LABEL[id]}`}
              disabled={id === 'home' || list.length <= NAV_MIN}
              onClick={() => toggle(id)}
            >
              Retirer
            </button>
          </li>
        ))}
      </ol>
      {hidden.length > 0 && (
        <>
          <p className="nav-editor-subtitle">Dans le menu du compte</p>
          <ul className="nav-editor-hidden">
            {hidden.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={list.length >= NAV_MAX}
                  onClick={() => toggle(id)}
                >
                  + {LABEL[id]}
                </button>
              </li>
            ))}
          </ul>
          {list.length >= NAV_MAX && <p className="muted">Retirez un onglet pour en ajouter un autre.</p>}
        </>
      )}
      <div className="nav-editor-actions">
        <button type="button" className="button-secondary" onClick={() => setList(NAV_DEFAULT)}>
          Barre par défaut
        </button>
        <button type="button" className="button-secondary" onClick={onClose}>
          Annuler
        </button>
        <button type="button" onClick={() => onSave(list)}>
          Enregistrer
        </button>
      </div>
    </dialog>
  );
}

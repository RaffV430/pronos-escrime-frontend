// Personnaliser la barre de navigation (aperçu de la refonte) : choisir 3 à 5 onglets et leur ordre.
import { useEffect, useRef, useState } from 'react';
import { NAV_CATALOG, NAV_DEFAULT, NAV_MAX, NAV_MIN } from '../lib/navPrefs';
import { useI18n } from '../i18n/context';

export default function NavEditor({ value, onSave, onClose, catalog = NAV_CATALOG, defaults = NAV_DEFAULT }) {
  const { t } = useI18n();
  const LABEL = Object.fromEntries(catalog.map(([id]) => [id, t(`nav.${id}`)]));
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
  const hidden = catalog.map(([id]) => id).filter((id) => !list.includes(id));
  return (
    <dialog ref={dialog} className="nav-editor" aria-labelledby="nav-editor-title" onClose={onClose}>
      <h2 id="nav-editor-title">{t('navEditor.title')}</h2>
      <p className="muted">{t('navEditor.help', { min: NAV_MIN, max: NAV_MAX })}</p>
      <ol className="nav-editor-list" aria-label={t('navEditor.shown')}>
        {list.map((id, i) => (
          <li key={id} className={id === 'home' ? 'is-locked' : undefined}>
            <span className="nav-editor-rank">{i + 1}</span>
            <strong>
              {LABEL[id]}
              {id === 'home' && <small>{t('navEditor.homeLocked')}</small>}
            </strong>
            <button
              type="button"
              className="button-secondary"
              aria-label={t('navEditor.up', { label: LABEL[id] })}
              disabled={i <= 1}
              onClick={() => move(id, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="button-secondary"
              aria-label={t('navEditor.down', { label: LABEL[id] })}
              disabled={id === 'home' || i === list.length - 1}
              onClick={() => move(id, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="button-secondary nav-editor-remove"
              aria-label={t('navEditor.removeAria', { label: LABEL[id] })}
              disabled={id === 'home' || list.length <= NAV_MIN}
              onClick={() => toggle(id)}
            >
              {t('navEditor.remove')}
            </button>
          </li>
        ))}
      </ol>
      {hidden.length > 0 && (
        <>
          <p className="nav-editor-subtitle">{t('navEditor.inMenu')}</p>
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
          {list.length >= NAV_MAX && <p className="muted">{t('navEditor.full')}</p>}
        </>
      )}
      <div className="nav-editor-actions">
        <button type="button" className="button-secondary" onClick={() => setList(defaults)}>
          {t('navEditor.default')}
        </button>
        <button type="button" className="button-secondary" onClick={onClose}>
          {t('navEditor.cancel')}
        </button>
        <button type="button" onClick={() => onSave(list)}>
          {t('navEditor.save')}
        </button>
      </div>
    </dialog>
  );
}

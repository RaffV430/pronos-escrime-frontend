import { ADMIN_SECTIONS } from '../lib/adminSections';

export default function AdminNav({ section, onChange }) {
  const current = ADMIN_SECTIONS.find(([id]) => id === section) || ADMIN_SECTIONS[0];
  return (
    <section className="admin-hub" aria-labelledby="admin-hub-title">
      <h1 id="admin-hub-title">Administration</h1>
      <nav className="admin-hub-nav" aria-label="Rubriques d’administration">
        {ADMIN_SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={id === current[0] ? 'is-active' : ''}
            aria-pressed={id === current[0]}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <p className="admin-hub-intro">{current[2]}</p>
    </section>
  );
}

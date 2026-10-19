import { HUB_SECTIONS } from '../lib/nav2';

// Maquette navigation 2 : « Mon espace » réunit tout ce qui concerne le joueur, au même endroit.
const ICONS = {
  mine: '📋',
  season: '📈',
  me: '🤺',
  community: '👥',
  account: '⚙️',
  play: '🎯',
  live: '📡',
  leaderboard: '🏆',
};

export default function MySpace({ user, onNavigate, actions, others = [] }) {
  return (
    <section className="nav2-hub feature-panel" aria-labelledby="nav2-hub-title">
      <p className="arena-eyebrow">MON ESPACE</p>
      <h1 id="nav2-hub-title">{user.name || user.username}</h1>
      <ul className="nav2-hub-grid">
        {HUB_SECTIONS.map(([id, label, hint]) => (
          <li key={id}>
            <button type="button" onClick={() => onNavigate(id)}>
              <span className="nav2-hub-icon" aria-hidden="true">
                {ICONS[id]}
              </span>
              <strong>{label}</strong>
              <small>{hint}</small>
            </button>
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <>
          {/* Sections retirées de la barre du bas : jamais introuvables. */}
          <h2 className="nav2-hub-sub">Autres sections</h2>
          <ul className="nav2-hub-grid">
            {others.map(([id, label, hint]) => (
              <li key={id}>
                <button type="button" onClick={() => onNavigate(id)}>
                  <span className="nav2-hub-icon" aria-hidden="true">
                    {ICONS[id]}
                  </span>
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="nav2-hub-sub">Aide et réglages rapides</h2>
      <ul className="nav2-hub-links">
        {actions.map(([label, run, tone]) => (
          <li key={label}>
            <button type="button" className={tone === 'danger' ? 'nav2-danger' : undefined} onClick={run}>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Fil d'Ariane et raccourcis entre les sections de « Mon espace ».
export function HubTrail({ tab, onNavigate }) {
  return (
    <nav className="nav2-trail" aria-label="Mon espace">
      <button type="button" className="nav2-back" onClick={() => onNavigate('hub')}>
        ← Mon espace
      </button>
      <div className="nav2-chips">
        {HUB_SECTIONS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => onNavigate(id)}>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

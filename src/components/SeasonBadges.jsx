const LEVELS = ['', 'Niv. 1', 'Niv. 2', 'Niv. 3', 'Niv. 4'];
// Paliers d'un trophée : pastilles remplies jusqu'au niveau atteint.
function Pips({ level, max }) {
  return (
    <span className="badge-pips" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < level ? 'on' : ''} />
      ))}
    </span>
  );
}

// Trophées de la saison, à 4 niveaux : obtenus en couleur, à décrocher en grisé, progression vers le palier suivant.
export default function SeasonBadges({ badges }) {
  if (!badges?.length) return null;
  const earned = badges.filter((b) => b.count > 0).length;
  return (
    <section className="season-badges" aria-label="Mes trophées">
      <h2>
        Mes trophées{' '}
        <span className="muted">
          {earned} / {badges.length}
        </span>
      </h2>
      <ul>
        {badges.map((b) => (
          <li key={b.id} className={b.count > 0 ? 'badge earned' : 'badge locked'}>
            <span className="badge-icon" aria-hidden="true">
              {b.icon}
            </span>
            <div>
              <strong>
                {b.label}
                {b.level > 0 && <span className="badge-count"> {LEVELS[b.level] || `Niv. ${b.level}`}</span>}
              </strong>
              {b.maxLevel > 0 && <Pips level={b.level || 0} max={b.maxLevel} />}
              <small>{b.description}</small>
              {b.next != null && (
                <small className="badge-progress">
                  {b.level > 0 ? `Niveau ${b.level + 1}` : 'Progression'} : {b.value ?? 0} / {b.next}
                </small>
              )}
              {b.level > 0 && b.next == null && <small className="badge-progress">Niveau maximum atteint</small>}
              {b.count > 0 && b.where.length > 0 && <small className="badge-where">{b.where[0]}</small>}
              {b.count > 0 && b.where.length > 1 && (
                <details className="badge-more">
                  <summary>
                    et {b.where.length - 1} autre{b.where.length > 2 ? 's' : ''}
                  </summary>
                  <ul>
                    {b.where.slice(1).map((w, i) => (
                      <li key={i}>
                        <small>{w}</small>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {b.count === 0 && b.next == null && <small className="badge-where">À décrocher</small>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Trophées de la saison : obtenus en couleur, à décrocher en grisé.
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
                {b.count > 1 && <span className="badge-count"> ×{b.count}</span>}
              </strong>
              <small>{b.description}</small>
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
              {b.count === 0 && <small className="badge-where">À décrocher</small>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

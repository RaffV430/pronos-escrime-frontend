import { useEffect, useState } from 'react';

// This component deliberately has no API, account, ID or persistence dependency.
const names = ['DEMO Alice', 'DEMO Camille', 'DEMO Léa', 'DEMO Sarah'];
export default function TutorialPractice({ view }) {
  const [mode, setMode] = useState(view || 'pools');
  const [layout, setLayout] = useState('Cartes');
  const [filter, setFilter] = useState('Tous');
  const [saved, setSaved] = useState({});
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (view) setMode(view);
  }, [view]);
  const save = (e, key) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setSaved((previous) => ({ ...previous, [key]: values }));
    setNotice('Essai conservé dans cette démonstration uniquement. Aucun envoi au serveur.');
  };
  return (
    <section className="tutorial-practice" data-tutorial-practice aria-label="Mini-épreuve de démonstration">
      <div className="tutorial-practice-inner">
        <p className="eyebrow">DÉMONSTRATION · SUR CET APPAREIL</p>
        <section className="compact-event" aria-labelledby="event-choice">
          <h1 id="event-choice">Mini-tournoi fictif</h1>
          <p>Fleuret dames · 4 tireuses fictives</p>
          <label>
            Épreuve{' '}
            <select defaultValue="demo">
              <option value="demo">Fleuret dames — démonstration</option>
            </select>
          </label>
        </section>
        <nav className="secondary-nav" aria-label="Type de pronostic">
          {[
            ['pools', 'Poules'],
            ['tableau', 'Tableau'],
            ['podium', 'Podium'],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                setNotice('');
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <p role="status">{notice || 'Essayez librement : ces données disparaissent en quittant la mini-épreuve.'}</p>
        {mode === 'pools' && (
          <section className="pool-section" data-practice-pools>
            <h2>Pronostics de poules</h2>
            <p>Poule fictive · 4 tireuses · 3 assauts par tireuse</p>
            {names.map((name, i) => (
              <form key={name} onSubmit={(e) => save(e, `pool-${i}`)} className="tutorial-practice-card">
                <strong>{name}</strong>
                <div className="tutorial-practice-fields">
                  <label>
                    Victoires{' '}
                    <input
                      defaultValue={saved[`pool-${i}`]?.wins}
                      name="wins"
                      type="number"
                      min="0"
                      max="3"
                      required
                      aria-label={`Victoires de ${name}`}
                    />
                  </label>
                  <label>
                    Indice{' '}
                    <input
                      defaultValue={saved[`pool-${i}`]?.indicator}
                      name="indicator"
                      type="number"
                      min="-15"
                      max="15"
                      required
                      aria-label={`Indice de ${name}`}
                    />
                  </label>
                  <button>Enregistrer l’essai</button>
                </div>
                {saved[`pool-${i}`] && <small>Essai enregistré sur cet appareil</small>}
              </form>
            ))}
          </section>
        )}
        {mode === 'tableau' && (
          <section data-practice-tableau>
            <h2>Tableau fictif · demi-finales</h2>
            <nav className="secondary-nav" aria-label="Filtrer les matchs">
              {['Tous', 'Mes tireurs', 'À compléter'].map((label) => (
                <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)}>
                  {label}
                </button>
              ))}
            </nav>
            <nav className="secondary-nav" aria-label="Affichage">
              {['Cartes', 'Liste', 'Tableau complet'].map((label) => (
                <button key={label} aria-pressed={layout === label} onClick={() => setLayout(label)}>
                  {label}
                </button>
              ))}
            </nav>
            <div className={`tutorial-practice-matches ${layout === 'Liste' ? 'is-list' : ''}`}>
              {[0, 1]
                .filter((i) => filter !== 'Mes tireurs' || i === 0)
                .filter((i) => filter !== 'À compléter' || !saved[`match-${i}`])
                .map((i) => (
                  <form key={i} className="tutorial-practice-card" onSubmit={(e) => save(e, `match-${i}`)}>
                    <p>
                      Demi-finale {i + 1} · piste {i + 1}
                    </p>
                    {[i * 2, i * 2 + 1].map((n) => (
                      <label key={n}>
                        {n === 0 ? '★ ' : ''}
                        {names[n]}{' '}
                        <input
                          aria-label={`Score de ${names[n]}`}
                          defaultValue={saved[`match-${i}`]?.[`score${(n % 2) + 1}`]}
                          name={`score${(n % 2) + 1}`}
                          type="number"
                          min="0"
                          max="15"
                          required
                        />
                      </label>
                    ))}
                    <button>Enregistrer l’essai</button>
                    {saved[`match-${i}`] && <small>Essai enregistré sur cet appareil</small>}
                  </form>
                ))}
              {layout === 'Tableau complet' && (
                <div className="tutorial-practice-card">
                  <h3>Finale</h3>
                  <p>Vainqueur de la demi-finale 1</p>
                  <p>Vainqueur de la demi-finale 2</p>
                  <small>Illustration du tour suivant</small>
                </div>
              )}
            </div>
          </section>
        )}
        {mode === 'podium' && (
          <section data-practice-podium>
            <h2>Pronostic de podium</h2>
            <form className="tutorial-practice-card" onSubmit={(e) => save(e, 'podium')}>
              {['Or', 'Argent', 'Bronze 1', 'Bronze 2'].map((label) => (
                <label key={label}>
                  {label}
                  <select name={label} required defaultValue={saved.podium?.[label] || ''}>
                    <option value="" disabled>
                      Choisir une tireuse
                    </option>
                    {names.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
              ))}
              <button>Enregistrer l’essai</button>
              {saved.podium && <small>Essai enregistré sur cet appareil</small>}
            </form>
          </section>
        )}
      </div>
    </section>
  );
}

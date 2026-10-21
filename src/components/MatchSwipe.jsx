import { useEffect, useRef, useState } from 'react';
import FencerProfile from './FencerProfile';
import { roundLabel } from './matchPresentation';
import { swipeSide } from '../lib/matchSwipe';
import './match-swipe.css';

export default function MatchSwipe({ matches, competitionId, ready, busy, onPick, onTableau }) {
  const [skipped, setSkipped] = useState([]);
  const [profile, setProfile] = useState(null);
  const [moving, setMoving] = useState(false);
  const [exiting, setExiting] = useState(null);
  const [note, setNote] = useState('');
  const card = useRef(null),
    gesture = useRef(null),
    dragged = useRef(false),
    timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const available = matches.filter((m) => !skipped.includes(m.id));
  const match = exiting || available[0],
    next = available.find((m) => m.id !== match?.id);
  const reset = () => {
    gesture.current = null;
    const el = card.current;
    if (!el) return;
    el.classList.remove('is-dragging', 'is-leaving', 'intent-left', 'intent-right');
    el.style.transform = '';
    el.style.removeProperty('--intent');
  };
  const choose = (side) => {
    if (!match || !ready || busy || moving) return;
    // Persist synchronously through the existing express path BEFORE the animation.
    // Closure is checked again by MatchBoard and then by the server.
    const accepted = onPick(match, side);
    if (accepted === false) {
      reset();
      setNote('Choix non enregistré. Consultez le message de sauvegarde et réessayez.');
      return;
    }
    setExiting(match);
    setNote(`${match[`player${side}`]} choisi. Vérifiez l’état d’enregistrement ci-dessous.`);
    setMoving(true);
    if (card.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.current.classList.add('is-leaving', side === 1 ? 'intent-left' : 'intent-right');
      card.current.style.transform = `translate3d(${(side === 1 ? -1 : 1) * 700}px,0,0) rotate(${side === 1 ? -20 : 20}deg)`;
    }
    timer.current = setTimeout(() => {
      setMoving(false);
      setExiting(null);
      reset();
    }, 300);
  };
  return (
    <section className="match-swipe" aria-label="Pronostic rapide par swipe">
      <p className="muted">Glissez vers votre vainqueur. Touchez son nom pour consulter son parcours.</p>
      {match ? (
        <>
          <p className="swipe-count">
            {available.length} rencontre{available.length > 1 ? 's' : ''} disponible{available.length > 1 ? 's' : ''} ·{' '}
            {roundLabel(match.round)}
          </p>
          <div className="swipe-viewport">
            <div className="swipe-stack">
              <div className="swipe-behind" aria-hidden="true">
                {next ? `${next.player1} / ${next.player2}` : 'Compléter les scores dans le tableau'}
              </div>
              <article
                key={match.id}
                ref={card}
                className="swipe-front"
                aria-label={`${match.player1} contre ${match.player2}`}
                onPointerDown={(e) => {
                  if (!ready || busy || moving || e.button > 0) return;
                  dragged.current = false;
                  gesture.current = { x: e.clientX, y: e.clientY, at: performance.now() };
                }}
                onPointerMove={(e) => {
                  const start = gesture.current;
                  if (!start) return;
                  const x = e.clientX - start.x,
                    y = e.clientY - start.y;
                  if (!dragged.current && Math.abs(y) > Math.abs(x) && Math.abs(y) > 10) {
                    reset();
                    return;
                  }
                  if (Math.abs(x) < 9) return;
                  dragged.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  e.currentTarget.classList.add('is-dragging');
                  e.currentTarget.classList.toggle('intent-left', x < 0);
                  e.currentTarget.classList.toggle('intent-right', x > 0);
                  e.currentTarget.style.setProperty('--intent', Math.min(1, Math.abs(x) / 85));
                  e.currentTarget.style.transform = `translate3d(${x * 0.88}px,0,0) rotate(${Math.max(-11, Math.min(11, x / 24))}deg)`;
                }}
                onPointerUp={(e) => {
                  const start = gesture.current;
                  if (!start) return;
                  const side = swipeSide({
                    x: e.clientX - start.x,
                    y: e.clientY - start.y,
                    elapsed: performance.now() - start.at,
                    width: e.currentTarget.clientWidth,
                  });
                  reset();
                  if (side) choose(side);
                }}
                onPointerCancel={reset}
              >
                <div className="swipe-choice left" aria-hidden="true">
                  ← {match.player1} gagne
                </div>
                <div className="swipe-choice right" aria-hidden="true">
                  {match.player2} gagne →
                </div>
                <div className="swipe-fencers">
                  {[1, 2].map((side) => (
                    <button
                      key={side}
                      type="button"
                      className={`swipe-fencer side-${side}`}
                      aria-label={`Parcours de ${match[`player${side}`]}`}
                      onClick={() => {
                        if (!dragged.current && !moving)
                          setProfile({ name: match[`player${side}`], matchId: match.id });
                      }}
                    >
                      {match[`seed${side}`] != null && (
                        <small className="match-seed" aria-label={`Entrée ${match[`seed${side}`]}`}>
                          {match[`seed${side}`]}
                        </small>
                      )}
                      <strong>{match[`player${side}`]}</strong>
                      <small>{match[`country${side}`] || 'Voir le parcours'}</small>
                    </button>
                  ))}
                </div>
                <p className="muted">← Gauche · Vainqueur · Droite →</p>
              </article>
            </div>
          </div>
          <div className="swipe-controls">
            <button
              type="button"
              className="button-secondary"
              disabled={!ready || busy || moving}
              onClick={() => choose(1)}
            >
              ← Choisir à gauche
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={!ready || busy || moving}
              onClick={() => choose(2)}
            >
              Choisir à droite →
            </button>
          </div>
          <button
            type="button"
            className="button-secondary"
            disabled={moving}
            onClick={() => setSkipped((old) => [...old, match.id])}
          >
            Passer cette rencontre
          </button>
        </>
      ) : (
        <div className="swipe-finished">
          <h3>Plus de rencontre à choisir</h3>
          <p>Retrouvez vos pronostics dans le tableau pour compléter les scores des perdants.</p>
          <button type="button" onClick={onTableau}>
            Compléter les scores dans le tableau →
          </button>
          {skipped.length > 0 && (
            <button type="button" className="button-secondary" onClick={() => setSkipped([])}>
              Revoir les rencontres passées
            </button>
          )}
        </div>
      )}
      <p role="status">{note}</p>
      {profile && (
        <FencerProfile {...profile} competitionId={competitionId} currentOnly onClose={() => setProfile(null)} />
      )}
    </section>
  );
}

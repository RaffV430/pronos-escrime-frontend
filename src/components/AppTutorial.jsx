import { useEffect, useRef, useState } from 'react';
import TutorialPractice from './TutorialPractice';
import { TUTORIAL_STEPS, tutorialKey } from '../lib/tutorial';
export default function AppTutorial({ userId, request, onNavigate, skipAutomatic = false }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const card = useRef(null);
  const navigate = useRef(onNavigate);
  useEffect(() => {
    navigate.current = onNavigate;
  }, [onNavigate]);
  useEffect(() => {
    let seen;
    try {
      seen = localStorage.getItem(tutorialKey(userId)) === 'done';
    } catch {
      seen = true;
    }
    if (request || (!seen && !skipAutomatic)) {
      setStep(0);
      setOpen(true);
    }
  }, [userId, request, skipAutomatic]);
  useEffect(() => {
    if (!open) return;
    const current = TUTORIAL_STEPS[step];
    if (current.tab !== 'play') navigate.current(current);
    let target = null;
    let details = null;
    let originallyOpen = false;
    const update = () => {
      const next = document.querySelector(
        current.tab === 'play'
          ? `[data-tutorial-practice] ${current.target
              .split(',')
              .map((selector) => selector.trim())
              .join(', [data-tutorial-practice] ')}`
          : current.target,
      );
      if (next && target !== next) {
        target = next;
        details = next.closest('details');
        if (details) {
          originallyOpen = details.open;
          details.open = true;
        }
        next.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      if (!target?.isConnected) {
        setBox(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setBox(
        rect.width && rect.height
          ? { top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }
          : null,
      );
    };
    const observer = new MutationObserver(update);
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
    const sizes = new ResizeObserver(update);
    sizes.observe(document.getElementById('root'));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    card.current?.focus({ preventScroll: true });
    return () => {
      observer.disconnect();
      sizes.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      if (details) details.open = originallyOpen;
    };
  }, [open, step]);
  useEffect(() => {
    if (!open || TUTORIAL_STEPS[step].tab !== 'play') return;
    const practice = document.querySelector('[data-tutorial-practice]');
    const siblings = [...(practice?.parentElement.children || [])].filter(
      (element) => !element.matches('.tutorial-practice, .tutorial-guide, .tutorial-spotlight'),
    );
    const previous = siblings.map((element) => element.inert);
    siblings.forEach((element) => {
      element.inert = true;
    });
    return () =>
      siblings.forEach((element, i) => {
        element.inert = previous[i];
      });
  }, [open, step]);
  const close = () => {
    try {
      localStorage.setItem(tutorialKey(userId), 'done');
    } catch {
      /* Optional storage. */
    }
    setOpen(false);
  };
  if (!open) return null;
  const current = TUTORIAL_STEPS[step];
  return (
    <>
      {current.tab === 'play' && <TutorialPractice view={current.view} />}
      {box && <div className="tutorial-spotlight" style={box} aria-hidden="true" />}
      <section
        ref={card}
        tabIndex={-1}
        role="region"
        aria-label="Visite guidée"
        className="tutorial-guide"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
      >
        <header>
          <span className="muted">
            Étape {step + 1} sur {TUTORIAL_STEPS.length}
          </span>
          <button className="button-link" onClick={close}>
            Passer le tutoriel
          </button>
        </header>
        <h2>{current.title}</h2>
        <p>{current.text}</p>
        {!box && (
          <p className="muted">
            Cette zone apparaît lorsque les données correspondantes sont disponibles. Vous pouvez poursuivre la visite.
          </p>
        )}
        <p className="muted">
          {current.tab === 'play'
            ? 'Vos essais restent sur cet appareil pendant cette visite. Aucun pronostic réel n’est enregistré.'
            : 'Vous pouvez utiliser la zone mise en évidence. La visite ne remplit ni n’enregistre rien à votre place.'}
        </p>
        <footer>
          <button className="button-secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Précédent
          </button>
          <button onClick={() => (step === TUTORIAL_STEPS.length - 1 ? close() : setStep((s) => s + 1))}>
            {step === TUTORIAL_STEPS.length - 1 ? 'Terminer' : 'Suivant'}
          </button>
        </footer>
      </section>
    </>
  );
}

// Mode « connexion faible » : choisi par le joueur (toujours / jamais) ou automatique (par défaut).
// En automatique, il s'active quand le téléphone signale un réseau lent, ou quand les réponses du serveur
// deviennent lentes ou échouent ; il se désactive tout seul quand la connexion redevient correcte.
export const MODE_KEY = 'pronos:data-mode';
const LEGACY_KEY = 'pronos:reduced-data';
const AUTO_KEY = 'pronos:auto-slow';
export const MODE_EVENT = 'pronos:data-mode';

const SLOW_MS = 3000; // réponse lente
const FAST_MS = 1200; // réponse rapide
const WINDOW = 6; // nombre de mesures prises en compte pour s'activer
const RECOVER = 6; // réponses rapides d'affilée pour se désactiver
const FAILURES = 3; // coupures récentes qui suffisent à s'activer
const FAILURE_WINDOW = 3 * 60000;
const HOLD = 5 * 60000; // durée minimale d'activation automatique (pas de clignotement)

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const read = (key) => {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    if (value === null) storage()?.removeItem(key);
    else storage()?.setItem(key, value);
  } catch {
    /* Stockage indisponible : le mode reste valable pour cette page. */
  }
};

// Choix du joueur : 'auto' (par défaut), 'on' ou 'off'. L'ancien interrupteur « true » vaut « toujours ».
export function dataMode() {
  const mode = read(MODE_KEY);
  if (mode === 'on' || mode === 'off' || mode === 'auto') return mode;
  return read(LEGACY_KEY) === 'true' ? 'on' : 'auto';
}

// Le téléphone annonce un réseau lent ou l'économiseur de données (Android, Chrome ; absent sur iPhone).
export function networkHint(connection = typeof navigator !== 'undefined' ? navigator.connection : null) {
  if (!connection) return false;
  return Boolean(
    connection.saveData ||
    ['slow-2g', '2g'].includes(connection.effectiveType) ||
    (Number.isFinite(connection.downlink) && connection.downlink > 0 && connection.downlink < 0.4) ||
    (Number.isFinite(connection.rtt) && connection.rtt >= 1200),
  );
}

// Mesures des échanges avec le serveur (durées et coupures), partagées par toute l'application.
export function createDetector(now = () => Date.now()) {
  let samples = [];
  let failures = [];
  let fastStreak = 0;
  let active = false;
  let since = 0;
  const restore = () => {
    try {
      const saved = JSON.parse(read(AUTO_KEY) || 'null');
      if (saved?.on && now() - saved.at < 30 * 60000) {
        active = true;
        since = saved.at;
      }
    } catch {
      /* Rien à reprendre. */
    }
  };
  restore();
  const persist = () => write(AUTO_KEY, active ? JSON.stringify({ on: true, at: since }) : null);
  const median = (list) => {
    const sorted = [...list].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  function evaluate() {
    const t = now();
    failures = failures.filter((f) => t - f < FAILURE_WINDOW);
    const slow = (samples.length >= WINDOW && median(samples.slice(-WINDOW)) >= SLOW_MS) || failures.length >= FAILURES;
    if (!active && slow) {
      active = true;
      since = t;
      fastStreak = 0;
      persist();
      return true;
    }
    if (active && fastStreak >= RECOVER && !failures.length && t - since >= HOLD) {
      active = false;
      samples = [];
      persist();
      return true;
    }
    return false;
  }
  return {
    // Durée d'une réponse du serveur ; renvoie true si l'état automatique a changé.
    record(ms) {
      samples = [...samples.slice(-(WINDOW * 2)), ms];
      fastStreak = ms <= FAST_MS ? fastStreak + 1 : 0;
      return evaluate();
    },
    // Coupure (pas de réponse, délai dépassé).
    fail() {
      failures.push(now());
      fastStreak = 0;
      return evaluate();
    },
    active: () => active,
    reset() {
      samples = [];
      failures = [];
      fastStreak = 0;
      active = false;
      persist();
    },
  };
}

export const detector = typeof window !== 'undefined' ? createDetector() : null;

// Mode connexion faible en vigueur maintenant.
export function lowConnection() {
  const mode = dataMode();
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return networkHint() || Boolean(detector?.active());
}
// Activé par le joueur, ou détecté automatiquement (pour l'afficher et proposer de le désactiver).
export const lowConnectionReason = () => (dataMode() === 'on' ? 'manual' : lowConnection() ? 'auto' : null);

export function applyMode() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reduced-data', lowConnection());
  window.dispatchEvent(new Event(MODE_EVENT));
}
export function setDataMode(mode) {
  write(MODE_KEY, mode === 'auto' ? null : mode);
  write(LEGACY_KEY, null);
  if (mode !== 'on') detector?.reset();
  applyMode();
}

// Branché sur le client HTTP : chaque réponse réelle du serveur (hors copie locale) est mesurée.
export function observe(start, { failed = false, fromCache = false } = {}) {
  if (!detector || fromCache || dataMode() !== 'auto') return;
  const before = lowConnection();
  if (failed) detector.fail();
  else detector.record(Date.now() - start);
  if (lowConnection() !== before) applyMode();
}

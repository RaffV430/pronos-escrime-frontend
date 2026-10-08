const KEY = 'pronos:reading-position';
const route = () => location.pathname + location.search;

export function rememberReadingPosition() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ route: route(), x: window.scrollX, y: window.scrollY, at: Date.now() }));
  } catch { /* Reload remains available when storage is blocked. */ }
}

export function validReadingPosition(value, currentRoute, now = Date.now()) {
  return value?.route === currentRoute && Number.isFinite(value.x) && value.x >= 0 &&
    Number.isFinite(value.y) && value.y >= 0 && Number.isFinite(value.at) &&
    now >= value.at && now - value.at < 120000;
}

export function restoreReadingPosition() {
  let saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    sessionStorage.removeItem(KEY);
  } catch { return; }
  if (!validReadingPosition(saved, route())) return;
  const initialRoute = route();
  const previous = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  let timer;
  const stop = () => {
    observer.disconnect();
    clearTimeout(timer);
    history.scrollRestoration = previous;
    for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) window.removeEventListener(type, stop);
  };
  const restore = () => {
    if (route() !== initialRoute) { stop(); return; }
    // Wait for asynchronously loaded content to reach the saved position.
    if (document.documentElement.scrollHeight < saved.y + window.innerHeight) return;
    window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
    stop();
  };
  const observer = new ResizeObserver(restore);
  observer.observe(document.documentElement);
  timer = setTimeout(stop, 15000);
  for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) window.addEventListener(type, stop, { once: true, passive: true });
  restore();
}

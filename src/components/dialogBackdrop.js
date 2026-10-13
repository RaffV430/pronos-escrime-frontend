// Fenêtre de résultat : sur ordinateur (souris, trackpad), un clic à côté de la fenêtre la ferme comme
// « Fermer ». Sur écran tactile, seul le bouton ferme : un appui accidentel est plus probable.
export function closeOnBackdrop(e) {
  const dialog = e.currentTarget;
  if (e.target !== dialog || !window.matchMedia?.('(pointer: fine)').matches) return;
  const r = dialog.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) dialog.close();
}
// Détermine la fenêtre visée sans laisser le clic traverser les fenêtres modales.
export function nestedDialogLayer(point, child, parent) {
  const inside = (r) => point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom;
  return inside(child) ? 'child' : parent && inside(parent) ? 'parent' : 'page';
}

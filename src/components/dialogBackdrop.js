// Fenêtre de résultat : sur ordinateur (souris, trackpad), un clic à côté de la fenêtre la ferme comme
// « Fermer ». Sur écran tactile, seul le bouton ferme : un appui accidentel est plus probable.
export function closeOnBackdrop(e) {
  const dialog = e.currentTarget;
  if (e.target !== dialog || !window.matchMedia?.('(pointer: fine)').matches) return;
  const r = dialog.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) dialog.close();
}

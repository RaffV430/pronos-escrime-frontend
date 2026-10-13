// « PETERS Peer Uwe » → « PETERS P. » ; « LEZHAVA NIKOLOZ » → « LEZHAVA N. » (nom de famille en capitales).
export const shortName = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  const isSurname = (p) => /^[A-ZÀ-ÖØ-Þ'’-]{2,}$/.test(p);
  let cut = parts.findIndex((p) => !isSurname(p));
  if (cut <= 0) cut = parts.length - 1; // tout en capitales : le dernier mot est le prénom
  return `${parts.slice(0, cut).join(' ')} ${parts[cut][0].toUpperCase()}.`;
};

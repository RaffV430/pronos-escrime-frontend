// Export tableur (CSV, séparateur « ; » pour Excel en français) de la saison d'un tireur.
const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const day = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');
const signed = (n) => (n == null ? '' : n > 0 ? `+${n}` : String(n));

export function seasonRows(data) {
  const rows = [['Date', 'Tournoi', 'Épreuve', 'Phase', 'Adversaire', 'Résultat', 'Score', 'Bilan', 'Place']];
  for (const c of data.competitions || []) {
    const base = [day(c.date), c.tournament || '', c.competition || ''];
    for (const p of c.pools || []) {
      rows.push([
        ...base,
        p.pool,
        '',
        '',
        '',
        p.wins == null ? '' : `${p.wins} V - ${p.losses} D, indice ${signed(p.indicator)}`,
        p.place ? `${p.place}/${p.size}` : '',
      ]);
      for (const b of p.bouts || [])
        rows.push([
          ...base,
          p.pool,
          b.opponent,
          b.won ? 'V' : 'D',
          b.given != null && b.received != null ? `${b.given}-${b.received}` : '',
          '',
          '',
        ]);
    }
    for (const m of c.tableau || [])
      rows.push([
        ...base,
        m.round,
        m.opponent,
        m.won ? 'V' : 'D',
        m.medical ? 'abandon' : m.score ? `${m.score[0]}-${m.score[1]}` : '',
        '',
        '',
      ]);
    if (c.result) rows.push([...base, 'Classement final', '', '', '', '', c.result.label]);
  }
  return rows;
}

export const seasonCsv = (data) =>
  '﻿' +
  seasonRows(data)
    .map((r) => r.map(cell).join(';'))
    .join('\r\n');

export function downloadSeasonCsv(data) {
  const blob = new Blob([seasonCsv(data)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const who = (data.favorite?.name || 'tireur').replace(/[^\p{L}\p{N}]+/gu, '-');
  a.download = `${who}-${data.season === 'all' ? 'toutes-saisons' : data.season || 'saison'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

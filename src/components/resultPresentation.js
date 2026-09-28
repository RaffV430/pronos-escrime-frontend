import { roundLabel } from './matchPresentation.js';
export const APP_URL = 'https://pronos-escrime.vercel.app/';
// Points d'un pronostic de match : barème + bonus outsider éventuel.
export const matchTotal = (p) => (p?.pointsEarned ?? 0) + (p?.bonusPoints ?? 0);
export const plural = (n, singular, multiple = `${singular}s`) => (Number(n) > 1 ? multiple : singular);
export const roundStatus = (round, complete) =>
  !complete ? 'En cours' : round === 'T4' ? 'Terminées' : round === 'T2' ? 'Terminée' : 'Terminé';
export const filterPredictionRows = (rows, status, round) =>
  rows.filter((r) => (!round || r.round === round) && (status === 'Tous' || r.status === status));
export function sharePayload(summary, file) {
  return {
    files: [file],
    title: 'Mon bilan Pronos Escrime',
    text: `${summary.tournamentName} — ${summary.ranking?.totalPoints || 0} ${plural(summary.ranking?.totalPoints || 0, 'point')}. Retrouvez-moi sur Pronos Escrime !`,
    url: APP_URL,
  };
}
export function drawResultCard(ctx, summary, date = new Date()) {
  const W = 1080,
    H = 1120,
    p = summary.ranking?.totalPoints || 0;
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, '#102c4c');
  gradient.addColorStop(1, '#204f82');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  const text = (value, x, y, size = 30, color = '#fff', weight = 500) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.fillText(String(value), x, y);
  };
  const wrap = (value, y, size, maxLines = 2) => {
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    const words = String(value).split(/\s+/);
    let line = '',
      lines = [];
    for (const word of words) {
      if (ctx.measureText(line + word).width > 944 && line) {
        lines.push(line.trim());
        line = '';
      }
      line += word + ' ';
    }
    if (line) lines.push(line.trim());
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (ctx.measureText(last + '…').width > 944) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    for (const row of lines) {
      text(row, 68, y, size, '#fff', 700);
      y += size * 1.3;
    }
    return y;
  };
  text('PRONOS ESCRIME', 68, 85, 28, '#a9c9ff', 750);
  text(summary.complete ? 'BILAN FINAL' : 'BILAN PROVISOIRE', 68, 143, 22, '#a9c9ff');
  wrap(summary.tournamentName, 208, 35);
  wrap(summary.ranking?.name || 'Mon bilan', 328, 42, 1);
  text(p, 68, 484, 112, '#fff', 800);
  text(plural(p, 'point'), 68, 535, 28, '#c3d7ee');
  text(`${summary.ranking?.rank || '—'} / ${summary.players}`, 620, 469, 62, '#fff', 750);
  text('AU CLASSEMENT', 620, 522, 22, '#c3d7ee');
  ctx.fillStyle = '#ffffff18';
  ctx.fillRect(68, 590, 944, 2);
  text(summary.exact || 0, 68, 694, 58, '#fff', 750);
  text(plural(summary.exact, 'score exact', 'scores exacts'), 68, 740, 25, '#c3d7ee');
  text(`${summary.accuracy ?? 0} %`, 620, 694, 58, '#fff', 750);
  text('de vainqueurs trouvés', 620, 740, 25, '#c3d7ee');
  if (summary.bestRound) {
    text('MEILLEUR TOUR', 68, 832, 20, '#a9c9ff');
    text(
      `${roundLabel(summary.bestRound.round)} · ${summary.bestRound.points} ${plural(summary.bestRound.points, 'point')}`,
      68,
      883,
      31,
    );
  }
  text('À votre tour de pronostiquer !', 68, 986, 30, '#fff', 700);
  text('pronos-escrime.vercel.app', 68, 1031, 26, '#a9c9ff');
  text(date.toLocaleDateString('fr-FR'), 68, 1080, 20, '#c3d7ee');
}

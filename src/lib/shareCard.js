// Image de résultat à partager (WhatsApp, Instagram…), dessinée sur le téléphone : 1080 × 1350 px.
const W = 1080,
  H = 1350;
const ordinal = (n) => (n === 1 ? '1er' : `${n}e`);

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function drawShareCard(canvas, summary, playerName) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const font = (weight, size) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f2a5c');
  bg.addColorStop(1, '#1f5fd1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.arc(W - 120, 160, 330, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = font(800, 54);
  ctx.fillText('↗ pronos escrime', 80, 130);

  ctx.font = font(700, 58);
  let y = 270;
  for (const line of wrap(ctx, summary.tournamentName, W - 160)) {
    ctx.fillText(line, 80, y);
    y += 70;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = font(500, 40);
  ctx.fillText(playerName, 80, y + 10);

  const rank = summary.ranking?.rank;
  ctx.fillStyle = '#ffffff';
  ctx.font = font(900, 230);
  ctx.fillText(rank ? ordinal(rank) : '—', 70, 720);
  ctx.font = font(600, 46);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  if (summary.players) ctx.fillText(`sur ${summary.players} joueurs`, 90, 800);

  const points = summary.ranking?.totalPoints ?? 0;
  const tiles = [
    [String(points), points > 1 ? 'points' : 'point'],
    [`${summary.winners}/${summary.played}`, 'bons vainqueurs'],
    [String(summary.exact), summary.exact > 1 ? 'scores exacts' : 'score exact'],
  ];
  const tileW = (W - 160 - 40) / 3;
  tiles.forEach(([value, label], i) => {
    const x = 80 + i * (tileW + 20);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(x, 900, tileW, 210, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, 76);
    ctx.fillText(value, x + 30, 1000);
    ctx.font = font(500, 32);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [j, line] of wrap(ctx, label, tileW - 50).entries()) ctx.fillText(line, x + 30, 1055 + j * 38);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = font(500, 34);
  if (summary.accuracy !== null && summary.accuracy !== undefined)
    ctx.fillText(`${summary.accuracy} % de bons vainqueurs`, 80, 1200);
  ctx.fillText(typeof location !== 'undefined' ? location.host : '', 80, 1270);
  return canvas;
}

// Partage natif si le téléphone le permet (image jointe), sinon téléchargement de l'image.
export async function shareCard(summary, playerName) {
  const canvas = drawShareCard(document.createElement('canvas'), summary, playerName);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  const file = new File([blob], 'mon-resultat-pronos-escrime.jpg', { type: 'image/jpeg' });
  const text = `${summary.tournamentName} : ${summary.ranking?.rank ? ordinal(summary.ranking.rank) : '—'} sur ${summary.players} au jeu de pronostics !`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

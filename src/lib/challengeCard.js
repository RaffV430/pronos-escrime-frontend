export function challengeFor(match, prediction, pageUrl, revealPrediction = false) {
  if (!revealPrediction) prediction = null;
  const page = new URL(pageUrl),
    url = new URL(page.pathname, page.origin);
  url.searchParams.set('match', String(match.id));
  if (page.searchParams.get('refonte') === '1') url.searchParams.set('refonte', '1');
  const winner = prediction
    ? match[prediction.predictedScore1 > prediction.predictedScore2 ? 'player1' : 'player2']
    : null;
  const text = winner
    ? `Je pronostique ${winner}${prediction.winnerOnly ? ' vainqueur' : ` (${prediction.predictedScore1}–${prediction.predictedScore2})`}, et toi ?`
    : `${match.player1} ou ${match.player2} : qui gagne ?`;
  return {
    revealPrediction,
    title: 'Défi Pronos Escrime',
    text,
    url: url.href,
    local: ['localhost', '127.0.0.1'].includes(url.hostname),
    winner,
  };
}
// Visuel de communication ; les scores affichés sont uniquement ceux du pronostic fourni.
export async function renderChallengeCard(match, prediction, challenge) {
  if (!challenge.revealPrediction) prediction = null;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Création de la carte indisponible.');
  await document.fonts?.ready;
  const text = (value, x, y, size = 30, color = '#fff', weight = 500) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Barlow, system-ui, sans-serif`;
    ctx.fillText(String(value), x, y);
  };
  const wrap = (value, x, y, size = 42, width = 920, lines = 3, color = '#fff') => {
    ctx.font = `700 ${size}px Barlow, system-ui, sans-serif`;
    let line = '',
      rows = [];
    for (const word of String(value).split(/\s+/)) {
      if (ctx.measureText(`${line} ${word}`).width > width && line) {
        rows.push(line);
        line = '';
      }
      line += `${line ? ' ' : ''}${word}`;
    }
    if (line) rows.push(line);
    const visible = rows.slice(0, lines);
    if (rows.length > lines) {
      let last = visible.at(-1);
      while (ctx.measureText(last + '…').width > width) last = last.slice(0, -1);
      visible[visible.length - 1] = last + '…';
    }
    visible.forEach((row) => {
      text(row, x, y, size, color, 700);
      y += size * 1.25;
    });
    return y;
  };
  ctx.fillStyle = '#0c1a2f';
  ctx.fillRect(0, 0, 1080, 1080);
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
  gradient.addColorStop(0, '#225da855');
  gradient.addColorStop(1, '#0c1a2f00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1080);
  const logo = new Image();
  logo.src = '/app-icon.svg?v=3';
  try {
    await logo.decode();
    ctx.drawImage(logo, 64, 55, 76, 76);
  } catch {
    /* Le nom de la marque reste lisible. */
  }
  text('pronos escrime', 160, 107, 45, '#fff', 700);
  text('JE VOUS DÉFIE', 64, 220, 26, '#ffc531', 700);
  text(`${match.round || 'Tableau'}${match.strip ? ` · Piste ${match.strip}` : ''}`, 64, 265, 26, '#b9c9df');
  wrap(match.player1, 64, 340, 50, 930, 2);
  text('VS', 64, 475, 26, '#ffc531', 700);
  wrap(match.player2, 64, 550, 50, 930, 2);
  ctx.fillStyle = '#225da8';
  ctx.beginPath();
  ctx.roundRect(64, 690, 952, 105, 20);
  ctx.fill();
  wrap(
    prediction
      ? prediction.winnerOnly
        ? `Mon choix : ${challenge.winner}`
        : `Mon score : ${prediction.predictedScore1} – ${prediction.predictedScore2}`
      : 'À vous de choisir le vainqueur',
    90,
    731,
    28,
    895,
    2,
  );
  text('Et vous ?', 64, 850, 46, '#fff', 700);
  text('Scannez ou ouvrez le lien du match.', 64, 910, 27, '#b9c9df');
  text(challenge.local ? 'APERÇU LOCAL' : 'pronos-escrime.fr', 64, 998, 25, '#b9c9df', 600);
  const QRCode = await import('qrcode');
  const qr = document.createElement('canvas');
  await QRCode.default.toCanvas(qr, challenge.url, {
    width: 185,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0c1a2f', light: '#ffffff' },
  });
  ctx.drawImage(qr, 830, 822, 185, 185);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Création de la carte impossible.'))),
      'image/png',
    ),
  );
}

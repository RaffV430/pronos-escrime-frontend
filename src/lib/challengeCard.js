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
// Les images ne transportent pas de lien cliquable : il reste dans le message ou le sticker.
export function challengeSharePayload(challenge, file, channel, supportsFiles) {
  if (channel === 'instagram' && file && supportsFiles) return { title: challenge.title, files: [file] };
  const text = `${challenge.text}\nFais ton pronostic sur Pronos Escrime 👇\n${challenge.url}`;
  return file && supportsFiles ? { title: challenge.title, text, files: [file] } : { title: challenge.title, text };
}

// Visuel de communication seulement ; aucune écriture de pronostic ou de points.
export async function renderChallengeCard(match, prediction, challenge, channel = 'instagram') {
  if (!challenge.revealPrediction) prediction = null;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Création de la carte indisponible.');
  await Promise.all([document.fonts?.load('700 70px "Barlow Condensed"'), document.fonts?.load('500 34px Barlow')]);
  const text = (value, x, y, size, color = '#f3f6fd', display = false, align = 'left') => {
    ctx.fillStyle = color;
    ctx.font = `${display ? 700 : 500} ${size}px ${display ? '"Barlow Condensed"' : 'Barlow'}, sans-serif`;
    ctx.textAlign = align;
    ctx.fillText(String(value), x, y);
  };
  const wrap = (value, x, y, size, width, lines, color = '#f3f6fd', display = true) => {
    ctx.font = `${display ? 700 : 500} ${size}px ${display ? '"Barlow Condensed"' : 'Barlow'}, sans-serif`;
    const words = String(value).split(/\s+/);
    const rows = [];
    let row = '';
    for (const word of words) {
      if (row && ctx.measureText(`${row} ${word}`).width > width) {
        rows.push(row);
        row = '';
      }
      row += `${row ? ' ' : ''}${word}`;
    }
    if (row) rows.push(row);
    rows.slice(0, lines).forEach((raw, i) => {
      let line = raw;
      const truncated = ctx.measureText(line).width > width || (i === lines - 1 && rows.length > lines);
      if (truncated) {
        while (line && ctx.measureText(line + '…').width > width) line = line.slice(0, -1);
        line += '…';
      }
      text(line, x, y + i * size * 1.12, size, color, display);
    });
  };
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, '#142c4e');
  gradient.addColorStop(1, '#091423');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);
  const logo = new Image();
  logo.src = '/app-icon.svg?v=3';
  try {
    await logo.decode();
    ctx.drawImage(logo, 76, 174, 80, 80);
  } catch {
    /* La marque reste lisible. */
  }
  text('pronos escrime', 178, 230, 49);
  text('JE VOUS DÉFIE', 76, 365, 30, '#ffc531');
  text('TU VOIS QUI', 76, 515, 144, '#f3f6fd', true);
  text('GAGNER ?', 76, 645, 144, '#7eb2ff', true);
  const rounds = { T2: 'FINALE', T4: 'DEMI-FINALE', T8: 'QUART DE FINALE' };
  wrap(rounds[match.round] || match.round || 'DUEL À PRONOSTIQUER', 76, 727, 35, 928, 1);
  for (const [i, left, color] of [
    [1, 76, '#ff495f'],
    [2, 558, '#22d37a'],
  ]) {
    ctx.fillStyle = '#16263b';
    ctx.beginPath();
    ctx.roundRect(left, 775, 446, 280, 28);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(left + 15, 775, 416, 7);
    text(match[`player${i}Country`] || 'ESCRIME', left + 28, 837, 29, '#c4d4eb');
    wrap(match[`player${i}`], left + 28, 925, 65, 390, 2);
  }
  text('VS', 540, 925, 43, '#c4d4eb', true, 'center');
  if (prediction && !prediction.winnerOnly) {
    text('MON PRONOSTIC', 540, 1130, 29, '#afc3e1', false, 'center');
    text(`${prediction.predictedScore1} – ${prediction.predictedScore2}`, 540, 1370, 260, '#f3f6fd', true, 'center');
  } else {
    text(prediction ? 'MON CHOIX' : 'LE DUEL EST LANCÉ', 540, 1150, 32, '#afc3e1', false, 'center');
    wrap(prediction ? challenge.winner : 'ET TOI, TU MISES SUR QUI ?', 100, 1270, 76, 880, 2, '#ffc531');
  }
  text('À TOI DE JOUER.', 540, 1540, 88, '#f3f6fd', true, 'center');
  text('Pronostique les matchs. Marque des points.', 540, 1608, 33, '#c4d4eb', false, 'center');
  text('Défie tes amis.', 540, 1655, 33, '#c4d4eb', false, 'center');
  ctx.strokeStyle = '#7eb2ff';
  ctx.lineWidth = 3;
  ctx.setLineDash(channel === 'instagram' ? [16, 12] : []);
  ctx.strokeRect(76, 1715, 928, 112);
  text(
    channel === 'instagram' ? 'ESPACE POUR TON STICKER LIEN' : 'LE LIEN EST DANS LE MESSAGE ↓',
    540,
    1787,
    37,
    '#bcd6ff',
    false,
    'center',
  );
  text(challenge.local ? 'APERÇU LOCAL' : 'pronos-escrime.fr', 540, 1880, 30, '#adc3e2', false, 'center');
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Création de la carte impossible.'))),
      'image/png',
    ),
  );
}

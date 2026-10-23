// Les valeurs viennent de la courbe existante : aucun calcul du barème ni écriture serveur.
export function seasonStory(rows, selectedId, playerName = '', seasonLabel = '') {
  const index = rows.findIndex((r) => r.id === selectedId);
  if (index < 0) throw new Error('Étape de saison indisponible.');
  const selected = rows[index];
  if (!Number.isFinite(selected.cumulative) || !Number.isFinite(selected.points))
    throw new Error('Points indisponibles.');
  return {
    title: 'Ma progression sur Pronos Escrime',
    text: `Ma saison sur Pronos Escrime : ${selected.cumulative} points après ${selected.name} (${selected.points >= 0 ? '+' : ''}${selected.points} sur ce tournoi). Et toi, tu en es où ?`,
    url: 'https://www.pronos-escrime.fr/',
    total: selected.cumulative,
    gain: selected.points,
    event: String(selected.name || ''),
    playerName: String(playerName || ''),
    seasonLabel: String(seasonLabel || ''),
    values: [0, ...rows.slice(0, index + 1).map((r) => r.cumulative)],
  };
}
export function seasonStoryChart(values) {
  const low = Math.min(0, ...values),
    high = Math.max(1, ...values);
  return values.map((v, i) => [
    110 + (i * 850) / Math.max(1, values.length - 1),
    1355 - ((v - low) / (high - low)) * 145,
  ]);
}
export async function renderSeasonStory(summary, channel = 'instagram') {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1920;
  const x = c.getContext('2d');
  if (!x) throw new Error('Création de la carte indisponible.');
  await Promise.all([document.fonts?.load('700 70px "Barlow Condensed"'), document.fonts?.load('500 34px Barlow')]);
  const gradient = x.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, '#142c4e');
  gradient.addColorStop(1, '#091423');
  x.fillStyle = gradient;
  x.fillRect(0, 0, 1080, 1920);
  const text = (s, a, b, size, color = '#f3f6fd', display = true, align = 'left') => {
    x.font = `${display ? 700 : 500} ${size}px ${display ? '"Barlow Condensed"' : 'Barlow'},sans-serif`;
    x.fillStyle = color;
    x.textAlign = align;
    x.fillText(String(s), a, b);
  };
  const fit = (s, a, b, size, width, color = '#f3f6fd', display = false) => {
    let value = String(s);
    text('', a, b, size, color, display);
    while (size > 22 && x.measureText(value).width > width) {
      size -= 2;
      text('', a, b, size, color, display);
    }
    if (x.measureText(value).width > width) {
      while (value && x.measureText(value + '…').width > width) value = value.slice(0, -1);
      value += '…';
    }
    text(value, a, b, size, color, display);
  };
  const logo = new Image();
  logo.src = '/app-icon.svg?v=3';
  try {
    await logo.decode();
    x.drawImage(logo, 76, 174, 80, 80);
  } catch {
    /* Marque toujours lisible. */
  }
  text('pronos escrime', 178, 230, 49);
  text('CHAQUE PRONO COMPTE', 76, 365, 30, '#ffc531', false);
  text('MA SAISON.', 76, 515, 142);
  text('MA PROGRESSION.', 76, 645, 142, '#7eb2ff');
  fit(
    [summary.seasonLabel && `Saison ${summary.seasonLabel}`, summary.playerName].filter(Boolean).join(' · '),
    76,
    720,
    35,
    928,
    '#b8cbe5',
  );
  fit(summary.total.toLocaleString('fr-FR'), 76, 970, 280, 860, '#f3f6fd', true);
  text('POINTS', 76, 1030, 40, '#afc3e1');
  fit(
    `${summary.gain >= 0 ? '+' : ''}${summary.gain} pts · ${summary.event}`,
    76,
    1090,
    37,
    928,
    summary.gain >= 0 ? '#22d37a' : '#ff7b88',
  );
  x.strokeStyle = '#345176';
  x.strokeRect(76, 1130, 928, 300);
  text('MON PARCOURS', 110, 1180, 29, '#bfd0e9', false);
  const points = seasonStoryChart(summary.values);
  x.beginPath();
  points.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.strokeStyle = '#7eb2ff';
  x.lineWidth = 6;
  x.stroke();
  x.fillStyle = '#ffc531';
  x.beginPath();
  x.arc(...points.at(-1), 9, 0, Math.PI * 2);
  x.fill();
  text('Début de saison', 110, 1405, 26, '#9fb8da', false);
  text('Étape choisie', 960, 1405, 26, '#9fb8da', false, 'right');
  text('ET TOI, TU EN ES OÙ ?', 540, 1570, 84, '#f3f6fd', true, 'center');
  text('Pronostique. Marque des points. Défie tes amis.', 540, 1640, 32, '#c4d4eb', false, 'center');
  x.strokeStyle = '#7eb2ff';
  x.lineWidth = 3;
  x.setLineDash(channel === 'instagram' ? [16, 12] : []);
  x.strokeRect(76, 1715, 928, 112);
  text(
    channel === 'instagram' ? 'ESPACE POUR TON STICKER LIEN' : 'LE LIEN EST DANS LE MESSAGE ↓',
    540,
    1785,
    37,
    '#bcd6ff',
    false,
    'center',
  );
  text('pronos-escrime.fr', 540, 1880, 30, '#adc3e2', false, 'center');
  return new Promise((resolve, reject) =>
    c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Création de la carte impossible.'))), 'image/png'),
  );
}

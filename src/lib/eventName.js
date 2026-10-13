// Presentation only: imported names and event identities remain unchanged.
export function eventNameFr(value) {
  const name = String(value || '');
  if (!/\b(foil|epee|épée|sabre|saber)\b/i.test(name) || !/\b(women|men|female|male|cadet|junior|senior)\b/i.test(name))
    return name;
  const women = /\b(women|female)\b/i.test(name);
  const men = /\b(men|male)\b/i.test(name);
  const age = /\bcadet\b/i.test(name)
    ? women
      ? 'Cadettes'
      : 'Cadets'
    : /\bjunior\b/i.test(name)
      ? 'Juniors'
      : /\bsenior\b/i.test(name)
        ? 'Seniors'
        : '';
  const weapon = /\bfoil\b/i.test(name) ? 'Fleuret' : /\b(epee|épée)\b/i.test(name) ? 'Épée' : 'Sabre';
  const team = /\bteam\b/i.test(name);
  const rest = name
    .replace(/\b(women|men|female|male)(?:['’]s)?\b/gi, '')
    .replace(/\b(cadet|junior|senior|foil|epee|épée|sabre|saber|team|individual)\b/gi, '')
    .replace(/^[\s·–—-]+|[\s·–—-]+$/g, '')
    .replace(/\s+/g, ' ');
  return [weapon, age, women ? 'Dames' : men ? 'Hommes' : '', team ? 'Par équipes' : '', rest]
    .filter(Boolean)
    .join(' · ');
}

// Même présentation en anglais : « Vet-50 Men's Foil » → « Foil · Men · Vet-50 ».
export function eventNameEn(value) {
  const name = String(value || '');
  if (!/\b(foil|epee|épée|sabre|saber)\b/i.test(name) || !/\b(women|men|female|male|cadet|junior|senior)\b/i.test(name))
    return name;
  const women = /\b(women|female)\b/i.test(name);
  const men = /\b(men|male)\b/i.test(name);
  const age = /\bcadet\b/i.test(name)
    ? 'Cadet'
    : /\bjunior\b/i.test(name)
      ? 'Junior'
      : /\bsenior\b/i.test(name)
        ? 'Senior'
        : '';
  const weapon = /\bfoil\b/i.test(name) ? 'Foil' : /\b(epee|épée)\b/i.test(name) ? 'Épée' : 'Sabre';
  const team = /\bteam\b/i.test(name);
  const rest = name
    .replace(/\b(women|men|female|male)(?:['’]s)?\b/gi, '')
    .replace(/\b(cadet|junior|senior|foil|epee|épée|sabre|saber|team|individual)\b/gi, '')
    .replace(/^[\s·–—-]+|[\s·–—-]+$/g, '')
    .replace(/\s+/g, ' ');
  return [weapon, age, women ? 'Women' : men ? 'Men' : '', team ? 'Team' : '', rest].filter(Boolean).join(' · ');
}
export const eventNameFor = (lang, value) => (lang === 'en' ? eventNameEn(value) : eventNameFr(value));

// Libellés du calendrier fédéral (« Épreuve nationale 1 ») en anglais.
export function eventLabelFor(lang, label) {
  if (lang !== 'en') return label;
  return String(label || '')
    .replace(/Épreuve nationale/i, 'National event')
    .replace(/Épreuve internationale/i, 'International event')
    .replace(/Circuit national/i, 'National circuit')
    .replace(/Coupe du monde/i, 'World Cup')
    .replace(/Championnats? de France/i, 'French Championships')
    .replace(/Championnats? du monde/i, 'World Championships')
    .replace(/Championnats? d['’]Europe/i, 'European Championships');
}

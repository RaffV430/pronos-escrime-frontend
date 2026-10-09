// « SAVIN Rafael », « Savin  Rafaël » → même tireur (casse, accents et espaces ignorés).
export const normalizeName = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

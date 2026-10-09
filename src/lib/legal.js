// Pages légales accessibles sans connexion.
export const LEGAL_PATHS = {
  '/mentions-legales': 'legal',
  '/confidentialite': 'privacy',
  '/regles-et-charte': 'rules',
};
export const legalPageFor = (pathname) => LEGAL_PATHS[String(pathname || '').replace(/\/$/, '')] || null;

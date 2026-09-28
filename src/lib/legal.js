// Pages légales accessibles sans connexion.
export const LEGAL_PATHS = { '/mentions-legales': 'legal', '/confidentialite': 'privacy' };
export const legalPageFor = (pathname) => LEGAL_PATHS[String(pathname || '').replace(/\/$/, '')] || null;

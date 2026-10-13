import { createContext, useContext } from 'react';
import { translate } from './translate.js';
import { localeOf } from './language.js';

export const I18nContext = createContext(null);
// Hors fournisseur (tests, pages isolées) : français par défaut.
const fallback = {
  lang: 'fr',
  locale: localeOf('fr'),
  setLang: () => {},
  t: (key, vars) => translate('fr', key, vars),
};
export const useI18n = () => useContext(I18nContext) || fallback;

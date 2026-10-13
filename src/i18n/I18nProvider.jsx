// Contexte de langue : t('clé', { variables }) renvoie le texte dans la langue choisie, avec repli sur le
// français si une traduction manque (et un avertissement en développement pour la repérer).
import { useEffect, useMemo, useState } from 'react';
import { I18nContext } from './context';
import { initialLanguage, localeOf, saveLanguage } from './language';
import { translate } from './translate';

export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => (import.meta.env.DEV ? initialLanguage() : 'fr'));
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(
    () => ({
      lang,
      locale: localeOf(lang),
      setLang: (next) => {
        if (!import.meta.env.DEV) return;
        saveLanguage(next);
        setLangState(next);
      },
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

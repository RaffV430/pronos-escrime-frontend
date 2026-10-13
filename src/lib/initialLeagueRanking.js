// Un lien ouvre un classement une seule fois ; une sélection manuelle le remplace.
export function initialLeagueRanking(search) {
  const id = Number(new URLSearchParams(search).get('league'));
  let consumed = false;
  let controller = null;
  return {
    start(leagues) {
      if (consumed || !Number.isSafeInteger(id) || id <= 0 || !leagues?.some((league) => league.id === id)) return null;
      consumed = true;
      controller = new AbortController();
      return { id, controller };
    },
    cancel() {
      consumed = true;
      controller?.abort();
    },
  };
}

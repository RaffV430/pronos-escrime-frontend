// Une épreuve ouverte continue de recevoir ses exempts, même si ses rencontres n'ont pas changé.
export function watchTableauByes(competitionId, fetchState, onValue) {
  let stopped = false;
  let loading = false;
  return {
    async refresh() {
      if (stopped || loading) return;
      loading = true;
      try {
        const state = await fetchState(competitionId);
        if (!stopped && state?.competitionId === competitionId && Array.isArray(state.byes)) onValue(state.byes);
      } catch {
        // Une coupure ne doit pas effacer les derniers exempts vérifiés.
      } finally {
        loading = false;
      }
    },
    stop() {
      stopped = true;
    },
  };
}

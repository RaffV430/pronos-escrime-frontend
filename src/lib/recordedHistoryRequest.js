// Scope the response to the selected consultation, including failures after it closes.
export function requestRecordedHistory(get, matchId, receive) {
  let active = true;
  Promise.resolve()
    .then(() => get(`/public/matches/${matchId}/live-history`))
    .then(({ data }) => {
      if (active) receive({ matchId, ...data });
    })
    .catch(() => {
      if (active) receive({ matchId, error: 'Historique temporairement indisponible.' });
    });
  return () => {
    active = false;
  };
}

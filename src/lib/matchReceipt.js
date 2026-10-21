// Only the board owning the match may consume its account-scoped delivery receipt.
export function receiptMatchId(receipt, matches) {
  const id = Number(/^match:(\d+)$/.exec(receipt?.key || '')?.[1]);
  return id && 'ok' in (receipt || {}) && matches.some((m) => Number(m.id) === id) ? id : null;
}

export function draftMatchesReceipt(draft, body) {
  if (!draft) return true;
  if (!body) return false;
  if ([1, 2].includes(body.winner)) {
    return draft.winner === body.winner && draft[`score${body.winner === 1 ? 2 : 1}`] === '';
  }
  return (
    draft.score1 !== '' &&
    draft.score1 != null &&
    draft.score2 !== '' &&
    draft.score2 != null &&
    Number(draft.score1) === body.predictedScore1 &&
    Number(draft.score2) === body.predictedScore2
  );
}

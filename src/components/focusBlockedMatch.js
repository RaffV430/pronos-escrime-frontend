// The tree may need another render to reveal a paginated round.
export function focusBlockedMatch(doc, id, tree) {
  let observer;
  let timeout;
  const focus = () => {
    const card = doc.getElementById(`${tree ? 'match-detail' : 'match'}-${id}`);
    if (!card) return false;
    const inputs = [...card.querySelectorAll('input')].filter((input) => !input.disabled);
    const target = inputs.find((input) => input.value === '') || inputs[0] || card;
    card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    target.focus({ preventScroll: true });
    observer?.disconnect();
    clearTimeout(timeout);
    return true;
  };
  if (!focus()) {
    observer = new MutationObserver(focus);
    observer.observe(doc.body, { childList: true, subtree: true });
    timeout = setTimeout(() => observer.disconnect(), 3000);
  }
  return () => {
    observer?.disconnect();
    clearTimeout(timeout);
  };
}

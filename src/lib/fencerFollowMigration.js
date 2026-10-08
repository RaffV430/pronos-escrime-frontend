// Ne retirer une ancienne préférence qu’après une réponse serveur exploitable.
export function remainingLocalFollows(items, submittedCount, result) {
  if (
    !Array.isArray(result?.imported) ||
    !Array.isArray(result?.unresolved) ||
    result.unresolved.some((i) => !Number.isInteger(i) || i < 0 || i >= submittedCount)
  )
    return items;
  const unresolved = new Set(result.unresolved);
  return items.filter((_, i) => i >= submittedCount || unresolved.has(i));
}

// Remove only acknowledged records, preserving unrelated recoverable and active drafts.
export function settleDraftEntries({ stored, active, recoverable }, ids) {
  const acknowledged = new Set(ids.map(String));
  const remaining = (value) => {
    const entries = Object.entries(value || {}).filter(([id]) => !acknowledged.has(id));
    return entries.length ? Object.fromEntries(entries) : null;
  };
  return {
    value: remaining({ ...stored, ...active }),
    recoverable: remaining(recoverable),
  };
}

// A new edit is a patch, not a replacement of entries still awaiting restoration.
// Explicit removals are applied before active edits; active input always wins over an older snapshot.
export function mergeDraftEntries({ stored, active, recoverable, removed = [] }) {
  const remaining = settleDraftEntries({ stored, recoverable }, removed);
  const value = { ...remaining.value, ...active };
  return {
    value: Object.keys(value).length ? value : null,
    recoverable: settleDraftEntries({ recoverable: remaining.recoverable }, Object.keys(active || {})).recoverable,
  };
}

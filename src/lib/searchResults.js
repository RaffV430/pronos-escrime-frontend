// Group matching names for presentation only; every identity and action stays distinct.
export function groupSearchResults(items) {
  const groups = [],
    names = new Map(),
    keys = new Set();
  for (const item of items) {
    if (keys.has(item.key)) continue;
    keys.add(item.key);
    const name =
      item.kind === 'fencer' ? item.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr') : null;
    if (name && names.has(name)) names.get(name).push(item);
    else {
      const group = [item];
      groups.push(group);
      if (name) names.set(name, group);
    }
  }
  return groups;
}

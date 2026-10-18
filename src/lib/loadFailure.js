// React.lazy conserve une promesse rejetée : réafficher le composant ne recharge pas son module.
export function isModuleLoadFailure(message) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (?:CSS )?chunk .+ failed|Unable to preload CSS/i.test(
    String(message || ''),
  );
}

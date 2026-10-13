import { useEffect } from 'react';
import { writeUx } from '../lib/uxFeatures';
import { useUxSettings } from '../lib/useUxSettings';
export function UxAppearance({ userId }) {
  const settings = useUxSettings(userId);
  return (
    <section className="ux-appearance">
      <h2>Couleurs adaptées</h2>
      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.adapted}
          onChange={(e) => writeUx(userId, { adapted: e.target.checked })}
        />
        Remplacer le rouge et le vert par le bleu et l’orange
      </label>
      <small className="muted">
        Préférence conservée sur cet appareil. Les libellés et les symboles restent visibles.
      </small>
    </section>
  );
}
export function UxRoot({ userId }) {
  const settings = useUxSettings(userId);
  useEffect(() => {
    document.documentElement.classList.toggle('adapted-colors', settings.adapted);
    return () => document.documentElement.classList.remove('adapted-colors');
  }, [settings.adapted]);
  return null;
}

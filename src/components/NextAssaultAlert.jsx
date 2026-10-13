import { useEffect, useRef, useState } from 'react';
import { useUxSettings } from '../lib/useUxSettings';
export default function NextAssaultAlert({ userId, appearances, onOpen, now }) {
  const prefs = useUxSettings(userId),
    seen = useRef(new Set());
  const [alert, setAlert] = useState(null);
  useEffect(() => {
    if (!prefs.next) {
      setAlert(null);
      return;
    }
    const next = appearances
      .flatMap((a) =>
        a.matches
          .filter((m) => !m.isFinished && !m.syncIssue && m.resultType !== 'CANCELLED')
          .map((match) => ({ ...a, match })),
      )
      .filter((a) => {
        const at = Date.parse(a.match.startsAt || '');
        return (
          Number.isFinite(at) && at >= now && at - now <= 15 * 60000 && !seen.current.has(`${userId}:${a.match.id}`)
        );
      })
      .sort((a, b) => Date.parse(a.match.startsAt) - Date.parse(b.match.startsAt))[0];
    if (!next) return;
    seen.current.add(`${userId}:${next.match.id}`);
    setAlert(next);
  }, [appearances, prefs.next, userId, now]);
  if (!alert) return null;
  const at = new Date(alert.match.startsAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <p className="ux-next-alert" role="status">
      <strong>{alert.entryName}</strong> · prochain assaut à {at}
      {alert.match.strip && ` · piste ${alert.match.strip}`}
      <button
        className="button-link"
        onClick={() => {
          onOpen({ ...alert, mode: 'follow' });
          setAlert(null);
        }}
      >
        Voir →
      </button>
      <button className="button-link" aria-label="Fermer l’alerte du prochain assaut" onClick={() => setAlert(null)}>
        ×
      </button>
    </p>
  );
}

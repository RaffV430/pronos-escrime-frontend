import { useEffect, useState } from 'react';
import API from '../api';
import { pollWhileVisible } from '../lib/polling';
import { updateBadge } from '../lib/adminDestination';
export default function AdminAlerts({ user, onOpen }) {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    if (!user?.isAdmin) {
      updateBadge(0);
      return;
    }
    const c = new AbortController();
    const stop = pollWhileVisible(
      () =>
        API.get('/clubs/admin/alerts', { signal: c.signal })
          .then(({ data }) => {
            if (c.signal.aborted) return;
            setCounts(data);
            updateBadge(data.total);
          })
          .catch(() => {}),
      30000,
    );
    const refresh = () =>
      API.get('/clubs/admin/alerts', { signal: c.signal })
        .then(({ data }) => {
          if (!c.signal.aborted) {
            setCounts(data);
            updateBadge(data.total);
          }
        })
        .catch(() => {});
    window.addEventListener('pronos:admin-alerts-changed', refresh);
    return () => {
      c.abort();
      stop();
      window.removeEventListener('pronos:admin-alerts-changed', refresh);
    };
  }, [user?.id, user?.isAdmin]);
  return counts?.total > 0 ? (
    <button
      className="button-secondary admin-alert-button"
      onClick={() => onOpen(counts.clubs ? 'clubs' : 'sync')}
      aria-label={`${counts.total} alerte(s) administrateur`}
    >
      {counts.total} alerte(s)
    </button>
  ) : null;
}

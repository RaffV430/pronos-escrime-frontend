import { useEffect, useState } from 'react';
import { readUx, UX_EVENT } from './uxFeatures';
export function useUxSettings(userId) {
  const [settings, setSettings] = useState(() => readUx(userId));
  useEffect(() => {
    setSettings(readUx(userId));
    const changed = (e) => {
      if (e.detail.id === userId) setSettings(e.detail.values);
    };
    window.addEventListener(UX_EVENT, changed);
    return () => window.removeEventListener(UX_EVENT, changed);
  }, [userId]);
  return settings;
}

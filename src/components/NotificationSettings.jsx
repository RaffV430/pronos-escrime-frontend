import { useEffect, useState } from 'react';
import API from '../api';
import { pushSupport, applicationKey, disableThisDevice } from '../lib/notifications';
// Fuseau horaire de l'appareil (heures silencieuses), détecté automatiquement.
const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  } catch {
    return 'Europe/Paris';
  }
};
const withDeviceTime = (preferences) => ({ ...preferences, timezone: deviceTimezone() });
export default function NotificationSettings({ userId }) {
  const [open, setOpen] = useState(false),
    [choices, setChoices] = useState([]),
    [config, setConfig] = useState(null),
    [registration, setRegistration] = useState(null),
    [sub, setSub] = useState(null),
    [enabled, setEnabled] = useState(false),
    [tournaments, setTournaments] = useState([]),
    [events, setEvents] = useState([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState({
      followAll: true,
      fencersOnly: false,
      fencerEntries: false,
      newMatches: true,
      reminders: true,
      roundResults: false,
      poolResults: false,
      recap: true,
      fencerResults: false,
      quietEnabled: false,
      quietStart: '22:00',
      quietEnd: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    }),
    [diagnostic, setDiagnostic] = useState(null);
  const [devices, setDevices] = useState([]);
  const unsupported = pushSupport();
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);
    setMessage('');
    (async () => {
      try {
        const [settings, items, ownDevices, account] = await Promise.all([
          API.get('/notifications/config'),
          API.get('/notifications/choices'),
          API.get('/notifications/devices'),
          API.get('/notifications/settings'),
        ]);
        const reg = unsupported ? null : await navigator.serviceWorker.register('/sw.js');
        const current = reg && (await reg.pushManager.getSubscription());
        const status = current ? (await API.post('/notifications/status', { endpoint: current.endpoint })).data : null;
        if (cancelled) return;
        setDevices(ownDevices.data);
        setConfig(settings.data);
        setChoices(items.data);
        setRegistration(reg);
        setSub(current);
        setEnabled(Boolean(status?.enabled));
        // Réglages du compte : les mêmes sur tous les appareils.
        setTournaments(account.data?.tournamentIds || []);
        setEvents(account.data?.competitionIds || []);
        if (account.data?.preferences) setPreferences((p) => ({ ...p, ...account.data.preferences }));
        setDiagnostic(status?.diagnostic || null);
        setReady(true);
      } catch {
        if (!cancelled) setMessage('Impossible de charger vos préférences. Fermez puis rouvrez ce panneau.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId, unsupported]);
  const toggle = (setter, id, checked) =>
    setter((old) => (checked ? [...new Set([...old, id])] : old.filter((x) => x !== id)));
  const activate = async () => {
    // Ask during the user's click, before any network wait (required by iOS).
    const permission =
      Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission();
    setBusy(true);
    setMessage('');
    try {
      if ((await permission) !== 'granted')
        throw Error(
          'Autorisation refusée. Vous pouvez la modifier dans les réglages de notifications du navigateur ou de l’application.',
        );
      await navigator.serviceWorker.ready;
      const current =
        sub ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey(config.publicKey),
        }));
      setSub(current);
      const legacy = !sub && devices.some((d) => d.legacy);
      const { data } = await API.post('/notifications/subscribe', {
        subscription: current.toJSON(),
        tournamentIds: tournaments,
        competitionIds: events,
        preferences: withDeviceTime(preferences),
        replaceLegacy: legacy,
      });
      setEnabled(true);
      setMessage(
        'Notifications activées sur cet appareil. Vos choix sont enregistrés sur votre compte et appliqués à tous vos appareils.' +
          (data?.replaced ? ' L’ancienne inscription de ce navigateur (ancienne adresse) a été remplacée.' : ''),
      );
    } catch (e) {
      setMessage(e.response?.data?.error || e.message || 'Activation impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  // Enregistre les choix sur le compte (et tous les appareils activés), même sans activer cet appareil.
  const save = async () => {
    if (enabled && sub) return activate();
    setBusy(true);
    setMessage('');
    try {
      const { data } = await API.put('/notifications/settings', {
        tournamentIds: tournaments,
        competitionIds: events,
        preferences: withDeviceTime(preferences),
      });
      setMessage(
        data?.devices
          ? `Choix enregistrés sur votre compte et appliqués à vos appareils activés (${data.devices}).`
          : 'Choix enregistrés sur votre compte. Ils s’appliqueront à chaque appareil où vous activerez les notifications.',
      );
    } catch (e) {
      setMessage(e.response?.data?.error || 'Enregistrement impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    setBusy(true);
    try {
      await disableThisDevice();
      setSub(null);
      setEnabled(false);
      setMessage('Notifications désactivées sur cet appareil.');
    } catch {
      setMessage('Désactivation non confirmée. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  const test = async (subscriptionId) => {
    setBusy(true);
    try {
      const result = await API.post(
        '/notifications/test',
        subscriptionId ? { subscriptionId } : { endpoint: sub.endpoint },
      );
      setMessage(
        `Test accepté pour cet appareil uniquement. Clôture fictive : ${new Date(result.data.testClosesAt).toLocaleString('fr-FR')}. Vérifiez la notification reçue.`,
      );
    } catch (e) {
      setMessage(e.response?.data?.error || 'Test indisponible.');
    } finally {
      setBusy(false);
    }
  };
  const set = (key) => (e) => setPreferences((p) => ({ ...p, [key]: e.target.checked }));
  const check = (key, label, hint = null) => (
    <label className="check-row" key={key}>
      <input type="checkbox" checked={Boolean(preferences[key])} disabled={busy} onChange={set(key)} />
      <span>
        {label}
        {hint && <small className="muted"> {hint}</small>}
      </span>
    </label>
  );
  const permission = typeof Notification === 'undefined' ? null : Notification.permission;
  return (
    <details className="feature-panel notification-settings" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Notifications</summary>
      {open && (
        <>
          {unsupported && <p className="notice">{unsupported}</p>}
          {!ready && !message && <p role="status">Chargement des préférences…</p>}
          {ready && (
            <>
              {!config?.available && <p>Les notifications sont en cours de configuration.</p>}
              <div className="notification-device">
                <p className="status-pill">
                  {enabled && permission === 'granted'
                    ? 'Activées sur cet appareil'
                    : 'Pas encore activées sur cet appareil'}
                </p>
                <div className="notification-actions">
                  {!enabled && (
                    <button
                      disabled={
                        busy ||
                        !!unsupported ||
                        !config?.available ||
                        (!preferences.followAll && !tournaments.length && !events.length)
                      }
                      onClick={activate}
                    >
                      Activer sur cet appareil
                    </button>
                  )}
                  {enabled && (
                    <>
                      <button className="button-secondary" disabled={busy} onClick={() => test()}>
                        Tester une notification
                      </button>
                      <button className="button-link" disabled={busy} onClick={disable}>
                        Désactiver sur cet appareil
                      </button>
                    </>
                  )}
                </div>
                <p className="muted">
                  Vos choix ci-dessous sont enregistrés sur votre compte : les mêmes sur tous vos appareils.
                </p>
              </div>

              <fieldset>
                <legend>Pour quelles épreuves ?</legend>
                <label className="check-row">
                  <input
                    type="radio"
                    name="notification-scope"
                    checked={preferences.followAll}
                    disabled={busy}
                    onChange={() => setPreferences((p) => ({ ...p, followAll: true }))}
                  />
                  Tous les tournois, y compris les prochains (recommandé)
                </label>
                <label className="check-row">
                  <input
                    type="radio"
                    name="notification-scope"
                    checked={!preferences.followAll}
                    disabled={busy}
                    onChange={() => setPreferences((p) => ({ ...p, followAll: false }))}
                  />
                  Seulement les tournois ou épreuves que je choisis
                </label>
                <div className="notification-choices" hidden={preferences.followAll}>
                  {choices.map((t) => (
                    <fieldset key={t.id}>
                      <legend>{t.name}</legend>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={tournaments.includes(t.id)}
                          onChange={(e) => toggle(setTournaments, t.id, e.target.checked)}
                        />{' '}
                        Tout le tournoi, y compris ses futures épreuves
                      </label>
                      {t.competitions.map((c) => (
                        <label className="check-row" key={c.id}>
                          <input
                            type="checkbox"
                            disabled={busy || tournaments.includes(t.id)}
                            checked={tournaments.includes(t.id) || events.includes(c.id)}
                            onChange={(e) => toggle(setEvents, c.id, e.target.checked)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Pronostics à faire</legend>
                <label className="check-row">
                  <input
                    type="radio"
                    name="notification-fencers"
                    checked={!preferences.fencersOnly}
                    disabled={busy}
                    onChange={() => setPreferences((p) => ({ ...p, fencersOnly: false }))}
                  />
                  Tous les matchs et toutes les poules
                </label>
                <label className="check-row">
                  <input
                    type="radio"
                    name="notification-fencers"
                    checked={preferences.fencersOnly}
                    disabled={busy}
                    onChange={() => setPreferences((p) => ({ ...p, fencersOnly: true }))}
                  />
                  Seulement les matchs et poules de Mes tireurs
                </label>
                {check('newMatches', 'Quand la moitié d’un tour est ouverte aux pronostics')}
                {check('reminders', 'Rappel 10 minutes avant la clôture, si un pronostic manque')}
              </fieldset>

              <fieldset>
                <legend>Mes tireurs</legend>
                {check('fencerResults', 'Leurs résultats', '(chaque match terminé, bilan de poule)')}
                {check('fencerEntries', 'Quand l’un d’eux est engagé dans une prochaine épreuve')}
              </fieldset>

              <fieldset>
                <legend>Mes bilans</legend>
                {check('roundResults', 'Après chaque tour du tableau')}
                {check('poolResults', 'Après les poules', '(une fois toutes les poules terminées)')}
                {check('recap', 'À la fin de chaque épreuve', '(points et classement)')}
              </fieldset>

              <fieldset>
                <legend>Heures silencieuses</legend>
                {check('quietEnabled', 'Ne rien recevoir pendant une plage horaire')}
                {preferences.quietEnabled && (
                  <div className="quiet-hours">
                    <label>
                      De{' '}
                      <input
                        type="time"
                        value={preferences.quietStart}
                        onChange={(e) => setPreferences((p) => ({ ...p, quietStart: e.target.value }))}
                      />
                    </label>
                    <label>
                      à{' '}
                      <input
                        type="time"
                        value={preferences.quietEnd}
                        onChange={(e) => setPreferences((p) => ({ ...p, quietEnd: e.target.value }))}
                      />
                    </label>
                    <small className="muted">
                      À l’heure de votre appareil ({deviceTimezone()}). Les alertes devenues inutiles pendant cette
                      plage ne sont pas envoyées au réveil.
                    </small>
                  </div>
                )}
              </fieldset>

              <div className="notification-actions">
                <button
                  disabled={busy || (!preferences.followAll && !tournaments.length && !events.length)}
                  onClick={save}
                >
                  Enregistrer mes choix
                </button>
              </div>

              <details className="notification-diagnostic">
                <summary>Diagnostic</summary>
                <p>
                  Autorisation du navigateur :{' '}
                  {permission === null
                    ? 'non disponible'
                    : permission === 'granted'
                      ? 'accordée'
                      : permission === 'denied'
                        ? 'refusée'
                        : 'pas encore demandée'}{' '}
                  · abonnement de cet appareil : {sub ? 'présent' : 'absent'}.
                </p>
                {diagnostic && (
                  <p>
                    Dernier envoi : {diagnostic.sentAt ? new Date(diagnostic.sentAt).toLocaleString('fr-FR') : 'aucun'}
                    {diagnostic.failed ? ' · Un envoi récent a échoué. Essayez le bouton de test.' : ''}
                  </p>
                )}
                {devices.length > 0 && (
                  <div className="notification-actions">
                    {devices.map((device, i) => (
                      <button
                        className="button-secondary"
                        key={device.id}
                        disabled={busy}
                        onClick={() => test(device.id)}
                      >
                        Tester sur {device.label}
                        {devices.length > 1 ? ` ${i + 1}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                {!sub && devices.some((d) => d.legacy) && (
                  <p className="notice">
                    Ce navigateur reçoit peut-être déjà vos alertes via l’ancienne adresse (pronos-escrime.vercel.app).
                    Si vous activez ici, l’ancienne inscription de ce navigateur est remplacée, sans doublon.
                  </p>
                )}
                {sub && !enabled && (
                  <button className="button-link" disabled={busy} onClick={disable}>
                    Réinitialiser l’abonnement de cet appareil
                  </button>
                )}
              </details>
            </>
          )}
          {message && <p role="status">{message}</p>}
          <p className="muted">
            Aucun envoi avant votre accord. La déconnexion désactive les alertes sur cet appareil. Les notifications
            peuvent être retardées par les réglages du téléphone.
          </p>
        </>
      )}
    </details>
  );
}

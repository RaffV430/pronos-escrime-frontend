import { useEffect, useState } from 'react';
import API from '../api';

export default function AdminAnnouncements() {
  const [form, setForm] = useState({ title: 'Nouvelle épreuve à pronostiquer', body: '', url: '/calendrier' });
  const [items, setItems] = useState([]),
    [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [available, setAvailable] = useState(false);
  const refresh = async () => {
    const { data } = await API.get('/admin/announcements');
    setItems(data.announcements);
    setAvailable(data.available);
  };
  useEffect(() => {
    refresh().catch(() => setError('Chargement des annonces impossible.'));
  }, []);
  const prepare = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setPreview((await API.post('/admin/announcements/prepare', form)).data);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Préparation impossible.');
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    setBusy(true);
    setError('');
    let current = preview;
    try {
      do {
        current = (await API.post(`/admin/announcements/${current.id}/send`, { confirm: true })).data;
        setPreview(current);
      } while (current.pending > 0);
      await refresh();
    } catch (e) {
      setError(
        e.response?.data?.error ||
          'Envoi interrompu. Actualisez le bilan avant de reprendre : les envois incertains ne seront pas répétés.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="feature-panel">
      <h2>Annonce générale</h2>
      <p>
        Une notification ponctuelle aux appareils ayant activé les notifications. Les heures silencieuses sont
        respectées : ces appareils ne recevront pas cette annonce.
      </p>
      {!available && <p role="status">L’envoi est désactivé sur cet environnement. La préparation reste possible.</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={prepare}>
        <fieldset disabled={busy}>
          <label>
            Titre
            <input
              required
              maxLength={80}
              value={form.title}
              onChange={(e) => {
                setPreview(null);
                setForm({ ...form, title: e.target.value });
              }}
            />
          </label>
          <label>
            Message
            <textarea
              required
              maxLength={240}
              value={form.body}
              onChange={(e) => {
                setPreview(null);
                setForm({ ...form, body: e.target.value });
              }}
            />
          </label>
          <label>
            Lien dans l’application
            <input
              required
              maxLength={500}
              value={form.url}
              onChange={(e) => {
                setPreview(null);
                setForm({ ...form, url: e.target.value });
              }}
            />
          </label>
          <button type="submit">Préparer l’aperçu</button>
        </fieldset>
      </form>
      {preview && (
        <article className="feature-panel">
          <h3>{preview.content.title}</h3>
          <p>{preview.content.body}</p>
          <p>{preview.content.url}</p>
          <p>
            {preview.users} utilisateurs · {preview.total} appareils sélectionnés à la préparation.
          </p>
          <p role="status">
            {preview.sent} acceptés par le service push · {preview.pending} à envoyer · {preview.skipped} ignorés ·{' '}
            {preview.failed} refusés · {preview.uncertain} incertains.
          </p>
          <p>
            Un envoi accepté ne garantit pas sa réception sur le téléphone. Les envois incertains ne sont jamais répétés
            automatiquement.
          </p>
          {preview.pending > 0 && (
            <button disabled={busy || !available} onClick={send}>
              {busy ? 'Envoi en cours…' : 'Confirmer et envoyer cette annonce'}
            </button>
          )}
        </article>
      )}
      <h3>Annonces récentes</h3>
      <button disabled={busy} onClick={() => refresh().catch(() => setError('Actualisation impossible.'))}>
        Actualiser le bilan
      </button>
      {items.map((item) => (
        <article key={item.id}>
          <strong>{item.content.title}</strong>
          <p>
            {new Date(item.createdAt).toLocaleString('fr-FR')} · {item.sent} acceptés · {item.pending} à envoyer ·{' '}
            {item.failed} refusés · {item.uncertain} incertains
          </p>
          <button
            disabled={busy}
            onClick={() => {
              setError('');
              setPreview(item);
            }}
          >
            Vérifier cette annonce
          </button>
        </article>
      ))}
    </section>
  );
}

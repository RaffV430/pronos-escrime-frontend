import { useState } from 'react';
import API from '../api';

const MAX = 280;
const EMOJIS = ['👏', '🔥', '😮', '😅', '🤺'];
const when = (d) =>
  new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const message = (e, fallback) => e?.response?.data?.error || fallback;

// Réactions (un emoji par joueur) et commentaires courts, chargés à l'ouverture.
export default function MatchSocial({ matchId, counts, isAdmin = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const total = data ? data.comments.length : counts?.comments || 0;
  const reactionsTotal = data ? Object.values(data.reactions).reduce((a, b) => a + b, 0) : counts?.reactions || 0;

  const load = () =>
    API.get(`/matches/${matchId}/social`)
      .then(({ data }) =>
        setData({
          ...data,
          emojis: Array.isArray(data?.emojis) ? data.emojis : EMOJIS,
          reactions: data?.reactions || {},
          comments: Array.isArray(data?.comments) ? data.comments : [],
        }),
      )
      .catch(() => setError('Réactions indisponibles.'));
  const open = (e) => {
    if (e.currentTarget.open && !data) load();
  };

  const react = async (emoji) => {
    if (busy) return;
    const next = data.mine === emoji ? null : emoji;
    setBusy(true);
    setError('');
    try {
      await API.put(`/matches/${matchId}/reaction`, { emoji: next });
      setData((d) => {
        const reactions = { ...d.reactions };
        if (d.mine) reactions[d.mine] = Math.max(0, (reactions[d.mine] || 1) - 1);
        if (next) reactions[next] = (reactions[next] || 0) + 1;
        return { ...d, reactions, mine: next };
      });
    } catch (e) {
      setError(message(e, 'Réaction non enregistrée.'));
    } finally {
      setBusy(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data: created } = await API.post(`/matches/${matchId}/comments`, { text: clean });
      setData((d) => ({
        ...d,
        comments: [
          { id: created.id, author: 'Vous', text: created.text, createdAt: created.createdAt, mine: true },
          ...d.comments,
        ],
      }));
      setText('');
    } catch (err) {
      setError(message(err, 'Commentaire non envoyé.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await API.delete(`/matches/${matchId}/comments/${c.id}`);
      setData((d) => ({ ...d, comments: d.comments.filter((x) => x.id !== c.id) }));
    } catch (e) {
      setError(message(e, 'Commentaire non retiré.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="match-social" onToggle={open}>
      <summary>
        Réactions et commentaires
        <span className="match-social-count" aria-label={`${reactionsTotal} réactions, ${total} commentaires`}>
          {reactionsTotal > 0 && ` · ${reactionsTotal} réaction${reactionsTotal > 1 ? 's' : ''}`}
          {total > 0 && ` · 💬 ${total}`}
        </span>
      </summary>
      {!data && !error && <p className="muted">Chargement…</p>}
      {error && (
        <p className="muted" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="match-reactions" role="group" aria-label="Réagir">
            {data.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`reaction${data.mine === emoji ? ' mine' : ''}`}
                aria-pressed={data.mine === emoji}
                disabled={busy}
                onClick={() => react(emoji)}
              >
                {emoji} {data.reactions[emoji] > 0 && <small>{data.reactions[emoji]}</small>}
              </button>
            ))}
          </div>
          <form className="match-comment-form" onSubmit={send}>
            <textarea
              rows={2}
              maxLength={MAX}
              value={text}
              placeholder="Un mot sur ce match…"
              aria-label="Votre commentaire"
              onChange={(e) => setText(e.target.value)}
            />
            <div>
              <small className="muted">
                {text.length}/{MAX}
              </small>
              <button type="submit" disabled={busy || !text.trim()}>
                Publier
              </button>
            </div>
          </form>
          {data.comments.length ? (
            <ul className="match-comments">
              {data.comments.map((c) => (
                <li key={c.id}>
                  <strong>{c.author}</strong> <small className="muted">{when(c.createdAt)}</small>
                  <p>{c.text}</p>
                  {(c.mine || isAdmin) && (
                    <button type="button" className="button-link" disabled={busy} onClick={() => remove(c)}>
                      Retirer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Pas encore de commentaire.</p>
          )}
        </>
      )}
    </details>
  );
}

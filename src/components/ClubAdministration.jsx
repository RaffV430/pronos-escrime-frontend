import { useEffect, useState } from 'react';
import API from '../api';
export default function ClubAdministration() {
  const [rows, setRows] = useState([]),
    [clubs, setClubs] = useState([]),
    [clubId, setClubId] = useState(''),
    [members, setMembers] = useState([]),
    [userId, setUserId] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [refusing, setRefusing] = useState(null),
    [motive, setMotive] = useState('');
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      API.get('/clubs/admin/responsibilities', { signal: c.signal }),
      API.get('/clubs', { signal: c.signal }),
    ])
      .then(([r, c]) => {
        setRows(r.data);
        setClubs(c.data);
      })
      .catch(() => {
        if (!c.signal.aborted) setError('Chargement des clubs impossible.');
      });
    return () => c.abort();
  }, [revision]);
  useEffect(() => {
    setMembers([]);
    setUserId('');
    if (!clubId) return;
    const c = new AbortController();
    API.get(`/clubs/admin/members/${clubId}`, { signal: c.signal })
      .then(({ data }) => setMembers(data))
      .catch(() => {
        if (!c.signal.aborted) setError('Chargement des membres impossible.');
      });
    return () => c.abort();
  }, [clubId, revision]);
  async function decide(row, status, comment) {
    setBusy(true);
    setError('');
    try {
      const { data } = await API.put('/clubs/admin/responsibility', {
        clubId: row.clubId,
        userId: row.userId,
        status,
        ...(comment ? { comment } : {}),
      });
      setRevision((n) => n + 1);
      setRefusing(null);
      setMotive('');
      setMessage(
        status === 'REJECTED'
          ? data.mailSent
            ? 'Demande refusée. Le motif a été envoyé par e-mail.'
            : 'Demande refusée. L’e-mail n’a pas pu être envoyé : prévenez le demandeur directement.'
          : 'Rôle mis à jour.',
      );
    } catch (e) {
      setError(e.response?.data?.error || 'Modification impossible.');
    } finally {
      setBusy(false);
    }
  }
  async function verify(id) {
    setBusy(true);
    try {
      await API.put(`/clubs/admin/${id}/verify`);
      setRevision((n) => n + 1);
      setMessage('Club vérifié.');
    } catch (e) {
      setError(e.response?.data?.error || 'Vérification impossible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="account-club-panel">
      <summary>Clubs et responsables</summary>
      {error && (
        <p role="alert">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              setRevision((n) => n + 1);
            }}
          >
            Réessayer
          </button>
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <h3>Demandes et responsables</h3>
      {!rows.length && <p>Aucune demande.</p>}
      {rows.map((r) => (
        <article key={r.id}>
          <strong>
            {r.user.name} · {r.club.name}
          </strong>
          <p>{r.reason}</p>
          <p>
            {{ PENDING: 'À valider', APPROVED: 'Responsable', REJECTED: 'Refusée', REVOKED: 'Rôle retiré' }[r.status]}
          </p>
          {r.status === 'PENDING' && (
            <>
              <button disabled={busy} onClick={() => decide(r, 'APPROVED')}>
                Valider
              </button>
              <button
                className="button-secondary"
                disabled={busy}
                onClick={() => {
                  setRefusing(r.id);
                  setMotive('');
                }}
              >
                Refuser
              </button>
              {refusing === r.id && (
                <form
                  className="refusal-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    decide(r, 'REJECTED', motive.trim());
                  }}
                >
                  <label>
                    Motif du refus (envoyé par e-mail à {r.user.name})
                    <textarea
                      required
                      minLength={5}
                      maxLength={1000}
                      rows={3}
                      value={motive}
                      onChange={(e) => setMotive(e.target.value)}
                      placeholder="Ex. : un responsable est déjà nommé pour ce club."
                    />
                  </label>
                  <div className="refusal-actions">
                    <button disabled={busy || motive.trim().length < 5}>Refuser et envoyer le motif</button>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={busy}
                      onClick={() => setRefusing(null)}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          {r.status === 'APPROVED' && (
            <button disabled={busy} onClick={() => decide(r, 'REVOKED')}>
              Retirer le rôle
            </button>
          )}
        </article>
      ))}
      <h3>Nommer un responsable</h3>
      <label>
        Club à administrer
        <select value={clubId} onChange={(e) => setClubId(e.target.value)}>
          <option value="">Choisir un club</option>
          {clubs.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Membre du club
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Choisir un membre</option>
          {members.map((m) => (
            <option value={m.id} key={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={busy || !userId}
        onClick={() => decide({ clubId: Number(clubId), userId: Number(userId) }, 'APPROVED')}
      >
        Nommer responsable
      </button>
      <h3>Anciens clubs à vérifier</h3>
      {clubs
        .filter((c) => c.status === 'PENDING')
        .map((c) => (
          <p key={c.id}>
            {c.name} · {c.city}{' '}
            <button disabled={busy} onClick={() => verify(c.id)}>
              Marquer comme vérifié
            </button>
          </p>
        ))}
    </details>
  );
}

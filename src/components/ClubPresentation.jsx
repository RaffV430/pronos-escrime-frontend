import { useState } from 'react';
import API from '../api';
export default function ClubPresentation({ club }) {
  const [text, setText] = useState(club.description || ''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
          await API.put('/clubs/me/presentation', { description: text });
          setMessage('Présentation enregistrée.');
        } catch (e) {
          setMessage(e.response?.data?.error || 'Enregistrement impossible.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Présentation du club
        <textarea value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
      </label>
      <button disabled={busy}>Enregistrer la présentation</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

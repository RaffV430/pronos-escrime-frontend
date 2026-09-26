import { useEffect, useRef, useState } from 'react';
import API from '../api';

const readSelection = key => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Number.isSafeInteger(value?.tournamentId) && value.tournamentId > 0 && Number.isSafeInteger(value?.eventId) && value.eventId > 0 ? value : null;
  } catch { return null; }
};

export default function EventSelector({ userId, onSelect, onReset, beforeChange = action => action() }) {
  const storageKey = 'pronos:last-event:' + userId;
  const pendingRestore = useRef(readSelection(storageKey));
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  const remember = (selection) => {
    try { localStorage.setItem(storageKey, JSON.stringify(selection)); } catch { /* Navigation still works when storage is unavailable. */ }
  };
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [tournamentId, setTournamentId] = useState('');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const url = tournamentId ? `/podium/competitions/${tournamentId}` : '/tournaments';
    API.get(url, { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Invalid list');
      if (!controller.signal.aborted) {
        const saved = pendingRestore.current;
        if (tournamentId) {
          setEvents(data);
          if (saved && String(saved.tournamentId) === tournamentId) {
            pendingRestore.current = null;
            if (data.some(event => Number(event.id) === saved.eventId)) {
              setEventId(String(saved.eventId));
              setConfirmed(true);
              onSelectRef.current(saved.tournamentId, saved.eventId, data.find(event=>Number(event.id)===saved.eventId));
            } else {
              try { localStorage.removeItem(storageKey); } catch { /* Optional preference. */ }
            }
          }
        } else {
          setTournaments(data);
          if (saved) {
            if (data.some(t => Number(t.id) === saved.tournamentId)) setTournamentId(String(saved.tournamentId));
            else {
              pendingRestore.current = null;
              try { localStorage.removeItem(storageKey); } catch { /* Optional preference. */ }
            }
          }
        }
      }
    }).catch(() => {
      if (!controller.signal.aborted) setError('Impossible de charger les compétitions. Réessayez.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tournamentId, retry, storageKey]);

  function reset() { pendingRestore.current = null; setConfirmed(false); onReset(); }
  if (confirmed) return <><section className="compact-event"><div><p className="eyebrow">{tournaments.find(t=>String(t.id)===tournamentId)?.name}</p><strong>{events.find(e=>String(e.id)===eventId)?.name}</strong><p>{events.find(e=>String(e.id)===eventId)?.podiumFormat==='TEAM'?'Par équipes · trois médailles':'Individuel · deux médailles de bronze'}</p></div><button className="button-secondary" onClick={()=>setChooserOpen(true)}>Changer ⌄</button></section>
    {chooserOpen && <EventChooser tournaments={tournaments} currentTournamentId={tournamentId} currentEventId={eventId} currentEvents={events} onClose={()=>setChooserOpen(false)} onChoose={(chosenTournamentId, event, entries)=>{
      setChooserOpen(false);
      if (String(event.id)===eventId && chosenTournamentId===tournamentId) return;
      beforeChange(()=>{
        pendingRestore.current=null;
        setTournamentId(chosenTournamentId); setEvents(entries); setEventId(String(event.id));
        remember({tournamentId:Number(chosenTournamentId),eventId:Number(event.id)});
        onSelect(Number(chosenTournamentId),Number(event.id),event);
      });
    }}/>}</>;

  const field = { display: 'grid', gap: '8px', flex: '1 1 240px' };
  const select = { width: '100%' };
  return <section aria-labelledby="event-choice" style={{ background: '#f2f6fb', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
    <h2 id="event-choice" style={{ marginTop: 0 }}>Choisissez vos pronostics</h2>
    <p>Sélectionnez une compétition, puis l’épreuve sur laquelle vous souhaitez pronostiquer.</p>
    <form onSubmit={e => { e.preventDefault(); if (tournamentId && eventId && !loading && !error) { remember({ tournamentId: Number(tournamentId), eventId: Number(eventId) }); onSelect(Number(tournamentId), Number(eventId), events.find(event=>String(event.id)===eventId)); setConfirmed(true); } }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        <label style={field}>Compétition<select style={select} required value={tournamentId} disabled={loading && !tournamentId} onChange={e => { reset(); setTournamentId(e.target.value); setEventId(''); setEvents([]); }}>
          <option value="">Choisir une compétition</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select></label>
        <label style={field}>Épreuve<select style={select} required value={eventId} disabled={!tournamentId || loading || !!error} onChange={e => { reset(); setEventId(e.target.value); }}>
          <option value="">Choisir une épreuve</option>
          {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
        </select></label>
      </div>
      {loading && <p role="status">Chargement…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Réessayer</button></p>}
      {!loading && !error && !tournaments.length && <p>Aucune compétition disponible pour le moment.</p>}
      {!loading && !error && tournamentId && !events.length && <p>Aucune épreuve disponible pour cette compétition.</p>}
      {!confirmed && <button type="submit" disabled={!eventId || loading || !!error} style={{ marginTop: '16px' }}>Accéder aux pronostics</button>}
    </form>
  </section>;
}

function EventChooser({tournaments,currentTournamentId,currentEventId,currentEvents,onChoose,onClose}) {
  const dialog=useRef(null);
  const [view,setView]=useState('events');
  const [chosenTournamentId,setChosenTournamentId]=useState(currentTournamentId);
  const [entries,setEntries]=useState(currentEvents);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const element=dialog.current;
    const previous=document.activeElement;
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    element.showModal();
    return ()=>{element.close();document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  useEffect(()=>{
    if(chosenTournamentId===currentTournamentId){setEntries(currentEvents);setLoading(false);setError('');return;}
    const controller=new AbortController();
    setLoading(true);setError('');setEntries([]);
    API.get(`/podium/competitions/${chosenTournamentId}`,{signal:controller.signal}).then(({data})=>{
      if(!Array.isArray(data))throw new Error('Invalid list');
      if(!controller.signal.aborted)setEntries(data);
    }).catch(()=>{if(!controller.signal.aborted)setError('Impossible de charger les épreuves.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[chosenTournamentId,currentTournamentId,currentEvents,retry]);
  return <dialog ref={dialog} className="event-chooser" aria-labelledby="event-chooser-title" onCancel={onClose}>
    <header><h2 id="event-chooser-title">{view==='events'?'Choisir une épreuve':'Choisir un tournoi'}</h2><button className="button-link event-chooser-close" aria-label="Fermer" onClick={onClose}>×</button></header>
    {view==='events'?<>
      <p className="event-chooser-context">{tournaments.find(t=>String(t.id)===chosenTournamentId)?.name}</p>
      <button className="button-link event-chooser-back" onClick={()=>setView('tournaments')}>← Changer de tournoi</button>
      <div className="event-chooser-list">
        {loading&&<p role="status">Chargement des épreuves…</p>}
        {error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Réessayer</button></p>}
        {!loading&&!error&&!entries.length&&<p>Aucune épreuve disponible pour ce tournoi.</p>}
        {!loading&&!error&&entries.map(event=><button key={event.id} className="event-choice-card" aria-current={chosenTournamentId===currentTournamentId&&String(event.id)===currentEventId?'true':undefined} onClick={()=>onChoose(chosenTournamentId,event,entries)}><strong>{event.name}</strong><span>{event.podiumFormat==='TEAM'?'Par équipes':'Individuel'}{chosenTournamentId===currentTournamentId&&String(event.id)===currentEventId?' · Épreuve actuelle':''}</span></button>)}
      </div>
    </>:<>
      <p className="event-chooser-context">Sélectionnez un tournoi pour retrouver ses épreuves.</p>
      <button className="button-link event-chooser-back" onClick={()=>setView('events')}>← Retour aux épreuves</button>
      <div className="event-chooser-list">{tournaments.map(t=><button key={t.id} className="event-choice-card" onClick={()=>{setChosenTournamentId(String(t.id));setView('events');}}><strong>{t.name}</strong>{String(t.id)===currentTournamentId&&<span>Tournoi actuel</span>}</button>)}</div>
    </>}
  </dialog>;
}

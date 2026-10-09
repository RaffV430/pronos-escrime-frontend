import { useEffect, useState } from 'react';
import API from '../api';
export default function ClubNamingRules() {
  const [rules, setRules] = useState('');
  useEffect(() => {
    const c = new AbortController();
    API.get('/clubs/rules', { signal: c.signal })
      .then(({ data }) => setRules(data.rules))
      .catch(() => {});
    return () => c.abort();
  }, []);
  return (
    <div className="club-naming-rules">
      <h3>Règles pour proposer un club</h3>
      <p>
        {rules ||
          'Indiquez le nom réel du club d’escrime et sa ville. Les noms injurieux, discriminatoires, menaçants, à caractère sexuel, publicitaires ou usurpant une identité sont refusés. Chaque ajout est soumis à validation. En attendant, vous restez sans club / accompagnant.'}
      </p>
      <p>
        Un contrôle automatique des termes interdits peut refuser une demande. Le motif apparaît dans Mon compte et est
        envoyé par e-mail. Un terme à revoir ou une ressemblance forte avec un terme de la liste entraîne un examen
        administratif, sans refus automatique. Vous pouvez demander un réexamen auprès de l’éditeur via les mentions
        légales.
      </p>
    </div>
  );
}

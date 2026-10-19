// Même accès depuis les pronostics et le suivi, sans modifier l'épreuve sélectionnée.
export default function StandingsAccess({ onOpen }) {
  return (
    <p className="event-standings-access">
      <button type="button" className="button-link" onClick={onOpen}>
        Consulter les classements de l’épreuve →
      </button>
    </p>
  );
}

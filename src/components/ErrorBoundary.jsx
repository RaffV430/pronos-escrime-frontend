import { Component } from 'react';
import { reportError } from '../lib/monitoring.js';
import { isModuleLoadFailure } from '../lib/loadFailure.js';

// Une erreur d'affichage dans une partie de la page ne doit plus laisser un écran blanc :
// message, bouton pour réessayer, et le reste de l'application (navigation) reste utilisable.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, message: '' };
  }
  static getDerivedStateFromError(error) {
    return { failed: true, message: String(error?.message || error).slice(0, 200) };
  }
  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack, zone: this.props.zone });
  }
  componentDidUpdate(previous) {
    // Changer d'onglet ou d'épreuve efface l'erreur.
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const moduleFailure = isModuleLoadFailure(this.state.message);
    return (
      <section className="feature-panel error-panel" role="alert">
        <h2>
          {moduleFailure
            ? 'Une partie de l’application n’a pas pu être chargée'
            : 'Cette partie de la page n’a pas pu s’afficher'}
        </h2>
        <p>
          {moduleFailure
            ? 'Une nouvelle version peut être disponible ou la connexion a été interrompue. Vos pronostics déjà enregistrés sont conservés. Rechargez la page pour réessayer ; une saisie non enregistrée devra être reprise.'
            : 'Vos pronostics enregistrés ne sont pas concernés. Réessayez, ou rechargez la page si le problème continue.'}
        </p>
        {!moduleFailure && <button onClick={() => this.setState({ failed: false })}>Réessayer</button>}{' '}
        <button className="button-secondary" onClick={() => window.location.reload()}>
          Recharger la page
        </button>
        {this.state.message && (
          <details className="error-detail">
            <summary>Détails pour l’assistance</summary>
            <small>{this.state.message}</small>
          </details>
        )}
      </section>
    );
  }
}

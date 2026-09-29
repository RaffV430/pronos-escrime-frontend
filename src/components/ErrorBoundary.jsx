import { Component } from 'react';
import { reportError } from '../lib/monitoring.js';

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
    return (
      <section className="feature-panel error-panel" role="alert">
        <h2>Cette partie de la page n’a pas pu s’afficher</h2>
        <p>
          Vos pronostics enregistrés ne sont pas concernés. Réessayez, ou rechargez la page si le problème continue.
        </p>
        <button onClick={() => this.setState({ failed: false })}>Réessayer</button>{' '}
        <button className="button-secondary" onClick={() => window.location.reload()}>
          Recharger la page
        </button>
        {this.state.message && <small className="error-detail">Détail technique : {this.state.message}</small>}
      </section>
    );
  }
}

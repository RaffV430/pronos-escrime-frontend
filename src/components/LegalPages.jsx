import { useEffect } from 'react';
import RulesAndCharter from './RulesAndCharter';
// Mentions légales et politique de confidentialité, accessibles sans connexion
// aux adresses /mentions-legales et /confidentialite.
const EDITOR = 'Raffaele Venturi';
const CONTACT = 'contact@pronos-escrime.fr';
const UPDATED = '10 octobre 2026';

export function LegalLinks() {
  return (
    <span className="legal-links">
      <a href="/confidentialite">Confidentialité</a> · <a href="/mentions-legales">Mentions légales</a> ·{' '}
      <a href="/regles-et-charte">Règles et charte</a>
    </span>
  );
}

const Contact = () => (
    <>
      par e-mail à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
    </>
  );

function Legal() {
  return (
    <>
      <h1>Mentions légales</h1>
      <h2>Éditeur</h2>
      <p>
        Pronos Escrime est un site personnel, non commercial, édité par {EDITOR}. Contact : <Contact />.
      </p>
      <p>Directeur de la publication : {EDITOR}.</p>
      <h2>Hébergement</h2>
      <ul>
        <li>
          Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis —{' '}
          <a href="https://vercel.com">vercel.com</a>
        </li>
        <li>
          Serveur : Render Services, Inc., 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis —{' '}
          <a href="https://render.com">render.com</a>
        </li>
        <li>
          Base de données : Neon, Inc. — <a href="https://neon.tech">neon.tech</a>
        </li>
      </ul>
      <h2>Résultats sportifs</h2>
      <p>
        Les résultats sont repris des publications officielles (FencingTimeLive, engarde-service). Pronos Escrime n’est
        affilié ni à la Fédération française d’escrime, ni à la FIE, ni aux organisateurs des compétitions. Le jeu est
        gratuit et sans mise d’argent.
      </p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="muted">Dernière mise à jour : {UPDATED}.</p>
      <h2>Responsable du traitement</h2>
      <p>
        {EDITOR}, éditeur du site. Contact : <Contact />.
      </p>
      <p>
        Les demandes de clubs contiennent le nom, la ville, l’abréviation éventuelle, le compte demandeur et la décision
        avec son motif. Elles servent à vérifier les ajouts et à vous informer du refus par e-mail. Seuls les
        administrateurs accèdent aux demandes ; les clubs acceptés apparaissent dans la liste publique. Le contrôle
        automatique compare les champs saisis à une liste de termes gérée par les administrateurs. Une demande de
        réexamen peut être adressée à l’éditeur <Contact />.
      </p>
      <h2>Données collectées et utilisation</h2>
      <ul>
        <li>
          <strong>Compte</strong> : nom d’utilisateur, adresse e-mail et mot de passe (conservé uniquement sous forme
          chiffrée). Ils servent à vous identifier et, pour l’e-mail, à vous envoyer un lien de réinitialisation si vous
          le demandez.
        </li>
        <li>
          <strong>Jeu</strong> : vos pronostics (matchs, poules, podiums, défis), vos points et vos délégations d’amis
          et clubs. Votre nom d’utilisateur et vos points apparaissent dans les classements visibles des autres joueurs
          ; vos pronostics ne sont montrés aux autres qu’après la clôture.
        </li>
        <li>
          <strong>Page publique des tournois</strong> : chaque tournoi a une page consultable sans compte (adresse
          /tournoi/…), avec le lieu, les dates, les podiums, les tableaux et le classement des dix meilleurs
          pronostiqueurs. Seuls votre pseudo abrégé (prénom ou premier mot suivi d’une initiale, par exemple « Raffaele
          V. »), votre rang et vos points y figurent ; jamais votre e-mail ni vos pronostics. Vous pouvez à tout moment
          ne plus y apparaître en décochant la case de « Mon compte » : votre pseudo est alors remplacé par «
          Pronostiqueur anonyme ».
        </li>
        <li>
          <strong>Notifications</strong> (si vous les activez) : l’abonnement technique de votre navigateur, les
          épreuves suivies, vos préférences et votre fuseau horaire.
        </li>
        <li>
          <strong>Sur votre appareil</strong> : votre session, vos brouillons de pronostics et vos choix d’affichage
          sont gardés dans le stockage local du navigateur. Aucun cookie publicitaire ni outil de mesure d’audience
          n’est utilisé.
        </li>
      </ul>
      <p>
        Ces traitements sont nécessaires au fonctionnement du jeu auquel vous vous inscrivez. La page publique repose
        sur l’intérêt légitime de faire connaître les compétitions et le jeu, limité à un pseudo abrégé et à vos points,
        avec possibilité de retrait à tout moment. Aucune donnée n’est vendue ni utilisée à des fins publicitaires.
      </p>
      <h2>Destinataires et sous-traitants</h2>
      <p>
        Les données sont hébergées par Vercel, Render et Neon. Les e-mails de réinitialisation sont envoyés par Resend.
        Les erreurs techniques peuvent être signalées à Sentry, sans vos données de compte. Certains de ces prestataires
        sont situés aux États-Unis ; les transferts reposent sur leurs garanties contractuelles (clauses contractuelles
        types ou Data Privacy Framework).
      </p>
      <h2>Durée de conservation</h2>
      <p>
        Vos données sont conservées tant que votre compte existe. Vous pouvez le supprimer à tout moment depuis « Mon
        compte » : vos pronostics, points, abonnements et participations sont alors effacés définitivement. Le journal
        des actions d’administration ne contient que des identifiants techniques.
      </p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez accéder à vos données, les corriger, les exporter ou les effacer, et vous opposer à leur traitement,
        en écrivant <Contact />. Vous pouvez aussi adresser une réclamation à la CNIL (
        <a href="https://www.cnil.fr">cnil.fr</a>).
      </p>
    </>
  );
}

export function LegalPage({ page }) {
  useEffect(() => {
    document.title = `${page === 'rules' ? 'Règles et charte' : page === 'legal' ? 'Mentions légales' : 'Politique de confidentialité'} · Pronos Escrime`;
  }, [page]);
  return (
    <main className="legal-page feature-panel">
      <p>
        <a href="/">← Retour à Pronos Escrime</a>
      </p>
      {page === 'rules' ? <RulesAndCharter /> : page === 'legal' ? <Legal /> : <Privacy />}
      <p className="muted">
        <LegalLinks />
      </p>
    </main>
  );
}

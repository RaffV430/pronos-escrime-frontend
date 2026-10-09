import ScoringRules from './ScoringRules';
import ClubNamingRules from './ClubNamingRules';

export default function RulesAndCharter() {
  return (
    <>
      <h1>Règles et charte</h1>
      <p>Les règles du jeu et les engagements de la communauté, réunis au même endroit.</p>
      <nav aria-label="Sommaire des règles">
        <a href="#poules">Poules</a> · <a href="#tableau">Matchs</a> · <a href="#podium">Podium</a> ·{' '}
        <a href="#clubs">Clubs</a> · <a href="#defis">Défis</a> · <a href="#charte">Charte</a>
      </nav>
      <section id="poules">
        <h2>Pronostics de poules</h2>
        <ScoringRules />
        <p>
          Les assauts annulés sont pris en compte lors du calcul : le nombre de victoires pronostiqué est plafonné au
          nombre d’assauts disputés et l’indice est ajusté de cinq touches par assaut annulé.
        </p>
      </section>
      <section id="tableau">
        <h2>Pronostics de matchs</h2>
        <ScoringRules type="matches" />
        <p>
          Un bonus outsider de 1 point s’ajoute pour un bon vainqueur choisi par moins de 25 % des pronostics valides, à
          partir de 8 pronostics valides. Il ne s’applique pas aux matchs annulés ou aux retraits médicaux.
        </p>
        <p>
          Les points sont calculés à partir des résultats officiels importés. Une correction du résultat entraîne le
          recalcul des points. L’état affiché sur le match indique si la saisie est encore ouverte.
        </p>
      </section>
      <section id="podium">
        <h2>Pronostics du podium</h2>
        <p>
          15 points par médaille correctement placée ; 5 points si le tireur ou l’équipe est médaillé à une autre place.
          Ces deux paliers ne se cumulent pas.
        </p>
        <p>
          En individuel, le podium comprend l’or, l’argent et deux bronzes interchangeables : jusqu’à 60 points. Par
          équipes, un seul bronze est attribué au vainqueur de la petite finale : jusqu’à 45 points.
        </p>
      </section>
      <section id="clubs">
        <h2>Classement des clubs</h2>
        <p>
          Le score d’un club est la moyenne des points de tous ses membres, y compris ceux à zéro. Il faut au moins
          trois membres. La composition est figée au début du tournoi : une arrivée ou un départ compte à partir du
          tournoi suivant.
        </p>
      </section>
      <section id="defis">
        <h2>Défis</h2>
        <p>
          Choisissez un vainqueur pour gagner 3 points bonus. Le barème est fixé à la création du défi. La saisie ferme
          au début prévu du match, ou plus tôt si le résultat est publié. Aucun bonus n’est attribué avant un résultat
          définitif.
        </p>
      </section>
      <section id="charte">
        <ClubNamingRules />
      </section>
    </>
  );
}

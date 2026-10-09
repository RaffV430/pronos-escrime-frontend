export const tutorialKey = (userId) => `pronos:tutorial:v2:${userId}`;
export const TUTORIAL_STEPS = [
  {
    tab: 'home',
    target: '.primary-nav',
    title: 'Les sections de l’application',
    text: 'Cette barre donne accès à l’accueil, Pronostiquer, Classements, Délégations et Mes tireurs.',
  },
  {
    tab: 'play',
    target: '[aria-labelledby="event-choice"], .compact-event',
    title: 'Choisir votre épreuve',
    text: 'Choisissez un tournoi puis une épreuve. Sur une épreuve déjà ouverte, utilisez Changer pour retrouver ce choix.',
  },
  {
    tab: 'play',
    view: 'pools',
    target: '.pool-section',
    title: 'Pronostiquer les poules',
    text: 'Dans Poules, prévoyez le nombre de victoires et l’indice de chaque tireur. Les champs et la sauvegarde apparaissent quand les poules sont disponibles.',
  },
  {
    tab: 'play',
    view: 'tableau',
    target: '[data-practice-tableau]',
    title: 'Passer au tableau',
    text: 'L’onglet Tableau permet de saisir les scores des matchs. Les vues Cartes, Liste et Tableau complet organisent les mêmes rencontres ; les filtres permettent de cibler les matchs à compléter ou vos tireurs.',
  },
  {
    tab: 'play',
    view: 'podium',
    target: '[data-practice-podium]',
    title: 'Choisir le podium',
    text: 'L’onglet Podium permet de sélectionner les médaillés lorsque la saisie est ouverte. Les pronostics se verrouillent selon les échéances de l’épreuve.',
  },
  {
    tab: 'me',
    target: '.fencer-manage',
    title: 'Ajouter et filtrer Mes tireurs',
    text: 'Ouvrez cette gestion pour chercher par nom, prénom ou club. Choisissez le tournoi et l’épreuve, puis utilisez le filtre de club ou Tireurs de mon club pour préciser la recherche. Ajoutez les tireurs que vous souhaitez suivre.',
  },
  {
    tab: 'community',
    target: '.account-club-panel',
    title: 'Changer de club',
    text: 'Dans cette section, utilisez Modifier mon club, choisissez un club ou Sans club / accompagnant, puis enregistrez. Un club absent est soumis à validation ; vos pronostics et favoris restent conservés.',
  },
  {
    tab: 'community',
    target: '.community-list, .community-card, .feature-panel',
    title: 'Mes délégations',
    text: 'Retrouvez ici vos groupes. Vous pouvez créer ou rejoindre une délégation, inviter des proches et choisir votre favorite pour l’accueil.',
  },
  {
    tab: 'leaderboard',
    target: '.filter-row, .leaderboard-card',
    title: 'Des classements précis',
    text: 'Choisissez le périmètre Général, Tournoi, Épreuve ou Circuit, puis la compétition correspondante. Ma position permet de retrouver rapidement votre rang.',
  },
  {
    tab: 'account',
    target: '.user-menu-trigger',
    title: 'Mon compte et mon bilan',
    text: 'Mon compte rassemble vos réglages et informations personnelles. Le menu utilisateur donne aussi accès à Mes pronostics, Ma saison et au tutoriel pour le revoir.',
  },
  {
    tab: 'account',
    target: '.site-footer .legal-links',
    title: 'Règles et attribution des points',
    text: 'Le lien Règles et charte, à côté de Mentions légales, rassemble les barèmes des poules, matchs et podiums, les bonus et les règles des clubs.',
  },
];

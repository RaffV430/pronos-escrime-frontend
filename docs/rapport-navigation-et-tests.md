# Pronos Escrime — Navigation, lisibilité et tests de robustesse (19 octobre 2026)

Analyse faite sur la version actuellement en ligne (branche main), en local, avec une copie de la base (jamais la production).
Maquette utilisable : dossier `maquette-navigation`, branche `maquette/navigation` (non publiée).

## 1. Ce qui mélange ou perd le joueur aujourd'hui

| # | Constat | Gravité |
|---|---|---|
| N1 | « Direct » s'intitule « Direct & résultats » et affiche en haut « Choisissez vos pronostics » : suivre, revoir des résultats et pronostiquer sont mélangés au même endroit. | Forte |
| N2 | Direct n'est pas dans la barre par défaut : on n'y accède que par le bouton du haut, qui n'apparaît que pendant un direct. | Forte |
| N3 | Délégations n'existe que dans le menu du compte ; le classement des clubs est rangé dans Délégations au lieu de Classements. « Mon club » apparaît à la fois dans Délégations et dans Mon compte. | Moyenne |
| N4 | Pronostiquer commence par deux listes déroulantes (compétition puis épreuve), alors que l'accueil montre les mêmes épreuves en cartes. | Moyenne |
| N5 | Dans une épreuve, environ 600 px d'en-têtes avant le premier match (épreuve, Poules/Tableau/Podium, compteur, 4 icônes d'affichage **sans nom sur mobile**, filtres, « Pronostic suivant »). | Moyenne |
| N6 | Après le premier pronostic, 4 éléments flottants s'empilent en bas : suggestion d'installation, bandeau « Annuler », bouton « Nouveau design », barre d'action. | Forte |
| N7 | Le bouton jaune « Nouveau design · revenir à l'ancien » reste en permanence au-dessus du contenu et cache parfois du texte (ex. message « Pas de réseau »). | Moyenne |
| N8 | Onglet allumé incohérent : sur Mon compte, Direct ou Délégations, aucun onglet ne correspond ; le rond « Accueil » au centre semble toujours sélectionné. | Faible |
| N9 | Classements : 90 joueurs = page de 12 600 px sur mobile, chaque ligne ayant « Détail des points » et « Comparer nos pronostics ». | Moyenne |
| N10 | Mes tireurs : deux titres pour la même chose (« Tireurs suivis · 2 » et « Mes tireurs · 2 »). | Faible |

## 2. Tests de robustesse

| Situation testée | Résultat | Gravité |
|---|---|---|
| 20 adresses ouvertes à 320 px de large (le plus petit téléphone courant) | Aucune page ne déborde ni ne plante | OK |
| Mémoire du téléphone corrompue (préférences illisibles) | Aucune page ne plante | OK |
| Serveur coupé pendant un pronostic | Pronostic gardé puis envoyé tout seul au retour du serveur (vérifié en base) ; mais l'étiquette affichait « NON ENREGISTRÉ » alors que le message disait « gardé » | Faible → corrigé |
| Match clos, scores égaux, texte au lieu d'un chiffre, session expirée, 12 clics rapides | Le serveur refuse proprement ou accepte sans doublon | OK |
| Lien vers une épreuve terminée (partage, ancienne notification) | Ouvre le choix d'épreuve **sans aucune explication** | Moyenne → corrigé |
| Lien vers une épreuve créée il y a moins de 5 min (notification « nouvelle épreuve ») | Ne s'ouvre pas : la liste gardée sur le téléphone est trop ancienne | Forte → corrigé |
| Lien d'invitation invalide (`/rejoindre/ZZZZZZ`), adresse inconnue | Retour à l'accueil sans message | Faible |
| **Juste après chaque mise en ligne** : un téléphone qui avait déjà l'app ouverte charge l'ancienne version, puis réclame un fichier qui n'existe plus → « Cette partie de la page n'a pas pu s'afficher » (le bouton « Réessayer » ne suffit pas) | Risque à chaque déploiement | Forte → corrigé |
| Horloge du téléphone décalée | L'app décide « ouvert / clos » avec l'heure du téléphone. En retard : le joueur voit « ouvert » mais le serveur refuse (message affiché). En avance : le match paraît clos trop tôt alors qu'il est encore ouvert | Moyenne (non corrigé) |
| Navigation privée / stockage bloqué (certains iPhone) | Connexion impossible, avec un message technique en anglais | Faible (non corrigé) |
| Avertissements internes | Doublons d'identifiants dans le podium des délégations (console) | Faible |

Suites automatiques : site 165/165 tests OK ; serveur 491 OK, 0 échec (74 tests nécessitant une base de test ignorés).

## 3. Propositions

### Nouvelle organisation (maquette « navigation 2 »)
Barre du bas fixe, une mission par onglet :
- **Accueil** — ce qui se passe maintenant.
- **Pronostiquer** — les épreuves ouvertes **en cartes** (un toucher ouvre l'épreuve) ; la liste déroulante reste dessous pour les autres.
- **Direct** — suivre une épreuve et revoir les résultats (« Épreuve suivie » / « Tous les résultats »), titre « Quelle épreuve suivre ? ».
- **Classements** — Joueurs · Clubs (le classement des clubs y est déplacé) · lien vers Mes délégations.
- **Mes tireurs** (barre par défaut, personnalisable) ; **Mon espace** s’ouvre depuis le nom du joueur — tout ce qui est personnel : Mes pronostics, Ma saison, Mes tireurs, Délégations & club, Compte & notifications, plus aide et réglages rapides (tutoriel, signaler un problème, connexion faible, ancien/nouveau design, déconnexion). Dans chaque section, un fil « ← Mon espace » et des raccourcis vers les autres.

Autres changements de la maquette : noms visibles sous les icônes d'affichage (Express, Cartes, Liste, Tableau complet) ; le bouton flottant « Nouveau design » disparaît (rangé dans Mon espace) ; la suggestion d'installation attend la fin du bandeau « Annuler ».

### Corrections incluses dans la maquette (utiles même sans la nouvelle navigation)
1. Lien vers une épreuve récente : relecture de la liste à jour avant d'abandonner.
2. Lien vers une épreuve terminée ou introuvable : message clair + où retrouver les résultats.
3. Après une mise en ligne : rechargement automatique une seule fois si un fichier de l'ancienne version manque.
4. Pronostic hors connexion : étiquette « En attente d'envoi ».

### À faire ensuite (non codé)
- Heure du serveur : corriger l'écart d'horloge du téléphone pour l'ouverture/clôture (le serveur doit exposer son heure).
- Classements : lignes compactes, détail et comparaison au toucher, recherche d'un joueur.
- Message lisible si le stockage du navigateur est bloqué.
- Message pour une invitation invalide et pour une adresse inconnue.
- Réduire l'en-tête d'une épreuve sur mobile (filtres et choix d'affichage dans un seul bouton « Affichage »).
- Décision du 19/10 : « Mes tireurs » dans la barre par défaut, « Mon espace » ouvert depuis le nom du joueur, barre personnalisable conservée.

## 4. Essayer la maquette
1. Serveurs : « maquette-back » (port 5001) et « maquette-front » (port 5174) dans l'aperçu de Claude Code.
2. Ouvrir http://localhost:5174/accueil?nav=2 (et ?nav=1 pour revenir à la navigation actuelle).
3. Épreuves de test fictives dans la base locale : « TEST maquette navigation (à supprimer) » et « TEST lien récent (à supprimer) ».

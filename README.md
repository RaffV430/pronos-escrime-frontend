# Pronos Escrime — Frontend

Interface React/Vite de l'application Pronos Escrime.

## Développement

1. Copier `.env.example` vers `.env`.
2. Renseigner `VITE_API_URL` avec l'URL de l'API, suffixe `/api` inclus.
3. Installer avec `npm ci` puis lancer `npm run dev`.

`npm run check` exécute le lint et le build de production.

## Déploiement Vercel

Configurer `VITE_API_URL=https://<backend>/api` dans les variables du projet. Le domaine Vercel exact doit également figurer dans `CORS_ORIGINS` sur le backend.

La configuration `vercel.json` redirige les routes du navigateur vers `index.html`.

## Section Poules

Un onglet Poules permet de choisir l'épreuve, de saisir les victoires et l'indice de chaque tireur et de consulter les défaites calculées automatiquement. Les pronostics sont enregistrés individuellement, restent modifiables jusqu'à clôture, puis affichent les résultats et le détail des points (maximum 8 par tireur).

Les administrateurs peuvent créer une poule (tireurs saisis un par ligne), fixer la clôture dans le fuseau de leur appareil, fermer les pronostics et publier/corriger un bilan complet. La première version gère les poules en cinq touches sans abandon. La saisie ne récupère pas de données FencingTimeLive.

Dépendance de déploiement : installer les trois nouvelles tables et le backend `/api/pools` avant de publier ce frontend. Voir la procédure additive dans le README du backend, sans exécuter les anciennes migrations Prisma.


## Fiabilité et communauté — 26 septembre 2026

Les scores sont limités à 15 en individuel et 45 par équipes, sans égalité. Un podium finalisé ne peut plus être rouvert. Les ex æquo partagent les rangs (1, 1, 3).

« Mes pronostics » regroupe les poules, matchs et podium, la progression de saisie, le détail des points et le bilan du tournoi. L’évolution de rang compare la dernière consultation dans ce navigateur. Les dates indiquent le fuseau de l’appareil ; l’heure de clôture correspond au début prévu +30 minutes, sauf réouverture manuelle. Une actualisation de l’affichage ne collecte pas les sources officielles.

L’espace Administration sépare les contrôles des parcours joueurs : recherche par nom ou ID, ajustements avec portée explicite et identifiant anti-doublon, verrouillages, retrait médical, correction d’un score officiel et validation du podium vérifié. Les changements sont journalisés à partir de cette version ; aucun historique antérieur n’est inventé. Les corrections de score ne modifient pas automatiquement les adversaires des tours suivants : vérifier lors du prochain import officiel.

Les ligues privées sont sur invitation et reprennent tous les points du tournoi, y compris avant l’adhésion. Les clubs se classent à la moyenne des points de tous leurs membres, avec au moins trois membres ; un joueur appartient à un seul club par tournoi. Les inscriptions/départs sont figés dès le premier horaire de match enregistré ou dès qu’un résultat de poule est connu. Sans horaire connu, la création de clubs est refusée.

Un défi ponctuel porte sur un match : bon vainqueur +3 points bonus, sinon 0. Création avant le début prévu, barème immuable, clôture au début prévu (ou avant si le résultat est publié), points uniquement après résultat final. Le bonus est séparé des 4 points du pronostic normal et recalculé à la lecture en cas de correction officielle.

Base : appliquer seulement `prisma/changes/20260926-community.sql` pour ces ajouts, puis générer le client Prisma. Ne pas lancer les anciennes migrations en production. Cette évolution ne redémarre aucune planification FencingTimeLive.

## Interface responsive validée — 26 septembre 2026

Navigation Pronostiquer / Mes pronostics / Classements / Communauté, avec administration séparée. Le sélecteur d’épreuve se replie après validation et utilise toutes les épreuves fournies par l’API. Les équipes accèdent directement au tableau. Les listes du podium viennent exclusivement de la liste d’engagement officielle, jamais des seuls matchs du premier tour.

Les vues Liste et Arbre partagent les mêmes saisies et endpoints. L’arbre affiche les tours disponibles et les numéros officiels des rencontres, sans inventer d’adversaires ou de liens d’avancement ; la petite finale reste un tour distinct lorsqu’elle est importée. L’enregistrement groupé conserve chaque saisie refusée par le serveur. Une confirmation protège les changements de rubrique/épreuve avec des scores non enregistrés. Les résultats et points restent issus de l’API, sans données de démonstration.

Classements général, tournoi, épreuve, position personnelle et écart au rang précédent. Poules sous forme de cartes sur mobile, podiums par format, invitations copiables et partageables. Rafraîchir l’affichage ne lance jamais une collecte FencingTimeLive. Aucun changement de schéma ou de backend requis. Les automatismes restent en pause.

Validation : `npm run check` (lint, tests des limites/verrous/positions officielles, build). Tests navigateur avec API locale isolée pour les écritures : sauvegarde depuis arbre visible en liste, enregistrement groupé avec refus partiel, protection des saisies, résultats médicaux et points simples. Ne pas déployer `work/interface-preview` ni l’API de test locale.

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

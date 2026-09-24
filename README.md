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

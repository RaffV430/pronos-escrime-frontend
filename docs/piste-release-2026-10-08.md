# Piste : publication et retour arrière

## Version conservée

Production Vercel vérifiée avant publication : commit `1465b2d1f6f97f329fdb2044bc5c44da9eb85c0b`, déploiement Ready `AqekvAv168s924h3xmpqNSuzrsgw`.

- Source préservée sur GitHub : `backup/pre-piste-2026-10-08`.
- Déploiement précédent : https://vercel.com/pronos-escrime/pronos-escrime-frontend/AqekvAv168s924h3xmpqNSuzrsgw
- Pour restaurer immédiatement l’interface : sélectionner ce déploiement dans Vercel et utiliser la restauration/promotion en production. Vérifier ensuite le domaine et les parcours.
- Pour rétablir aussi la branche source : créer une PR de retour du changement Piste, sans réécrire l’historique partagé.

Aucune migration de base ni modification serveur dans cette publication. Les identifiants, pronostics, sessions, points et historiques sont conservés. Aucun jeu de simulation n’est envoyé sur le serveur. Les clés de préférences de vues et de thème existantes sont réutilisées.

## Suivi des pistes

Accès depuis Accueil → Voir les pistes, et depuis Moi. Le suivi utilise la liste authentifiée des matchs, rafraîchie toutes les 30 secondes lorsque la page est visible. Il ne déclenche aucun import supplémentaire auprès des sites officiels ; la cadence du planificateur serveur reste inchangée.

Le serveur actuel transmet les résultats importés, les tendances après clôture et les points personnels validés. Il ne transmet pas de chrono, période ou fil des touches. Un match clos est donc marqué « Résultat attendu », jamais présenté comme un assaut en direct confirmé. Aucun calcul parallèle des points ou projection de classement n’est ajouté. Les anomalies de synchronisation et points en attente ne sont pas présentés comme validés.

Le suivi « Mes tireurs » est propre au navigateur et annoncé comme tel. Il ne remplace pas le réglage serveur des tireurs du club.

## Contrôles locaux

- npm ci, npm run check, contrôle de dépendances.
- Tests de liens officiels, filtrage, états de résultat et points non validés, bonus issus du serveur.
- Base PostgreSQL locale dédiée seulement : sauvegarde de pronostic, refus après résultat, séparation admin/joueur.
- Navigateur : cartes/liste/arbre, poules, choix d’épreuve, accueil, suivi des pistes, clair/sombre et largeurs 390/1440 px.
- Aucun test local n’envoie de push ou ne collecte FTL/Engarde.

# Historique depuis les résultats

L’ouverture d’un match terminé dans le détail des résultats charge son historique via une lecture dédiée. Aucun téléchargement de tous les fils lors de l’affichage du tableau. L’API conserve l’ordre des joueurs du match ; le rendu réutilise l’orientation officielle existante.

Le fil distingue les observations réellement reçues, les repères dont l’ordre des touches n’est pas connu et les corrections. Les repères neutres restent touchables et ne sont pas représentés comme des coups doubles. Un initialiseur 0–0 portant un relais ultérieur ne crée plus un faux premier relais devant les touches du relais précédent. Les autres observations restent dans leur ordre de réception.

Une absence d’historique est explicite. Une panne de lecture permet de réessayer. Les fils partiels sont signalés et le dernier score reçu est indiqué s’il diffère du résultat officiel. Aucune touche manquante n’est reconstituée.

Cette PR est construite sur la branche de la PR frontend #227 afin de conserver le repli sur les bilans officiels des relais.

Dépendance : publier le backend de conservation avant cette interface. La PR des bilans officiels des relais reste distincte : elle complète un score de relais, sans inventer de touches. Préparation uniquement, aucune publication ni modification de pronostic/point.

Contrôles : tests de regroupement, inversion et repères ; `npm run check` ; consultation locale d’un résultat terminé, repère touchable, absence d’historique et panne/reprise. Contrôle visuel ordinateur et iframe mobile 390 × 844, avec données synthétiques. Ce contrôle n’est pas un test sur téléphone physique ni en production.

# Trek App

Application pour organiser un trek (Via Alpina) entre potes : itinéraire,
étapes, hébergements (refuges/bivouacs), participants et matériel — pour voir
d'un coup d'œil qui sera là, quand, où, et ce qu'il manque comme matériel.

Pas de compte ni de mot de passe : chacun choisit juste un prénom en arrivant
(stocké dans son navigateur), pour savoir qui a ajouté quoi.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript + TailwindCSS
- [Convex](https://convex.dev) comme backend (base de données + fonctions
  serveur temps réel — les changements d'un pote apparaissent en direct chez
  les autres)
- Déploiement : [Vercel](https://vercel.com)

## Mise en route

### 1. Lier le projet Convex

```bash
npm install
npx convex dev
```

La première fois, ça ouvre le navigateur pour te connecter à Convex et
choisir/créer un projet. Ça écrit ensuite automatiquement `.env.local` avec
les variables nécessaires (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`,
`NEXT_PUBLIC_CONVEX_SITE_URL`) et pousse le schéma + les fonctions de
`convex/`.

### 2. Lancer le projet

```bash
npm run dev
```

Lance en parallèle le serveur Next.js (`localhost:3000`) et `npx convex dev`
(qui surveille `convex/` et repousse les changements en direct). Pour les
lancer séparément : `npm run dev:frontend` et `npm run dev:backend`.

## Modèle de données (`convex/schema.ts`)

- **treks** — un trek (nom, section de la Via Alpina, dates)
- **etapes** — les jours du trek (distance, D+/D-, dates, tracé GPS optionnel),
  liées à un trek
- **hebergements** — refuge / bivouac / hôtel par étape, statut de réservation
- **participants** — les potes qui participent au trek
- **etapeParticipants** — qui est présent à quelle étape
- **materielItems** — matériel requis, global au trek ou lié à une étape
- **materielApports** — qui apporte quoi, et en quelle quantité
- **commentaires** — fil de discussion par étape

Les fonctions dans `convex/materiel.ts` calculent, pour chaque item, s'il est
couvert, manquant ou en double en comparant la quantité requise à la somme
des apports des participants — c'est ça qui alimente la checklist et
l'alerte "matériel manquant" sur la vue d'ensemble.

## Carte et tracé officiel de la Via Alpina

L'onglet **Carte** de chaque trek affiche le tracé complet de la Via Alpina
suisse (Vaduz → Montreux, 20 étapes officielles) sur un fond de carte
[swisstopo](https://www.swisstopo.admin.ch), avec [Leaflet](https://leafletjs.com).
Cliquer une étape officielle (ligne bleue) la surligne, zoome dessus, et
permet de l'ajouter à l'itinéraire du trek en un clic — plus besoin de
saisir distance/dénivelé à la main. Chaque étape (importée ou saisie
manuellement) a son propre fil de commentaires.

Les données du tracé (`src/data/via-alpina-ch.json`) viennent de la relation
OpenStreetMap [`12359033`](https://www.openstreetmap.org/relation/12359033)
(licence [ODbL](https://www.openstreetmap.org/copyright)) ; distance et
dénivelé sont recalculés à partir de la géométrie et de l'API d'altitude de
swisstopo, et peuvent différer légèrement des chiffres officiels de la Via
Alpina selon comment chaque étape a été cartographiée dans OpenStreetMap
(l'écart total sur les 20 étapes reste sous les 3 % par rapport aux 390 km /
+23 500 m officiels). Les durées affichées sont une estimation (distance +
dénivelé), pas une mesure. Pour régénérer ce fichier après une mise à jour
d'OpenStreetMap, voir le script utilisé dans l'historique de ce projet
(récupération via l'API Overpass + reconstruction du tracé par ID de nœuds +
altitude via `api3.geo.admin.ch/rest/services/profile.json`).

## Déploiement sur Vercel

1. Crée un déploiement de prod Convex : `npx convex deploy` (à faire une fois
   pour pousser le schéma/les fonctions en prod).
2. Connecte le repo GitHub à un nouveau projet Vercel.
3. Dans les settings du projet Vercel, ajoute les variables d'environnement
   `NEXT_PUBLIC_CONVEX_URL` (et `NEXT_PUBLIC_CONVEX_SITE_URL` si besoin) avec
   les valeurs du déploiement de prod (visibles sur le
   [dashboard Convex](https://dashboard.convex.dev)).
4. Deploy.

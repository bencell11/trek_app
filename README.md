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
- **etapes** — les jours du trek (distance, D+/D-, dates), liées à un trek
- **hebergements** — refuge / bivouac / hôtel par étape, statut de réservation
- **participants** — les potes qui participent au trek
- **etapeParticipants** — qui est présent à quelle étape
- **materielItems** — matériel requis, global au trek ou lié à une étape
- **materielApports** — qui apporte quoi, et en quelle quantité

Les fonctions dans `convex/materiel.ts` calculent, pour chaque item, s'il est
couvert, manquant ou en double en comparant la quantité requise à la somme
des apports des participants — c'est ça qui alimente la checklist et
l'alerte "matériel manquant" sur la vue d'ensemble.

## Déploiement sur Vercel

1. Crée un déploiement de prod Convex : `npx convex deploy` (à faire une fois
   pour pousser le schéma/les fonctions en prod).
2. Connecte le repo GitHub à un nouveau projet Vercel.
3. Dans les settings du projet Vercel, ajoute les variables d'environnement
   `NEXT_PUBLIC_CONVEX_URL` (et `NEXT_PUBLIC_CONVEX_SITE_URL` si besoin) avec
   les valeurs du déploiement de prod (visibles sur le
   [dashboard Convex](https://dashboard.convex.dev)).
4. Deploy.

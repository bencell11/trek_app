# Trek App

Application pour organiser un trek (Via Alpina) entre potes : itinéraire,
étapes, hébergements (refuges/bivouacs), participants et matériel — pour voir
d'un coup d'œil qui sera là, quand, où, et ce qu'il manque comme matériel.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript + TailwindCSS
- [Supabase](https://supabase.com) (Postgres + Auth) via `@supabase/ssr`
- Déploiement : [Vercel](https://vercel.com)

## Mise en route

### 1. Créer le projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans le SQL Editor du projet, exécute le contenu de
   [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).
3. Dans **Authentication → Providers**, l'auth par email (magic link / OTP)
   est activée par défaut — c'est celle utilisée par l'app.
4. Récupère l'URL du projet et la clé `anon` dans **Project Settings → API**.

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Renseigne `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 3. Lancer le projet

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) — tu seras redirigé vers
`/login` pour te connecter par email (lien magique).

## Modèle de données

- **treks** — un trek (nom, section de la Via Alpina, dates)
- **etapes** — les jours du trek (distance, D+/D-, dates)
- **hebergements** — refuge / bivouac / hôtel par étape, statut de réservation
- **participants** — les potes qui participent au trek
- **etape_participants** — qui est présent à quelle étape
- **materiel_items** — matériel requis, global au trek ou par étape
- **materiel_apports** — qui apporte quoi, et en quelle quantité

La vue "Matériel" calcule automatiquement, pour chaque item, s'il est
couvert, manquant ou en double en comparant la quantité requise à la somme
des apports des participants.

## Déploiement sur Vercel

1. Connecte le repo GitHub à un nouveau projet Vercel.
2. Renseigne les mêmes variables d'environnement
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dans les
   settings du projet Vercel.
3. Deploy.

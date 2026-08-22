-- Trek App: schéma initial
-- Organisation de treks (Via Alpina) entre potes : étapes, hébergements,
-- participants et matériel (requis vs apporté).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type hebergement_type as enum ('refuge', 'bivouac', 'hotel', 'autre');
create type statut_reservation as enum ('a_faire', 'en_cours', 'confirme');

-- ---------------------------------------------------------------------------
-- Treks
-- ---------------------------------------------------------------------------
create table treks (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text,
  section_via_alpina text,
  date_debut date,
  date_fin date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Étapes
-- ---------------------------------------------------------------------------
create table etapes (
  id uuid primary key default gen_random_uuid(),
  trek_id uuid not null references treks (id) on delete cascade,
  ordre integer not null,
  nom text not null,
  point_depart text,
  point_arrivee text,
  date date,
  distance_km numeric(5, 1),
  denivele_positif integer,
  denivele_negatif integer,
  duree_estimee_h numeric(4, 1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trek_id, ordre)
);

create index etapes_trek_id_idx on etapes (trek_id);

-- ---------------------------------------------------------------------------
-- Hébergements (un par étape, en général)
-- ---------------------------------------------------------------------------
create table hebergements (
  id uuid primary key default gen_random_uuid(),
  etape_id uuid not null references etapes (id) on delete cascade,
  nom text not null,
  type hebergement_type not null default 'refuge',
  latitude double precision,
  longitude double precision,
  contact text,
  statut_reservation statut_reservation not null default 'a_faire',
  prix_chf numeric(7, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hebergements_etape_id_idx on hebergements (etape_id);

-- ---------------------------------------------------------------------------
-- Participants
-- ---------------------------------------------------------------------------
create table participants (
  id uuid primary key default gen_random_uuid(),
  trek_id uuid not null references treks (id) on delete cascade,
  nom text not null,
  email text,
  telephone text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index participants_trek_id_idx on participants (trek_id);

-- Présence d'un participant sur une étape donnée (qui est là, quand, où)
create table etape_participants (
  etape_id uuid not null references etapes (id) on delete cascade,
  participant_id uuid not null references participants (id) on delete cascade,
  primary key (etape_id, participant_id)
);

-- ---------------------------------------------------------------------------
-- Matériel : ce qui est requis vs ce qui est apporté
-- ---------------------------------------------------------------------------
-- Un item requis peut être global au trek (etape_id null) ou spécifique
-- à une étape (ex: corde uniquement pour le passage du J3).
create table materiel_items (
  id uuid primary key default gen_random_uuid(),
  trek_id uuid not null references treks (id) on delete cascade,
  etape_id uuid references etapes (id) on delete cascade,
  nom text not null,
  categorie text,
  quantite_requise integer not null default 1,
  notes text,
  created_at timestamptz not null default now()
);

create index materiel_items_trek_id_idx on materiel_items (trek_id);
create index materiel_items_etape_id_idx on materiel_items (etape_id);

-- Ce que chaque participant apporte, en regard d'un item requis
create table materiel_apports (
  id uuid primary key default gen_random_uuid(),
  materiel_item_id uuid not null references materiel_items (id) on delete cascade,
  participant_id uuid not null references participants (id) on delete cascade,
  quantite integer not null default 1,
  created_at timestamptz not null default now(),
  unique (materiel_item_id, participant_id)
);

create index materiel_apports_item_id_idx on materiel_apports (materiel_item_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger treks_set_updated_at before update on treks
  for each row execute function set_updated_at();

create trigger etapes_set_updated_at before update on etapes
  for each row execute function set_updated_at();

create trigger hebergements_set_updated_at before update on hebergements
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- App conçue pour un petit groupe de confiance : tout utilisateur authentifié
-- a accès en lecture/écriture à toutes les données (pas de multi-tenant).
alter table treks enable row level security;
alter table etapes enable row level security;
alter table hebergements enable row level security;
alter table participants enable row level security;
alter table etape_participants enable row level security;
alter table materiel_items enable row level security;
alter table materiel_apports enable row level security;

create policy "authenticated read/write treks" on treks
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write etapes" on etapes
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write hebergements" on hebergements
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write participants" on participants
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write etape_participants" on etape_participants
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write materiel_items" on materiel_items
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write materiel_apports" on materiel_apports
  for all to authenticated using (true) with check (true);

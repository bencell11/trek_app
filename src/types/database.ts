export type HebergementType = "refuge" | "bivouac" | "hotel" | "autre";
export type StatutReservation = "a_faire" | "en_cours" | "confirme";

export type Trek = {
  id: string;
  nom: string;
  description: string | null;
  section_via_alpina: string | null;
  date_debut: string | null;
  date_fin: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Etape = {
  id: string;
  trek_id: string;
  ordre: number;
  nom: string;
  point_depart: string | null;
  point_arrivee: string | null;
  date: string | null;
  distance_km: number | null;
  denivele_positif: number | null;
  denivele_negatif: number | null;
  duree_estimee_h: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Hebergement = {
  id: string;
  etape_id: string;
  nom: string;
  type: HebergementType;
  latitude: number | null;
  longitude: number | null;
  contact: string | null;
  statut_reservation: StatutReservation;
  prix_chf: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Participant = {
  id: string;
  trek_id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  user_id: string | null;
  created_at: string;
};

export type EtapeParticipant = {
  etape_id: string;
  participant_id: string;
};

export type MaterielItem = {
  id: string;
  trek_id: string;
  etape_id: string | null;
  nom: string;
  categorie: string | null;
  quantite_requise: number;
  notes: string | null;
  created_at: string;
};

export type MaterielApport = {
  id: string;
  materiel_item_id: string;
  participant_id: string;
  quantite: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      treks: {
        Row: Trek;
        Insert: Partial<Trek>;
        Update: Partial<Trek>;
        Relationships: [];
      };
      etapes: {
        Row: Etape;
        Insert: Partial<Etape>;
        Update: Partial<Etape>;
        Relationships: [];
      };
      hebergements: {
        Row: Hebergement;
        Insert: Partial<Hebergement>;
        Update: Partial<Hebergement>;
        Relationships: [];
      };
      participants: {
        Row: Participant;
        Insert: Partial<Participant>;
        Update: Partial<Participant>;
        Relationships: [];
      };
      etape_participants: {
        Row: EtapeParticipant;
        Insert: Partial<EtapeParticipant>;
        Update: Partial<EtapeParticipant>;
        Relationships: [];
      };
      materiel_items: {
        Row: MaterielItem;
        Insert: Partial<MaterielItem>;
        Update: Partial<MaterielItem>;
        Relationships: [];
      };
      materiel_apports: {
        Row: MaterielApport;
        Insert: Partial<MaterielApport>;
        Update: Partial<MaterielApport>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

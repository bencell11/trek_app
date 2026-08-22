export type MaterielItemBase = {
  quantiteRequise: number;
  capacitePersonnes?: number;
  apports: { quantite: number }[];
};

export type Couverture = {
  requis: number;
  couvert: number;
  manque: number;
  // "places" pour un abri dont le besoin dépend du nombre de participants,
  // "" (unités brutes) pour un item classique compté à la pièce.
  unite: "places" | "";
};

/**
 * Pour un abri (tente...), le besoin n'est pas une quantité saisie à la
 * main : c'est le nombre de participants concernés (présents sur l'étape
 * si l'item y est lié, sinon tout le trek), et la couverture est la somme
 * des unités apportées multipliée par leur capacité en personnes.
 */
export function calculerCouverture(
  item: MaterielItemBase,
  participantsConcernes: number
): Couverture {
  const apporte = item.apports.reduce((sum, a) => sum + a.quantite, 0);

  if (item.capacitePersonnes && item.capacitePersonnes > 0) {
    const couvert = apporte * item.capacitePersonnes;
    return {
      requis: participantsConcernes,
      couvert,
      manque: Math.max(0, participantsConcernes - couvert),
      unite: "places",
    };
  }

  return {
    requis: item.quantiteRequise,
    couvert: apporte,
    manque: Math.max(0, item.quantiteRequise - apporte),
    unite: "",
  };
}

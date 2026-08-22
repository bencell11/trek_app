export type MaterielItemBase = {
  quantiteRequise: number;
  capacitePersonnes?: number;
  apports: { participantId: string; quantite: number }[];
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
 * Pour un abri (tente...), le besoin correspond aux participants présents
 * sur le périmètre donné (une étape précise, ou tout le trek), et la
 * couverture ne compte que les apports des participants effectivement
 * présents sur ce périmètre — un abri suit son propriétaire sur tous ses
 * jours de présence, pas une étape unique.
 */
export function calculerCouverture(
  item: MaterielItemBase,
  participantsPresents: Set<string>
): Couverture {
  if (item.capacitePersonnes && item.capacitePersonnes > 0) {
    const couvert = item.apports
      .filter((a) => participantsPresents.has(a.participantId))
      .reduce((sum, a) => sum + a.quantite * item.capacitePersonnes!, 0);
    return {
      requis: participantsPresents.size,
      couvert,
      manque: Math.max(0, participantsPresents.size - couvert),
      unite: "places",
    };
  }

  const apporte = item.apports.reduce((sum, a) => sum + a.quantite, 0);
  return {
    requis: item.quantiteRequise,
    couvert: apporte,
    manque: Math.max(0, item.quantiteRequise - apporte),
    unite: "",
  };
}

export type ObservationType = "M" | "NM" | "NJ";

export interface ObservationChoice {
  observation: string;
  type: ObservationType;
}

export const OBSERVATION_LIST_CHOICE: ObservationChoice[] = [
  { observation: "Autoriser", type: "NM" },
  { observation: "Congé", type: "M" },
  { observation: "Circoncision", type: "M" },
  { observation: "Congé Sans Solde", type: "NM" },
  { observation: "Décès Proche", type: "M" },
  { observation: "Décès non Proche", type: "NM" },
  { observation: "Formation", type: "M" },
  { observation: "Jours Fériés", type: "M" },
  { observation: "Malade Non Justifié", type: "NJ" },
  { observation: "Malade", type: "NM" },
  { observation: "Malade Familiale", type: "NM" },
  { observation: "Mariage", type: "M" },
  { observation: "Mariage Proche", type: "M" },
  { observation: "Mariage Non Proche", type: "NM" },
  { observation: "Mission", type: "M" },
  { observation: "Non Justifié", type: "NJ" },
  { observation: "Nouveau né", type: "M" },
  { observation: "Récupération", type: "M" },
];

export const OBSERVATION_TYPE_LABEL: Record<ObservationType, string> = {
  M: "Monétaire",
  NM: "Non Monétaire",
  NJ: "Non Justifié",
};

// Tailwind classes mapped to the design tokens (success / warning / destructive)
export const OBSERVATION_TYPE_STYLE: Record<ObservationType, { badge: string; block: string; dot: string }> = {
  M: {
    badge: "bg-success/15 text-success border-success/30",
    block: "bg-success/5 border-success/30 text-success",
    dot: "bg-success",
  },
  NM: {
    badge: "bg-warning/15 text-warning border-warning/30",
    block: "bg-warning/5 border-warning/30 text-warning",
    dot: "bg-warning",
  },
  NJ: {
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    block: "bg-destructive/5 border-destructive/30 text-destructive",
    dot: "bg-destructive",
  },
};

export function findObservation(name: string | null | undefined): ObservationChoice | undefined {
  if (!name) return undefined;
  return OBSERVATION_LIST_CHOICE.find((o) => o.observation === name);
}

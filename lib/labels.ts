export const LEVEL_LABEL = { nizsi: "Nižší gymnázium", vyssi: "Vyšší gymnázium" } as const;
export type Level = keyof typeof LEVEL_LABEL;

// Палитра Box by Box: красный упаковочный скотч и крафт-картон на нейтральной
// бумаге. Компоненты и экраны берут цвета только отсюда.

export const light = {
  background: "#F1F0EC",
  backgroundAlt: "#E7E5DE",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F6F2",
  border: "#E0DDD4",
  ink: "#1F1C1A",
  inkMuted: "#665F58",
  inkFaint: "#A49C93",
  onAccent: "#FFFFFF",
  accent: "#B81D14",
  accentSoft: "#F6DEDB",
  // Крафт — коробки и бирки; бирюза — «успеваем», янтарь — риск.
  kraft: "#C79A62",
  kraftSoft: "#F1E4D2",
  teal: "#1F7A6E",
  tealSoft: "#D8EDE9",
  amber: "#B07614",
  danger: "#B3362F",
  success: "#1F7A6E",
  signal: "#9C5F12",
  scrim: "rgba(31,28,26,0.45)",
  statusDimmed: "#8C8A86",
};

export const dark = {
  background: "#141210",
  backgroundAlt: "#1B1916",
  surface: "#23201C",
  surfaceAlt: "#2B2823",
  border: "#37332D",
  ink: "#F2EFEA",
  inkMuted: "#B3ACA3",
  inkFaint: "#7A736B",
  onAccent: "#FFFFFF",
  accent: "#E2564B",
  accentSoft: "#3D211E",
  kraft: "#D9B07C",
  kraftSoft: "#3A2F22",
  teal: "#4FB3A4",
  tealSoft: "#1C3330",
  amber: "#E0A040",
  danger: "#E0675F",
  success: "#4FB3A4",
  signal: "#E0A040",
  scrim: "rgba(0,0,0,0.6)",
  statusDimmed: "#090807",
};

export type Palette = typeof light;

export const KINDS = ["kitchen", "bath", "bedroom", "living", "office", "kids", "storage"] as const;
export const KIND_LABEL: Record<string, string> = { kitchen: "Kitchen", bath: "Bathroom", bedroom: "Bedroom", living: "Living room", office: "Office", kids: "Kids' room", storage: "Storage" };
export const KIND_COLORS: Record<string, string> = { kitchen: "#C2562E", bath: "#3E86A8", bedroom: "#6A5AA8", living: "#3E8A5A", office: "#4E5D78", kids: "#C28A1E", storage: "#8A7A66" };

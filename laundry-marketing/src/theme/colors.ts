/**
 * Laundri marketing palette (sync with src/styles/theme.css / logo).
 */
export const colors = {
  primary: "#00BCD4",
  primaryHover: "#00A3B8",
  accent: "#FF9800",
  accentHover: "#F57C00",
  navy: "#1A237E",
  background: "#FFFFFF",
  section: "#F8F9FA",
  text: "#212529",
  textSecondary: "#6C757D",
} as const;

export type Colors = typeof colors;

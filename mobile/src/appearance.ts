import type { AppearanceMode, WebAppearanceMessage } from "./bridge";
export type NativeAppearance = WebAppearanceMessage["payload"];
// Bootstrap fallback only. Once connected, the web sends its actual CSS token values.
// Parity with globals.css is verified by the appearance contract tests.
export const nativePalettes = {
  light: {
    background: "rgb(251, 250, 247)",
    foreground: "rgb(9, 10, 13)",
    card: "rgb(246, 246, 243)",
    mutedForeground: "rgb(83, 88, 97)",
    primary: "rgb(31, 60, 108)",
    primaryForeground: "rgb(251, 250, 247)",
  },
  dark: {
    background: "rgb(11, 13, 18)",
    foreground: "rgb(236, 235, 232)",
    card: "rgb(19, 22, 28)",
    mutedForeground: "rgb(149, 152, 159)",
    primary: "rgb(116, 153, 214)",
    primaryForeground: "rgb(4, 6, 9)",
  },
} as const;
export function bootstrapAppearance(mode: AppearanceMode): NativeAppearance {
  return { mode, colors: nativePalettes[mode] };
}

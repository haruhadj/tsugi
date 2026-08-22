// Colour scheme catalogue (D56/D57, context/progress-tracker.md). The CSS itself
// lives in globals.css under `[data-palette]`; this file is only the id list
// and the swatch hex used to render the picker in Settings.
//
// "raiden" is the default (D57) and, uniquely, overrides the ground tokens too —
// it's sampled from the logo (public/logo.png), not layered on the zinc base like
// the other four. "rose" is the old "Curation Desk" direction it replaced,
// preserved as a selectable scheme with its own ground override.
export const PALETTES = [
  { id: "raiden", label: "Raiden", primary: "#542C84", highlight: "#D0B070" },
  { id: "rose", label: "Rose", primary: "#F43F5E", highlight: "#F59E0B" },
  { id: "indigo", label: "Indigo", primary: "#6366F1", highlight: "#D946EF" },
  { id: "emerald", label: "Emerald", primary: "#10B981", highlight: "#A3E635" },
  { id: "violet", label: "Violet", primary: "#8B5CF6", highlight: "#FB7185" },
  { id: "sky", label: "Sky", primary: "#0EA5E9", highlight: "#F59E0B" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "raiden";

export const PALETTE_IDS = PALETTES.map((p) => p.id);

export function isPaletteId(value: string): value is PaletteId {
  return (PALETTE_IDS as string[]).includes(value);
}

// Read client-side only, before paint — see the inline script in RootLayout.
export const PALETTE_COOKIE = "tsugi-palette";

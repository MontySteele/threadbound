// Character display names, shared by App, LoomEye, and TapestryOverlay.
// Lives outside App.tsx so the overlays don't import the component that
// imports them (App ↔ overlay cycle).

export const CHAR_NAME: Record<string, string> = { vess: 'Vess, the Hexweaver', bram: 'Bram, the Cinderfist' };

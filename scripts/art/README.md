# Art pipeline (M3-B6)

The game currently ships the **procedural sigil set** (`packages/client/src/sigils.tsx`)
— deterministic SVG marks, whole-set consistent by construction. This pipeline
exists to replace that set wholesale with AI-generated portraits **only if the
generated set can hold one style**. Mixing sets is forbidden (M3 plan B6).

## Pipeline

1. **Generate** one image per entry in `prompts.json` using the shared style
   template (below) + the per-entity subject line. Any image model; keep the
   model + seed in `generation-log.json` so regeneration is cheap.
2. **Post-process identically** (consistency beats per-image quality):
   ```bash
   ./post-process.sh raw/ out/    # palette-quantize → vignette → frame → crop
   ```
3. Drop `out/*.png` into `packages/client/public/art/` named `<entity_id>.png`.
   The client auto-prefers a portrait file over the sigil when present
   (see `sigils.tsx` — `Portrait` wrapper, TODO on adoption).
4. **Designer review against /?style before adopting.** If more than ~3 images
   fight the set's style, abandon the pass and keep sigils (sanctioned fallback).

## Style template (prepend to every prompt)

> Dark gothic painterly portrait, muted parchment-and-umber palette
> (#14110f ground, #d8cfc0 light, single accent hue), single subject centered
> on a neutral dark ground, no text, no border, square crop, soft top light,
> heavy shadow, matte texture, somber — never cartoonish, never glossy.

## Fallbacks (in order)

1. Procedural sigils (current, shipped).
2. CC0 dark-fantasy portrait packs (itch.io) run through the same post-process.
3. Typographic sigil cards intensified (= option 1, more so).

# Threadbound — S22-R1 rider: The Overture (the title crawl)

**Charter (designer, 2026-07-07):** the game currently opens with no
context at all. Add a short scrolling text — an intro movie in the
oldest sense — that fires on arrival, repeats on title-screen idle,
and always carries a skip. One screen of fluff, doing exactly one job:
hand a stranger the PERMITTED MISREADING (§5b: "descent to Hell") so
their first run makes sense, while the held-reveal law keeps
everything it protects.

**Scope:** client-only; title screen only; strings stall at the table
below; no art (B6 untouched — the crawl plays over the existing title
field/vignette); no Witness voice (S20 ruling: it has not met them
yet — this is AUTHORIAL text, the epigraph's register).

## Writing law for every line (rejection criteria)

1. Funeral direction ONLY. No births, no mirror, no cradle, no dawn,
   no "carried up." The crawl may imply the descent is toward
   something terrible; it may not say what is actually there.
2. Canon-true under permitted simplification: nothing false, much
   withheld — the crawl obeys the same discipline as the Witness even
   though it is not the Witness.
3. Word-drawer lexicon; austere; no proper nouns beyond the Loom.
4. The final line is St-e1 verbatim — the crawl resolves into the
   title it decorates.

## The proposed crawl (PROVISIONAL rev. 2 — signs as one row; rev. 1's
middle read stilted per designer, lines 1 and 5 kept)

> There was one rite, once, and one machine to keep it:
> the Loom, which carried the dead out of the world.
>
> When the world stopped agreeing with itself, so did the Loom —
> and the rite jammed, half-turned, unfinished.
>
> The dead still go down. But nothing carries them now,
> and the dark below is crowded with the half-carried.
>
> So the living go down after the dead, to walk the rite's road
> and finish it by hand — for the way is long,
> and it was never work for one.
>
> Two go down together, bound by one thread.

(Line 5 = St-e1; on resolve, the title and epigraph are already on
screen — the crawl literally becomes the title screen. "The
half-carried" is the lore bible's own cargo term — the crawl teaches
the word Act 1 is full of. "The living go down" holds true across all
four q_came origins — a fleeing pair was never sent.)

## Mechanics (D-rows)

| # | behavior | spec |
|---|---|---|
| O-1 | first arrival | auto-plays once per browser (`tb_overture_seen`, the tutorial-dismissal pattern); never auto-plays again after a skip or a completion |
| O-2 | attract loop | on the TITLE screen only, after 150s of inactivity, the crawl replays; any input ends it instantly; it never plays over an open lobby, join flow, or the how-to overlay |
| O-3 | skip | always visible ("skip — Esc"), plus Esc/Space/click-anywhere; skipping is instant, no fade-out tax |
| O-4 | motion | prefers-reduced-motion: the scroll becomes a paced fade sequence, same lines, same skip |
| O-5 | duration | full read ~35–45s; the scroll speed is derived from line count so future edits don't need retiming |
| O-6 | voice option | RECOMMENDED (a) authorial prose as proposed. Enumerated for the record: (b) frame as a funeral-liturgy fragment — REJECTED here because §10.7 (the chant) is explicitly deferred until roles lock; (c) hybrid available later — when the chant ratifies, its first verse may REPLACE lines 1–2, one sign-off row, no retiming |

## Sign-off table (STALLS)

| # | row | status |
|---|---|---|
| Ov-1 | the five-stanza crawl text above | PROVISIONAL |
| Ov-2 | the skip label ("skip — Esc") | PROVISIONAL |

## Exit gates

Suite green; parity untouched (client-only); screenshot/recording of
one full play + one skip + one reduced-motion pass in
docs/reference/; the designer smoke item: arrive fresh (cleared
storage), read it cold, and answer one question — "do I know why I am
descending?" If yes, the rider passes.

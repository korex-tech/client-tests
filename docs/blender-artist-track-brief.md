# Hiring a Blender artist for Marble Racing tracks — new-session starter

Paste the prompt below into a NEW Claude session to kick off the hire. It's
self-contained (a fresh session won't have this chat's history).

---

## Session-starter prompt (copy this)

> I'm building **KOREX Marble Racing** — a deterministic, provably-fair marble
> racing game (three.js + Rapier WASM physics, headless Node sim with
> record-and-replay; repo `korex-tech/marble-race`). I need to **hire a Blender
> artist to create the 3D race tracks**, and I want your help producing a
> hire-ready brief, a sourcing plan, and a screening process.
>
> **Context the artist must work within:**
> - Tracks are physics courses marbles roll down — they must work with our Rapier
>   physics sim, so geometry needs **clean, accurate collision meshes** and
>   **real-world scale**, not just pretty visuals.
> - Engine constraint today: courses must be **z-monotonic** (run downhill,
>   start→finish; **no closed loops yet** — closed circuits are a queued feature).
>   Banking curves, ramps, funnels, obstacles, shortcuts, speed pads are all in scope.
> - **Visual style — "KoreX Racing Style Bible / Clean Futurism":** glossy metallic
>   silver & white PBR surfaces (white `#F0F2F5`, silver `#C0C0C0`), **electric
>   purple `#9400D3`** + **neon cyan `#00FFFF`** emissive accents, bright high-key
>   studio lighting, sharp aerodynamic geometry, distinct edge borders. **No fog,
>   smoke, or grit.** Everything reads cleanly from a top-down / spectator camera.
>   Reference kit: Kenney Marble Kit (CC0).
> - **Tracks to build first (3):** Mountain (stability/endurance-favouring, tight
>   and technical), Sprint (speed-favouring, long straights + gentle banks), and a
>   stadium "arena" look for league races.
> - **Deliverables per track:** Blender source (`.blend`) + **GLB** export; separate
>   **visual mesh and simplified collision mesh**; PBR materials in the palette;
>   modular pieces where possible; correct scale/orientation for three.js; a
>   web-appropriate poly budget.
>
> **Help me with:**
> 1. A complete, professional **job brief / spec sheet** to send candidates (scope,
>    deliverables, file formats, style, technical constraints, milestones).
> 2. **Where to find** the right artist (ArtStation, Blender Market, Polycount,
>    Upwork / Fiverr Pro, Blender/game-dev Discords) and how to shortlist.
> 3. **Screening questions + a small paid test task** that proves physics-friendly
>    topology *and* on-style results.
> 4. Rough **budget and timeline** guidance.
>
> Ask me anything you need first, then produce the brief.

---

## Notes for whoever runs that session
- The Style Bible lives at `docs/KOREX-RACING-STYLE-BIBLE.md` in `korex-tech/client-tests`.
- The full game/economy spec and blueprint review live in the same `docs/` folder.
- Confirm with the owner: three.js up-axis (Y-up vs Z-up), target poly budget,
  whether to extend the Kenney kit or build bespoke, and licensing/ownership terms.

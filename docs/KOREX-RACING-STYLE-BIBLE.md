# KoreX Racing — Visual Style Bible

**Purpose:** Consistent, high-fidelity, premium esports aesthetic for all
generated assets, textures, images, UI, and Three.js materials. Keep this in
context; apply it to every asset/code/image suggestion. This is the **Marble
Racing** product look (distinct from the darker KOREX gambling brand).

> Quick correction protocol: if a generated asset drifts gritty/dark, it violates
> "Clean Futurism" — regenerate brighter, prioritising the silver/purple scheme.

## 1. Core visual principles
- **Aesthetic — "Clean Futurism":** high-contrast, minimalist, sharp, highly
  legible. No cluttered backgrounds, fog, smoke, or gritty textures.
- **Lighting — "Studio Professional":** even, high-key lighting; sharp directional
  shadows to emphasise 3D form. No dim or murky lighting.
- **Materials (PBR):**
  - *Track surface* — glossy silver/white. Roughness `0.1–0.2` (smooth, not
    mirrored), Metalness `0.8–1.0`.
  - *Accents* — electric purple `#9400D3` and neon cyan `#00FFFF`, high emission
    intensity for self-illuminated glow.
  - *Transparency* — sparing (glass barriers, UI only); prioritise solid
    high-tech surfaces.

## 2. Color palette
- **Primary (structure):** White `#F0F2F5`, Silver `#C0C0C0`.
- **Primary accent (brand):** Electric Purple `#9400D3`.
- **Secondary accent (highlights/UI):** Neon Cyan `#00FFFF`.
- **Forbidden:** muddy browns, dark grays, desaturated "concrete." Everything
  reads synthetic, clean, manufactured.

## 3. Asset design rules
- **Form:** sharp, geometric, aerodynamic. Clean splines, banking curves, distinct
  edge borders.
- **Readability:** identifiable from a top-down / spectator camera. No tiny
  details that vanish at distance.
- **UI / broadcast:** overlays look like broadcast graphics — bold, condensed,
  sans-serif typefaces; high contrast (white/cyan text on dark-purple panels).

## 4. Prompting template (for consistent asset generation)
> "A 3D [Asset Name], KoreX Racing style, premium esports aesthetic. Surfaces:
> glossy metallic silver and white PBR materials. Accents: neon cyan and electric
> purple emissive strips. Clean lighting, high contrast, studio environment, no
> fog, sharp geometry, 8k resolution, Unreal Engine 5 render style."

## 5. How to use this in the workflow
- **Asset/texture:** "Based on the Style Bible, generate a [texture map / asset
  description / shader code] for a [track obstacle / UI element]."
- **Drift correction:** "This asset is too dark and gritty — it violates 'Clean
  Futurism.' Re-generate brighter, prioritise the silver/purple scheme."
- **Three.js materials:** "Using the MeshStandardMaterial settings from the Style
  Bible, create a shader that makes the purple accents pulse with emissive
  intensity 2.0."

# Design — Chanya.jp

Locked multi-page design system. Future Hallmark runs read this file first;
pages defer to it. Amend intentionally — this file is the rule.

## System

- Genre · modern-minimal
- Theme · Cobalt
- Axes · cool paper / engineered grotesk / electric cobalt signal
- Audience · work contacts and the VRChat community
- Purpose · make the person, technical work, and photography easy to reach
- Tone · technical / austere / specific
- Enrichment · owned profile and VRChat photography only; no generated imagery

## Page families

- Home · Split Studio; preserve its existing hero and page rhythm.
- About · Long Document profile spread; portrait, identity, and facts form one composition.
- Development · Index-First; projects are ruled records, not feature cards.
- Gallery · Catalogue; a compact inventory masthead leads directly into an
  irregular, manifest-driven field of owned photographs.
- Gallery Admin · Workbench; the public `GalleryCanvas` remains the primary
  surface while a sticky command rail and one Inspector add editing controls.
- Contact / Other · Index-First directory; the links are the interface.
- RuntimeHtml · Component Playground; the live editor and preview are the primary content.
- 404 · sparse Index-First recovery page.

Shared chrome stays N1b (wordmark, route cluster, Contact, visible Cmd/Ctrl-K)
with Ft2 inline footer. Page families may change structure, never palette,
type, control geometry, navigation, or footer voice.

## Canonical tokens

`src/styles/design-tokens.ts` is the source of truth. Vanilla Extract exposes
these values as CSS custom properties; page styles never improvise raw colours
or font families.

```css
:root {
  --color-paper:      oklch(98.1% 0.008 255);
  --color-paper-2:    oklch(100% 0 0);
  --color-paper-3:    oklch(95.5% 0.012 255);
  --color-ink:        oklch(24% 0.025 260);
  --color-ink-2:      oklch(45% 0.025 260);
  --color-rule:       oklch(86% 0.018 255);
  --color-accent:     oklch(54% 0.22 263);
  --color-accent-2:   oklch(42% 0.2 263);
  --color-accent-ink: oklch(97.5% 0.008 255);
  --color-focus:      oklch(54% 0.22 263);

  --font-display: "Space Grotesk Variable", "Space Grotesk", sans-serif;
  --font-body:    "Inter Variable", Inter, sans-serif;
  --font-outlier: "JetBrains Mono Variable", "JetBrains Mono", monospace;

  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem;
  --space-4: 1rem;   --space-6: 1.5rem; --space-8: 2rem;
  --space-12: 3rem;  --space-16: 4rem;  --space-24: 6rem;

  --radius-card: .75rem;
  --radius-input: .375rem;
  --radius-sharp: .125rem;
  --radius-pill: 999px;

  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --dur-micro: 120ms;
  --dur-base: 280ms;
}
```

## Layout rules

- Non-home mastheads stay compact: `h1` caps at 3.25rem and content starts in the first viewport.
- About may use one composed image/text spread; Gallery may use an irregular image grid.
- Gallery layouts use only three authored spans: standard, wide, and feature.
  The editor and published route render the same component, markup, focal point,
  caption, and responsive image rules.
- Gallery Admin keeps the canvas at the public width. Its Inspector overlays
  from the right at desktop sizes and from the bottom on small screens.
- Development, Contact, and Other use ruled rows rather than bordered card grids.
- Never reuse one generic two-column intro across every route.
- Section rhythm is intentionally uneven. Accent occupies less than 5% of a viewport.
- At 320, 375, 414, and 768px: no clipped content, no horizontal scroll,
  no overlapping masthead columns, and every touch target is at least 44px.

## CTA and interaction voice

- Primary · cobalt fill / accent-ink / 6px radius / one-line verb.
- Secondary · transparent, one-pixel rule / same radius.
- Index links · the full row is the control; title and destination remain visible.
- Focus rings appear instantly. Hover effects only run on hover-capable pointers.
- Gallery zoom, command palette, and RuntimeHtml controls retain keyboard equivalents.

## Motion stance

- Content and index pages are composed and static.
- Gallery uses one restrained image-scale affordance; RuntimeHtml uses state feedback only.
- Gallery Admin motion is limited to three stateful actions: FLIP reorder,
  save-status opacity, and Inspector open/close. All use transform/opacity.
- No scroll choreography is added to non-home routes.
- Reduced-motion fallback is an opacity-only transition of 150ms or less.

## Gallery publishing model

- R2 is the v1 source of truth for immutable managed originals,
  the atomic `manifests/state.json` draft/published pair, and revision snapshots.
- The checked-in 42 photographs remain a seed fallback and keep their existing
  static AVIF/WebP paths. New photographs use UUID object keys.
- Public URLs expose only Images-binding transformations; original R2 objects
  have no route.
- Cloudflare Access protects `/admin/gallery*` with GitHub as its only IdP;
  the Worker also verifies issuer, audience, and the single administrator email.
- Draft saves use a base version, mutation UUID, conditional R2 write, and a
  canonical `409` response. Publishing updates the validated published half in
  the same atomic state object, so a concurrent draft save cannot be skipped.
- Removing a photograph is reversible manifest editing. This interface never
  deletes an R2 original.

## Exports

The project consumes the canonical TypeScript tokens directly. These mappings
are portable references; they do not add Tailwind or shadcn to this project.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(98.1% 0.008 255);
  --color-paper-2: oklch(100% 0 0);
  --color-paper-3: oklch(95.5% 0.012 255);
  --color-ink: oklch(24% 0.025 260);
  --color-ink-2: oklch(45% 0.025 260);
  --color-rule: oklch(86% 0.018 255);
  --color-accent: oklch(54% 0.22 263);
  --color-accent-ink: oklch(97.5% 0.008 255);
  --color-focus: oklch(54% 0.22 263);
  --font-display: "Space Grotesk Variable", "Space Grotesk", sans-serif;
  --font-body: "Inter Variable", Inter, sans-serif;
  --font-outlier: "JetBrains Mono Variable", "JetBrains Mono", monospace;
  --spacing-1: .25rem; --spacing-2: .5rem; --spacing-4: 1rem;
  --spacing-6: 1.5rem; --spacing-8: 2rem; --spacing-12: 3rem;
  --radius-card: .75rem; --radius-input: .375rem;
  --ease-out: cubic-bezier(.22, 1, .36, 1);
}
```

### DTCG

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(98.1% 0.008 255)", "$type": "color" },
    "paper-2": { "$value": "oklch(100% 0 0)", "$type": "color" },
    "paper-3": { "$value": "oklch(95.5% 0.012 255)", "$type": "color" },
    "ink": { "$value": "oklch(24% 0.025 260)", "$type": "color" },
    "ink-2": { "$value": "oklch(45% 0.025 260)", "$type": "color" },
    "rule": { "$value": "oklch(86% 0.018 255)", "$type": "color" },
    "accent": { "$value": "oklch(54% 0.22 263)", "$type": "color" },
    "accent-ink": { "$value": "oklch(97.5% 0.008 255)", "$type": "color" },
    "focus": { "$value": "oklch(54% 0.22 263)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Space Grotesk Variable, Space Grotesk, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Inter Variable, Inter, sans-serif", "$type": "fontFamily" },
    "outlier": { "$value": "JetBrains Mono Variable, JetBrains Mono, monospace", "$type": "fontFamily" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "base": { "$value": "280ms", "$type": "duration" }
  }
}
```

### shadcn/ui variables

```css
:root {
  --background: 98.1% 0.008 255;
  --foreground: 24% 0.025 260;
  --card: 100% 0 0;
  --card-foreground: 24% 0.025 260;
  --popover: 100% 0 0;
  --popover-foreground: 24% 0.025 260;
  --primary: 54% 0.22 263;
  --primary-foreground: 97.5% 0.008 255;
  --secondary: 95.5% 0.012 255;
  --secondary-foreground: 24% 0.025 260;
  --muted: 95.5% 0.012 255;
  --muted-foreground: 45% 0.025 260;
  --accent: 54% 0.22 263;
  --accent-foreground: 97.5% 0.008 255;
  --border: 86% 0.018 255;
  --input: 86% 0.018 255;
  --ring: 54% 0.22 263;
  --radius: .375rem;
}
```

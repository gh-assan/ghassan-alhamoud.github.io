# Image Migration — Plan & Progress

## Objective
Replace the generic `og-default.png` fallback with per-article OG images from `articles-tmp/Articles/IMG/`, optimized for web and responsive across social previews.

---

## Execution Log

| Step | Status | Description |
|------|--------|-------------|
| Analysis | ✅ Done | Mapped 21 IMG source files to 23 articles; identified 3 with no source image |
| Image conversion | ✅ Done | Resized all to 1200×630px, converted to WebP + JPEG at quality 85 |
| Placeholder generation | ✅ Done | Created dark gradient placeholders for ART-017, ART-021, ART-024 |
| HTML update | ✅ Done | Updated all 23 article files' `og:image` and `twitter:image` to per-article URLs |
| Source files | ⏳ User | User will move `articles-tmp/Articles/IMG/` outside the project manually |

## Results

**Before:**
- 21 source PNG files, ~70 MB total, dimensions up to 2848×1536px
- All articles using generic `og-default.png`

**After:**
- 46 output files (23 WebP + 23 JPEG) in `/images/articles/`
- **4.7 MB total** (93% reduction from source)
- Average: ~100 KB per file
- Each article now has its own OG preview image

---

## Current State (Source)

### Source images: `articles-tmp/Articles/IMG/` (22 files)
| File | Size | Dimensions | Article ID |
|------|------|-----------|------------|
| ART001.png | 1.9 MB | 1424×736 | ART002 — Agent Reasoning Fallacy |
| ART002.png | 1.8 MB | 1424×736 | ART002 (same article, diff file naming) |
| ART003.png | 2.1 MB | 1424×736 | ART003 — Agent Black Box |
| ART004.png | 1.9 MB | 1424×736 | ART004 — Startup Intelligence |
| ART005.png | 1.8 MB | 1424×736 | ART005 — Ideation Engine |
| ART006.png | 1.9 MB | 1424×736 | ART006 — Agent Reliability |
| ART007.png | 1.7 MB | 1424×736 | ART007 — Compliance-as-Code |
| ART008.png | 2.0 MB | 1424×736 | ART008 — Agent Attestation |
| ART009.png | 2.6 MB | 1424×736 | ART009 — Crunchbase Treadmill |
| ART010.png | 1.7 MB | 1424×736 | ART010 — EchoWeave |
| ART011.png | 2.3 MB | 1424×736 | ART011 — DreamForge |
| ART012.png | 2.1 MB | 1424×736 | ART012 — Negotiation Veteran |
| ART14.png | 5.9 MB | 2760×1504 | ART014 — Memory Architecture |
| ART15.png | 2.8 MB | 1312×816 | ART015 — Boring Automation |
| ART16.png | 1.3 MB | 1408×768 | ART-016 — Automation Pattern |
| ART18.png | 7.0 MB | 2848×1472 | ART-018 — Stress Test |
| ART19.png | 5.4 MB | 2816×1536 | ART-019 — Issue Management |
| ART20.png | 4.9 MB | 2816×1536 | ART-020 — (no matching article, skip) |
| ART22.png | 6.8 MB | 2848×1472 | ART-022 — Workspace Indexing |
| ART23.png | 7.6 MB | 2848×1472 | ART-023 — 5 Failures |
| ART0.png | 1.9 MB | 1408×768 | ART-001 — Agent Soup Compilers? |
| AGENT-negotiation.jpg | 64 KB | (check) | ART-012 alternative? or earlier version |

### Target: `/images/articles/` directory
- Per-article OG images for all 23 articles
- Each named by article ID: `ART-001.png`, `ART002.png`, etc.
- Optimized drastically (current images are 1.3–7.6 MB each)

### Missing article images
These articles have NO image yet:
- ART-001 (has ART0.png — likely a generic draft)
- ART-013 (A2A Negotiation Outreach)
- ART-017 (42 Automation Opportunities) — has image prompt referencing 1200×627px hero
- ART-024 (5 Infrastructure Layers)

### Image Naming Mismatches
| IMG File | Actual Article | Action |
|----------|---------------|--------|
| ART0.png | Likely ART-001 | Rename → ART-001.png |
| ART001.png | ART002 (by date/content) | Keep as ART002.png |
| ART002.png | ART003 | Keep as ART003.png |
| ... (shifts by 1) | ... | Map correctly |
| ART20.png | No matching article (ART-020 doesn't exist) | Skip/archive |
| ART14.png | ART014 | Rename → ART014.png |
| ART15.png | ART015 | Rename → ART015.png |
| ART16.png | ART-016 | Use for ART-016 |

---

## Image Mapping (IMG file → Article ID → Slug)

| IMG File | Maps To Article | Target Filename |
|----------|----------------|-----------------|
| ART0.png | ART-001 (stop-building-agent-soup-compilers) | `ART-001.png` |
| ART001.png | ART002 (agent-reasoning-discovery-fallacy) | `ART002.png` |
| ART002.png | ART003 (agent-black-box-skill-ledger) | `ART003.png` |
| ART003.png | ART004 (startup-intelligence-entity-graph) | `ART004.png` |
| ART004.png | ART005 (systematic-ideation-engine) | `ART005.png` |
| ART005.png | ART006 (agent-reliability-sla-infrastructure) | `ART006.png` |
| ART006.png | ART007 (compliance-as-code-eu-ai-act) | `ART007.png` |
| ART007.png | ART008 (agent-execution-attestation) | `ART008.png` |
| ART008.png | ART009 (startupgraph-insights-engine) | `ART009.png` |
| ART009.png | ART010 (echoweave-on-device-narrative-os) | `ART010.png` |
| ART010.png | ART011 (dreamforge-automation-pipeline) | `ART011.png` |
| ART011.png | ART012 (negotiation-veteran-collapse-llm-coach) | `ART012.png` |
| ART012.png | ART-013 (a2a-negotiation-outreach) | `ART-013.png` |
| ART14.png | ART014 (every-token-is-rent-memory-architecture) | `ART014.png` |
| ART15.png | ART015 (most-boring-automation-self-improving) | `ART015.png` |
| ART16.png | ART-016 (automation-pattern-6-industries) | `ART-016.png` |
| ART18.png | ART-018 (stress-test-self-healing-250-target) | `ART-018.png` |
| ART19.png | ART-019 (issue-management-system-property) | `ART-019.png` |
| ART22.png | ART-022 (workspace-indexing-3ms) | `ART-022.png` |
| ART23.png | ART-023 (5-failures-building-agent-3-months) | `ART-023.png` |
| AGENT-negotiation.jpg | ART-012 alternative (small 64KB) | Skip (ART012.png is better) |

**Missing images for:** ART-017 (has image prompt), ART-021, ART-024

---

## Optimization Strategy

### Why optimize?
Current average: **3.3 MB per image**. Cumulative: **~70 MB**. 
Target: **under 200 KB per image** (standard for OG cards). Cumulative: ~4.5 MB.

### Optimization steps (per image):
1. **Resize to 1200×630px** — standard OG image size (LinkedIn, Twitter, Slack, WhatsApp)
2. **Convert to WebP** — ~30% smaller than PNG with same quality
3. **Generate JPEG fallback** — for platforms that don't support WebP
4. **Quality: 85%** — visually lossless for social preview cards

### Output files:
```
/images/articles/
  ART-001.webp   (primary, ~60-120 KB)
  ART-001.jpg    (fallback, ~80-150 KB)
  ART002.webp
  ART002.jpg
  ... (for each article)
```

### Image dimensions for responsive:
- **Desktop/LinkedIn**: 1200×630px (OG standard, 1.91:1 ratio)
- No need for separate mobile images — OG images are only used as social share previews, always the same size across devices

---

## Execution Steps

### Step 1: Create output directory
```
mkdir -p /images/articles/
```

### Step 2: Batch convert script
A Python script that for each IMG file:
1. Copies → renames to correct article ID
2. Resizes to 1200×630 (crop center if needed)
3. Converts to WebP (quality 85%)
4. Converts to JPEG (quality 85%, fallback)
5. Outputs to `/images/articles/{ARTICLE_ID}.{webp,jpg}`

### Step 3: Update article HTML files
For each of the 23 article HTML files, update the og:image meta tags:
```html
<meta property="og:image" content="https://ghassanalhamoud.github.io/images/articles/ART-001.webp" />
<meta property="twitter:image" content="https://ghassanalhamoud.github.io/images/articles/ART-001.webp" />
```

### Step 4: Generate placeholder images for missing articles
For ART-017, ART-021, ART-024:
- Option A: Generate from their image prompts (ideal)
- Option B: Use a script to create gradient-based placeholders with the article title

### Step 5: Update article-template.html
Update the template so future articles get the image link pattern.

---

## Tools needed
- Python 3 with `Pillow` (PIL) or ImageMagick (`convert`)
- If Pillow not available: use `sips` (macOS built-in) + `cwebp` (WebP tools)

---

## Estimated output
- 20 article images × 2 formats (WebP + JPG) = 40 files
- Cumulative size: ~4 MB total (vs ~70 MB source)
- 3 placeholder images to generate

## Article ID Naming Convention
- ART-001 through ART-024 (with dash) or ART002 through ART015 (no dash)
- Use the **exact same ID** as used in `articles.json` / HTML meta to keep mapping consistent

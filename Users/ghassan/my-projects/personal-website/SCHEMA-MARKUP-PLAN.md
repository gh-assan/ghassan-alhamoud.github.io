# Schema Markup Enhancement Plan

## Goal
Add a `Person` schema alongside the existing `ProfessionalService` schema to improve SEO, enable Google Knowledge Panels, and better represent Ghassan's expertise (including AI, AI Agents, LLM systems).

## Analysis

### Current Schema (already present)
- **Type:** `ProfessionalService`
- **Purpose:** Describes the consulting business — services offered, area served, founder info
- **Status:** ✅ Good, keep as-is

### New Schema to Add
- **Type:** `Person`
- **Purpose:** Represents Ghassan as an individual expert (used for Knowledge Panels, search snippets)

## Fields to Include

| Field | Value | Notes |
|-------|-------|-------|
| `@context` | `https://schema.org` | Required |
| `@type` | `Person` | |
| `name` | `Ghassan Alhamoud` | |
| `url` | `https://ghassan-alhamoud.com/` | From CNAME file |
| `image` | `https://ghassan-alhamoud.com/images/ghassan.png` | Existing image path |
| `jobTitle` | `Senior Software Engineer — AI Agent Enablement, Software Architecture` | Matches hero role text |
| `gender` | `male` | |
| `sameAs` | LinkedIn, Xing | Social profile links |
| `alumniOf` | Damascus University — Information Technology | Confirmed: IT is correct sub-domain of Computer Science/Engineering |
| `knowsAbout` | Expanded list including AI, AI Agents, LLM Systems, Agent Architecture, Distributed Systems, Kafka, Event-Driven Architecture, System Design, Software Architecture | |
| `description` | Updated to reflect AI + distributed systems focus | |

## Implementation Steps

1. **Add a new `<script type="application/ld+json">` block** after the existing one (before `</head>`)
2. **Keep existing `ProfessionalService` schema untouched**
3. **Verify domain** — CNAME confirms `ghassan-alhamoud.com` (currently via GitHub Pages)

## Verification

After implementation, validate:
- ✅ No duplicate fields conflict between the two schemas (they're separate blocks — valid per Google)
- ✅ `knowsAbout` covers AI/Agents/LLM topics prominently
- ✅ All URLs use the canonical domain
- ✅ The `image` path matches an existing asset

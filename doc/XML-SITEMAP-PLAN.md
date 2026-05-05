# XML Sitemap Plan

## Goal
Generate a comprehensive `sitemap.xml` covering every discoverable page on `https://ghassan-alhamoud.com/` to submit to Google Search Console for full indexing.

## Why
- Currently 0 structured sitemaps exist for this domain.
- Google has no guaranteed crawl path to discover:
  - 24 article pages (one per slug)
  - The article index (`/articles/`)
  - The homepage (`/`)
  - The 404 page (intentionally excluded, see below)
- A sitemap is the single source of truth for Google Search Console to discover and prioritise content.

## Inventory of Pages

### Static Pages
| Page | URL | Priority | Change Frequency |
|------|-----|----------|------------------|
| Homepage | `https://ghassan-alhamoud.com/` | 1.0 | weekly |
| Articles Index | `https://ghassan-alhamoud.com/articles/` | 0.9 | weekly |
| 404 Page | intentionally excluded — error page | — | — |

### Article Pages (24 total)
Each gets `priority: 0.8` and `changefreq: monthly` since articles are evergreen technical content.

| # | Slug | Last Modified |
|---|------|---------------|
| 1 | stop-building-agent-soup-compilers | 2026-03-10 |
| 2 | agent-reasoning-discovery-fallacy | 2026-03-08 |
| 3 | agent-black-box-skill-ledger | 2026-03-12 |
| 4 | startup-intelligence-entity-graph | 2026-03-18 |
| 5 | systematic-ideation-engine | 2026-03-20 |
| 6 | agent-reliability-sla-infrastructure | 2026-03-22 |
| 7 | compliance-as-code-eu-ai-act | 2026-03-25 |
| 8 | agent-execution-attestation | 2026-03-28 |
| 9 | startupgraph-insights-engine | 2026-03-30 |
| 10 | echoweave-on-device-narrative-os | 2026-04-05 |
| 11 | dreamforge-automation-pipeline | 2026-04-08 |
| 12 | negotiation-veteran-collapse-llm-coach | 2026-04-10 |
| 13 | a2a-negotiation-outreach | 2026-04-12 |
| 14 | every-token-is-rent-memory-architecture | 2026-04-01 |
| 15 | most-boring-automation-self-improving | 2026-04-15 |
| 16 | automation-pattern-6-industries | 2026-05-02 |
| 17 | ai-found-42-automation-opportunities | 2026-05-02 |
| 18 | stress-test-self-healing-250-target | 2026-05-03 |
| 19 | issue-management-system-property | 2026-05-04 |
| 20 | 5-failures-building-agent-3-months | 2026-05-04 |
| 21 | 5-infrastructure-layers-broke-agent | 2026-05-04 |
| 22 | self-healing-architecture-feedback-loop | 2026-05-05 |
| 23 | workspace-indexing-3ms | 2026-05-06 |

## Sitemap Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ghassan-alhamoud.com/</loc>
    <lastmod>2026-05-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ghassan-alhamoud.com/articles/</loc>
    <lastmod>2026-05-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- For each article: -->
  <url>
    <loc>https://ghassan-alhamoud.com/articles/{slug}.html</loc>
    <lastmod>{date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Domain Considerations
- **CNAME** points `ghassanalhamoud.github.io` → `ghassan-alhamoud.com`
- All sitemap `<loc>` values MUST use the canonical domain: `https://ghassan-alhamoud.com/`
- GitHub Pages supports sitemaps placed at root (`/sitemap.xml`)
- No SSL concerns — GitHub Pages provides HTTPS automatically for custom domains.

## Google Search Console Setup
1. Add the property `https://ghassan-alhamoud.com` to Google Search Console.
2. Verify ownership via **TXT DNS record** (recommended) or **HTML file upload**.
3. Submit `https://ghassan-alhamoud.com/sitemap.xml` in the Sitemaps section.

### Verification Methods (ordered by preference)
| Method | How |
|--------|-----|
| **TXT Record** | Add a TXT record to the DNS zone for `ghassan-alhamoud.com` (most durable) |
| **HTML Tag** | Add `<meta name="google-site-verification" content="...">` to `<head>` of homepage (requires redeployment) |
| **DNS CNAME** | Not applicable — CNAME already in use for GitHub Pages |

## robots.txt (Optional but Recommended)
Create `/robots.txt` to explicitly allow all crawlers and point to the sitemap:

```
User-agent: *
Allow: /

Sitemap: https://ghassan-alhamoud.com/sitemap.xml
```

This prevents accidental crawl blocks and ensures crawler discovery of the sitemap.

## Implementation Steps

| # | Action | Details |
|---|--------|---------|
| 1 | Generate `sitemap.xml` | Place at project root with all 26 URLs (2 static + 24 articles) |
| 2 | Generate `robots.txt` | Place at project root pointing to sitemap |
| 3 | Deploy to GitHub Pages | Push to `main` branch |
| 4 | Add to Google Search Console | Add property, verify, submit sitemap |
| 5 | Monitor indexing | Check Coverage report in GSC for errors/warnings |
| 6 | Future-proofing | Update sitemap when new articles are published |

## Automation Strategy
Since this is a static site with data-driven articles, the sitemap can be generated from `articles/articles.json`:

1. Read articles array for slug + date
2. Construct static entries (home, articles index)
3. Construct dynamic entries (one per article)
4. Output valid XML

This keeps the sitemap always in sync with article metadata.

## Progress

| Step | Status |
|------|--------|
| Plan documented | ✅ Done |
| `sitemap.xml` generated | ⬜ To Do |
| `robots.txt` generated | ⬜ To Do |
| Deployed to GitHub Pages | ⬜ To Do |
| Google Search Console property added | ⬜ To Do |
| Sitemap submitted to GSC | ⬜ To Do |
| Indexing verified | ⬜ To Do |

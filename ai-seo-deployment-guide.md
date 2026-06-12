# AI SEO Deployment Guide

**Created:** June 12, 2026
**Purpose:** Instructions for deploying AI findability improvements to infin8growth.ai

---

## Files Created/Updated

### 1. FAQ Content (`faq-content.md`)
**Status:** Ready for Claude Design
**Location:** `/infin8/web/faq-content.md`

**To deploy:**
- Create `/faq.html` page using the content and schema
- Add FAQ section to homepage (bottom) with 5 questions
- Add FAQ page to sitemap.xml
- Test schema at https://search.google.com/test/rich-results

### 2. Enhanced llms.txt
**Status:** Ready to deploy
**Location:** `/infin8/web/llms.txt`

**To deploy:**
- Replace existing llms.txt at site root
- Verify at https://infin8growth.ai/llms.txt

**Changes made:**
- Added Quick Links section with markdown links
- Added FAQ section with Q&A format
- Added Foundation Install to key concepts
- Added Founders section with social links
- Added links throughout document

### 3. Google A2A agent.json
**Status:** Ready to deploy
**Location:** `/infin8/web/.well-known/agent.json`

**To deploy:**
- Create `/.well-known/` directory at site root
- Upload agent.json to `/.well-known/agent.json`
- Verify at https://infin8growth.ai/.well-known/agent.json

**Contains:**
- Business capabilities (Foundation Assessment, Foundation Install, OS Expansion tiers)
- Pricing information
- Team information
- Methodology description
- Industry focus areas

### 4. Person Schema for Marshall
**Status:** Ready to deploy
**Location:** `/infin8/web/schema-person-marshall.json`

**To deploy:**
- Add JSON-LD to `<head>` of about.html
- Optionally add to index.html

**Add this to the page head:**
```html
<script type="application/ld+json">
[paste contents of schema-person-marshall.json]
</script>
```

---

## Sitemap Updates

Add these URLs to `/sitemap.xml`:

```xml
<url>
  <loc>https://infin8growth.ai/faq.html</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

---

## Verification Checklist

After deployment, verify:

- [ ] https://infin8growth.ai/llms.txt returns updated content
- [ ] https://infin8growth.ai/.well-known/agent.json returns JSON
- [ ] https://infin8growth.ai/faq.html loads with FAQ content
- [ ] FAQ schema validates at Google Rich Results Test
- [ ] Person schema validates at Google Rich Results Test
- [ ] Sitemap includes FAQ page
- [ ] Homepage FAQ section links to full FAQ page

---

## Re-run AI SEO Test

After deployment, re-run the AI SEO test to verify:

- [ ] llms.txt score improves (should hit 95+)
- [ ] Google A2A Protocol passes
- [ ] FAQ schema detected

---

## Notes

- The MCP endpoint and OpenAPI spec recommendations from the AI SEO tool were skipped (see earlier analysis for rationale)
- Person schema for Louisa can be added later using same format
- Field Notes template with Article schema is being created separately

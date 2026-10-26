# Remove Unused Static .html Preview Files Implementation Plan

> **Goal:** Safely remove all obsolete, offline static `.html` preview mockups from the Wagmart repository without affecting any Shopify theme functionality.
> **Architecture:** Shopify Online Store 2.0 themes strictly execute `.liquid` layout, template, section, and snippet files together with `assets/` and `config/settings_data.json`. The root `.html` files are non-executable offline prototypes created during early design and are never parsed or loaded by Shopify servers.
> **Tech Stack:** Shopify Liquid, Shopify CLI (`shopify theme check`).

## Global Constraints

- Zero impact on live Shopify storefront rendering, navigation, routing, cart drawer, checkout, and blog templates.
- Only remove root-level mock preview `.html` files (`*.html`). Do not modify core theme folders (`layout/`, `templates/`, `sections/`, `snippets/`, `assets/`, `config/`, `locales/`).
- Verify theme integrity after removal by executing `shopify theme check` (must exit with 0 errors).

---

### Task 1: Audit and Target Unused .html Files

**Files Deleted:**
1. `bento_preview.html` (15 KB) - Static bento grid mockup [DELETED]
2. `blog_details_preview.html` (40 KB) - Static blog article mockup [DELETED]
3. `cart_preview.html` (64 KB) - Static cart drawer mockup [DELETED]
4. `collection.html` (40 KB) - Static collection catalog mockup [DELETED]
5. `collection_preview.html` (155 KB) - Static collection preview [DELETED]
6. `cta_banner_preview.html` (11 KB) - Static CTA banner preview [DELETED]
7. `cta_footer_preview.html` (29 KB) - Static CTA footer preview [DELETED]
8. `index.html` (42 KB) - Static homepage prototype [DELETED]
9. `product_preview.html` (47 KB) - Static product details preview [DELETED]

**Verification Steps:**
- [x] Ensure none of these files are referenced by Liquid theme files (verified: 0 references found in `layout/`, `templates/`, `sections/`, or `snippets/`).
- [x] Remove the 9 targeted `.html` files.

---

### Task 2: Validate Theme Integrity

- [x] Run `shopify theme check`
- [x] Confirm 0 errors and status code 0 (Verified: 88 files inspected, 0 errors, status code 0).

# Implementation Plan: Dynamic Shopify Admin Migration & Hardcoded Data Removal

> **Goal:** Migrate all hardcoded/dummy mock data across theme liquid files into native dynamic Shopify Admin objects (Products, Collections, Blogs, Menus, Policies, and Theme Customizer Section Settings/Blocks), enabling professional store management directly from the Shopify Admin panel.

---

## 1. Audit: All Hardcoded / Dummy Data in Project

| # | File | Current Hardcoded Data | Dynamic Shopify Admin Replacement |
|---|------|------------------------|-----------------------------------|
| 1 | `sections/main-blog.liquid` | Static arrays (`default_images`, `default_titles`, `default_excerpts`, `default_urls`, `default_dates`), loops `for i in (1..3)` and `(0..3)` fallback mock cards | Native `blog.articles` object; if 0 articles, display clean empty state prompting admin to publish posts via **Shopify Admin > Online Store > Blog Posts**. |
| 2 | `sections/blog-section.liquid` | Static arrays (`default_images`, `default_titles`, `default_excerpts`, `default_urls`) and hardcoded blocks in `index.json` | Dynamic `section.settings.blog.articles` (or `blogs['news'].articles`); section setting for blog picker with clean fallback. |
| 3 | `sections/curated-categories.liquid` | 5 static HTML category cards (Fashion Store, Accessories, Grooming, Supplements, Toys) with hardcoded asset images (`category-1.webp` through `5`) | Dynamic Section Blocks (`category_card`) with Shopify `collection` picker, `image_picker`, custom title, and subtitle, customizable via Theme Editor. |
| 4 | `sections/pet-category-banner.liquid` | Static cards ("FOR DOG", "FOR CAT"), hardcoded text list (Food & Treats, Toys & Play), hardcoded image `banner-cat.webp` | Section settings with Shopify collection pickers (`dog_collection`, `cat_collection`) and `image_picker` for custom dog/cat banner photos. |
| 5 | `sections/shop-by-need.liquid` (Bento) | 6 hardcoded Bento cards with static titles, descriptions, and asset images `bento-grid-1.webp` to `6` | Section Blocks or individual card settings with `image_picker`, `collection` / `url` picker, title, category label, and description. |
| 6 | `sections/testimonials.liquid` | Hardcoded avatar images (`image_copy_2.png`, `image_copy.png`, `image.png`), rigid 3-review limit | Dynamic Section Blocks (`testimonial`) with `image_picker` for reviewer avatar, author name, review text, and star rating. |
| 7 | `sections/header.liquid` | Hardcoded desktop navigation links (`Shop`, `Collection`, `Blog`, `Contact`) | Dynamic Shopify Menu (`linklists[section.settings.main_menu].links`) managed from **Shopify Admin > Online Store > Navigation**. |
| 8 | `sections/footer.liquid` | Hardcoded links in Column 2 ("Shop Essentials") and Column 3 ("Customer Care") | Dynamic Shopify Menus (`linklists[section.settings.footer_menu_1]` & `footer_menu_2`) from **Shopify Admin > Navigation**. |
| 9 | `sections/main-faq.liquid` & `snippets/faq-page-content.liquid` | 100% hardcoded FAQ questions and answers in static HTML | Dynamic Section Blocks (`faq_item`) in `main-faq.liquid` with question and answer text fields, editable in Theme Editor. |
| 10 | `sections/main-privacy-policy.liquid`, `main-refund-policy.liquid`, `main-shipping-policy.liquid` | Render hardcoded snippets (`privacy-policy-data`, `refund-policy-data`, `shipping-policy-data`) | Dynamic `page.content` or native Shopify policy objects (`shop.privacy_policy.body`, `shop.refund_policy.body`, `shop.shipping_policy.body`) managed via **Shopify Admin > Settings > Policies**. |
| 11 | `sections/main-product.liquid` | Hardcoded grooming glove fallback description, rigid dummy specifications ("Silicone", "Dogs and Cats", "One Size"), and hardcoded glove benefits | Dynamic `product.description`, dynamic metafields (`product.metafields.custom.*`) only when present, and optional customizable benefit blocks. |
| 12 | `sections/main-collection.liquid` | Hardcoded category icon subnav (Food, Grooming, Toys, Beds, Accessories, Health Care) with static JPG/WEBP assets | Dynamic collection filtering or customizable collection list blocks. |

---

## 2. What Needs to be Configured in Shopify Admin (Merchant Checklist)

To run the store 100% professionally through the Shopify Admin:

### A. Online Store > Blog Posts
1. Create a Blog (e.g. `News` or `Pet Journal`).
2. Add real blog articles with:
   - Featured Image
   - Title
   - Excerpt
   - Content (body)
   - Tags (e.g. `Health & Care`, `Nutrition`, `Training`)

### B. Products & Collections
1. **Products:** Add products with Title, Images, Price, Compare-at Price, Description, Product Type, and Vendor.
2. **Collections:**
   - Create collections: `Bestsellers`, `Dogs`, `Cats`, `Grooming`, `Food & Treats`, `Toys`, etc.
   - Assign products to respective collections.

### C. Online Store > Navigation
1. **Main menu:** Set up header navigation links (e.g. Home, Shop, Collections, Blogs, FAQ, Contact).
2. **Footer menus:**
   - Menu 1: Shop Essentials (links to collections).
   - Menu 2: Customer Care (links to FAQ, Contact, Policies).

### D. Settings > Policies
1. Add your legal policies in Shopify Admin:
   - **Privacy Policy**
   - **Refund Policy**
   - **Shipping Policy**
   - **Terms of Service**

### E. Online Store > Themes > Customize (Theme Editor)
1. **Hero Banner:** Upload custom banner slides and links.
2. **Curated Categories:** Pick collections and images for each category card block.
3. **Shop by Need (Bento):** Pick collections/links and banner images.
4. **Pet Trust & Testimonials:** Add customer review blocks and upload real customer avatar images.
5. **FAQ Page:** Add FAQ blocks directly with custom questions and answers.

---

## 3. Phased Implementation Plan

### Phase 1: Blog & Articles Dynamic Connection (Immediate Priority)
- Refactor `sections/main-blog.liquid`:
  - Remove all hardcoded default arrays (`default_images`, `default_titles`, etc.).
  - Remove fallback `for i in (1..3)` and `(0..3)` mock loops.
  - Render strictly `blog.articles`; if empty, show a polite store empty-state ("New articles coming soon").
- Refactor `sections/blog-section.liquid`:
  - Pull articles dynamically from `section.settings.blog.articles` (fallback to `blogs['news'].articles`).
  - Remove hardcoded default arrays and mock loops.
  - Clean up mock articles in `templates/index.json`.

### Phase 2: Policies Dynamic Connection
- Refactor `sections/main-privacy-policy.liquid`, `main-refund-policy.liquid`, `main-shipping-policy.liquid`:
  - Use `policy.body` (when routed through `/policies/*`) or `page.content` or `shop.[policy_name].body`.
  - Fall back gracefully to snippet only if admin policy is blank.

### Phase 3: Navigation & Footer Dynamic Connection
- Refactor `sections/header.liquid`:
  - Connect navigation list to `linklists[section.settings.main_menu].links` while retaining Wagmart header styling and Bestsellers dropdown.
- Refactor `sections/footer.liquid`:
  - Connect Column 2 & Column 3 to Shopify `link_list` settings (`footer_menu_1`, `footer_menu_2`).

### Phase 4: Homepage Sections Dynamic Blocks & Pickers
- Refactor `sections/curated-categories.liquid`:
  - Add `blocks` to schema (`type: "category"`) with collection picker, custom image picker, title, and description.
- Refactor `sections/shop-by-need.liquid`:
  - Add schema settings or blocks for all 6 Bento cards (image picker, collection/url picker, custom text).
- Refactor `sections/pet-category-banner.liquid`:
  - Add schema settings for Dog & Cat collection pickers and image pickers.
- Refactor `sections/testimonials.liquid`:
  - Add `blocks` (`type: "review"`) with reviewer avatar `image_picker`, rating range, quote, and name.
- Refactor `sections/main-faq.liquid`:
  - Replace static `faq-page-content.liquid` with dynamic FAQ accordion blocks (`type: "faq_item"`).

### Phase 5: Product & Collection Dynamic Polishing
- Refactor `sections/main-product.liquid`:
  - Remove hardcoded grooming glove text fallback.
  - Render specifications table rows only if metafields or product attributes exist.
- Refactor `sections/main-collection.liquid`:
  - Ensure category subnav pills dynamically pull from actual store collections or can be customized in Theme Editor.

---

## 4. Verification & Validation
- Run `shopify theme check` after every phase to ensure 0 errors.
- Test preview locally via running `shopify theme dev` server.
- Verify that editing/adding content in Shopify Admin instantly reflects on the storefront without editing Liquid code.

# 🐾 Wagmart — Shopify Online Store 2.0 Theme

> A modern, premium pet supplies storefront theme for Shopify Online Store 2.0.

[![Shopify Online Store 2.0](https://img.shields.io/badge/Shopify-Online_Store_2.0-95BF47?logo=shopify&logoColor=white)](https://shopify.dev/docs/themes)
[![Theme Check](https://img.shields.io/badge/Theme_Check-0_Offenses_Passing-brightgreen?logo=shopify&logoColor=white)](https://shopify.dev/docs/themes/tools/theme-check)
[![Liquid](https://img.shields.io/badge/Shopify-Liquid-2C2C2C)](https://shopify.dev/docs/api/liquid)

---

## 🌟 Overview

**Wagmart** is a high-converting, mobile-responsive Shopify Online Store 2.0 theme built natively with Shopify Liquid, modern CSS, and vanilla JavaScript. Converted from a custom-designed storefront, it preserves rich visual aesthetics, micro-interactions, and custom pet commerce features without any runtime dependencies on Node.js, React, or Vite.

---

## ✨ Features

- **🐾 Online Store 2.0 Architecture** — 100% modular JSON templates (`templates/*.json`) supporting Shopify's visual Theme Editor (add, remove, and reorder sections and blocks).
- **🛒 Ajax Cart Engine** — Slide-over Cart Drawer (`snippets/cart-drawer.liquid`) with instant quantity adjustment (`+` / `-`), item removal, and auto-updating subtotal without page reloads.
- **❤️ LocalStorage Wishlist** — Client-side wishlist modal (`snippets/wishlist-modal.liquid`) allowing customers to bookmark favorite items and move them to cart.
- **⚡ Predictive Search Modal** — Live search powered by Shopify's `/search/suggest.json` endpoint with instant thumbnail previews.
- **🔍 Quick View Modal** — Instant preview popup for fast product inspection and quick cart additions.
- **🎠 Interactive Hero Banner** — 5-slide cross-fade slider with autoplay, pagination dots, and touch swipe gestures.
- **⭐ Best Sellers Carousel** — Horizontal snap carousel with category filter pills ("All", "Food", "Toys", "Beds", "Grooming", "Travel").
- **🎥 Video Reels Showcase** — Social-style vertical pet reel carousel with hover states and full-screen video player modal.
- **📦 Bento Grid "Shop By Need"** — 5-block editorial layout targeting pet parenting needs.
- **📖 Pet Trust, Testimonials, FAQ & Blog** — Rich storytelling sections with smooth accordions and verified customer review cards.

---

## 📁 Theme Structure

```text
wagmart/
├── assets/
│   ├── theme.css                       # Compiled Tailwind CSS utilities + custom keyframes
│   ├── theme.js                        # Vanilla JS engine (Cart, Wishlist, Search, Modals, Sliders)
│   ├── WAGMART-Logo.webp               # Brand identity
│   └── [65+ images, webp, png, jpg]   # Product, hero, bento, reels, and category photography
├── config/
│   ├── settings_schema.json            # Theme Editor global settings (Colors, Typography, Social, Cart)
│   └── settings_data.json              # Default configuration values
├── layout/
│   └── theme.liquid                    # HTML5 shell, SEO meta, Shopify headers, drawer & modal mounting
├── locales/
│   └── en.default.json                 # Comprehensive English translations
├── sections/
│   ├── header.liquid                   # Sticky navigation, logo, search, wishlist & cart counters
│   ├── footer.liquid                   # CTA banner, 4-column menu, social icons, copyright
│   ├── hero-banner.liquid              # 5-slide cross-fade slider with autoplay & dots
│   ├── curated-categories.liquid       # "Better Together" 5 category cards with peek image
│   ├── featured-collection.liquid      # "Loved by Pets" carousel with category filter pills
│   ├── shop-by-need.liquid             # 5-card Bento Grid layout with gradients & category links
│   ├── pet-category-banner.liquid      # Dual "FOR DOG" & "FOR CAT" split cards with feature pills
│   ├── pet-trust.liquid                # "The Wagmart Difference" 4-column benefits & metrics
│   ├── pet-reels.liquid                # "Real Pets. Real Moments." video carousel & modal
│   ├── testimonials.liquid             # 3-column review cards & 4.96/5 aggregate rating badge
│   ├── blog-section.liquid             # "Pet Journal & Care Guides" 4-article editorial grid
│   ├── faq-accordion.liquid            # Collapsible accordion with background lifestyle image
│   ├── main-product.liquid             # PDP: Gallery, variants, quantity selector, Ajax Add-to-Cart
│   ├── main-collection.liquid          # Collection grid with sorting, price, and pagination
│   ├── main-cart.liquid                # Standalone cart page with item updates and checkout
│   ├── main-search.liquid              # Predictive and full-text search results
│   ├── main-page.liquid                # Standard CMS page
│   ├── main-blog.liquid                # Blog index grid
│   ├── main-article.liquid             # Single blog post template
│   └── main-404.liquid                 # 404 error page with quick shop redirection
├── snippets/
│   ├── product-card.liquid             # Reusable card: badges, wishlist heart, price lockup, stepper
│   ├── section-badge.liquid            # Reusable pill badge
│   ├── theme-button.liquid             # Primary, secondary, outline, and ghost button styles
│   ├── cart-drawer.liquid              # Slide-over cart drawer with live Ajax item controls
│   ├── wishlist-modal.liquid           # LocalStorage-backed pet wishlist modal
│   ├── search-modal.liquid             # Live search overlay with instant results
│   ├── quick-view-modal.liquid         # Product quick preview modal
│   ├── reel-modal.liquid               # Fullscreen video reel player
│   └── icon-*.liquid                   # 10 inline SVG icon snippets
└── templates/
    ├── index.json                      # Homepage with all 10 modular sections
    ├── product.json                    # Product page template
    ├── collection.json                 # Collection page template
    ├── cart.json                       # Cart page template
    ├── search.json                     # Search page template
    ├── page.json                       # Standard page template
    ├── blog.json                       # Blog listing template
    ├── article.json                    # Article post template
    └── 404.json                        # 404 template
```

---

## 🚀 Development & Deployment

### 1. Local Preview with Shopify CLI

```bash
# In the repository root
shopify theme dev --store your-store.myshopify.com
```

### 2. Validate with Shopify Theme Check

```bash
shopify theme check
```

*Current status: 51 files inspected, 0 errors, 0 warnings.*

### 3. Push to Shopify Store

```bash
shopify theme push --store your-store.myshopify.com
```

### 4. Upload as a ZIP to Shopify Admin

1. Compress the contents of this folder (`assets/`, `config/`, `layout/`, `locales/`, `sections/`, `snippets/`, `templates/`) into a `.zip` archive.
2. In **Shopify Admin**, navigate to **Online Store** → **Themes**.
3. Under **Theme library**, click **Add theme** → **Upload zip file**.
4. Customize via the Shopify visual editor and publish when ready!

---

## 📄 License

Proprietary © Wagmart. All rights reserved.

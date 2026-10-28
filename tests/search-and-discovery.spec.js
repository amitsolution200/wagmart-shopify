// @ts-check
const { test, expect } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');

let server;
let serverPort;
let baseUrl;

// Sample mock pet catalog for Search & Discovery
const mockProducts = [
  {
    id: '9633074053292',
    title: 'Pet Grooming Glove',
    handle: 'pet-grooming-glove',
    vendor: 'My Store 2',
    product_type: 'Grooming',
    tags: ['dog', 'cat', 'brush', 'grooming'],
    price: 330,
    price_cents: 33000,
    compare_price: 499,
    available: false,
    image: 'catalog-bath-massage-brush.webp',
  },
  {
    id: '9633074053293',
    title: 'Natural Grain-Free Dog Food Kibble',
    handle: 'natural-grain-free-dog-food',
    vendor: 'Wagmart Essentials',
    product_type: 'Food',
    tags: ['dog', 'kibble', 'dry-food'],
    price: 1250,
    price_cents: 125000,
    compare_price: 1450,
    available: true,
    image: 'kibble-bulldog-adult.jpg',
  },
  {
    id: '9633074053294',
    title: 'Orthopedic Memory Foam Pet Bed Haven',
    handle: 'orthopedic-memory-foam-pet-bed',
    vendor: 'Wagmart Comfort',
    product_type: 'Beds',
    tags: ['dog', 'cat', 'bed', 'orthopedic'],
    price: 1899,
    price_cents: 189900,
    compare_price: 2499,
    available: true,
    image: 'catalog-orthopedic-bed.webp',
  },
  {
    id: '9633074053295',
    title: 'Durable Braided Rope Dog Leash',
    handle: 'durable-braided-rope-dog-leash',
    vendor: 'Wagmart Essentials',
    product_type: 'Accessories',
    tags: ['dog', 'leash', 'rope'],
    price: 499,
    price_cents: 49900,
    compare_price: 699,
    available: true,
    image: 'catalog-rope-leash.webp',
  },
  {
    id: '9633074053296',
    title: 'Interactive Slow Feeder Anti-Choke Bowl',
    handle: 'interactive-slow-feeder-bowl',
    vendor: 'Wagmart Care',
    product_type: 'Accessories',
    tags: ['dog', 'cat', 'bowl', 'feeder'],
    price: 649,
    price_cents: 64900,
    compare_price: 899,
    available: true,
    image: 'catalog-slow-feeder-bowl.webp',
  },
  {
    id: '9633074053297',
    title: 'Gentle De-Shedding Pet Bath Brush',
    handle: 'gentle-deshedding-pet-bath-brush',
    vendor: 'Wagmart Care',
    product_type: 'Grooming',
    tags: ['dog', 'cat', 'brush', 'bath'],
    price: 399,
    price_cents: 39900,
    compare_price: 549,
    available: true,
    image: 'catalog-bath-massage-brush.webp',
  },
];

function generateSearchHtml(urlObj) {
  const q = (urlObj.searchParams.get('q') || '').trim();
  const performed = !!q;
  const sort = urlObj.searchParams.get('sort_by') || 'relevance';
  const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
  const availFilter = urlObj.searchParams.get('filter.v.availability');
  const typeFilter = urlObj.searchParams.getAll('filter.p.product_type');
  const vendorFilter = urlObj.searchParams.getAll('filter.p.vendor');
  const minPrice = parseFloat(urlObj.searchParams.get('filter.v.price.gte') || '0');
  const maxPriceParam = urlObj.searchParams.get('filter.v.price.lte');
  const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : 3000;

  // Filter products
  let matched = mockProducts.filter((p) => {
    if (q && q !== 'all') {
      const matchTerm = (p.title + ' ' + p.product_type + ' ' + p.tags.join(' ') + ' ' + p.vendor).toLowerCase();
      if (!matchTerm.includes(q.toLowerCase())) return false;
    }
    if (availFilter === '1' && !p.available) return false;
    if (availFilter === '0' && p.available) return false;
    if (typeFilter.length > 0 && !typeFilter.includes(p.product_type)) return false;
    if (vendorFilter.length > 0 && !vendorFilter.includes(p.vendor)) return false;
    if (p.price < minPrice || p.price > maxPrice) return false;
    return true;
  });

  // Sort products
  if (sort === 'price-ascending') {
    matched.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-descending') {
    matched.sort((a, b) => b.price - a.price);
  } else if (sort === 'title-ascending') {
    matched.sort((a, b) => a.title.localeCompare(b.title));
  }

  // Pagination (2 items per page for pagination testing)
  const pageSize = 2;
  const totalPages = Math.ceil(matched.length / pageSize) || 1;
  const paginated = matched.slice((page - 1) * pageSize, page * pageSize);

  // Active filter count
  let activeFilterCount = 0;
  if (availFilter) activeFilterCount++;
  activeFilterCount += typeFilter.length;
  activeFilterCount += vendorFilter.length;
  if (minPrice > 0 || maxPriceParam) activeFilterCount++;

  // Active chips
  let chipsHtml = '';
  if (availFilter === '1') {
    const removeUrl = new URL(urlObj.toString());
    removeUrl.searchParams.delete('filter.v.availability');
    chipsHtml += `<a href="${removeUrl.pathname}${removeUrl.search}" class="wm-plp-chip" data-remove-filter="availability" role="button">
      <span>Availability: In stock</span><span class="wm-plp-chip__close" aria-hidden="true">&times;</span>
    </a>`;
  }
  typeFilter.forEach((t) => {
    const removeUrl = new URL(urlObj.toString());
    const vals = removeUrl.searchParams.getAll('filter.p.product_type').filter((v) => v !== t);
    removeUrl.searchParams.delete('filter.p.product_type');
    vals.forEach((v) => removeUrl.searchParams.append('filter.p.product_type', v));
    chipsHtml += `<a href="${removeUrl.pathname}${removeUrl.search}" class="wm-plp-chip" data-remove-filter="product_type" role="button">
      <span>Product type: ${t}</span><span class="wm-plp-chip__close" aria-hidden="true">&times;</span>
    </a>`;
  });
  if (minPrice > 0 || maxPriceParam) {
    const removeUrl = new URL(urlObj.toString());
    removeUrl.searchParams.delete('filter.v.price.gte');
    removeUrl.searchParams.delete('filter.v.price.lte');
    chipsHtml += `<a href="${removeUrl.pathname}${removeUrl.search}" class="wm-plp-chip" data-remove-filter="price" role="button">
      <span>Price: ₹${minPrice} – ₹${maxPrice}</span><span class="wm-plp-chip__close" aria-hidden="true">&times;</span>
    </a>`;
  }

  // Clear all URL
  const clearAllUrl = `/search?q=${encodeURIComponent(q)}&options%5Bprefix%5D=last&type=product${sort && sort !== 'relevance' ? '&sort_by=' + encodeURIComponent(sort) : ''}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${performed ? 'Results for "' + q + '"' : 'Search Our Catalog'} — Wagmart</title>
  <link rel="stylesheet" href="/assets/header.css">
  <link rel="stylesheet" href="/assets/collection.css">
  <script>
    window.Wagmart = { moneyFormat: "₹{{amount}}" };
  </script>
</head>
<body class="bg-white text-[#1F2937]">

  <!-- Header with Search Trigger and Modal -->
  <header data-wm-header>
    <div data-header-shell>
      <button type="button" class="wm-icon-btn" data-search-open aria-controls="WmSearch" aria-expanded="false" aria-haspopup="dialog" aria-label="Search products">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
    </div>
  </header>

  <!-- Search Modal Snippet -->
  <div class="wm-search" id="WmSearch" data-search data-predictive-url="/search/suggest" data-search-url="/search" aria-hidden="true">
    <div class="wm-backdrop" data-search-close></div>
    <div class="wm-search__panel" role="dialog" aria-modal="true" aria-label="Search products">
      <form class="wm-search__form" action="/search" method="get" role="search" data-search-form>
        <svg class="wm-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <label class="wm-sr-only" for="WmSearchInput">Search pet products</label>
        <input
          class="wm-search__input"
          id="WmSearchInput"
          type="search"
          name="q"
          value="${q}"
          placeholder="Search pet products..."
          autocomplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-controls="WmSearchResults"
          data-search-input
        >
        <input type="hidden" name="options[prefix]" value="last">
        <button type="button" class="wm-search__clear" data-search-clear hidden>Clear</button>
        <button type="button" class="wm-close-btn" data-search-close aria-label="Close search">&times;</button>
      </form>
      <div class="wm-search__body">
        <div data-search-idle>
          <p class="wm-search__label">Popular Products</p>
          <ul class="wm-results" role="listbox" aria-label="Products">
            <li>
              <a class="wm-result" href="/products/pet-grooming-glove">
                <span class="wm-result__thumb"></span>
                <span class="wm-result__text">
                  <span class="wm-result__title">Pet Grooming Glove</span>
                  <span class="wm-result__meta">₹330.00 <span class="wm-sold-out-badge" style="display:inline-block;margin-left:6px;padding:2px 7px;font-size:11px;font-weight:700;border-radius:999px;background:#FEE2E2;color:#DC2626;">Sold out</span></span>
                </span>
              </a>
            </li>
          </ul>
        </div>
        <div id="WmSearchResults" data-search-results aria-live="polite" hidden></div>
      </div>
    </div>
  </div>

  <!-- Search Results Main Page -->
  <main id="MainContent" class="wm-plp wm-search-page" data-collection-page data-search-page data-search-terms="${q}" data-search-performed="${performed}">
    <div class="wm-plp-container">

      <!-- Hero Header -->
      <header class="wm-plp-hero">
        <div class="wm-plp-hero__content">
          <span class="wm-plp-hero__eyebrow">WAGMART SEARCH &bull; <span data-plp-total-count>${matched.length} ${matched.length === 1 ? 'result' : 'results'}</span></span>
          <h1 class="wm-plp-hero__title" data-plp-hero-title>${performed ? `Results for &ldquo;${q}&rdquo;` : 'Search Our Catalog'}</h1>
          <form action="/search" method="get" class="mt-6 flex items-center max-w-lg mx-auto bg-white rounded-full p-1.5 border border-[#D5CEBF]">
            <input type="hidden" name="type" value="product">
            <input type="hidden" name="options[prefix]" value="last">
            <input type="search" name="q" value="${q}" placeholder="Search for toys, grooming, food, beds..." class="flex-1 px-4 py-2 text-sm bg-transparent text-neutral-800">
            <button type="submit" class="px-5 py-2.5 rounded-full bg-[#1B3A2A] text-white text-xs font-bold">Search</button>
          </form>
        </div>
      </header>

      ${performed ? `
      <!-- Toolbar Snippet -->
      <div class="wm-plp-toolbar-wrap" data-plp-toolbar-wrap>
        <div class="wm-plp-toolbar">
          <div class="wm-plp-toolbar__left">
            <button type="button" class="wm-plp-toolbar__filter-btn" data-plp-filter-toggle aria-expanded="true" aria-controls="wm-plp-sidebar">
              <span>Filter</span>
              <span class="wm-plp-toolbar__filter-badge" data-plp-filter-badge ${activeFilterCount === 0 ? 'hidden' : ''}>${activeFilterCount}</span>
            </button>
            <p class="wm-plp-toolbar__results" data-plp-results-text aria-live="polite">
              Showing <strong>${matched.length}</strong> results for &ldquo;${q}&rdquo;
            </p>
          </div>
          <div class="wm-plp-toolbar__right">
            <div class="wm-plp-toolbar__sort">
              <label for="wm-plp-sort-select" class="wm-plp-toolbar__sort-label">Sort by:</label>
              <div class="wm-plp-toolbar__sort-select-wrap">
                <select id="wm-plp-sort-select" class="wm-plp-toolbar__sort-select" data-plp-sort-select aria-label="Sort products by">
                  <option value="relevance" ${sort === 'relevance' ? 'selected' : ''}>Relevance</option>
                  <option value="price-ascending" ${sort === 'price-ascending' ? 'selected' : ''}>Price: Low to High</option>
                  <option value="price-descending" ${sort === 'price-descending' ? 'selected' : ''}>Price: High to Low</option>
                  <option value="title-ascending" ${sort === 'title-ascending' ? 'selected' : ''}>Alphabetical (A–Z)</option>
                </select>
              </div>
            </div>
            <div class="wm-plp-toolbar__views">
              <button type="button" class="wm-plp-toolbar__view-btn is-active" data-plp-view="grid" aria-pressed="true" title="Grid View">Grid</button>
              <button type="button" class="wm-plp-toolbar__view-btn" data-plp-view="list" aria-pressed="false" title="List View">List</button>
            </div>
          </div>
        </div>

        <!-- Mobile Filter Bar (<768px) -->
        <div class="wm-plp-mobile-bar">
          <button type="button" class="wm-plp-mobile-bar__btn" data-plp-mobile-filter-open>
            <span>Filter</span>
            <span class="wm-plp-mobile-bar__badge" data-plp-mobile-filter-badge ${activeFilterCount === 0 ? 'hidden' : ''}>${activeFilterCount}</span>
          </button>
          <div class="wm-plp-mobile-bar__sort-wrap">
            <select class="wm-plp-mobile-bar__sort" data-plp-mobile-sort aria-label="Sort products on mobile">
              <option value="relevance" ${sort === 'relevance' ? 'selected' : ''}>Relevance</option>
              <option value="price-ascending" ${sort === 'price-ascending' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-descending" ${sort === 'price-descending' ? 'selected' : ''}>Price: High to Low</option>
            </select>
          </div>
        </div>

        <!-- Active Filter Chips Row -->
        <div class="wm-plp-active-filters" data-plp-active-filters ${activeFilterCount === 0 ? 'hidden' : ''}>
          <span class="wm-plp-active-filters__label">Active Filters:</span>
          <div class="wm-plp-active-filters__list" data-plp-filter-chips>
            ${chipsHtml}
          </div>
          <a href="${clearAllUrl}" class="wm-plp-active-filters__clear" data-plp-clear-all role="button">Clear All</a>
        </div>
      </div>

      <!-- Workspace: Sidebar + Products -->
      <div class="wm-plp-workspace" data-plp-workspace data-sidebar="open" data-layout="grid">
        <div class="wm-plp-sidebar-backdrop" data-plp-sidebar-backdrop hidden></div>

        <!-- Filter Sidebar Snippet -->
        <aside id="wm-plp-sidebar" class="wm-plp-sidebar" aria-label="Product Filters" data-plp-sidebar>
          <div class="wm-plp-sidebar__head">
            <span class="wm-plp-sidebar__head-title">Filter Options</span>
            <button type="button" class="wm-plp-sidebar__close" data-plp-sidebar-close aria-label="Close filters">&times;</button>
          </div>

          <form id="wm-plp-filter-form" class="wm-plp-filter-form" data-plp-filter-form action="/search" method="get">
            <input type="hidden" name="q" value="${q}">
            <input type="hidden" name="options[prefix]" value="last">
            <input type="hidden" name="type" value="product">
            ${sort && sort !== 'relevance' ? `<input type="hidden" name="sort_by" value="${sort}">` : ''}

            <!-- Availability Filter -->
            <details class="wm-plp-filter-group" open data-filter-group>
              <summary class="wm-plp-filter-group__summary">
                <span>Availability ${availFilter ? '(1)' : ''}</span>
              </summary>
              <div class="wm-plp-filter-group__content">
                <div class="wm-plp-filter-list">
                  <label class="wm-plp-check">
                    <input type="checkbox" name="filter.v.availability" value="1" id="Filter-avail-1" ${availFilter === '1' ? 'checked' : ''} data-filter-input>
                    <span class="wm-plp-check__box" aria-hidden="true"></span>
                    <span class="wm-plp-check__label">In stock</span>
                    <span class="wm-plp-check__count">(5)</span>
                  </label>
                  <label class="wm-plp-check">
                    <input type="checkbox" name="filter.v.availability" value="0" id="Filter-avail-0" ${availFilter === '0' ? 'checked' : ''} data-filter-input>
                    <span class="wm-plp-check__box" aria-hidden="true"></span>
                    <span class="wm-plp-check__label">Out of stock</span>
                    <span class="wm-plp-check__count">(1)</span>
                  </label>
                </div>
              </div>
            </details>

            <!-- Price Range Filter -->
            <details class="wm-plp-filter-group" open data-filter-group>
              <summary class="wm-plp-filter-group__summary">
                <span>Price</span>
              </summary>
              <div class="wm-plp-filter-group__content">
                <div class="wm-plp-price-filter" data-price-filter data-range-max="3000">
                  <div class="wm-plp-price-filter__display" data-price-display>
                    Price: ₹${minPrice} – ₹${maxPrice}
                  </div>
                  <div class="wm-plp-range-slider">
                    <div class="wm-plp-range-slider__track"></div>
                    <div class="wm-plp-range-slider__fill" data-price-range-fill style="left:${(minPrice / 3000) * 100}%; right:${100 - (maxPrice / 3000) * 100}%;"></div>
                    <input type="range" class="wm-plp-range-slider__input" min="0" max="3000" step="1" value="${minPrice}" data-price-range-min aria-label="Minimum price in INR">
                    <input type="range" class="wm-plp-range-slider__input" min="0" max="3000" step="1" value="${maxPrice}" data-price-range-max aria-label="Maximum price in INR">
                  </div>
                  <div class="wm-plp-price-inputs">
                    <div class="wm-plp-price-input-box">
                      <span class="wm-plp-price-input-box__prefix">₹</span>
                      <input type="number" name="filter.v.price.gte" id="Filter-min-price" class="wm-plp-price-input-box__field" min="0" max="3000" value="${minPrice}" data-price-input-min aria-label="Minimum price input">
                    </div>
                    <span class="wm-plp-price-inputs__sep">–</span>
                    <div class="wm-plp-price-input-box">
                      <span class="wm-plp-price-input-box__prefix">₹</span>
                      <input type="number" name="filter.v.price.lte" id="Filter-max-price" class="wm-plp-price-input-box__field" min="0" max="3000" value="${maxPrice}" data-price-input-max aria-label="Maximum price input">
                    </div>
                  </div>
                </div>
              </div>
            </details>

            <!-- Product Type Filter -->
            <details class="wm-plp-filter-group" open data-filter-group>
              <summary class="wm-plp-filter-group__summary">
                <span>Product Type ${typeFilter.length > 0 ? `(${typeFilter.length})` : ''}</span>
              </summary>
              <div class="wm-plp-filter-group__content">
                <div class="wm-plp-filter-list">
                  ${['Food', 'Beds', 'Grooming', 'Accessories'].map((t, idx) => `
                    <label class="wm-plp-check">
                      <input type="checkbox" name="filter.p.product_type" value="${t}" id="Filter-type-${idx}" ${typeFilter.includes(t) ? 'checked' : ''} data-filter-input>
                      <span class="wm-plp-check__box" aria-hidden="true"></span>
                      <span class="wm-plp-check__label">${t}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </details>
          </form>

          <div class="wm-plp-sidebar__footer">
            <button type="button" class="wm-plp-sidebar__reset-btn" data-plp-clear-all>Reset</button>
            <button type="button" class="wm-plp-sidebar__apply-btn" data-plp-sidebar-apply>
              Show <span data-plp-apply-count>${matched.length}</span> Products
            </button>
          </div>
        </aside>

        <!-- Results Column -->
        <div class="wm-plp-results-col">
          <!-- Loading Shimmer Skeleton -->
          <div class="wm-plp-skeleton-grid" data-plp-skeleton hidden aria-hidden="true">
            <div class="wm-plp-skeleton-card"><div class="wm-plp-skeleton-card__media"></div></div>
            <div class="wm-plp-skeleton-card"><div class="wm-plp-skeleton-card__media"></div></div>
          </div>

          <!-- Product Grid -->
          <div id="wm-plp-products" class="wm-plp-grid" data-plp-grid role="region" aria-label="Search results" ${matched.length === 0 ? 'hidden' : ''}>
            ${paginated.map((p) => `
              <div class="wm-card wm-plp-card wm-unified-card group relative w-full bg-[#FAF8F5] rounded-[22px] p-3 pb-4 border border-[#EAE5D9] ${!p.available ? 'is-sold-out' : ''}" data-product-card data-product-id="${p.id}" data-handle="${p.handle}">
                <div class="wm-card__media relative aspect-square overflow-hidden rounded-[16px] bg-white flex items-center justify-center p-3">
                  ${!p.available ? '<span class="wm-card__tag" style="color:#DC2626;background:#FEE2E2;">Sold Out</span>' : '<span class="wm-card__tag">Best Seller</span>'}
                  <img src="/assets/${p.image}" alt="${p.title}" class="object-contain w-full h-full max-h-[180px]" loading="lazy">
                </div>
                <div class="wm-card__body mt-3">
                  <div class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">${p.product_type}</div>
                  <h3 class="wm-card__title mt-1 font-semibold text-sm text-[#1B3A2A]"><a href="/products/${p.handle}" class="wm-card__link">${p.title}</a></h3>
                  <div class="wm-card__price mt-2 flex items-baseline gap-2">
                    <span class="font-bold text-[#1B3A2A]">₹${p.price}</span>
                    ${p.compare_price > p.price ? `<s class="text-xs text-neutral-400">₹${p.compare_price}</s>` : ''}
                    ${!p.available ? '<span class="text-xs font-semibold text-red-600">· Sold out</span>' : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Empty State -->
          <div class="wm-plp-empty-state" data-plp-empty-state ${matched.length > 0 ? 'hidden' : ''} role="status" aria-live="polite">
            <h2 class="wm-plp-empty-state__title">No products match your filters</h2>
            <p class="wm-plp-empty-state__desc">We couldn’t find any pet supplies matching your selection. Try clearing some filters or searching for another term.</p>
            <button type="button" class="wm-plp-empty-state__btn" data-plp-clear-all>Clear All Filters</button>
          </div>

          <!-- Pagination Snippet -->
          <div class="wm-plp-pagination-wrap" data-plp-pagination-wrap ${totalPages <= 1 ? 'hidden' : ''}>
            <nav class="wm-plp-pagination" data-plp-pagination aria-label="Pagination">
              <div class="wm-plp-pagination__info">
                Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, matched.length)} of ${matched.length} results
              </div>
              <ul class="wm-plp-pagination__list">
                ${page > 1 ? `
                  <li class="wm-plp-pagination__item">
                    <a href="${(() => { const u = new URL(urlObj.toString()); u.searchParams.set('page', String(page - 1)); return u.pathname + u.search; })()}" class="wm-plp-pagination__link wm-plp-pagination__link--prev" aria-label="Previous page">Previous</a>
                  </li>
                ` : ''}
                ${Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => `
                  <li class="wm-plp-pagination__item">
                    ${pNum === page ? `
                      <span class="wm-plp-pagination__link is-active" aria-current="page">${pNum}</span>
                    ` : `
                      <a href="${(() => { const u = new URL(urlObj.toString()); u.searchParams.set('page', String(pNum)); return u.pathname + u.search; })()}" class="wm-plp-pagination__link" aria-label="Page ${pNum}">${pNum}</a>
                    `}
                  </li>
                `).join('')}
                ${page < totalPages ? `
                  <li class="wm-plp-pagination__item">
                    <a href="${(() => { const u = new URL(urlObj.toString()); u.searchParams.set('page', String(page + 1)); return u.pathname + u.search; })()}" class="wm-plp-pagination__link wm-plp-pagination__link--next" aria-label="Next page">Next</a>
                  </li>
                ` : ''}
              </ul>
            </nav>
          </div>
        </div>
      </div>
      ` : `
      <div class="py-16 text-center max-w-lg mx-auto">
        <h2 class="text-xl font-bold text-[#1B3A2A] mb-2">Find the Perfect Product for Your Pet</h2>
        <p class="text-sm text-neutral-500 mb-6">Explore popular pet essentials below:</p>
        <div class="flex flex-wrap justify-center gap-2">
          <a href="/search?q=dog&type=product" class="px-4 py-2 rounded-full border border-[#D5CEBF] bg-white text-xs font-semibold text-[#1B3A2A]">Dog Supplies</a>
          <a href="/search?q=grooming&type=product" class="px-4 py-2 rounded-full border border-[#D5CEBF] bg-white text-xs font-semibold text-[#1B3A2A]">Grooming</a>
        </div>
      </div>
      `}
    </div>
  </main>

  <script src="/assets/header.js"></script>
  <script src="/assets/collection.js"></script>
</body>
</html>`;
}

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, 'http://127.0.0.1');

    // Static asset serving from workspace /assets/
    if (urlObj.pathname.startsWith('/assets/')) {
      const fileName = path.basename(urlObj.pathname);
      const filePath = path.join(__dirname, '..', 'assets', fileName);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        let contentType = 'text/plain';
        if (ext === '.css') contentType = 'text/css';
        else if (ext === '.js') contentType = 'application/javascript';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.jpg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(fs.readFileSync(filePath));
      }
      res.writeHead(404);
      return res.end('Not found');
    }

    // Predictive search API simulation (/search/suggest.json)
    if (urlObj.pathname.startsWith('/search/suggest')) {
      const q = (urlObj.searchParams.get('q') || '').toLowerCase().trim();
      const results = mockProducts.filter((p) =>
        (p.title + ' ' + p.product_type + ' ' + p.tags.join(' ')).toLowerCase().includes(q)
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          resources: {
            results: {
              products: results.map((p) => ({
                id: p.id,
                title: p.title,
                url: `/products/${p.handle}`,
                featured_image: { url: `/assets/${p.image}` },
                price: (p.price_cents / 100).toFixed(2),
                price_min: (p.price_cents / 100).toFixed(2),
                price_max: (p.price_cents / 100).toFixed(2),
                compare_at_price_max: (p.compare_price * 100 / 100).toFixed(2),
                available: p.available,
                product_type: p.product_type,
                vendor: p.vendor,
              })),
              collections: q.includes('food') || q.includes('dog') ? [{ title: 'Dog Food Supplies', url: '/collections/dog-food' }] : [],
            },
          },
        })
      );
    }

    // Search Page & AJAX HTML responses
    if (urlObj.pathname === '/search' || urlObj.pathname === '/') {
      const html = generateSearchHtml(urlObj);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      baseUrl = `http://127.0.0.1:${serverPort}`;
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test.describe('Shopify Search & Discovery Integration', () => {

  test('1. Debounced Predictive Search Dropdown renders real products with INR pricing and sold out indicator', async ({ page }) => {
    await page.goto(`${baseUrl}/search`);

    // Click search icon button to open modal
    const searchOpenBtn = page.locator('[data-search-open]');
    await searchOpenBtn.click();

    const searchModal = page.locator('#WmSearch');
    await expect(searchModal).toBeVisible();

    const searchInput = page.locator('#WmSearchInput');
    await expect(searchInput).toBeFocused();

    // Type query "kibble"
    await searchInput.fill('kibble');

    // Wait for debounced predictive search results to render
    const resultsContainer = page.locator('#WmSearchResults');
    await expect(resultsContainer).toBeVisible({ timeout: 5000 });

    // Verify product card is displayed
    const productItem = resultsContainer.locator('.wm-result').first();
    await expect(productItem).toBeVisible();
    await expect(productItem).toContainText('Natural Grain-Free Dog Food Kibble');
    await expect(productItem).toContainText('₹1,250');

    // Verify thumbnail image is present
    const thumb = productItem.locator('img.wm-result__thumb');
    await expect(thumb).toBeVisible();

    // Type "glove" which is out of stock (available: false)
    await searchInput.fill('glove');
    await expect(resultsContainer.locator('.wm-result').first()).toContainText('Pet Grooming Glove');
    // Verify "Sold out" indicator is shown
    await expect(resultsContainer).toContainText('Sold out');
  });

  test('2. Predictive Search Keyboard Navigation (ArrowDown, ArrowUp, Escape)', async ({ page }) => {
    await page.goto(`${baseUrl}/search`);

    await page.locator('[data-search-open]').click();
    const searchInput = page.locator('#WmSearchInput');
    await searchInput.fill('dog');

    const resultsContainer = page.locator('#WmSearchResults');
    await expect(resultsContainer.locator('[role="option"]').first()).toBeVisible({ timeout: 5000 });

    // Focus input and press ArrowDown
    await searchInput.focus();
    await searchInput.press('ArrowDown');
    const firstOption = resultsContainer.locator('[role="option"]').nth(0);
    await expect(firstOption).toHaveAttribute('aria-selected', 'true');

    // Press ArrowDown to second result
    await searchInput.press('ArrowDown');
    const secondOption = resultsContainer.locator('[role="option"]').nth(1);
    await expect(secondOption).toHaveAttribute('aria-selected', 'true');
    await expect(firstOption).toHaveAttribute('aria-selected', 'false');

    // Press ArrowUp back to first result
    await searchInput.press('ArrowUp');
    await expect(firstOption).toHaveAttribute('aria-selected', 'true');

    // Press Escape to dismiss modal
    await searchInput.press('Escape');
    const searchModal = page.locator('#WmSearch');
    await expect(searchModal).not.toHaveClass(/is-open/);
  });

  test('3. Search Results Page renders real products, headings, and INR prices', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=dog`);

    // Verify H1 and eyebrow
    await expect(page.locator('[data-plp-hero-title]')).toContainText('Results for “dog”');
    await expect(page.locator('[data-plp-total-count]')).toContainText('6 results');

    // Verify product cards in grid
    const cards = page.locator('[data-plp-grid] [data-product-card]');
    await expect(cards).toHaveCount(2); // 2 per page pagination

    // First card checks
    const firstCard = cards.first();
    await expect(firstCard.locator('.wm-card__title')).toBeVisible();
    await expect(firstCard.locator('.wm-card__price')).toContainText('₹');
    await expect(firstCard.locator('img')).toBeVisible();
  });

  test('4. Facet Filtering: Availability checkbox filters results and persists in URL', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=dog`);

    // Locate "In stock" label
    const inStockLabel = page.locator('label:has(#Filter-avail-1)');
    await inStockLabel.click();

    // Verify URL parameter is updated via pushState
    await page.waitForURL(/filter\.v\.availability=1/);
    expect(page.url()).toContain('filter.v.availability=1');

    // Verify active filter chip appears
    const chip = page.locator('[data-plp-filter-chips] .wm-plp-chip');
    await expect(chip).toBeVisible();
    await expect(chip).toContainText('Availability: In stock');

    // Verify toolbar active badge count
    const badge = page.locator('[data-plp-filter-badge]');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('1');
  });

  test('5. Combined Filters: Availability + Product Type simultaneous filtering', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=dog`);

    // Select In Stock
    await page.locator('label:has(#Filter-avail-1)').click();
    await page.waitForURL(/filter\.v\.availability=1/);

    // Select Product Type "Food"
    await page.locator('label:has(input[name="filter.p.product_type"][value="Food"])').click();
    await page.waitForURL(/filter\.p\.product_type=Food/);

    // Verify both filters present in URL
    expect(page.url()).toContain('filter.v.availability=1');
    expect(page.url()).toContain('filter.p.product_type=Food');

    // Verify 2 active chips
    const chips = page.locator('[data-plp-filter-chips] .wm-plp-chip');
    await expect(chips).toHaveCount(2);

    // Verify filter badge count is 2
    await expect(page.locator('[data-plp-filter-badge]')).toHaveText('2');
  });

  test('6. Price Range Slider & Inputs synchronization and URL persistence', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=dog`);

    const minInput = page.locator('#Filter-min-price');
    const maxInput = page.locator('#Filter-max-price');

    // Update price inputs
    await minInput.fill('500');
    await minInput.dispatchEvent('change');
    await page.waitForURL(/filter\.v\.price\.gte=500/);

    await maxInput.fill('2000');
    await maxInput.dispatchEvent('change');
    await page.waitForURL(/filter\.v\.price\.lte=2000/);

    expect(page.url()).toContain('filter.v.price.gte=500');
    expect(page.url()).toContain('filter.v.price.lte=2000');

    // Verify price chip
    const priceChip = page.locator('[data-plp-filter-chips] [data-remove-filter="price"]');
    await expect(priceChip).toBeVisible();
    await expect(priceChip).toContainText('Price: ₹500 – ₹2000');
  });

  test('7. Removing Filter Chips and Clear All functionality', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=dog&filter.v.availability=1&filter.p.product_type=Food`);

    // Verify 2 chips exist
    let chips = page.locator('[data-plp-filter-chips] .wm-plp-chip');
    await expect(chips).toHaveCount(2);

    // Click first chip's remove link
    await chips.first().click();
    await page.waitForFunction(() => !window.location.search.includes('filter.v.availability'));
    expect(page.url()).not.toContain('filter.v.availability');

    // Click "Clear All"
    const clearAllBtn = page.locator('[data-plp-clear-all]').first();
    await clearAllBtn.click();

    // Verify search query "dog" is retained, but all filters are removed
    await page.waitForFunction(() => !window.location.search.includes('filter.p.product_type'));
    expect(page.url()).toContain('q=dog');
    expect(page.url()).not.toContain('filter.p.product_type');
  });

  test('8. Sorting updates URL parameter and re-sorts results', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=dog`);

    const sortSelect = page.locator('#wm-plp-sort-select');
    await sortSelect.selectOption('price-ascending');

    await page.waitForURL(/sort_by=price-ascending/);
    expect(page.url()).toContain('sort_by=price-ascending');

    // Verify first product is the cheapest
    const firstPrice = page.locator('[data-plp-grid] [data-product-card] .wm-card__price').first();
    await expect(firstPrice).toContainText('₹330');
  });

  test('9. Pagination navigation across search results', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=dog`);

    const pagination = page.locator('[data-plp-pagination]');
    await expect(pagination).toBeVisible();

    // Click page 2 link
    const page2Link = pagination.locator('a[aria-label="Page 2"]');
    await page2Link.click();

    await page.waitForURL(/page=2/);
    expect(page.url()).toContain('page=2');

    // Verify Page 2 is active pill
    const activePage = pagination.locator('.is-active');
    await expect(activePage).toHaveText('2');
  });

  test('10. Browser Back/Forward navigation (popstate) preserves search and filter state', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=dog`);

    // Apply availability filter
    await page.locator('label:has(#Filter-avail-1)').click();
    await page.waitForURL(/filter\.v\.availability=1/);
    expect(page.url()).toContain('filter.v.availability=1');

    // Navigate back
    await page.goBack();
    await page.waitForFunction(() => !window.location.search.includes('filter.v.availability'));
    expect(page.url()).not.toContain('filter.v.availability');
    await expect(page.locator('#Filter-avail-1')).not.toBeChecked();

    // Navigate forward
    await page.goForward();
    await page.waitForFunction(() => window.location.search.includes('filter.v.availability'));
    expect(page.url()).toContain('filter.v.availability=1');
    await expect(page.locator('#Filter-avail-1')).toBeChecked();
  });

  test('11. Empty Search Results State displays friendly no-results guidance', async ({ page }) => {
    await page.goto(`${baseUrl}/search?q=nonexistentproductxyz123`);

    const emptyState = page.locator('[data-plp-empty-state]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No products match your filters');

    // Grid should be hidden
    await expect(page.locator('#wm-plp-products')).toBeHidden();
  });

  test('12. Mobile Filter Drawer & Accessibility (<768px)', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${baseUrl}/search?q=dog`);

    const mobileFilterBtn = page.locator('[data-plp-mobile-filter-open]');
    await expect(mobileFilterBtn).toBeVisible();

    // Open mobile drawer
    await mobileFilterBtn.click();

    const sidebar = page.locator('#wm-plp-sidebar');
    await expect(sidebar).toHaveClass(/is-mobile-open/);

    const backdrop = page.locator('[data-plp-sidebar-backdrop]');
    await expect(backdrop).toHaveClass(/is-active/);

    // Verify sticky footer in drawer
    const applyBtn = sidebar.locator('[data-plp-sidebar-apply]');
    await expect(applyBtn).toBeVisible();
    await expect(applyBtn).toContainText('Show 6 Products');

    // Close via close button
    const closeBtn = sidebar.locator('[data-plp-sidebar-close]');
    await closeBtn.click();
    await expect(sidebar).not.toHaveClass(/is-mobile-open/);
  });
});

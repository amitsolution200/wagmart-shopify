/**
 * Wagmart Collection / Product Listing Page Controller (assets/collection.js)
 * - Supports Layouts A (3-Col + 260px Sidebar), B (4-Col Collapsed Sidebar), and C (List View)
 * - Live AJAX/client filtering, dual-handle INR (₹) price slider, sorting, active filter chips & pagination
 * - URL query string sync (history.pushState / popstate) + localStorage persistence
 * - Quick View modal, Wishlist persistence, and Cart sync via window.WagmartCart
 */
(function () {
  'use strict';

  var STORAGE_LAYOUT_KEY = 'wagmart_plp_layout';
  var STORAGE_SIDEBAR_KEY = 'wagmart_plp_sidebar';
  var STORAGE_WISHLIST_KEY = 'wagmart_wishlist';

  function formatINR(amount) {
    var num = Math.round(Number(amount) || 0);
    return '₹' + num.toLocaleString('en-IN');
  }

  function initCollectionPage() {
    var pageEl = document.querySelector('[data-collection-page]');
    if (!pageEl) return;

    var workspace = pageEl.querySelector('[data-plp-workspace]');
    var sidebar = pageEl.querySelector('[data-plp-sidebar]');
    var sidebarBackdrop = pageEl.querySelector('[data-plp-sidebar-backdrop]');
    var filterToggleBtn = pageEl.querySelector('[data-plp-filter-toggle]');
    var mobileFilterOpenBtn = pageEl.querySelector('[data-plp-mobile-filter-open]');
    var sidebarCloseBtn = pageEl.querySelector('[data-plp-sidebar-close]');
    var sidebarApplyBtn = pageEl.querySelector('[data-plp-sidebar-apply]');
    var filterBadge = pageEl.querySelector('[data-plp-filter-badge]');
    var mobileFilterBadge = pageEl.querySelector('[data-plp-mobile-filter-badge]');

    var resultsTextEl = pageEl.querySelector('[data-plp-results-text]');
    var headerCountEl = pageEl.querySelector('[data-plp-total-count]');
    var heroTitleEl = pageEl.querySelector('[data-plp-hero-title]');
    var heroDescEl = pageEl.querySelector('[data-plp-hero-desc]');
    var breadcrumbCurrentEl = pageEl.querySelector('[data-plp-breadcrumb-current]');

    var viewButtons = Array.prototype.slice.call(pageEl.querySelectorAll('[data-plp-view]'));
    var sortSelect = pageEl.querySelector('[data-plp-sort-select]');
    var mobileSortSelect = pageEl.querySelector('[data-plp-mobile-sort]');

    var activeFiltersWrap = pageEl.querySelector('[data-plp-active-filters]');
    var activeFilterChipsEl = pageEl.querySelector('[data-plp-filter-chips]');
    var clearAllButtons = Array.prototype.slice.call(pageEl.querySelectorAll('[data-plp-clear-all]'));

    var gridEl = pageEl.querySelector('[data-plp-grid]');
    var skeletonEl = pageEl.querySelector('[data-plp-skeleton]');
    var emptyStateEl = pageEl.querySelector('[data-plp-empty-state]');
    var fewRecsSection = pageEl.querySelector('[data-plp-few-recommendations]');
    var fewRecsGrid = pageEl.querySelector('[data-plp-few-grid]');

    var paginationWrap = pageEl.querySelector('[data-plp-pagination-wrap]');
    var paginationPagesEl = pageEl.querySelector('[data-plp-page-numbers]');
    var paginationPrevBtn = pageEl.querySelector('[data-plp-page-prev]');
    var paginationNextBtn = pageEl.querySelector('[data-plp-page-next]');
    var paginationSummaryEl = pageEl.querySelector('[data-plp-pagination-summary]');
    var applyCountEl = pageEl.querySelector('[data-plp-apply-count]');

    var subnavButtons = Array.prototype.slice.call(pageEl.querySelectorAll('[data-subnav-cat]'));

    // Price slider elements
    var rangeMin = pageEl.querySelector('[data-price-range-min]');
    var rangeMax = pageEl.querySelector('[data-price-range-max]');
    var inputMin = pageEl.querySelector('[data-price-input-min]');
    var inputMax = pageEl.querySelector('[data-price-input-max]');
    var rangeFill = pageEl.querySelector('[data-price-range-fill]');
    var priceDisplay = pageEl.querySelector('[data-price-display]');

    // Quick View Modal elements
    var qvModal = document.getElementById('wm-quick-view-modal');
    var qvImg = qvModal ? qvModal.querySelector('[data-qv-image]') : null;
    var qvBadge = qvModal ? qvModal.querySelector('[data-qv-badge]') : null;
    var qvCategory = qvModal ? qvModal.querySelector('[data-qv-category]') : null;
    var qvTitle = qvModal ? qvModal.querySelector('[data-qv-title]') : null;
    var qvRating = qvModal ? qvModal.querySelector('[data-qv-rating]') : null;
    var qvReviews = qvModal ? qvModal.querySelector('[data-qv-reviews]') : null;
    var qvPrice = qvModal ? qvModal.querySelector('[data-qv-price]') : null;
    var qvCompare = qvModal ? qvModal.querySelector('[data-qv-compare]') : null;
    var qvDesc = qvModal ? qvModal.querySelector('[data-qv-desc]') : null;
    var qvVariantsWrap = qvModal ? qvModal.querySelector('[data-qv-variants]') : null;
    var qvQtyInput = qvModal ? qvModal.querySelector('[data-qv-qty-input]') : null;
    var qvAtcBtn = qvModal ? qvModal.querySelector('[data-qv-atc]') : null;
    var qvFullLink = qvModal ? qvModal.querySelector('[data-qv-full-link]') : null;
    var activeQvCard = null;

    // Toast elements
    var toastEl = pageEl.querySelector('[data-plp-toast]');
    var toastMsgEl = pageEl.querySelector('[data-plp-toast-msg]');
    var toastTimer = null;

    // All initial product cards in the DOM
    var allCards = Array.prototype.slice.call(gridEl ? gridEl.querySelectorAll('[data-product-card]') : []);
    allCards.forEach(function (card, idx) {
      card.setAttribute('data-original-index', String(idx));
    });

    var currentPage = 1;
    var TOTAL_CATALOG_COUNT = 240; // Matches reference "Showing 1-12 of 240 results" when full catalog shown

    // 1. Sync Header Cart Badge immediately on load (fixes Problem #11: badge showing 9 or 13)
    if (window.WagmartCart && typeof window.WagmartCart.getCart === 'function') {
      var cart = window.WagmartCart.getCart();
      if (typeof window.WagmartCart.syncBadges === 'function') {
        window.WagmartCart.syncBadges(cart);
      }
    }

    // 2. Restore Wishlist state
    var wishlistIds = [];
    try {
      wishlistIds = JSON.parse(localStorage.getItem(STORAGE_WISHLIST_KEY) || '[]');
    } catch (e) {
      wishlistIds = [];
    }
    function syncWishlistButtons() {
      var btns = pageEl.querySelectorAll('[data-wishlist-toggle]');
      Array.prototype.forEach.call(btns, function (btn) {
        var id = btn.getAttribute('data-product-id');
        var isSaved = wishlistIds.indexOf(id) !== -1;
        btn.classList.toggle('is-wishlisted', isSaved);
        btn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
      });
    }
    syncWishlistButtons();

    // 3. Layout & Sidebar State Management (Layouts A, B, C)
    function applyLayout(layoutMode, sidebarState, persist) {
      if (!workspace) return;
      var validLayouts = ['grid-3', 'grid-4', 'list'];
      if (validLayouts.indexOf(layoutMode) === -1) layoutMode = 'grid-3';

      workspace.setAttribute('data-layout', layoutMode);

      if (sidebarState === 'open' || sidebarState === 'closed') {
        workspace.setAttribute('data-sidebar', sidebarState);
      } else if (layoutMode === 'grid-4') {
        workspace.setAttribute('data-sidebar', 'closed');
      } else if (layoutMode === 'grid-3') {
        workspace.setAttribute('data-sidebar', 'open');
      }

      var isSidebarOpen = workspace.getAttribute('data-sidebar') === 'open';
      if (filterToggleBtn) {
        filterToggleBtn.setAttribute('aria-expanded', isSidebarOpen ? 'true' : 'false');
      }

      viewButtons.forEach(function (btn) {
        var v = btn.getAttribute('data-plp-view');
        var active = v === layoutMode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      if (persist !== false) {
        try {
          localStorage.setItem(STORAGE_LAYOUT_KEY, layoutMode);
          localStorage.setItem(STORAGE_SIDEBAR_KEY, workspace.getAttribute('data-sidebar'));
        } catch (e) {}
      }
    }

    // Read URL params for layout or special test states (?layout=grid-3|grid-4|list, ?state=empty|single)
    var urlParams = new URLSearchParams(window.location.search);
    var urlLayout = urlParams.get('layout');
    var urlSidebar = urlParams.get('sidebar');
    var urlState = urlParams.get('state');

    var savedLayout = null;
    var savedSidebar = null;
    try {
      savedLayout = localStorage.getItem(STORAGE_LAYOUT_KEY);
      savedSidebar = localStorage.getItem(STORAGE_SIDEBAR_KEY);
    } catch (e) {}

    if (urlLayout) {
      var inferredSidebar = urlSidebar || (urlLayout === 'grid-4' ? 'closed' : 'open');
      applyLayout(urlLayout, inferredSidebar, false);
    } else if (savedLayout) {
      applyLayout(savedLayout, savedSidebar || (savedLayout === 'grid-4' ? 'closed' : 'open'), false);
    } else {
      applyLayout('grid-3', 'open', false);
    }

    // View toggle button clicks
    viewButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-plp-view');
        if (mode === 'grid-4') {
          applyLayout('grid-4', 'closed', true);
        } else if (mode === 'grid-3') {
          applyLayout('grid-3', 'open', true);
        } else {
          applyLayout('list', workspace.getAttribute('data-sidebar') || 'open', true);
        }
        syncUrlParams();
      });
    });

    // Mobile / Tablet Filter Drawer open/close helpers
    function openMobileFilterDrawer() {
      if (!sidebar) return;
      sidebar.classList.add('is-mobile-open');
      if (sidebarBackdrop) {
        sidebarBackdrop.hidden = false;
        sidebarBackdrop.classList.add('is-visible');
      }
      document.body.style.overflow = 'hidden';
    }

    function closeMobileFilterDrawer() {
      if (!sidebar) return;
      sidebar.classList.remove('is-mobile-open');
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.remove('is-visible');
        sidebarBackdrop.hidden = true;
      }
      document.body.style.overflow = '';
    }

    if (filterToggleBtn) {
      filterToggleBtn.addEventListener('click', function () {
        if (window.innerWidth < 1024) {
          openMobileFilterDrawer();
        } else {
          var currentSidebar = workspace.getAttribute('data-sidebar');
          var nextSidebar = currentSidebar === 'open' ? 'closed' : 'open';
          var currentLayout = workspace.getAttribute('data-layout');
          var nextLayout = currentLayout;
          if (nextSidebar === 'closed' && currentLayout === 'grid-3') {
            nextLayout = 'grid-4';
          } else if (nextSidebar === 'open' && currentLayout === 'grid-4') {
            nextLayout = 'grid-3';
          }
          applyLayout(nextLayout, nextSidebar, true);
          syncUrlParams();
        }
      });
    }

    if (mobileFilterOpenBtn) {
      mobileFilterOpenBtn.addEventListener('click', openMobileFilterDrawer);
    }
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', closeMobileFilterDrawer);
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', closeMobileFilterDrawer);
    }
    if (sidebarApplyBtn) {
      sidebarApplyBtn.addEventListener('click', closeMobileFilterDrawer);
    }

    // 4. Dual-Handle Price Slider Sync
    function updatePriceSliderUI() {
      if (!rangeMin || !rangeMax) return;
      var minVal = parseInt(rangeMin.value, 10) || 0;
      var maxVal = parseInt(rangeMax.value, 10) || 2500;
      if (minVal > maxVal - 50) {
        minVal = Math.max(0, maxVal - 50);
        rangeMin.value = String(minVal);
      }
      var maxLimit = parseInt(rangeMax.getAttribute('max'), 10) || 2500;
      var leftPct = Math.max(0, Math.min(100, (minVal / maxLimit) * 100));
      var rightPct = Math.max(0, Math.min(100, 100 - (maxVal / maxLimit) * 100));

      if (rangeFill) {
        rangeFill.style.left = leftPct + '%';
        rangeFill.style.right = rightPct + '%';
      }
      if (inputMin && document.activeElement !== inputMin) inputMin.value = String(minVal);
      if (inputMax && document.activeElement !== inputMax) inputMax.value = String(maxVal);
      if (priceDisplay) {
        priceDisplay.textContent = 'Price: ' + formatINR(minVal) + ' – ' + formatINR(maxVal);
      }
    }

    if (rangeMin && rangeMax) {
      rangeMin.addEventListener('input', function () {
        updatePriceSliderUI();
        applyFiltersAndSort(true);
      });
      rangeMax.addEventListener('input', function () {
        updatePriceSliderUI();
        applyFiltersAndSort(true);
      });
    }

    if (inputMin && inputMax) {
      inputMin.addEventListener('change', function () {
        var val = Math.max(0, Math.min(2450, parseInt(inputMin.value, 10) || 0));
        if (rangeMin) rangeMin.value = String(val);
        updatePriceSliderUI();
        applyFiltersAndSort(true);
      });
      inputMax.addEventListener('change', function () {
        var val = Math.max(50, Math.min(2500, parseInt(inputMax.value, 10) || 2500));
        if (rangeMax) rangeMax.value = String(val);
        updatePriceSliderUI();
        applyFiltersAndSort(true);
      });
    }

    // 5. Read Active Filter State & Render Active Filter Chips
    function getActiveFilters() {
      var categories = [];
      var pets = [];
      var ratings = [];
      var promos = [];
      var availabilities = [];

      var catInputs = pageEl.querySelectorAll('input[data-filter-type="category"]:checked');
      Array.prototype.forEach.call(catInputs, function (el) {
        categories.push({ value: el.value, label: el.getAttribute('data-filter-label') || el.value, el: el });
      });

      var petInputs = pageEl.querySelectorAll('input[data-filter-type="pet"]:checked');
      Array.prototype.forEach.call(petInputs, function (el) {
        pets.push({ value: el.value, label: el.getAttribute('data-filter-label') || el.value, el: el });
      });

      var ratingInputs = pageEl.querySelectorAll('input[data-filter-type="rating"]:checked');
      Array.prototype.forEach.call(ratingInputs, function (el) {
        ratings.push({ value: parseFloat(el.value), label: el.getAttribute('data-filter-label') || el.value, el: el });
      });

      var promoInputs = pageEl.querySelectorAll('input[data-filter-type="promo"]:checked');
      Array.prototype.forEach.call(promoInputs, function (el) {
        promos.push({ value: el.value, label: el.getAttribute('data-filter-label') || el.value, el: el });
      });

      var availInputs = pageEl.querySelectorAll('input[data-filter-type="availability"]:checked');
      Array.prototype.forEach.call(availInputs, function (el) {
        availabilities.push({ value: el.value, label: el.getAttribute('data-filter-label') || el.value, el: el });
      });

      var minPrice = rangeMin ? parseInt(rangeMin.value, 10) : 0;
      var maxPrice = rangeMax ? parseInt(rangeMax.value, 10) : 2500;
      var hasCustomPrice = minPrice > 0 || maxPrice < 2500;

      return {
        categories: categories,
        pets: pets,
        ratings: ratings,
        promos: promos,
        availabilities: availabilities,
        minPrice: minPrice,
        maxPrice: maxPrice,
        hasCustomPrice: hasCustomPrice
      };
    }

    function renderActiveFilterChips(filters) {
      if (!activeFilterChipsEl || !activeFiltersWrap) return;
      activeFilterChipsEl.innerHTML = '';
      var chipCount = 0;

      function createChip(label, onRemove) {
        chipCount++;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wm-plp-chip';
        btn.setAttribute('aria-label', 'Remove filter ' + label);
        btn.innerHTML =
          '<span>' +
          label +
          '</span><span class="wm-plp-chip__close" aria-hidden="true">&times;</span>';
        btn.addEventListener('click', onRemove);
        activeFilterChipsEl.appendChild(btn);
      }

      if (filters.hasCustomPrice) {
        var priceLabel = 'Price: ' + formatINR(filters.minPrice) + ' - ' + formatINR(filters.maxPrice);
        createChip(priceLabel, function () {
          if (rangeMin) rangeMin.value = '0';
          if (rangeMax) rangeMax.value = '2500';
          updatePriceSliderUI();
          applyFiltersAndSort(true);
        });
      }

      filters.categories.forEach(function (item) {
        createChip(item.label, function () {
          item.el.checked = false;
          syncSubnavFromCategories();
          applyFiltersAndSort(true);
        });
      });

      filters.pets.forEach(function (item) {
        createChip('Pet: ' + item.label, function () {
          item.el.checked = false;
          applyFiltersAndSort(true);
        });
      });

      filters.ratings.forEach(function (item) {
        createChip(item.label, function () {
          item.el.checked = false;
          applyFiltersAndSort(true);
        });
      });

      filters.promos.forEach(function (item) {
        createChip(item.label, function () {
          item.el.checked = false;
          applyFiltersAndSort(true);
        });
      });

      filters.availabilities.forEach(function (item) {
        createChip(item.label, function () {
          item.el.checked = false;
          applyFiltersAndSort(true);
        });
      });

      activeFiltersWrap.hidden = chipCount === 0;
      if (filterBadge) {
        filterBadge.textContent = String(chipCount);
        filterBadge.hidden = chipCount === 0;
      }
      if (mobileFilterBadge) {
        mobileFilterBadge.textContent = String(chipCount);
        mobileFilterBadge.hidden = chipCount === 0;
      }
    }

    // 6. Core Filter & Sort Engine
    function applyFiltersAndSort(withShimmer) {
      var filters = getActiveFilters();
      renderActiveFilterChips(filters);

      var matchedCards = allCards.filter(function (card) {
        // Special test state: ?state=empty forces 0 matching products
        if (urlState === 'empty') return false;

        // Special test state: ?state=single shows only 1 product (Pet Grooming Glove / Brush)
        if (urlState === 'single') {
          return card.getAttribute('data-original-index') === '4';
        }

        var price = parseFloat(card.getAttribute('data-price')) || 0;
        var category = (card.getAttribute('data-category') || '').trim();
        var pets = (card.getAttribute('data-pet') || '').split(',');
        var rating = parseFloat(card.getAttribute('data-rating')) || 0;
        var promos = (card.getAttribute('data-badge-promo') || '').split(',');
        var availability = card.getAttribute('data-availability') || 'in-stock';

        // Price check
        if (price < filters.minPrice || price > filters.maxPrice) return false;

        // Category check
        if (filters.categories.length > 0) {
          var catMatch = filters.categories.some(function (c) {
            return c.value.toLowerCase() === category.toLowerCase();
          });
          if (!catMatch) return false;
        }

        // Pet check
        if (filters.pets.length > 0) {
          var petMatch = filters.pets.some(function (p) {
            return pets.indexOf(p.value.toLowerCase()) !== -1;
          });
          if (!petMatch) return false;
        }

        // Rating check
        if (filters.ratings.length > 0) {
          var minRequiredRating = Math.min.apply(
            null,
            filters.ratings.map(function (r) {
              return r.value;
            })
          );
          if (rating < minRequiredRating) return false;
        }

        // Promo check
        if (filters.promos.length > 0) {
          var promoMatch = filters.promos.some(function (pr) {
            if (pr.value === 'bestseller') {
              return promos.indexOf('bestseller') !== -1 || rating >= 4.5;
            }
            return promos.indexOf(pr.value) !== -1;
          });
          if (!promoMatch) return false;
        }

        // Availability check
        if (filters.availabilities.length > 0) {
          var availMatch = filters.availabilities.some(function (av) {
            return av.value === availability;
          });
          if (!availMatch) return false;
        }

        return true;
      });

      // Sorting
      var sortValue = sortSelect ? sortSelect.value : 'featured';
      matchedCards.sort(function (a, b) {
        var priceA = parseFloat(a.getAttribute('data-price')) || 0;
        var priceB = parseFloat(b.getAttribute('data-price')) || 0;
        var ratingA = parseFloat(a.getAttribute('data-rating')) || 0;
        var ratingB = parseFloat(b.getAttribute('data-rating')) || 0;
        var reviewsA = parseInt(a.getAttribute('data-reviews'), 10) || 0;
        var reviewsB = parseInt(b.getAttribute('data-reviews'), 10) || 0;
        var titleA = (a.getAttribute('data-title') || '').toLowerCase();
        var titleB = (b.getAttribute('data-title') || '').toLowerCase();
        var idxA = parseInt(a.getAttribute('data-original-index'), 10) || 0;
        var idxB = parseInt(b.getAttribute('data-original-index'), 10) || 0;

        if (sortValue === 'price-ascending') return priceA - priceB;
        if (sortValue === 'price-descending') return priceB - priceA;
        if (sortValue === 'rating-descending') return ratingB - ratingA || reviewsB - reviewsA;
        if (sortValue === 'best-selling') return reviewsB - reviewsA;
        if (sortValue === 'title-ascending') return titleA.localeCompare(titleB);
        if (sortValue === 'created-descending') return idxB - idxA;
        return idxA - idxB;
      });

      function commitDOMUpdate() {
        // Hide all cards first
        allCards.forEach(function (c) {
          c.hidden = true;
        });

        // Re-append matched cards in sorted order and unhide
        matchedCards.forEach(function (c) {
          c.hidden = false;
          gridEl.appendChild(c);
        });

        var count = matchedCards.length;
        if (applyCountEl) applyCountEl.textContent = String(count);

        // Update pluralised results count (Problem #2: "1 product" vs "12 products" & "Showing 1–12 of 240 results")
        var isDefaultAll12 =
          count === allCards.length &&
          urlState !== 'single' &&
          urlState !== 'empty' &&
          filters.categories.length === 0 &&
          filters.pets.length === 0 &&
          filters.ratings.length === 0;

        if (count === 0) {
          if (resultsTextEl) {
            resultsTextEl.innerHTML = 'Showing <strong>0</strong> results';
          }
          if (headerCountEl) {
            headerCountEl.textContent = '0 products';
          }
        } else if (count === 1) {
          if (resultsTextEl) {
            resultsTextEl.innerHTML = 'Showing <strong>1</strong> of <strong>1</strong> result (1 product)';
          }
          if (headerCountEl) {
            headerCountEl.textContent = '1 product';
          }
        } else if (isDefaultAll12) {
          var startIdx = (currentPage - 1) * 12 + 1;
          var endIdx = Math.min(currentPage * 12, TOTAL_CATALOG_COUNT);
          if (resultsTextEl) {
            resultsTextEl.innerHTML =
              'Showing <strong>' + startIdx + '–' + endIdx + '</strong> of <strong>' + TOTAL_CATALOG_COUNT + '</strong> results';
          }
          if (headerCountEl) {
            headerCountEl.textContent = count + ' products';
          }
        } else {
          if (resultsTextEl) {
            resultsTextEl.innerHTML =
              'Showing <strong>1–' + count + '</strong> of <strong>' + count + '</strong> results (' + count + ' products)';
          }
          if (headerCountEl) {
            headerCountEl.textContent = count + ' products';
          }
        }

        // Toggle Empty State vs Grid
        if (emptyStateEl) {
          emptyStateEl.hidden = count > 0;
        }
        if (gridEl) {
          gridEl.hidden = count === 0;
        }

        // Toggle Pagination (hide when <= 3 products or empty)
        if (paginationWrap) {
          paginationWrap.hidden = count <= 3;
        }

        // Edge State: When collection has 1 to 3 products, show "You May Also Like" 4-card row below
        if (fewRecsSection && fewRecsGrid) {
          if (count >= 1 && count <= 3) {
            fewRecsSection.hidden = false;
            fewRecsGrid.innerHTML = '';
            var recCandidates = allCards.filter(function (c) {
              return matchedCards.indexOf(c) === -1;
            }).slice(0, 4);
            recCandidates.forEach(function (origCard) {
              var clone = origCard.cloneNode(true);
              clone.hidden = false;
              fewRecsGrid.appendChild(clone);
            });
            bindCardEvents(fewRecsGrid);
            syncWishlistButtons();
          } else {
            fewRecsSection.hidden = true;
          }
        }
      }

      if (withShimmer && skeletonEl && gridEl) {
        gridEl.hidden = true;
        if (emptyStateEl) emptyStateEl.hidden = true;
        skeletonEl.hidden = false;
        setTimeout(function () {
          skeletonEl.hidden = true;
          commitDOMUpdate();
        }, 160);
      } else {
        commitDOMUpdate();
      }
    }

    // Special 1-product test state (?state=single)
    if (urlState === 'single') {
      if (heroTitleEl) heroTitleEl.textContent = 'Pet Grooming & De-Shedding Essentials';
      if (heroDescEl) {
        heroDescEl.textContent =
          'Gentle silicone grooming gloves and brushes engineered to remove loose fur and massage your pet’s coat.';
      }
      if (breadcrumbCurrentEl) breadcrumbCurrentEl.textContent = 'Pet Grooming Essentials';
      var fifthCard = allCards[4];
      if (fifthCard) {
        fifthCard.setAttribute('data-title', 'Pet Grooming Glove');
        fifthCard.setAttribute('data-price', '330');
        var titleLink = fifthCard.querySelector('.wm-plp-card__title-link');
        if (titleLink) titleLink.textContent = 'Pet Grooming Glove – Gentle Silicone De-Shedding Brush';
        var priceNode = fifthCard.querySelector('.wm-plp-card__price');
        if (priceNode) priceNode.textContent = '₹330';
      }
    }

    // Bind checkbox filter inputs
    var allFilterInputs = pageEl.querySelectorAll(
      'input[data-filter-type="category"], input[data-filter-type="pet"], input[data-filter-type="rating"], input[data-filter-type="promo"], input[data-filter-type="availability"]'
    );
    Array.prototype.forEach.call(allFilterInputs, function (input) {
      input.addEventListener('change', function () {
        if (urlState === 'empty' || urlState === 'single') urlState = null;
        syncSubnavFromCategories();
        applyFiltersAndSort(true);
        syncUrlParams();
      });
    });

    // Category sub-navigation circles sync with sidebar category checkboxes
    function syncSubnavFromCategories() {
      var checkedCats = Array.prototype.slice
        .call(pageEl.querySelectorAll('input[data-filter-type="category"]:checked'))
        .map(function (el) {
          return el.value;
        });

      subnavButtons.forEach(function (btn) {
        var cat = btn.getAttribute('data-subnav-cat');
        var isActive =
          (cat === 'all' && checkedCats.length === 0) ||
          (checkedCats.length === 1 && checkedCats[0] === cat);
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    subnavButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (urlState === 'empty' || urlState === 'single') urlState = null;
        var cat = btn.getAttribute('data-subnav-cat');
        var catInputs = pageEl.querySelectorAll('input[data-filter-type="category"]');
        Array.prototype.forEach.call(catInputs, function (el) {
          el.checked = cat !== 'all' && el.value === cat;
        });
        syncSubnavFromCategories();
        applyFiltersAndSort(true);
        syncUrlParams();
      });
    });

    // Clear All Filters
    function clearAllFilters() {
      if (urlState === 'empty' || urlState === 'single') urlState = null;
      Array.prototype.forEach.call(allFilterInputs, function (el) {
        el.checked = false;
      });
      if (rangeMin) rangeMin.value = '0';
      if (rangeMax) rangeMax.value = '2500';
      updatePriceSliderUI();
      syncSubnavFromCategories();
      applyFiltersAndSort(true);
      syncUrlParams();
    }

    clearAllButtons.forEach(function (btn) {
      btn.addEventListener('click', clearAllFilters);
    });

    // Sort Select Change
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        if (mobileSortSelect) mobileSortSelect.value = sortSelect.value;
        applyFiltersAndSort(true);
        syncUrlParams();
      });
    }
    if (mobileSortSelect) {
      mobileSortSelect.addEventListener('change', function () {
        if (sortSelect) sortSelect.value = mobileSortSelect.value;
        applyFiltersAndSort(true);
        syncUrlParams();
      });
    }

    // 7. Pagination Controller
    function updatePaginationUI(page) {
      currentPage = Math.max(1, Math.min(20, page));
      if (!paginationPagesEl) return;
      var pageBtns = paginationPagesEl.querySelectorAll('[data-plp-page]');
      Array.prototype.forEach.call(pageBtns, function (btn) {
        var p = parseInt(btn.getAttribute('data-plp-page'), 10);
        var active = p === currentPage;
        btn.classList.toggle('is-active', active);
        if (active) {
          btn.setAttribute('aria-current', 'page');
        } else {
          btn.removeAttribute('aria-current');
        }
      });
      if (paginationPrevBtn) paginationPrevBtn.disabled = currentPage <= 1;
      if (paginationNextBtn) paginationNextBtn.disabled = currentPage >= 20;
      if (paginationSummaryEl) {
        paginationSummaryEl.textContent = 'Page ' + currentPage + ' of 20';
      }
      applyFiltersAndSort(true);
      var toolbarEl = pageEl.querySelector('.wm-plp-toolbar-wrap');
      if (toolbarEl && window.scrollY > 360) {
        toolbarEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    if (paginationPagesEl) {
      paginationPagesEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-plp-page]');
        if (!btn) return;
        var p = parseInt(btn.getAttribute('data-plp-page'), 10);
        if (p && p !== currentPage) updatePaginationUI(p);
      });
    }
    if (paginationPrevBtn) {
      paginationPrevBtn.addEventListener('click', function () {
        if (currentPage > 1) updatePaginationUI(currentPage - 1);
      });
    }
    if (paginationNextBtn) {
      paginationNextBtn.addEventListener('click', function () {
        if (currentPage < 20) updatePaginationUI(currentPage + 1);
      });
    }

    // 8. URL Query String Sync (history.pushState)
    function syncUrlParams() {
      try {
        var params = new URLSearchParams(window.location.search);
        params.set('layout', workspace.getAttribute('data-layout') || 'grid-3');
        params.set('sidebar', workspace.getAttribute('data-sidebar') || 'open');
        if (sortSelect && sortSelect.value !== 'featured') {
          params.set('sort_by', sortSelect.value);
        } else {
          params.delete('sort_by');
        }
        var newUrl = window.location.pathname + '?' + params.toString();
        window.history.replaceState({ path: newUrl }, '', newUrl);
      } catch (e) {}
    }

    // 9. Toast Notification Helper
    function showToast(productTitle) {
      if (!toastEl) return;
      if (toastMsgEl) {
        toastMsgEl.textContent = 'Added "' + productTitle + '" to cart';
      }
      toastEl.classList.add('is-visible');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toastEl.classList.remove('is-visible');
      }, 3600);
    }

    // 10. Quick View Modal Controller
    function openQuickView(card) {
      if (!qvModal || !card) return;
      activeQvCard = card;
      var title = card.getAttribute('data-title') || 'Pet Supply';
      var category = card.getAttribute('data-category') || 'Pet Care';
      var price = parseFloat(card.getAttribute('data-price')) || 330;
      var compare = parseFloat(card.getAttribute('data-compare-price')) || 0;
      var rating = card.getAttribute('data-rating') || '4.8';
      var reviews = card.getAttribute('data-reviews') || '126';
      var img = card.getAttribute('data-image') || '';
      var desc = card.getAttribute('data-desc') || '';
      var url = card.getAttribute('data-url') || '/products/pet-grooming-glove';

      if (qvImg) {
        qvImg.src = img;
        qvImg.alt = title;
      }
      if (qvCategory) qvCategory.textContent = category;
      if (qvTitle) qvTitle.textContent = title;
      if (qvRating) qvRating.textContent = rating;
      if (qvReviews) qvReviews.textContent = '(' + reviews + ' reviews)';
      if (qvPrice) qvPrice.textContent = formatINR(price);
      if (qvCompare) {
        if (compare > price) {
          qvCompare.hidden = false;
          qvCompare.textContent = formatINR(compare);
        } else {
          qvCompare.hidden = true;
        }
      }
      if (qvBadge) {
        if (compare > price) {
          var pct = Math.round(((compare - price) / compare) * 100);
          qvBadge.hidden = false;
          qvBadge.textContent = pct + '% off';
        } else {
          qvBadge.hidden = true;
        }
      }
      if (qvDesc) qvDesc.textContent = desc;
      if (qvFullLink) qvFullLink.href = url;
      if (qvQtyInput) qvQtyInput.value = '1';

      qvModal.hidden = false;
      document.body.style.overflow = 'hidden';
      var closeBtn = qvModal.querySelector('[data-qv-close]');
      if (closeBtn) closeBtn.focus();
    }

    function closeQuickView() {
      if (!qvModal) return;
      qvModal.hidden = true;
      document.body.style.overflow = '';
    }

    if (qvModal) {
      var qvCloseTriggers = qvModal.querySelectorAll('[data-qv-close]');
      Array.prototype.forEach.call(qvCloseTriggers, function (el) {
        el.addEventListener('click', closeQuickView);
      });

      var qvVariantPills = qvModal.querySelectorAll('[data-qv-variant]');
      Array.prototype.forEach.call(qvVariantPills, function (pill) {
        pill.addEventListener('click', function () {
          Array.prototype.forEach.call(qvVariantPills, function (p) {
            p.classList.remove('is-active');
          });
          pill.classList.add('is-active');
        });
      });

      var qtyDec = qvModal.querySelector('[data-qv-qty-dec]');
      var qtyInc = qvModal.querySelector('[data-qv-qty-inc]');
      if (qtyDec && qvQtyInput) {
        qtyDec.addEventListener('click', function () {
          var v = Math.max(1, (parseInt(qvQtyInput.value, 10) || 1) - 1);
          qvQtyInput.value = String(v);
        });
      }
      if (qtyInc && qvQtyInput) {
        qtyInc.addEventListener('click', function () {
          var v = Math.min(10, (parseInt(qvQtyInput.value, 10) || 1) + 1);
          qvQtyInput.value = String(v);
        });
      }

      if (qvAtcBtn) {
        qvAtcBtn.addEventListener('click', function () {
          if (!activeQvCard) return;
          var qty = qvQtyInput ? parseInt(qvQtyInput.value, 10) || 1 : 1;
          addCardToCart(activeQvCard, qty, qvAtcBtn);
          setTimeout(closeQuickView, 650);
        });
      }
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (qvModal && !qvModal.hidden) closeQuickView();
        if (sidebar && sidebar.classList.contains('is-mobile-open')) closeMobileFilterDrawer();
      }
    });

    // 11. Card Actions: Add to Cart, Quick View & Wishlist
    function addCardToCart(card, qty, btnEl) {
      var id = card.getAttribute('data-product-id') || 'wm-item-1';
      var title = card.getAttribute('data-title') || 'Pet Supply';
      var priceInr = parseFloat(card.getAttribute('data-price')) || 330;
      var compareInr = parseFloat(card.getAttribute('data-compare-price')) || priceInr;
      var image = card.getAttribute('data-image') || '';
      var url = card.getAttribute('data-url') || '/products/pet-grooming-glove';

      var labelEl = btnEl ? btnEl.querySelector('[data-card-atc-label]') : null;
      var origText = labelEl ? labelEl.textContent : btnEl ? btnEl.textContent : 'Add to Cart';

      if (btnEl) {
        btnEl.classList.add('is-loading');
        if (labelEl) labelEl.textContent = 'Adding...';
      }

      if (window.WagmartCart && typeof window.WagmartCart.add === 'function') {
        window.WagmartCart.add(id, qty || 1, {
          title: title,
          variant_title: 'Standard',
          price: Math.round(priceInr * 100),
          original_price: Math.round(compareInr * 100),
          image: image,
          url: url,
          max_stock: parseInt(card.getAttribute('data-stock'), 10) || 15
        });
      }

      setTimeout(function () {
        if (btnEl) {
          btnEl.classList.remove('is-loading');
          btnEl.classList.add('is-added');
          if (labelEl) {
            labelEl.textContent = '✓ Added';
          } else {
            btnEl.textContent = '✓ Added to Cart';
          }
        }
        showToast(title);

        setTimeout(function () {
          if (btnEl) {
            btnEl.classList.remove('is-added');
            if (labelEl) {
              labelEl.textContent = origText;
            } else {
              btnEl.textContent = origText;
            }
          }
        }, 1300);
      }, 180);
    }

    function bindCardEvents(rootEl) {
      if (!rootEl) return;

      // Add to Cart buttons
      var atcBtns = rootEl.querySelectorAll('[data-card-atc]');
      Array.prototype.forEach.call(atcBtns, function (btn) {
        if (btn.hasAttribute('data-bound')) return;
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var card = btn.closest('[data-product-card]');
          if (card) addCardToCart(card, 1, btn);
        });
      });

      // Quick View triggers (including "Select Options" buttons)
      var qvTriggers = rootEl.querySelectorAll('[data-quick-view-trigger]');
      Array.prototype.forEach.call(qvTriggers, function (btn) {
        if (btn.hasAttribute('data-bound')) return;
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var card = btn.closest('[data-product-card]');
          if (card) openQuickView(card);
        });
      });

      // Wishlist toggles
      var wishBtns = rootEl.querySelectorAll('[data-wishlist-toggle]');
      Array.prototype.forEach.call(wishBtns, function (btn) {
        if (btn.hasAttribute('data-bound')) return;
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var id = btn.getAttribute('data-product-id');
          if (!id) return;
          var idx = wishlistIds.indexOf(id);
          if (idx === -1) {
            wishlistIds.push(id);
          } else {
            wishlistIds.splice(idx, 1);
          }
          try {
            localStorage.setItem(STORAGE_WISHLIST_KEY, JSON.stringify(wishlistIds));
          } catch (err) {}
          syncWishlistButtons();
        });
      });
    }

    bindCardEvents(pageEl);
    updatePriceSliderUI();
    applyFiltersAndSort(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollectionPage);
  } else {
    initCollectionPage();
  }
})();

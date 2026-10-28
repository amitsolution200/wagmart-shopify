/**
 * Wagmart Collection / Product Listing Page Controller (assets/collection.js)
 * - Uses 100% REAL Shopify Storefront Filtering (collection.filters) configured in Shopify Admin
 * - Zero fake/mock data, true product counts, true prices, true availability
 * - Native AJAX filtering with URL synchronization (pushState / popState)
 * - Supports 2 View Modes: Grid View & List View (persisted in localStorage)
 * - Quick View Modal (#wm-quick-view-modal) for individual product inspection
 * - Wishlist and Cart Quantity Stepper integration
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

  function normalizeLayout(mode) {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'grid';
    if (mode === 'list') return 'list';
    return 'grid';
  }

  function initCollectionPage() {
    var pageEl = document.querySelector('[data-collection-page], [data-search-page]');
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

    var viewButtons = Array.prototype.slice.call(pageEl.querySelectorAll('[data-plp-view]'));
    var sortSelect = pageEl.querySelector('[data-plp-sort-select]');
    var mobileSortSelect = pageEl.querySelector('[data-plp-mobile-sort]');

    var activeFiltersWrap = pageEl.querySelector('[data-plp-active-filters]');
    var activeFilterChipsEl = pageEl.querySelector('[data-plp-filter-chips]');
    var gridEl = pageEl.querySelector('[data-plp-grid]');
    var skeletonEl = pageEl.querySelector('[data-plp-skeleton]');
    var emptyStateEl = pageEl.querySelector('[data-plp-empty-state]');

    var paginationWrap = pageEl.querySelector('[data-plp-pagination-wrap]');
    var applyCountEl = pageEl.querySelector('[data-plp-apply-count]');

    // Quick View Modal elements (#wm-quick-view-modal)
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
    var qvQtyInput = qvModal ? qvModal.querySelector('[data-qv-qty-input]') : null;
    var qvAtcBtn = qvModal ? qvModal.querySelector('[data-qv-atc]') : null;
    var qvFullLink = qvModal ? qvModal.querySelector('[data-qv-full-link]') : null;
    var activeQvCard = null;

    // Wishlist state
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
        var isSaved = wishlistIds.some(function (item) {
          return (typeof item === 'object' ? item.id : item) == id;
        });
        btn.classList.toggle('is-wishlisted', isSaved);
        btn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
      });
    }

    // Layout (Grid vs List) & Desktop Sidebar toggle
    function applyLayout(layoutMode, sidebarState, persist) {
      if (!workspace) return;
      var cleanLayout = normalizeLayout(layoutMode);
      workspace.setAttribute('data-layout', cleanLayout);

      if (sidebarState === 'open' || sidebarState === 'closed') {
        workspace.setAttribute('data-sidebar', sidebarState);
      }

      var isSidebarOpen = workspace.getAttribute('data-sidebar') === 'open';
      if (filterToggleBtn) {
        filterToggleBtn.setAttribute('aria-expanded', isSidebarOpen ? 'true' : 'false');
      }

      viewButtons.forEach(function (btn) {
        var v = normalizeLayout(btn.getAttribute('data-plp-view'));
        var active = v === cleanLayout;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      if (persist !== false) {
        try {
          localStorage.setItem(STORAGE_LAYOUT_KEY, cleanLayout);
          localStorage.setItem(STORAGE_SIDEBAR_KEY, workspace.getAttribute('data-sidebar'));
        } catch (e) {}
      }
    }

    var savedLayout = 'grid';
    var savedSidebar = 'open';
    try {
      savedLayout = localStorage.getItem(STORAGE_LAYOUT_KEY) || 'grid';
      savedSidebar = localStorage.getItem(STORAGE_SIDEBAR_KEY) || 'open';
    } catch (e) {}
    if (window.innerWidth < 768) {
      savedLayout = 'grid';
    }
    applyLayout(savedLayout, savedSidebar, false);

    window.addEventListener('resize', function () {
      if (window.innerWidth < 768 && workspace && workspace.getAttribute('data-layout') !== 'grid') {
        workspace.setAttribute('data-layout', 'grid');
      }
    });

    viewButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetMode = btn.getAttribute('data-plp-view');
        applyLayout(targetMode, workspace ? workspace.getAttribute('data-sidebar') : 'open', true);
      });
    });

    if (filterToggleBtn) {
      filterToggleBtn.addEventListener('click', function () {
        if (!workspace) return;
        var current = workspace.getAttribute('data-sidebar') || 'open';
        var next = current === 'open' ? 'closed' : 'open';
        applyLayout(workspace.getAttribute('data-layout') || 'grid', next, true);
      });
    }

    // Mobile Bottom-Sheet Filter Drawer (<768px)
    function openMobileFilterDrawer() {
      if (!sidebar) return;
      sidebar.classList.add('is-mobile-open');
      if (sidebarBackdrop) {
        sidebarBackdrop.hidden = false;
        sidebarBackdrop.classList.add('is-active');
      }
      document.body.style.overflow = 'hidden';
      if (sidebarCloseBtn) sidebarCloseBtn.focus();
    }

    function closeMobileFilterDrawer() {
      if (!sidebar) return;
      sidebar.classList.remove('is-mobile-open');
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.remove('is-active');
        sidebarBackdrop.hidden = true;
      }
      document.body.style.overflow = '';
    }

    if (mobileFilterOpenBtn) mobileFilterOpenBtn.addEventListener('click', openMobileFilterDrawer);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileFilterDrawer);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileFilterDrawer);
    if (sidebarApplyBtn) sidebarApplyBtn.addEventListener('click', closeMobileFilterDrawer);

    // Dynamic Price Range Slider UI Setup
    function setupPriceSlider() {
      var priceFilter = pageEl.querySelector('[data-price-filter]');
      if (!priceFilter) return;

      var rangeMin = priceFilter.querySelector('[data-price-range-min]');
      var rangeMax = priceFilter.querySelector('[data-price-range-max]');
      var inputMin = priceFilter.querySelector('[data-price-input-min]');
      var inputMax = priceFilter.querySelector('[data-price-input-max]');
      var rangeFill = priceFilter.querySelector('[data-price-range-fill]');
      var priceDisplay = priceFilter.querySelector('[data-price-display]');
      var maxCatalogPrice = parseFloat(priceFilter.getAttribute('data-range-max')) || 1000;

      function updatePriceSliderUI() {
        if (!rangeMin || !rangeMax) return;
        var minVal = parseInt(rangeMin.value, 10);
        var maxVal = parseInt(rangeMax.value, 10);
        var maxLimit = parseInt(rangeMax.getAttribute('max'), 10) || maxCatalogPrice;

        if (minVal > maxVal) {
          var tmp = minVal;
          minVal = maxVal;
          maxVal = tmp;
        }

        var leftPct = Math.max(0, Math.min(100, (minVal / maxLimit) * 100));
        var rightPct = Math.max(0, Math.min(100, 100 - (maxVal / maxLimit) * 100));

        if (rangeFill) {
          rangeFill.style.left = leftPct + '%';
          rangeFill.style.right = rightPct + '%';
        }
        if (inputMin && document.activeElement !== inputMin) inputMin.value = String(minVal);
        if (inputMax && document.activeElement !== inputMax) inputMax.value = String(maxVal);
        if (priceDisplay) {
          priceDisplay.textContent = formatINR(minVal) + ' – ' + formatINR(maxVal);
        }
      }

      updatePriceSliderUI();

      if (rangeMin && rangeMax) {
        rangeMin.addEventListener('input', function () {
          updatePriceSliderUI();
        });
        rangeMin.addEventListener('change', function () {
          triggerFilterUpdate();
        });
        rangeMax.addEventListener('input', function () {
          updatePriceSliderUI();
        });
        rangeMax.addEventListener('change', function () {
          triggerFilterUpdate();
        });
      }

      if (inputMin && inputMax) {
        inputMin.addEventListener('change', function () {
          var maxLimit = parseInt(rangeMax.getAttribute('max'), 10) || maxCatalogPrice;
          var val = Math.max(0, Math.min(maxLimit, parseInt(inputMin.value, 10) || 0));
          if (rangeMin) rangeMin.value = String(val);
          updatePriceSliderUI();
          triggerFilterUpdate();
        });
        inputMax.addEventListener('change', function () {
          var maxLimit = parseInt(rangeMax.getAttribute('max'), 10) || maxCatalogPrice;
          var val = Math.max(0, Math.min(maxLimit, parseInt(inputMax.value, 10) || maxLimit));
          if (rangeMax) rangeMax.value = String(val);
          updatePriceSliderUI();
          triggerFilterUpdate();
        });
      }
    }

    // Build URL from current active form filters
    function buildFilterUrl() {
      var form = pageEl.querySelector('[data-plp-filter-form]');
      var baseUrl = form ? form.getAttribute('action') || window.location.pathname : window.location.pathname;
      var params = new URLSearchParams();

      // Sort
      var currentSort = (sortSelect && sortSelect.value) || (mobileSortSelect && mobileSortSelect.value);
      if (currentSort && currentSort !== 'featured' && currentSort !== 'relevance') {
        params.set('sort_by', currentSort);
      }

      if (form) {
        // Search query and options
        var qInput = form.querySelector('input[name="q"]');
        if (qInput && qInput.value) {
          params.set('q', qInput.value);
        }
        var optPrefix = form.querySelector('input[name="options[prefix]"]');
        if (optPrefix && optPrefix.value) {
          params.set('options[prefix]', optPrefix.value);
        }
        var typeInput = form.querySelector('input[name="type"]');
        if (typeInput && typeInput.value) {
          params.set('type', typeInput.value);
        }
        // Collect checked checkboxes
        var checkedBoxes = form.querySelectorAll('input[type="checkbox"][data-filter-input]:checked');
        Array.prototype.forEach.call(checkedBoxes, function (cb) {
          if (cb.name && cb.value) {
            params.append(cb.name, cb.value);
          }
        });

        // Price range
        var priceFilter = form.querySelector('[data-price-filter]');
        if (priceFilter) {
          var maxLimit = parseFloat(priceFilter.getAttribute('data-range-max')) || 1000;
          var inMin = priceFilter.querySelector('[data-price-input-min]');
          var inMax = priceFilter.querySelector('[data-price-input-max]');
          var minVal = inMin ? parseFloat(inMin.value) || 0 : 0;
          var maxVal = inMax ? parseFloat(inMax.value) || maxLimit : maxLimit;

          if (minVal > 0 && inMin && inMin.name) {
            params.set(inMin.name, String(minVal));
          }
          if (maxVal < maxLimit && inMax && inMax.name) {
            params.set(inMax.name, String(maxVal));
          }
        }
      }

      var qs = params.toString();
      return qs ? baseUrl + '?' + qs : baseUrl;
    }

    var isFetching = false;

    // Fetch and render filtered results from Shopify Storefront
    function fetchFilteredResults(targetUrl, pushState) {
      if (isFetching) return;
      isFetching = true;

      // Show shimmer skeleton
      if (skeletonEl) skeletonEl.hidden = false;
      if (gridEl) gridEl.hidden = true;
      if (emptyStateEl) emptyStateEl.hidden = true;

      fetch(targetUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(function (res) {
          return res.text();
        })
        .then(function (htmlText) {
          var parser = new DOMParser();
          var newDoc = parser.parseFromString(htmlText, 'text/html');

          // 1. Update Product Grid
          var newGrid = newDoc.querySelector('[data-plp-grid]');
          if (gridEl && newGrid) {
            gridEl.innerHTML = newGrid.innerHTML;
          }

          // 2. Update Empty State
          var newEmpty = newDoc.querySelector('[data-plp-empty-state]');
          if (emptyStateEl && newEmpty) {
            emptyStateEl.innerHTML = newEmpty.innerHTML;
          }

          // Count matching products
          var newCards = gridEl ? gridEl.querySelectorAll('[data-product-card]') : [];
          var count = newCards.length;

          if (gridEl) gridEl.hidden = count === 0;
          if (emptyStateEl) emptyStateEl.hidden = count > 0;

          // 3. Update Filter Sidebar Form
          var newSidebar = newDoc.querySelector('[data-plp-sidebar]');
          if (sidebar && newSidebar) {
            var newForm = newSidebar.querySelector('[data-plp-filter-form]');
            var curForm = sidebar.querySelector('[data-plp-filter-form]');
            if (newForm && curForm) {
              curForm.innerHTML = newForm.innerHTML;
              if (newForm.getAttribute('action')) {
                curForm.setAttribute('action', newForm.getAttribute('action'));
              }
            }
          }

          // 4. Update Toolbar Counts & Active Filter Badges
          var newResultsText = newDoc.querySelector('[data-plp-results-text]');
          if (resultsTextEl && newResultsText) {
            resultsTextEl.innerHTML = newResultsText.innerHTML;
          }

          var newHeaderCount = newDoc.querySelector('[data-plp-total-count]');
          if (headerCountEl && newHeaderCount) {
            headerCountEl.innerHTML = newHeaderCount.innerHTML;
          }

          var newBadge = newDoc.querySelector('[data-plp-filter-badge]');
          if (filterBadge && newBadge) {
            filterBadge.textContent = newBadge.textContent;
            filterBadge.hidden = newBadge.hasAttribute('hidden') || newBadge.textContent.trim() === '0';
          }

          var newMobileBadge = newDoc.querySelector('[data-plp-mobile-filter-badge]');
          if (mobileFilterBadge && newMobileBadge) {
            mobileFilterBadge.textContent = newMobileBadge.textContent;
            mobileFilterBadge.hidden = newMobileBadge.hasAttribute('hidden') || newMobileBadge.textContent.trim() === '0';
          }

          if (applyCountEl) {
            applyCountEl.textContent = String(count);
          }

          // 5. Update Active Filter Chips Row
          var newActiveFilters = newDoc.querySelector('[data-plp-active-filters]');
          if (activeFiltersWrap && newActiveFilters) {
            activeFiltersWrap.innerHTML = newActiveFilters.innerHTML;
            activeFiltersWrap.hidden = newActiveFilters.hasAttribute('hidden');
          }

          // 6. Update Pagination
          var newPagination = newDoc.querySelector('[data-plp-pagination-wrap]');
          if (paginationWrap && newPagination) {
            paginationWrap.innerHTML = newPagination.innerHTML;
            paginationWrap.hidden = newPagination.hasAttribute('hidden');
          }

          // 7. Update Category Subnav Circles
          var newSubnav = newDoc.querySelector('[data-plp-subnav]');
          var curSubnav = pageEl.querySelector('[data-plp-subnav]');
          if (curSubnav && newSubnav) {
            curSubnav.innerHTML = newSubnav.innerHTML;
          }

          // 8. Update Hero Title & Description
          var newHeroTitle = newDoc.querySelector('[data-plp-hero-title]');
          var curHeroTitle = pageEl.querySelector('[data-plp-hero-title]');
          if (curHeroTitle && newHeroTitle) {
            curHeroTitle.innerHTML = newHeroTitle.innerHTML;
          }

          var newHeroDesc = newDoc.querySelector('[data-plp-hero-desc]');
          var curHeroDesc = pageEl.querySelector('[data-plp-hero-desc]');
          if (curHeroDesc && newHeroDesc) {
            curHeroDesc.innerHTML = newHeroDesc.innerHTML;
          }

          // 9. Update Breadcrumb Current Item
          var newBreadcrumb = newDoc.querySelector('[data-plp-breadcrumb-current]');
          var curBreadcrumb = pageEl.querySelector('[data-plp-breadcrumb-current]');
          if (curBreadcrumb && newBreadcrumb) {
            curBreadcrumb.innerHTML = newBreadcrumb.innerHTML;
          }

          // 10. Update Collection Handle & Document Title
          var newPageEl = newDoc.querySelector('[data-collection-page]');
          if (pageEl && newPageEl) {
            var newHandle = newPageEl.getAttribute('data-collection-handle');
            if (newHandle) {
              pageEl.setAttribute('data-collection-handle', newHandle);
            }
          }
          if (newDoc.title) {
            document.title = newDoc.title;
          }

          // 11. Update browser URL history
          if (pushState !== false) {
            window.history.pushState({ url: targetUrl }, '', targetUrl);
          }

          // Hide skeleton
          if (skeletonEl) skeletonEl.hidden = true;
          isFetching = false;

          // Re-bind dynamic events on new DOM elements
          bindDynamicEvents();
        })
        .catch(function (err) {
          console.error('Error fetching filtered collection:', err);
          if (skeletonEl) skeletonEl.hidden = true;
          if (gridEl) gridEl.hidden = false;
          isFetching = false;
        });
    }

    function triggerFilterUpdate() {
      var nextUrl = buildFilterUrl();
      fetchFilteredResults(nextUrl, true);
    }

    // Bind event listeners that depend on refreshed DOM
    function bindDynamicEvents() {
      setupPriceSlider();
      syncWishlistButtons();

      // Filter Checkboxes in Sidebar
      var form = pageEl.querySelector('[data-plp-filter-form]');
      if (form) {
        var filterCheckboxes = form.querySelectorAll('input[type="checkbox"][data-filter-input]');
        Array.prototype.forEach.call(filterCheckboxes, function (cb) {
          cb.addEventListener('change', function () {
            triggerFilterUpdate();
          });
        });
      }

      // "Clear All" / "Reset" buttons
      var clearButtons = pageEl.querySelectorAll('[data-plp-clear-all]');
      Array.prototype.forEach.call(clearButtons, function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var baseUrl = btn.getAttribute('href') || (form ? form.getAttribute('action') : null) || window.location.pathname;
          var currentSort = (sortSelect && sortSelect.value) || (mobileSortSelect && mobileSortSelect.value);
          var params = new URLSearchParams();
          if (form) {
            var qInp = form.querySelector('input[name="q"]');
            if (qInp && qInp.value) params.set('q', qInp.value);
            var optPfx = form.querySelector('input[name="options[prefix]"]');
            if (optPfx && optPfx.value) params.set('options[prefix]', optPfx.value);
            var typInp = form.querySelector('input[name="type"]');
            if (typInp && typInp.value) params.set('type', typInp.value);
          }
          if (currentSort && currentSort !== 'featured' && currentSort !== 'relevance') {
            params.set('sort_by', currentSort);
          }
          var qs = params.toString();
          var cleanBase = baseUrl.split('?')[0];
          var targetUrl = qs ? cleanBase + '?' + qs : cleanBase;
          fetchFilteredResults(targetUrl, true);
        });
      });

      // Pagination Links
      var paginationLinks = pageEl.querySelectorAll('[data-plp-pagination] a');
      Array.prototype.forEach.call(paginationLinks, function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var href = link.getAttribute('href');
          if (href) {
            fetchFilteredResults(href, true);
            if (workspace) {
              var topPos = workspace.getBoundingClientRect().top + window.pageYOffset - 90;
              window.scrollTo({ top: topPos, behavior: 'smooth' });
            }
          }
        });
      });

      // Active Filter Chips: Clicking chip removes that filter
      var chipLinks = pageEl.querySelectorAll('.wm-plp-chip');
      Array.prototype.forEach.call(chipLinks, function (chip) {
        chip.addEventListener('click', function (e) {
          e.preventDefault();
          var removeUrl = chip.getAttribute('href');
          if (removeUrl) {
            fetchFilteredResults(removeUrl, true);
          }
        });
      });

      // Wishlist toggle
      var wishlistBtns = pageEl.querySelectorAll('[data-wishlist-toggle]');
      Array.prototype.forEach.call(wishlistBtns, function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute('data-product-id');
          var idx = wishlistIds.indexOf(id);
          if (idx !== -1) {
            wishlistIds.splice(idx, 1);
          } else {
            wishlistIds.push(id);
          }
          try {
            localStorage.setItem(STORAGE_WISHLIST_KEY, JSON.stringify(wishlistIds));
          } catch (err) {}
          syncWishlistButtons();
        });
      });

      // Quick View Triggers ([data-plp-qv-trigger], [data-quick-view-trigger])
      var qvTriggers = pageEl.querySelectorAll('[data-plp-qv-trigger], [data-quick-view-trigger]');
      Array.prototype.forEach.call(qvTriggers, function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
          }
          var card = btn.closest('[data-product-card]');
          if (card) openQuickView(card, btn);
        });
      });

      // Synchronize quantity steppers on cards
      if (window.WagmartCart && typeof window.WagmartCart.syncCardSteppers === 'function') {
        window.WagmartCart.syncCardSteppers();
      }

      // Category Subnav Circle Click: Toggle category or reset to All products
      var subnavItems = pageEl.querySelectorAll('[data-subnav-item], .wm-plp-subnav__item');
      Array.prototype.forEach.call(subnavItems, function (item) {
        item.addEventListener('click', function (e) {
          e.preventDefault();
          var isActive = item.classList.contains('is-active');
          var allUrl = item.getAttribute('data-all-url') || (pageEl && pageEl.getAttribute('data-all-collection-url')) || '/collections/all';
          var colUrl = item.getAttribute('data-col-url') || item.getAttribute('href') || allUrl;
          var targetUrl = isActive ? allUrl : colUrl;
          fetchFilteredResults(targetUrl, true);
        });
      });

      bindSortOptionClicks();
      syncSortUI();
    }

    // Custom Sort Dropdown & Mobile Sort Sheet (NO native OS select popup)
    var customSort = pageEl.querySelector('[data-plp-custom-sort]');
    var customSortTrigger = pageEl.querySelector('[data-plp-custom-sort-trigger]');
    var customSortMenu = pageEl.querySelector('[data-plp-custom-sort-menu]');
    var customSortCurrent = pageEl.querySelector('[data-plp-sort-current]');

    var mobileSortDrawer = pageEl.querySelector('[data-plp-mobile-sort-drawer]');
    var mobileSortTrigger = pageEl.querySelector('[data-plp-mobile-sort-trigger]');
    var mobileSortCloses = pageEl.querySelectorAll('[data-plp-mobile-sort-close]');

    function openCustomSortMenu() {
      if (!customSortMenu || !customSortTrigger) return;
      customSortMenu.hidden = false;
      customSortTrigger.setAttribute('aria-expanded', 'true');
    }

    function closeCustomSortMenu() {
      if (!customSortMenu || !customSortTrigger) return;
      customSortMenu.hidden = true;
      customSortTrigger.setAttribute('aria-expanded', 'false');
    }

    function toggleCustomSortMenu() {
      if (!customSortMenu) return;
      if (customSortMenu.hidden) {
        openCustomSortMenu();
      } else {
        closeCustomSortMenu();
      }
    }

    function openMobileSortDrawer() {
      if (!mobileSortDrawer) return;
      mobileSortDrawer.hidden = false;
      var toolbarWrap = pageEl.querySelector('[data-plp-toolbar-wrap]');
      if (toolbarWrap) toolbarWrap.style.zIndex = '9999';
      document.body.style.overflow = 'hidden';
    }

    function closeMobileSortDrawer() {
      if (!mobileSortDrawer) return;
      mobileSortDrawer.hidden = true;
      var toolbarWrap = pageEl.querySelector('[data-plp-toolbar-wrap]');
      if (toolbarWrap) toolbarWrap.style.zIndex = '';
      document.body.style.overflow = '';
    }

    function selectSortOption(sortVal, optionLabel) {
      if (sortSelect) sortSelect.value = sortVal;
      if (mobileSortSelect) mobileSortSelect.value = sortVal;
      var sidebarSortInput = pageEl.querySelector('[data-plp-sidebar-sort-input]');
      if (sidebarSortInput) sidebarSortInput.value = sortVal;

      if (customSortCurrent && optionLabel) {
        customSortCurrent.textContent = optionLabel;
      }

      syncSortUI();
      closeCustomSortMenu();
      closeMobileSortDrawer();
      triggerFilterUpdate();
    }

    function syncSortUI() {
      var currentVal = (sortSelect && sortSelect.value) || (mobileSortSelect && mobileSortSelect.value);
      if (!currentVal) {
        var sidebarSortInput = pageEl.querySelector('[data-plp-sidebar-sort-input]');
        currentVal = (sidebarSortInput && sidebarSortInput.value) || 'manual';
      }
      if (currentVal === 'featured') currentVal = 'manual';

      var desktopOpts = pageEl.querySelectorAll('.wm-plp-custom-sort__option');
      Array.prototype.forEach.call(desktopOpts, function (btn) {
        var btnVal = btn.getAttribute('data-sort-value');
        var isCurrent = btnVal === currentVal || (currentVal === 'manual' && btnVal === 'featured');
        btn.classList.toggle('is-active', isCurrent);
        btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        if (isCurrent && customSortCurrent) {
          var textEl = btn.querySelector('.wm-plp-custom-sort__option-text') || btn.querySelector('span') || btn;
          customSortCurrent.textContent = textEl.textContent.trim();
        }
      });

      var mobileOpts = pageEl.querySelectorAll('.wm-plp-mobile-sort-drawer__item');
      Array.prototype.forEach.call(mobileOpts, function (btn) {
        var btnVal = btn.getAttribute('data-sort-value');
        var isCurrent = btnVal === currentVal || (currentVal === 'manual' && btnVal === 'featured');
        btn.classList.toggle('is-active', isCurrent);
      });
    }

    function bindSortOptionClicks() {
      var sortOptions = pageEl.querySelectorAll('.wm-plp-custom-sort__option, .wm-plp-mobile-sort-drawer__item');
      Array.prototype.forEach.call(sortOptions, function (opt) {
        opt.onclick = function (e) {
          e.preventDefault();
          var val = opt.getAttribute('data-sort-value');
          var labelText = (opt.querySelector('.wm-plp-custom-sort__option-text') || opt.querySelector('span') || opt).textContent.trim();
          selectSortOption(val, labelText);
        };
      });
    }

    if (customSortTrigger) {
      customSortTrigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleCustomSortMenu();
      });
    }

    if (mobileSortTrigger) {
      mobileSortTrigger.addEventListener('click', function (e) {
        e.preventDefault();
        openMobileSortDrawer();
      });
    }

    Array.prototype.forEach.call(mobileSortCloses, function (btn) {
      btn.addEventListener('click', function () {
        closeMobileSortDrawer();
      });
    });

    document.addEventListener('click', function (e) {
      if (customSort && !customSort.contains(e.target)) {
        closeCustomSortMenu();
      }
    });

    // Hidden fallback select change triggers
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        if (mobileSortSelect) mobileSortSelect.value = sortSelect.value;
        syncSortUI();
        triggerFilterUpdate();
      });
    }
    if (mobileSortSelect) {
      mobileSortSelect.addEventListener('change', function () {
        if (sortSelect) sortSelect.value = mobileSortSelect.value;
        syncSortUI();
        triggerFilterUpdate();
      });
    }

    // Browser Back / Forward navigation handling
    window.addEventListener('popstate', function (e) {
      fetchFilteredResults(window.location.href, false);
    });

    // Quick View Modal Controller (#wm-quick-view-modal handled globally by window.WagmartQuickView in assets/theme.js)
    function openQuickView(card, triggerBtn) {
      if (window.WagmartQuickView && typeof window.WagmartQuickView.open === 'function') {
        window.WagmartQuickView.open(card, triggerBtn);
      }
    }

    function closeQuickView() {
      if (window.WagmartQuickView && typeof window.WagmartQuickView.close === 'function') {
        window.WagmartQuickView.close();
      } else if (qvModal) {
        qvModal.hidden = true;
        document.body.style.overflow = '';
      }
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (qvModal && !qvModal.hidden) closeQuickView();
        if (sidebar && sidebar.classList.contains('is-mobile-open')) closeMobileFilterDrawer();
        if (customSortMenu && !customSortMenu.hidden) closeCustomSortMenu();
        if (mobileSortDrawer && !mobileSortDrawer.hidden) closeMobileSortDrawer();
      }
    });

    // Initial binding
    bindDynamicEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollectionPage);
  } else {
    initCollectionPage();
  }
})();

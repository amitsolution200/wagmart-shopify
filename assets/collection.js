/**
 * Wagmart Collection Page JavaScript
 * Handles:
 * - Left-side Filter Drawer popup & backdrop overlay
 * - In-stock toggle and interactive facet checkboxes
 * - Filter Accordions (Price, Brand, Age Groups, Form, Weight, etc.)
 * - Dynamic "Apply (N)" counter & live product filtering
 * - Stepper (+ / -) on collection product cards
 * - "Options" / "Add to Cart" button cart integration
 * - Grid density layout toggler (2-column vs 4-column)
 * - Sort by dropdown sorting
 */

(function () {
  'use strict';

  function initCollectionPage() {
    const filterDrawer = document.getElementById('wm-filter-drawer');
    const filterBackdrop = document.getElementById('wm-filter-backdrop');
    const openFilterBtns = document.querySelectorAll('[data-open-filters]');
    const closeFilterBtns = document.querySelectorAll('[data-close-filters]');
    const filterForm = document.getElementById('wm-filter-form');
    const applyBtn = document.querySelector('[data-filter-apply-btn]');
    const resetBtn = document.querySelector('[data-filter-reset-btn]');
    const inStockToggle = document.getElementById('filter-in-stock');
    const gridContainer = document.getElementById('wm-products-grid');
    const toolbarCount = document.querySelector('[data-toolbar-count]');
    const sortSelect = document.getElementById('wm-sort-by');
    const viewDense2Btn = document.querySelector('[data-view-cols="2"]');
    const viewDense4Btn = document.querySelector('[data-view-cols="4"]');

    // 1. Open / Close Left Filter Drawer
    function openDrawer() {
      if (filterDrawer && filterBackdrop) {
        filterDrawer.classList.add('is-open');
        filterBackdrop.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeDrawer() {
      if (filterDrawer && filterBackdrop) {
        filterDrawer.classList.remove('is-open');
        filterBackdrop.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    }

    openFilterBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      });
    });

    closeFilterBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
      });
    });

    if (filterBackdrop) {
      filterBackdrop.addEventListener('click', closeDrawer);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && filterDrawer && filterDrawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // 2. Accordion Collapsible Sections
    const accordionBtns = document.querySelectorAll('[data-accordion-btn]');
    accordionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.wm-filter-accordion-item');
        if (item) {
          item.classList.toggle('is-open');
        }
      });
    });

    // 3. Dynamic Filter Count & Apply Button
    function getSelectedFilters() {
      const selected = {
        inStockOnly: inStockToggle ? inStockToggle.checked : false,
        brands: [],
        categories: [],
        dogAge: [],
        catAge: [],
        flavors: [],
        weights: [],
      };

      const checkedBoxes = filterDrawer ? filterDrawer.querySelectorAll('input[type="checkbox"]:checked') : [];
      checkedBoxes.forEach((cb) => {
        const group = cb.getAttribute('data-filter-group');
        const val = cb.value.toLowerCase().trim();
        if (group && selected[group]) {
          selected[group].push(val);
        }
      });

      return { selected, totalChecked: checkedBoxes.length + (selected.inStockOnly ? 1 : 0) };
    }

    function updateApplyButtonCount() {
      if (!applyBtn) return;
      const { totalChecked } = getSelectedFilters();
      applyBtn.textContent = `Apply (${totalChecked})`;
    }

    if (filterDrawer) {
      filterDrawer.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]') || e.target.id === 'filter-in-stock') {
          updateApplyButtonCount();
        }
      });
    }

    // 4. Filter Products Grid
    function applyFiltering() {
      if (!gridContainer) return;
      const { selected, totalChecked } = getSelectedFilters();
      const productCards = gridContainer.querySelectorAll('[data-product-card]');
      let visibleCount = 0;

      productCards.forEach((card) => {
        const cardVendor = (card.getAttribute('data-product-vendor') || '').toLowerCase();
        const cardCategory = (card.getAttribute('data-product-category') || '').toLowerCase();
        const cardStock = parseInt(card.getAttribute('data-product-stock') || '20', 10);
        const cardFlavor = (card.getAttribute('data-product-flavor') || '').toLowerCase();
        const cardPet = (card.getAttribute('data-product-pet') || '').toLowerCase();

        let matches = true;

        if (selected.inStockOnly && cardStock <= 0) {
          matches = false;
        }

        if (matches && selected.brands.length > 0) {
          const matchBrand = selected.brands.some((b) => cardVendor.includes(b));
          if (!matchBrand) matches = false;
        }

        if (matches && selected.categories.length > 0) {
          const matchCat = selected.categories.some((c) => cardCategory.includes(c));
          if (!matchCat) matches = false;
        }

        if (matches && selected.flavors.length > 0) {
          const matchFlavor = selected.flavors.some((f) => cardFlavor.includes(f));
          if (!matchFlavor) matches = false;
        }

        if (matches && selected.dogAge.length > 0 && cardPet === 'dog') {
          const matchAge = selected.dogAge.some((a) => cardCategory.includes(a) || cardFlavor.includes(a));
          if (!matchAge) matches = false;
        }

        if (matches && selected.catAge.length > 0 && cardPet === 'cat') {
          const matchAge = selected.catAge.some((a) => cardCategory.includes(a) || cardFlavor.includes(a));
          if (!matchAge) matches = false;
        }

        if (matches) {
          card.style.display = '';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (toolbarCount) {
        toolbarCount.textContent = `${visibleCount} products`;
      }

      closeDrawer();
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        applyFiltering();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (filterDrawer) {
          const checkboxes = filterDrawer.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach((cb) => (cb.checked = false));
          if (inStockToggle) inStockToggle.checked = false;
        }
        updateApplyButtonCount();
        applyFiltering();
      });
    }

    // 5. Quantity Stepper on Card [- 1 +]
    document.addEventListener('click', (e) => {
      const stepperBtn = e.target.closest('[data-stepper-btn]');
      if (stepperBtn) {
        e.preventDefault();
        e.stopPropagation();
        const stepper = stepperBtn.closest('.wm-card-stepper');
        if (stepper) {
          const qtyElem = stepper.querySelector('[data-stepper-qty]');
          const delta = parseInt(stepperBtn.getAttribute('data-delta'), 10) || 0;
          let currentQty = parseInt(qtyElem.textContent || '1', 10);
          currentQty = Math.max(1, currentQty + delta);
          qtyElem.textContent = currentQty;
        }
        return;
      }

      // Add to Cart / Options button click
      const optionsBtn = e.target.closest('[data-card-options-btn]');
      if (optionsBtn) {
        e.preventDefault();
        e.stopPropagation();
        const card = optionsBtn.closest('[data-product-card]');
        if (card) {
          const id = card.getAttribute('data-product-id');
          const name = card.getAttribute('data-product-name');
          const priceRaw = card.getAttribute('data-product-price') || '';
          const price = parseInt(priceRaw.replace(/[^0-9]/g, ''), 10) * 100 || 50000;
          const image = card.getAttribute('data-product-image');
          const qtyElem = card.querySelector('[data-stepper-qty]');
          const qty = parseInt(qtyElem?.textContent || '1', 10);

          // Add to cart via Wagmart Cart system
          if (window.Cart && typeof window.Cart.add === 'function') {
            window.Cart.add(id, qty, true, { name, price, image });
          } else {
            // Visual feedback
            const originalText = optionsBtn.textContent;
            optionsBtn.textContent = 'Added ✓';
            optionsBtn.style.backgroundColor = '#15803D';
            setTimeout(() => {
              optionsBtn.textContent = originalText;
              optionsBtn.style.backgroundColor = '';
            }, 1500);
          }
        }
      }
    });

    // 6. View Layout Toggler (2 columns vs 4 columns)
    if (viewDense2Btn && gridContainer) {
      viewDense2Btn.addEventListener('click', (e) => {
        e.preventDefault();
        gridContainer.classList.add('grid-dense-2');
        viewDense2Btn.classList.add('bg-[#FAF8F5]', 'text-[#111827]', 'border-[#D5CEBF]');
        if (viewDense4Btn) {
          viewDense4Btn.classList.remove('bg-[#FAF8F5]', 'text-[#111827]', 'border-[#D5CEBF]');
        }
      });
    }

    if (viewDense4Btn && gridContainer) {
      viewDense4Btn.addEventListener('click', (e) => {
        e.preventDefault();
        gridContainer.classList.remove('grid-dense-2');
        viewDense4Btn.classList.add('bg-[#FAF8F5]', 'text-[#111827]', 'border-[#D5CEBF]');
        if (viewDense2Btn) {
          viewDense2Btn.classList.remove('bg-[#FAF8F5]', 'text-[#111827]', 'border-[#D5CEBF]');
        }
      });
    }

    // 7. Sort by Dropdown
    if (sortSelect && gridContainer) {
      sortSelect.addEventListener('change', () => {
        const val = sortSelect.value;
        const cards = Array.from(gridContainer.querySelectorAll('[data-product-card]'));

        cards.sort((a, b) => {
          const priceA = parseFloat(a.getAttribute('data-product-price-num') || '0');
          const priceB = parseFloat(b.getAttribute('data-product-price-num') || '0');
          const titleA = (a.getAttribute('data-product-name') || '').toLowerCase();
          const titleB = (b.getAttribute('data-product-name') || '').toLowerCase();

          if (val === 'price-low-high') return priceA - priceB;
          if (val === 'price-high-low') return priceB - priceA;
          if (val === 'title-ascending') return titleA.localeCompare(titleB);
          if (val === 'title-descending') return titleB.localeCompare(titleA);
          return 0; // default featured
        });

        cards.forEach((card) => gridContainer.appendChild(card));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollectionPage);
  } else {
    initCollectionPage();
  }
})();

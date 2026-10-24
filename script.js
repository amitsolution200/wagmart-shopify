/**
 * =========================================================
 * WAGMART PRODUCT DETAILS PAGE - JAVASCRIPT
 * Full interactivity matching reference specifications:
 * - Gallery thumbnail switching
 * - Weight option selection & price recalculation
 * - Quantity increment / decrement
 * - Purchase type (One-time vs Subscribe & Save) calculation
 * - Dynamic Afterpay installment calculation
 * - Accessible Tabs switching
 * - Add to Cart counter animation & toast notification
 * - Horizontal carousel scroll for related products
 * - Newsletter email validation and response
 * - Fullscreen image zoom lightbox
 * =========================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // Check if we are on the Product Details Page (index.html)
  if (document.getElementById('main-product-image')) {
    initProductDetailsPage();
  }

  // Check if we are on the Collection Page (collection.html)
  if (document.getElementById('collection-layout')) {
    initCollectionPage();
  }

});

// =========================================================
// PRODUCT DETAILS PAGE LOGIC (index.html)
// =========================================================
function initProductDetailsPage() {
  const mainImage = document.getElementById('main-product-image');
  if (!mainImage) return;

  const requestedId = Number(new URLSearchParams(window.location.search).get('product'));
  const requestedProduct = (typeof products !== 'undefined' ? products : []).find(item => item.id === requestedId);
  if (requestedProduct) {
    const title = document.getElementById('product-title');
    const subtitle = document.getElementById('product-subtitle');
    const price = document.getElementById('display-price');
    const comparePrice = document.getElementById('display-compare-price');
    const discount = document.getElementById('display-discount-badge');
    if (title) title.textContent = requestedProduct.name;
    if (subtitle) subtitle.innerHTML = `${requestedProduct.category} &nbsp;·&nbsp; ${requestedProduct.petType}`;
    if (price) price.textContent = `₹${requestedProduct.price.toLocaleString('en-IN')}`;
    if (comparePrice) comparePrice.textContent = `₹${requestedProduct.oldPrice.toLocaleString('en-IN')}`;
    if (discount) discount.textContent = `${getDiscountPercent(requestedProduct.price, requestedProduct.oldPrice)}% OFF`;
    mainImage.src = requestedProduct.image;
    mainImage.alt = requestedProduct.name;
    document.title = `${requestedProduct.name} – Wagmart`;
  }

  const baseProduct = requestedProduct || (typeof products !== 'undefined' ? products.find(item => item.id === 1) : null);
  const weightPrices = {
    '1 kg': { price: Math.round((baseProduct?.price || 1299) * 0.38), compare: Math.round((baseProduct?.oldPrice || 1599) * 0.38) },
    '3 kg': { price: baseProduct?.price || 1299, compare: baseProduct?.oldPrice || 1599 },
    '5 kg': { price: Math.round((baseProduct?.price || 1299) * 1.48), compare: Math.round((baseProduct?.oldPrice || 1599) * 1.48) }
  };
  const state = {
    basePrice: baseProduct?.price || 1299,
    comparePrice: baseProduct?.oldPrice || 1599,
    discountRateSubscribe: 0.1,
    quantity: 1,
    purchaseType: 'onetime'
  };

  const thumbBtns = document.querySelectorAll('.thumb-btn');
  const zoomBtn = document.getElementById('image-zoom-trigger');
  const imageModal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  const modalClose = document.getElementById('modal-close');
  const modalBackdrop = document.getElementById('modal-backdrop');

  const currentSizeText = document.getElementById('current-size-text');
  const displayPrice = document.getElementById('display-price');
  const displayComparePrice = document.getElementById('display-compare-price');
  const displayDiscountBadge = document.getElementById('display-discount-badge');
  const displayAfterpay = document.getElementById('display-afterpay');

  const weightChips = document.querySelectorAll('.weight-chip');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const qtyInput = document.getElementById('qty-input');

  const radioOnetime = document.getElementById('radio-onetime');
  const radioSubscribe = document.getElementById('radio-subscribe');
  const labelOnetime = document.getElementById('label-purchase-onetime');
  const labelSubscribe = document.getElementById('label-purchase-subscribe');
  const onetimePriceDisplay = document.getElementById('onetime-price-display');
  const subscribePriceDisplay = document.getElementById('subscribe-price-display');

  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const applePayBtn = document.getElementById('apple-pay-btn');
  const cartCounter = document.getElementById('cart-counter');
  const toastContainer = document.getElementById('toast-container');

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  const sliderPrev = document.getElementById('slider-prev');
  const sliderNext = document.getElementById('slider-next');
  const relatedSlider = document.getElementById('related-products-slider');
  const relatedAddBtns = document.querySelectorAll('.btn-card-add');

  // Related product cards are also navigable; the add-to-cart button remains
  // an independent action because it stops propagation below.
  document.querySelectorAll('#related-products-slider .product-card').forEach(card => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      const name = card.querySelector('.card-title')?.textContent.replace(/\s+/g, '').toLowerCase();
      const product = (typeof products !== 'undefined' ? products : []).find(item => item.name.replace(/\s+/g, '').toLowerCase() === name);
      if (product) window.location.href = `index.html?product=${product.id}#product`;
    });
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
  });

  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterEmail = document.getElementById('newsletter-email');
  const newsletterFeedback = document.getElementById('newsletter-feedback');

  // =========================================================
  // 1. GALLERY: THUMBNAIL CLICKING & SMOOTH SWITCH
  // =========================================================
  thumbBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const newSrc = btn.getAttribute('data-src');
      if (!newSrc) return;

      // Update active thumb
      thumbBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Subtle fade transition for main image
      mainImage.style.opacity = '0.3';
      setTimeout(() => {
        mainImage.src = newSrc;
        mainImage.style.opacity = '1';
      }, 120);
    });
  });

  // Zoom Lightbox
  if (zoomBtn && imageModal) {
    const openZoom = () => {
      modalImg.src = mainImage.src;
      imageModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    };

    const closeZoom = () => {
      imageModal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };

    zoomBtn.addEventListener('click', openZoom);
    if (modalClose) modalClose.addEventListener('click', closeZoom);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeZoom);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !imageModal.hasAttribute('hidden')) {
        closeZoom();
      }
    });
  }

  // =========================================================
  // 2. PRICING & RECALCULATION ENGINE
  // =========================================================
  function formatINR(amount) {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
  }

  function updatePricing() {
    const unitPrice = state.basePrice;
    const unitCompare = state.comparePrice;
    const subscribeUnitPrice = Math.round(unitPrice * (1 - state.discountRateSubscribe));

    // Update One-time vs Subscribe card labels
    if (onetimePriceDisplay) {
      onetimePriceDisplay.textContent = formatINR(unitPrice * state.quantity);
    }
    if (subscribePriceDisplay) {
      subscribePriceDisplay.textContent = formatINR(subscribeUnitPrice * state.quantity);
    }

    // Determine current effective price based on purchase type
    let finalUnitPrice = state.purchaseType === 'subscribe' ? subscribeUnitPrice : unitPrice;
    let finalTotalPrice = finalUnitPrice * state.quantity;
    let totalComparePrice = unitCompare * state.quantity;

    // Display primary price
    if (displayPrice) {
      displayPrice.textContent = formatINR(finalTotalPrice);
    }
    if (displayComparePrice) {
      displayComparePrice.textContent = formatINR(totalComparePrice);
    }

    // Discount percentage
    if (displayDiscountBadge) {
      const discountPct = Math.round(((totalComparePrice - finalTotalPrice) / totalComparePrice) * 100);
      displayDiscountBadge.textContent = `${discountPct}% OFF`;
    }

    // Afterpay installment (4 payments)
    if (displayAfterpay) {
      const installment = (finalTotalPrice / 4).toFixed(2);
      displayAfterpay.textContent = `₹${parseFloat(installment).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  // =========================================================
  // 3. WEIGHT SELECTION
  // =========================================================
  weightChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const weight = chip.getAttribute('data-weight');
      if (!weight || !weightPrices[weight]) return;

      weightChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');

      state.selectedWeight = weight;
      state.basePrice = weightPrices[weight].price;
      state.comparePrice = weightPrices[weight].compare;

      if (currentSizeText) {
        currentSizeText.textContent = weight;
      }

      updatePricing();
    });
  });

  // =========================================================
  // 4. QUANTITY STEPPER
  // =========================================================
  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      if (state.quantity > 1) {
        state.quantity--;
        qtyInput.value = state.quantity;
        updatePricing();
      }
    });

    qtyPlus.addEventListener('click', () => {
      if (state.quantity < 99) {
        state.quantity++;
        qtyInput.value = state.quantity;
        updatePricing();
      }
    });
  }

  // =========================================================
  // 5. PURCHASE OPTION RADIOS
  // =========================================================
  function handlePurchaseTypeChange(type) {
    state.purchaseType = type;
    if (type === 'onetime') {
      radioOnetime.checked = true;
      labelOnetime.classList.add('selected');
      labelSubscribe.classList.remove('selected');
    } else {
      radioSubscribe.checked = true;
      labelSubscribe.classList.add('selected');
      labelOnetime.classList.remove('selected');
    }
    updatePricing();
  }

  if (radioOnetime && radioSubscribe) {
    radioOnetime.addEventListener('change', () => handlePurchaseTypeChange('onetime'));
    radioSubscribe.addEventListener('change', () => handlePurchaseTypeChange('subscribe'));

    labelOnetime.addEventListener('click', () => handlePurchaseTypeChange('onetime'));
    labelSubscribe.addEventListener('click', () => handlePurchaseTypeChange('subscribe'));
  }

  // Initial pricing calculate
  updatePricing();

  // =========================================================
  // 6. ACCESSIBLE TABS SWITCHING
  // =========================================================
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('aria-controls');

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('hidden', '');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.removeAttribute('hidden');
      }
    });
  });

  // =========================================================
  // 7. TOAST NOTIFICATION & CART COUNTER
  // =========================================================
  function showToast(message) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <div class="toast-message">${message}</div>
      <button type="button" class="toast-close-btn" aria-label="Close notification">&times;</button>
    `;

    toast.querySelector('.toast-close-btn').addEventListener('click', () => {
      toast.remove();
    });

    toastContainer.appendChild(toast);

    // Auto dismiss after 3.8s
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(60px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3800);
  }

  function triggerCartAdd(productName, qty, price) {
    state.cartCount += qty;
    if (cartCounter) {
      cartCounter.textContent = state.cartCount;
      const cartBtn = document.getElementById('header-cart-btn');
      if (cartBtn) {
        cartBtn.classList.remove('cart-bounce');
        void cartBtn.offsetWidth; // trigger reflow
        cartBtn.classList.add('cart-bounce');
      }
    }

    const totalFormatted = formatINR(price * qty);
    showToast(`🐾 Added to cart: <strong>${productName}</strong> (x${qty}) · ${totalFormatted}`);
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const effectiveUnitPrice = state.purchaseType === 'subscribe' 
        ? Math.round(state.basePrice * (1 - state.discountRateSubscribe))
        : state.basePrice;
      
      const itemDesc = `Bulldog Natural Choice (${state.selectedWeight})`;
      triggerCartAdd(itemDesc, state.quantity, effectiveUnitPrice);
    });
  }

  if (applePayBtn) {
    applePayBtn.addEventListener('click', () => {
      showToast(`🍎 Apple Pay initialized for ${state.quantity}x Bulldog Natural Choice (${state.selectedWeight})`);
    });
  }

  // Related products Add to Cart
  relatedAddBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pName = btn.getAttribute('data-product') || 'Pet Food';
      const price = parseInt(btn.getAttribute('data-price'), 10) || 999;
      triggerCartAdd(pName, 1, price);
    });
  });

  // =========================================================
  // 8. RELATED PRODUCTS HORIZONTAL CAROUSEL
  // =========================================================
  if (relatedSlider && sliderPrev && sliderNext) {
    const scrollStep = 280;

    sliderPrev.addEventListener('click', () => {
      relatedSlider.scrollBy({ left: -scrollStep, behavior: 'smooth' });
    });

    sliderNext.addEventListener('click', () => {
      relatedSlider.scrollBy({ left: scrollStep, behavior: 'smooth' });
    });
  }

  // =========================================================
  // 9. NEWSLETTER FORM VALIDATION & FEEDBACK
  // =========================================================
  if (newsletterForm && newsletterEmail && newsletterFeedback) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = newsletterEmail.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        newsletterFeedback.className = 'newsletter-feedback error';
        newsletterFeedback.textContent = 'Please enter a valid email address.';
        newsletterEmail.focus();
        return;
      }

      // Success
      newsletterFeedback.className = 'newsletter-feedback success';
      newsletterFeedback.textContent = '🎉 Thank you! Check your inbox for your 10% discount code.';
      newsletterEmail.value = '';

      showToast('🐾 Welcome to Wagmart Pet Club! 10% coupon sent to your inbox.');
    });
  }
}

// =========================================================
// COLLECTION PAGE LOGIC (collection.html)
// Layout States: A (Expanded, 3-col), B (Collapsed, 4-col), C (List)
// =========================================================
function initCollectionPage() {
  const collectionLayout = document.getElementById('collection-layout');
  if (!collectionLayout) return;

  // Global collections & products arrays from products.js
  const allProducts = typeof products !== 'undefined' ? products : [];
  const allCollections = typeof collections !== 'undefined' ? collections : [];

  // --- STATE ---
  const state = {
    sidebarExpanded: true,
    viewMode: localStorage.getItem('wagmart_view_mode') || 'grid', // 'grid' | 'list'
    sortBy: 'default',
    currentPage: 1,
    itemsPerPage: 12,
    priceMin: 100,
    priceMax: 2000,
    minBound: 100,
    maxBound: 2500,
    selectedCollection: new URLSearchParams(window.location.search).get('collection'),
    checkedCategories: [],
    checkedPetTypes: [],
    checkedRatings: [],
    checkedPromotions: ['isBestSeller'],
    checkedAvailability: ['inStock'],
    wishlist: JSON.parse(localStorage.getItem('wagmart_wishlist') || '[]'),
    cartCount: parseInt(localStorage.getItem('wagmart_cart_count') || '0', 10)
  };

  if (state.selectedCollection) state.checkedCategories = [state.selectedCollection.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())];

  // --- DOM REFERENCES ---
  const circlesContainer = document.getElementById('collection-circles-container');
  const filterToggleBtn = document.getElementById('filter-toggle-btn');
  const filterSidebar = document.getElementById('filter-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');

  const viewGridBtn = document.getElementById('view-grid-btn');
  const viewListBtn = document.getElementById('view-list-btn');
  const sortSelect = document.getElementById('sort-select');

  const resultsCountText = document.getElementById('results-count-text');
  const activeChipsContainer = document.getElementById('active-chips-container');
  const clearAllFiltersBtn = document.getElementById('clear-all-filters-btn');

  const priceMinRange = document.getElementById('price-min-range');
  const priceMaxRange = document.getElementById('price-max-range');
  const rangeHighlight = document.getElementById('range-highlight');
  const priceDisplayText = document.getElementById('price-display-text');

  const productsContainer = document.getElementById('products-container');
  const noProductsMsg = document.getElementById('no-products-msg');
  const btnResetEmpty = document.getElementById('btn-reset-empty');

  const paginationContainer = document.getElementById('pagination-container');
  const headerCartCount = document.getElementById('header-cart-count');
  const toastContainer = document.getElementById('toast-container');

  const quickViewModal = document.getElementById('quick-view-modal');
  const quickViewBackdrop = document.getElementById('quick-view-backdrop');
  const quickViewClose = document.getElementById('quick-view-close');
  const quickViewBody = document.getElementById('quick-view-body');

  const accordionHeaders = document.querySelectorAll('.accordion-header');

  let currentFilteredList = [];

  // Sync initial cart count badge
  if (headerCartCount) {
    headerCartCount.textContent = state.cartCount;
  }

  // Set initial view mode
  applyViewMode(state.viewMode);

  // Sync initial filter checkboxes from state
  syncCheckboxesFromState();

  // 1. Render Collection Circles Row
  renderCollectionCircles();

  // 2. Setup Price Slider UI
  setupPriceSlider();

  // 3. Setup Accordions
  setupAccordions();

  // 4. Initial Render of Products & Filters
  filterAndRender();

  // =========================================================
  // COLLECTION CIRCLES RENDERING & CLICK
  // =========================================================
  function renderCollectionCircles() {
    if (!circlesContainer) return;
    circlesContainer.innerHTML = '';

    allCollections.forEach(col => {
      const circleEl = document.createElement('div');
      circleEl.className = `collection-circle-item ${state.selectedCollection === col.categoryKey || (!state.selectedCollection && col.active) ? 'active' : ''}`;
      circleEl.setAttribute('role', 'button');
      circleEl.setAttribute('tabindex', '0');
      circleEl.setAttribute('data-category', col.categoryKey);
      circleEl.innerHTML = `
        <div class="collection-circle-thumb">
          <img src="${col.image}" alt="${col.name}" loading="lazy">
        </div>
        <span class="circle-name">${col.name}</span>
        <span class="circle-items-count">${col.count} items</span>
      `;

      circleEl.addEventListener('click', () => {
        window.location.href = `collection.html?collection=${encodeURIComponent(col.id)}`;
      });
      circleEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          circleEl.click();
        }
      });
      /* Legacy inline filter behavior is retained for callers that prevent navigation. */
      circleEl.addEventListener('click', () => {
        const isAlreadyActive = circleEl.classList.contains('active');
        
        // Remove active from all circles
        document.querySelectorAll('.collection-circle-item').forEach(c => c.classList.remove('active'));

        if (!isAlreadyActive) {
          circleEl.classList.add('active');
          state.selectedCollection = col.categoryKey;
          
          // Select corresponding category checkbox if exists
          const catCheckbox = document.querySelector(`.filter-checkbox[name="category"][value="${col.categoryKey}"]`);
          if (catCheckbox && !catCheckbox.checked) {
            catCheckbox.checked = true;
            if (!state.checkedCategories.includes(col.categoryKey)) {
              state.checkedCategories.push(col.categoryKey);
            }
          }
        } else {
          state.selectedCollection = null;
          // Uncheck category checkbox if it was exclusively set
          const catCheckbox = document.querySelector(`.filter-checkbox[name="category"][value="${col.categoryKey}"]`);
          if (catCheckbox) {
            catCheckbox.checked = false;
            state.checkedCategories = state.checkedCategories.filter(c => c !== col.categoryKey);
          }
        }

        state.currentPage = 1;
        filterAndRender();
      });

      circlesContainer.appendChild(circleEl);
    });
  }

  // =========================================================
  // VIEW MODE TOGGLING (GRID vs LIST)
  // =========================================================
  function applyViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('wagmart_view_mode', mode);

    collectionLayout.setAttribute('data-view', mode);

    if (mode === 'grid') {
      viewGridBtn.classList.add('active');
      viewGridBtn.setAttribute('aria-pressed', 'true');
      viewListBtn.classList.remove('active');
      viewListBtn.setAttribute('aria-pressed', 'false');
    } else {
      viewListBtn.classList.add('active');
      viewListBtn.setAttribute('aria-pressed', 'true');
      viewGridBtn.classList.remove('active');
      viewGridBtn.setAttribute('aria-pressed', 'false');
    }
  }

  viewGridBtn.addEventListener('click', () => {
    applyViewMode('grid');
    renderCurrentPageProducts();
  });

  viewListBtn.addEventListener('click', () => {
    applyViewMode('list');
    renderCurrentPageProducts();
  });

  // =========================================================
  // SIDEBAR TOGGLING (STATE A: 3-COL vs STATE B: 4-COL / DRAWER)
  // =========================================================
  filterToggleBtn.addEventListener('click', () => {
    const isMobileOrTablet = window.innerWidth <= 992;

    if (isMobileOrTablet) {
      // Mobile Drawer Mode
      filterSidebar.classList.add('drawer-open');
      sidebarOverlay.classList.add('is-active');
      filterToggleBtn.setAttribute('aria-expanded', 'true');
    } else {
      // Desktop: State A (expanded 3-cols) vs State B (collapsed 4-cols)
      const isCurrentlyExpanded = collectionLayout.getAttribute('data-sidebar') === 'expanded';
      const newSidebarState = isCurrentlyExpanded ? 'collapsed' : 'expanded';

      collectionLayout.setAttribute('data-sidebar', newSidebarState);
      filterToggleBtn.setAttribute('aria-expanded', newSidebarState === 'expanded' ? 'true' : 'false');
      state.sidebarExpanded = newSidebarState === 'expanded';
    }
  });

  // Close Drawer
  function closeDrawer() {
    filterSidebar.classList.remove('drawer-open');
    sidebarOverlay.classList.remove('is-active');
    filterToggleBtn.setAttribute('aria-expanded', 'false');
  }

  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeDrawer);

  // =========================================================
  // DUAL RANGE PRICE SLIDER
  // =========================================================
  function setupPriceSlider() {
    if (!priceMinRange || !priceMaxRange) return;

    function onPriceChange(e) {
      let minVal = parseInt(priceMinRange.value, 10);
      let maxVal = parseInt(priceMaxRange.value, 10);

      // Prevent thumbs from crossing
      if (maxVal - minVal < 50) {
        if (e && e.target === priceMinRange) {
          priceMinRange.value = maxVal - 50;
          minVal = maxVal - 50;
        } else {
          priceMaxRange.value = minVal + 50;
          maxVal = minVal + 50;
        }
      }

      state.priceMin = minVal;
      state.priceMax = maxVal;

      updatePriceHighlight(minVal, maxVal);
      priceDisplayText.textContent = `₹${minVal.toLocaleString('en-IN')} - ₹${maxVal.toLocaleString('en-IN')}`;

      state.currentPage = 1;
      filterAndRender();
    }

    priceMinRange.addEventListener('input', onPriceChange);
    priceMaxRange.addEventListener('input', onPriceChange);

    // Initial position
    updatePriceHighlight(state.priceMin, state.priceMax);
    priceDisplayText.textContent = `₹${state.priceMin.toLocaleString('en-IN')} - ₹${state.priceMax.toLocaleString('en-IN')}`;
  }

  function updatePriceHighlight(minVal, maxVal) {
    if (!rangeHighlight) return;
    const minPercent = ((minVal - state.minBound) / (state.maxBound - state.minBound)) * 100;
    const maxPercent = ((maxVal - state.minBound) / (state.maxBound - state.minBound)) * 100;

    rangeHighlight.style.left = `${minPercent}%`;
    rangeHighlight.style.right = `${100 - maxPercent}%`;
  }

  // =========================================================
  // ACCORDIONS
  // =========================================================
  function setupAccordions() {
    accordionHeaders.forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.accordion-group');
        if (!group) return;
        const isOpen = group.classList.contains('is-open');
        group.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    });
  }

  // =========================================================
  // CHECKBOX EVENT LISTENERS
  // =========================================================
  function syncCheckboxesFromState() {
    document.querySelectorAll('.filter-checkbox').forEach(cb => {
      const name = cb.getAttribute('name');
      const val = cb.value;

      if (name === 'category') cb.checked = state.checkedCategories.includes(val);
      if (name === 'petType') cb.checked = state.checkedPetTypes.includes(val);
      if (name === 'rating') cb.checked = state.checkedRatings.includes(val);
      if (name === 'promotions') cb.checked = state.checkedPromotions.includes(val);
      if (name === 'availability') cb.checked = state.checkedAvailability.includes(val);

      cb.addEventListener('change', () => {
        readCheckboxesToState();
        state.currentPage = 1;
        filterAndRender();
      });
    });
  }

  function readCheckboxesToState() {
    state.checkedCategories = Array.from(document.querySelectorAll('.filter-checkbox[name="category"]:checked')).map(c => c.value);
    state.checkedPetTypes = Array.from(document.querySelectorAll('.filter-checkbox[name="petType"]:checked')).map(c => c.value);
    state.checkedRatings = Array.from(document.querySelectorAll('.filter-checkbox[name="rating"]:checked')).map(c => c.value);
    state.checkedPromotions = Array.from(document.querySelectorAll('.filter-checkbox[name="promotions"]:checked')).map(c => c.value);
    state.checkedAvailability = Array.from(document.querySelectorAll('.filter-checkbox[name="availability"]:checked')).map(c => c.value);
  }

  // =========================================================
  // SORT SELECT
  // =========================================================
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.sortBy = sortSelect.value;
      state.currentPage = 1;
      filterAndRender();
    });
  }

  // =========================================================
  // CLEAR ALL FILTERS
  // =========================================================
  if (clearAllFiltersBtn) {
    clearAllFiltersBtn.addEventListener('click', resetAllFilters);
  }
  if (btnResetEmpty) {
    btnResetEmpty.addEventListener('click', resetAllFilters);
  }

  function resetAllFilters() {
    state.checkedCategories = [];
    state.checkedPetTypes = [];
    state.checkedRatings = [];
    state.checkedPromotions = [];
    state.checkedAvailability = [];
    state.selectedCollection = null;

    state.priceMin = state.minBound;
    state.priceMax = state.maxBound;
    if (priceMinRange) priceMinRange.value = state.minBound;
    if (priceMaxRange) priceMaxRange.value = state.maxBound;
    updatePriceHighlight(state.minBound, state.maxBound);
    if (priceDisplayText) {
      priceDisplayText.textContent = `₹${state.minBound.toLocaleString('en-IN')} - ₹${state.maxBound.toLocaleString('en-IN')}`;
    }

    // Uncheck all checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);

    // Deactivate circle rings
    document.querySelectorAll('.collection-circle-item').forEach(c => c.classList.remove('active'));

    state.currentPage = 1;
    filterAndRender();
  }

  // =========================================================
  // FILTERING, SORTING & RENDERING PIPELINE
  // =========================================================
  function filterAndRender() {
    currentFilteredList = filterProducts();
    sortProducts(currentFilteredList);
    renderActiveFilterChips();
    renderCurrentPageProducts();
    renderPagination(currentFilteredList.length);
  }

  function filterProducts() {
    return allProducts.filter(product => {
      // 1. Price check
      if (product.price < state.priceMin || product.price > state.priceMax) {
        return false;
      }

      // 2. Categories check
      if (state.checkedCategories.length > 0) {
        if (!state.checkedCategories.includes(product.category)) return false;
      }

      // 3. Pet Type check
      if (state.checkedPetTypes.length > 0) {
        if (!state.checkedPetTypes.includes(product.petType)) return false;
      }

      // 4. Rating check
      if (state.checkedRatings.length > 0) {
        const floorRating = String(Math.floor(product.rating));
        if (!state.checkedRatings.includes(floorRating)) return false;
      }

      // 5. Promotions check
      if (state.checkedPromotions.length > 0) {
        let promoMatch = false;
        if (state.checkedPromotions.includes('isNew') && product.isNew) promoMatch = true;
        if (state.checkedPromotions.includes('isBestSeller') && product.isBestSeller) promoMatch = true;
        if (state.checkedPromotions.includes('onSale') && product.oldPrice && product.oldPrice > product.price) promoMatch = true;
        if (!promoMatch) return false;
      }

      // 6. Availability check
      if (state.checkedAvailability.length > 0) {
        let availMatch = false;
        if (state.checkedAvailability.includes('inStock') && product.inStock) availMatch = true;
        if (state.checkedAvailability.includes('outOfStock') && !product.inStock) availMatch = true;
        if (!availMatch) return false;
      }

      return true;
    });
  }

  function sortProducts(list) {
    switch (state.sortBy) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.id - a.id);
        break;
      default:
        // Default sequence
        list.sort((a, b) => a.id - b.id);
        break;
    }
  }

  // =========================================================
  // ACTIVE FILTER CHIPS
  // =========================================================
  function renderActiveFilterChips() {
    if (!activeChipsContainer) return;
    activeChipsContainer.innerHTML = '';

    const chips = [];

    // Price Chip (Shown if slider changed or default active)
    if (state.priceMin !== state.minBound || state.priceMax !== state.maxBound) {
      chips.push({
        label: `Price : ₹${state.priceMin.toLocaleString('en-IN')} - ₹${state.priceMax.toLocaleString('en-IN')}`,
        type: 'price'
      });
    }

    // Categories
    state.checkedCategories.forEach(cat => {
      chips.push({ label: cat, type: 'category', value: cat });
    });

    // Pet Types
    state.checkedPetTypes.forEach(pet => {
      chips.push({ label: pet, type: 'petType', value: pet });
    });

    // Ratings
    state.checkedRatings.forEach(rat => {
      chips.push({ label: `${rat} Star`, type: 'rating', value: rat });
    });

    // Promotions
    state.checkedPromotions.forEach(promo => {
      const label = promo === 'isNew' ? 'New Arrivals' : promo === 'isBestSeller' ? 'Best Seller' : 'On Sale';
      chips.push({ label, type: 'promotions', value: promo });
    });

    // Availability
    state.checkedAvailability.forEach(avail => {
      const label = avail === 'inStock' ? 'In Stock' : 'Out of Stock';
      chips.push({ label, type: 'availability', value: avail });
    });

    // Render chips
    chips.forEach(chip => {
      const chipEl = document.createElement('span');
      chipEl.className = 'filter-chip';
      chipEl.innerHTML = `
        <span>${chip.label}</span>
        <button type="button" class="chip-remove-btn" aria-label="Remove ${chip.label} filter">&times;</button>
      `;

      const removeBtn = chipEl.querySelector('.chip-remove-btn');
      removeBtn.addEventListener('click', () => {
        removeFilter(chip);
      });

      activeChipsContainer.appendChild(chipEl);
    });

    // Show or hide clear all link
    if (clearAllFiltersBtn) {
      clearAllFiltersBtn.style.display = chips.length > 0 ? 'inline-block' : 'none';
    }
  }

  function removeFilter(chip) {
    if (chip.type === 'price') {
      state.priceMin = state.minBound;
      state.priceMax = state.maxBound;
      if (priceMinRange) priceMinRange.value = state.minBound;
      if (priceMaxRange) priceMaxRange.value = state.maxBound;
      updatePriceHighlight(state.minBound, state.maxBound);
      if (priceDisplayText) {
        priceDisplayText.textContent = `₹${state.minBound.toLocaleString('en-IN')} - ₹${state.maxBound.toLocaleString('en-IN')}`;
      }
    } else {
      const cb = document.querySelector(`.filter-checkbox[name="${chip.type}"][value="${chip.value}"]`);
      if (cb) cb.checked = false;
      readCheckboxesToState();

      // Deactivate circle if removing active category
      if (chip.type === 'category' && state.selectedCollection === chip.value) {
        state.selectedCollection = null;
        document.querySelectorAll('.collection-circle-item').forEach(c => c.classList.remove('active'));
      }
    }

    state.currentPage = 1;
    filterAndRender();
  }

  // =========================================================
  // RENDER PRODUCTS (GRID OR LIST)
  // =========================================================
  function renderCurrentPageProducts() {
    if (!productsContainer) return;

    const totalCount = currentFilteredList.length;

    // Results counter text
    if (resultsCountText) {
      if (totalCount === 0) {
        resultsCountText.textContent = 'Showing 0 results';
      } else {
        const start = (state.currentPage - 1) * state.itemsPerPage + 1;
        const end = Math.min(state.currentPage * state.itemsPerPage, totalCount);
        resultsCountText.textContent = `Showing ${start}-${end} of ${totalCount} results`;
      }
    }

    // Handle Empty State
    if (totalCount === 0) {
      productsContainer.innerHTML = '';
      if (noProductsMsg) noProductsMsg.classList.remove('hidden');
      return;
    } else {
      if (noProductsMsg) noProductsMsg.classList.add('hidden');
    }

    // Pagination slice
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const pageItems = currentFilteredList.slice(startIndex, startIndex + state.itemsPerPage);

    productsContainer.innerHTML = '';

    pageItems.forEach(p => {
      const isWishlisted = state.wishlist.includes(p.id);
      // Always derive the badge from the displayed prices so product data cannot drift.
      const discount = getDiscountPercent(p.price, p.oldPrice);

      if (state.viewMode === 'list') {
        // STATE C: List View Card
        const card = document.createElement('article');
        card.className = 'product-card-list';
        card.setAttribute('data-id', p.id);
        card.innerHTML = `
          <div class="list-img-wrap">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
          </div>
          <div class="list-details-col">
            <span class="list-category">${p.category}</span>
            <h3 class="list-product-name">${p.name}</h3>
            <div class="list-rating-row">
              <span class="gold-stars">★★★★★</span>
              <span class="list-rating-score">${p.rating}</span>
              <span class="list-reviews-count">(${p.reviews} reviews)</span>
            </div>
            <p class="list-description">${p.description}</p>
          </div>
          <div class="list-actions-col">
            <div class="list-price-wrap">
              <span class="list-current-price">₹${p.price.toLocaleString('en-IN')}</span>
              ${p.oldPrice ? `<span class="list-old-price">₹${p.oldPrice.toLocaleString('en-IN')}</span>` : ''}
              ${discount > 0 ? `<span class="list-discount-badge">${discount}% OFF</span>` : ''}
            </div>
            <div class="list-btn-row">
              <button type="button" class="list-add-to-cart-btn btn-add-cart" data-id="${p.id}">
                Add to Cart
              </button>
              <button type="button" class="list-heart-btn btn-wishlist ${isWishlisted ? 'is-wishlisted' : ''}" data-id="${p.id}" aria-label="Add to wishlist" title="Wishlist">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWishlisted ? '#E11D48' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
          </div>
        `;
        productsContainer.appendChild(card);
        card.style.cursor = 'pointer';
        card.addEventListener('click', (event) => {
          if (event.target.closest('button')) return;
          window.location.href = `index.html?product=${p.id}#product`;
        });
      } else {
        // STATE A & B: Grid View Card
        const card = document.createElement('article');
        card.className = 'product-card';
        card.setAttribute('data-id', p.id);
        card.innerHTML = `
          <div class="card-image-wrap">
            ${discount > 0 ? `<span class="card-discount-badge">${discount}% off</span>` : ''}
            <div class="card-hover-actions">
              <button type="button" class="card-action-btn btn-wishlist ${isWishlisted ? 'is-wishlisted' : ''}" data-id="${p.id}" aria-label="Add to wishlist" title="Wishlist">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${isWishlisted ? '#E11D48' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
              <button type="button" class="card-action-btn btn-quick-view" data-id="${p.id}" aria-label="Quick View" title="Quick View">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button type="button" class="card-action-btn btn-add-cart" data-id="${p.id}" aria-label="Add to cart" title="Add to Cart">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </button>
            </div>
            <img src="${p.image}" alt="${p.name}" class="card-product-img" loading="lazy">
          </div>
          <div class="card-details">
            <div class="card-meta-row">
              <span class="card-category">${p.category}</span>
              <span class="card-rating">
                <span class="star-icon">★</span>
                <span>${p.rating}</span>
              </span>
            </div>
            <h3 class="card-product-name" title="${p.name}">${p.name}</h3>
            <div class="card-price-row">
              <span class="card-current-price">₹${p.price.toLocaleString('en-IN')}</span>
              ${p.oldPrice ? `<span class="card-old-price">₹${p.oldPrice.toLocaleString('en-IN')}</span>` : ''}
            </div>
          </div>
        `;
        productsContainer.appendChild(card);
        card.style.cursor = 'pointer';
        card.addEventListener('click', (event) => {
          if (event.target.closest('button')) return;
          window.location.href = `index.html?product=${p.id}#product`;
        });
      }
    });

    // Attach card action listeners
    attachCardActionListeners();
  }

  // =========================================================
  // CARD ACTIONS: WISHLIST, QUICK VIEW, ADD TO CART
  // =========================================================
  function attachCardActionListeners() {
    // Add to Cart
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const product = allProducts.find(p => p.id === id);
        if (!product) return;

        state.cartCount++;
        localStorage.setItem('wagmart_cart_count', state.cartCount);
        if (headerCartCount) headerCartCount.textContent = state.cartCount;

        showToast(`🐾 "${product.name}" added to cart!`);
      });
    });

    // Wishlist Toggle
    document.querySelectorAll('.btn-wishlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const product = allProducts.find(p => p.id === id);
        if (!product) return;

        const isCurrentlyWishlisted = state.wishlist.includes(id);

        if (isCurrentlyWishlisted) {
          state.wishlist = state.wishlist.filter(wId => wId !== id);
          showToast(`Removed "${product.name}" from wishlist.`);
        } else {
          state.wishlist.push(id);
          showToast(`❤️ Added "${product.name}" to wishlist!`);
        }

        localStorage.setItem('wagmart_wishlist', JSON.stringify(state.wishlist));
        renderCurrentPageProducts();
      });
    });

    // Quick View
    document.querySelectorAll('.btn-quick-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const product = allProducts.find(p => p.id === id);
        if (product) openQuickView(product);
      });
    });
  }

  // Quick View Modal
  function openQuickView(product) {
    if (!quickViewModal || !quickViewBody) return;
    const discount = getDiscountPercent(product.price, product.oldPrice);

    quickViewBody.innerHTML = `
      <div style="display: grid; grid-template-columns: 240px 1fr; gap: 24px; align-items: start;">
        <div style="background: #F4F0E8; border-radius: 12px; padding: 20px; display: flex; align-items: center; justify-content: center; height: 240px;">
          <img src="${product.image}" alt="${product.name}" style="max-height: 200px; max-width: 100%; object-fit: contain;">
        </div>
        <div>
          <div style="font-size: 12px; color: #6B7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">${product.category} · ${product.petType}</div>
          <h2 style="font-size: 20px; font-weight: 700; color: #1F2937; margin: 0 0 10px; line-height: 1.3;">${product.name}</h2>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
            <span style="color: #F5A623; font-size: 15px;">★★★★★</span>
            <span style="font-weight: 700; font-size: 13px;">${product.rating}</span>
            <span style="color: #6B7280; font-size: 13px;">(${product.reviews} reviews)</span>
          </div>
          <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px;">
            <span style="font-size: 24px; font-weight: 800; color: #D96B27;">₹${product.price.toLocaleString('en-IN')}</span>
            ${product.oldPrice ? `<span style="font-size: 15px; color: #9CA3AF; text-decoration: line-through;">₹${product.oldPrice.toLocaleString('en-IN')}</span>` : ''}
            ${discount > 0 ? `<span style="background: #1F4D2B; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">${discount}% OFF</span>` : ''}
          </div>
          <p style="font-size: 13.5px; color: #4B5563; line-height: 1.6; margin: 0 0 20px;">${product.description}</p>
          <div style="display: flex; gap: 12px;">
            <button type="button" class="list-add-to-cart-btn btn-modal-add" style="padding: 11px 24px; font-size: 14px;">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;

    const modalAddBtn = quickViewBody.querySelector('.btn-modal-add');
    if (modalAddBtn) {
      modalAddBtn.addEventListener('click', () => {
        state.cartCount++;
        localStorage.setItem('wagmart_cart_count', state.cartCount);
        if (headerCartCount) headerCartCount.textContent = state.cartCount;
        showToast(`🐾 "${product.name}" added to cart!`);
        closeQuickView();
      });
    }

    quickViewModal.classList.add('is-open');
    quickViewModal.setAttribute('aria-hidden', 'false');
  }

  function closeQuickView() {
    if (!quickViewModal) return;
    quickViewModal.classList.remove('is-open');
    quickViewModal.setAttribute('aria-hidden', 'true');
  }

  if (quickViewClose) quickViewClose.addEventListener('click', closeQuickView);
  if (quickViewBackdrop) quickViewBackdrop.addEventListener('click', closeQuickView);

  // =========================================================
  // PAGINATION CONTROLS (< 1 2 3 ... 10 >)
  // =========================================================
  function renderPagination(totalCount) {
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalCount / state.itemsPerPage) || 1;
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    paginationContainer.style.display = 'inline-flex';

    // Previous Arrow (<)
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'page-btn page-arrow';
    prevBtn.setAttribute('aria-label', 'Previous Page');
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = state.currentPage === 1;
    if (state.currentPage === 1) prevBtn.style.opacity = '0.4';
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderCurrentPageProducts();
        renderPagination(totalCount);
        scrollToProducts();
      }
    });
    paginationContainer.appendChild(prevBtn);

    // Number Buttons
    // If totalPages <= 5, show all
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        createPageButton(i);
      }
    } else {
      // 1 2 3 ... 10 style
      createPageButton(1);
      if (state.currentPage > 3) {
        createEllipsis();
      }

      const start = Math.max(2, state.currentPage - 1);
      const end = Math.min(totalPages - 1, state.currentPage + 1);

      for (let i = start; i <= end; i++) {
        createPageButton(i);
      }

      if (state.currentPage < totalPages - 2) {
        createEllipsis();
      }
      createPageButton(totalPages);
    }

    // Next Arrow (>)
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'page-btn page-arrow';
    nextBtn.setAttribute('aria-label', 'Next Page');
    nextBtn.innerHTML = '&gt;';
    nextBtn.disabled = state.currentPage === totalPages;
    if (state.currentPage === totalPages) nextBtn.style.opacity = '0.4';
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderCurrentPageProducts();
        renderPagination(totalCount);
        scrollToProducts();
      }
    });
    paginationContainer.appendChild(nextBtn);

    function createPageButton(pageNumber) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `page-btn page-num ${pageNumber === state.currentPage ? 'active' : ''}`;
      btn.setAttribute('data-page', pageNumber);
      btn.textContent = pageNumber;

      btn.addEventListener('click', () => {
        state.currentPage = pageNumber;
        renderCurrentPageProducts();
        renderPagination(totalCount);
        scrollToProducts();
      });

      paginationContainer.appendChild(btn);
    }

    function createEllipsis() {
      const span = document.createElement('span');
      span.className = 'page-ellipsis';
      span.textContent = '...';
      paginationContainer.appendChild(span);
    }
  }

  function scrollToProducts() {
    const toolbar = document.querySelector('.collection-toolbar-section');
    if (toolbar) {
      toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // =========================================================
  // TOAST NOTIFICATION
  // =========================================================
  function showToast(message) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button type="button" class="toast-close-btn" aria-label="Dismiss notification">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

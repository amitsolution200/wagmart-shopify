/**
 * WAGMART — Product Details Page Interactive Controller (assets/product.js)
 * Zero-dependency vanilla JavaScript handling:
 * - Gallery thumbnails, mobile swipe, inner hover zoom & fullscreen lightbox
 * - Variant swatches & pack/size pills (dynamic price, stock & image updates)
 * - Quantity stepper clamped between 1 and available stock
 * - AJAX Add to Cart, cart badge bump animation, toast notification & Buy It Now
 * - Indian Pincode delivery & COD availability checker
 * - Desktop Tabs / Mobile Accordions with keyboard accessibility
 * - Frequently Bought Together dynamic bundle calculator & batch Add to Cart
 * - Customer Reviews sorting & inline Write-a-Review submission
 * - Recently Viewed products via localStorage
 * - Mobile Sticky Bottom Add-to-Cart Bar via IntersectionObserver
 */

(function () {
  'use strict';

  function formatINR(amountInRupees) {
    const num = Math.round(Number(amountInRupees) || 0);
    return '₹' + num.toLocaleString('en-IN');
  }

  function initProductPage() {
    const pdpRoot = document.querySelector('[data-wm-pdp]');
    if (!pdpRoot) return;

    // =========================================================================
    // 1. GALLERY, HOVER ZOOM, MOBILE SWIPE & FULLSCREEN LIGHTBOX
    // =========================================================================
    const mainImg = document.getElementById('wm-main-product-image');
    const stage = document.querySelector('[data-gallery-stage]');
    const thumbs = Array.from(document.querySelectorAll('[data-gallery-thumb]'));
    const dots = Array.from(document.querySelectorAll('[data-gallery-dot]'));
    const prevBtn = document.querySelector('[data-gallery-prev]');
    const nextBtn = document.querySelector('[data-gallery-next]');
    const zoomTrigger = document.querySelector('[data-gallery-zoom]');

    // Lightbox elements
    const lightbox = document.getElementById('wm-pdp-lightbox');
    const lightboxImg = document.getElementById('wm-lightbox-img');
    const lightboxClose = document.querySelector('[data-lightbox-close]');
    const lightboxPrev = document.querySelector('[data-lightbox-prev]');
    const lightboxNext = document.querySelector('[data-lightbox-next]');

    let currentImgIdx = 0;
    const gallerySources = thumbs.map((btn) => ({
      src: btn.getAttribute('data-full-src') || btn.querySelector('img')?.src || '',
      alt: btn.getAttribute('data-alt') || btn.querySelector('img')?.alt || 'Product image',
      filter: btn.getAttribute('data-img-filter') || '',
      crop: btn.getAttribute('data-img-crop') || '',
    }));

    function setActiveImage(index) {
      if (!gallerySources.length || !mainImg) return;
      currentImgIdx = (index + gallerySources.length) % gallerySources.length;
      const item = gallerySources[currentImgIdx];

      mainImg.style.opacity = '0.35';
      setTimeout(() => {
        mainImg.src = item.src;
        mainImg.alt = item.alt;
        mainImg.style.filter = item.filter || 'none';
        mainImg.style.transform = item.crop || '';
        mainImg.style.opacity = '1';
      }, 110);

      thumbs.forEach((t, i) => {
        const active = i === currentImgIdx;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });

      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === currentImgIdx);
      });

      if (lightbox && lightbox.classList.contains('is-open') && lightboxImg) {
        lightboxImg.src = item.src;
        lightboxImg.alt = item.alt;
      }
    }

    thumbs.forEach((btn, idx) => {
      btn.addEventListener('click', () => setActiveImage(idx));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (idx + 1) % thumbs.length;
          thumbs[next].focus();
          setActiveImage(next);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (idx - 1 + thumbs.length) % thumbs.length;
          thumbs[prev].focus();
          setActiveImage(prev);
        }
      });
    });

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => setActiveImage(idx));
    });

    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); setActiveImage(currentImgIdx - 1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); setActiveImage(currentImgIdx + 1); });

    // Desktop Hover Inner Zoom
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (stage && mainImg) {
      stage.addEventListener('mousemove', (e) => {
        if (!canHover.matches || window.innerWidth < 1024) return;
        const rect = stage.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        stage.classList.add('is-zoomed');
        mainImg.style.transformOrigin = `${x}% ${y}%`;
      });

      stage.addEventListener('mouseleave', () => {
        stage.classList.remove('is-zoomed');
        mainImg.style.transformOrigin = 'center center';
      });

      // Touch swipe on stage for mobile
      let touchStartX = null;
      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
      }, { passive: true });

      stage.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > 40) {
          if (deltaX < 0) setActiveImage(currentImgIdx + 1);
          else setActiveImage(currentImgIdx - 1);
        }
        touchStartX = null;
      }, { passive: true });

      // Click stage to open lightbox
      stage.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openLightbox();
      });
    }

    function openLightbox() {
      if (!lightbox || !lightboxImg) return;
      const item = gallerySources[currentImgIdx] || { src: mainImg?.src, alt: mainImg?.alt };
      lightboxImg.src = item.src;
      lightboxImg.alt = item.alt;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('overflow-hidden');
      if (lightboxClose) lightboxClose.focus();
    }

    function closeLightbox() {
      if (!lightbox || !lightbox.classList.contains('is-open')) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('overflow-hidden');
    }

    if (zoomTrigger) zoomTrigger.addEventListener('click', (e) => { e.stopPropagation(); openLightbox(); });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => setActiveImage(currentImgIdx - 1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => setActiveImage(currentImgIdx + 1));
    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!lightbox || !lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') setActiveImage(currentImgIdx - 1);
      else if (e.key === 'ArrowRight') setActiveImage(currentImgIdx + 1);
    });

    // =========================================================================
    // 2. QUANTITY STEPPER & VARIANT SELECTION
    // =========================================================================
    const qtyInput = document.getElementById('wm-pdp-qty');
    const qtyMinus = document.querySelector('[data-qty-minus]');
    const qtyPlus = document.querySelector('[data-qty-plus]');
    const priceCurrentEl = document.querySelector('[data-pdp-price]');
    const priceCompareEl = document.querySelector('[data-pdp-compare]');
    const priceSaveEl = document.querySelector('[data-pdp-save]');
    const stickyPriceEl = document.querySelector('[data-sticky-price]');
    const stockStatusEl = document.querySelector('[data-pdp-stock]');
    const stockTextEl = document.querySelector('[data-pdp-stock-text]');
    const atcBtn = document.getElementById('wm-pdp-atc-btn');
    const atcBtnText = document.querySelector('[data-atc-text]');
    const buyNowBtn = document.getElementById('wm-pdp-buy-now-btn');
    const stickyAtcBtn = document.getElementById('wm-sticky-atc-btn');
    const notifyBox = document.getElementById('wm-pdp-notify-box');
    const variantIdInput = document.querySelector('form#product-form input[name="id"]');

    let maxStock = parseInt(pdpRoot.getAttribute('data-max-stock') || '18', 10);
    let unitPriceRupees = parseInt(pdpRoot.getAttribute('data-base-price') || '330', 10);
    let comparePriceRupees = parseInt(pdpRoot.getAttribute('data-compare-price') || '415', 10);

    function syncQuantity(newVal) {
      if (!qtyInput) return;
      const clamped = Math.max(1, Math.min(maxStock > 0 ? maxStock : 1, parseInt(newVal, 10) || 1));
      qtyInput.value = clamped;
      if (qtyMinus) qtyMinus.disabled = clamped <= 1 || maxStock <= 0;
      if (qtyPlus) qtyPlus.disabled = clamped >= maxStock || maxStock <= 0;
    }

    if (qtyMinus) qtyMinus.addEventListener('click', () => syncQuantity((parseInt(qtyInput.value, 10) || 1) - 1));
    if (qtyPlus) qtyPlus.addEventListener('click', () => syncQuantity((parseInt(qtyInput.value, 10) || 1) + 1));
    if (qtyInput) qtyInput.addEventListener('change', () => syncQuantity(qtyInput.value));
    syncQuantity(1);

    // Color Swatches
    const colorSwatches = Array.from(document.querySelectorAll('[data-color-swatch]'));
    const colorLabelEl = document.querySelector('[data-selected-color]');
    colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach((s) => {
          s.classList.toggle('is-active', s === swatch);
          s.setAttribute('aria-checked', String(s === swatch));
        });
        const colorName = swatch.getAttribute('data-color-swatch');
        const filterVal = swatch.getAttribute('data-color-filter') || 'none';
        if (colorLabelEl) colorLabelEl.textContent = colorName;
        if (mainImg) mainImg.style.filter = filterVal;
      });
    });

    // Size / Pack Pills
    const sizePills = Array.from(document.querySelectorAll('[data-size-pill]'));
    const sizeLabelEl = document.querySelector('[data-selected-size]');
    sizePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        sizePills.forEach((p) => {
          p.classList.toggle('is-active', p === pill);
          p.setAttribute('aria-checked', String(p === pill));
        });
        const label = pill.getAttribute('data-size-pill');
        const newPrice = parseInt(pill.getAttribute('data-price') || '330', 10);
        const newCompare = parseInt(pill.getAttribute('data-compare') || '415', 10);
        const newStock = parseInt(pill.getAttribute('data-stock') || '18', 10);
        const variantId = pill.getAttribute('data-variant-id');

        if (sizeLabelEl) sizeLabelEl.textContent = label;
        unitPriceRupees = newPrice;
        comparePriceRupees = newCompare;
        maxStock = newStock;
        if (variantId && variantIdInput) variantIdInput.value = variantId;

        // Update Price Display
        if (priceCurrentEl) priceCurrentEl.textContent = formatINR(unitPriceRupees);
        if (stickyPriceEl) stickyPriceEl.textContent = formatINR(unitPriceRupees);
        if (priceCompareEl) {
          priceCompareEl.textContent = formatINR(comparePriceRupees);
          priceCompareEl.style.display = comparePriceRupees > unitPriceRupees ? '' : 'none';
        }
        if (priceSaveEl && comparePriceRupees > unitPriceRupees) {
          const pct = Math.round(((comparePriceRupees - unitPriceRupees) / comparePriceRupees) * 100);
          priceSaveEl.textContent = `Save ${pct}%`;
          priceSaveEl.style.display = '';
        }

        // Update Stock Indicator & Out-of-Stock state
        if (stockStatusEl && stockTextEl) {
          stockStatusEl.classList.remove('is-low', 'is-out');
          if (maxStock <= 0) {
            stockStatusEl.classList.add('is-out');
            stockTextEl.textContent = 'Currently out of stock';
            if (atcBtn) atcBtn.disabled = true;
            if (atcBtnText) atcBtnText.textContent = 'Sold Out';
            if (buyNowBtn) buyNowBtn.style.display = 'none';
            if (notifyBox) notifyBox.classList.remove('hidden');
          } else if (maxStock <= 5) {
            stockStatusEl.classList.add('is-low');
            stockTextEl.textContent = `Only ${maxStock} left in stock – order soon!`;
            if (atcBtn) atcBtn.disabled = false;
            if (atcBtnText) atcBtnText.textContent = 'Add to Cart';
            if (buyNowBtn) buyNowBtn.style.display = '';
            if (notifyBox) notifyBox.classList.add('hidden');
          } else {
            stockTextEl.textContent = 'In stock – ships within 24 hrs from Surat';
            if (atcBtn) atcBtn.disabled = false;
            if (atcBtnText) atcBtnText.textContent = 'Add to Cart';
            if (buyNowBtn) buyNowBtn.style.display = '';
            if (notifyBox) notifyBox.classList.add('hidden');
          }
        }
        syncQuantity(qtyInput ? qtyInput.value : 1);
        updateFbtSummary();
      });
    });

    // =========================================================================
    // 3. AJAX ADD TO CART, TOAST NOTIFICATION & WISHLIST
    // =========================================================================
    const toast = document.getElementById('wm-pdp-toast');
    const toastMsg = document.querySelector('[data-toast-msg]');
    const toastViewCart = document.querySelector('[data-toast-view-cart]');
    let toastTimer = null;

    function showToast(message) {
      if (!toast) return;
      if (toastMsg && message) toastMsg.textContent = message;
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 4000);
    }

    if (toastViewCart) {
      toastViewCart.addEventListener('click', () => {
        toast.classList.remove('is-visible');
        if (window.WagmartCart) window.WagmartCart.openDrawer();
      });
    }

    function bumpCartBadge() {
      document.querySelectorAll('[data-cart-count], #header-cart-count').forEach((badge) => {
        badge.classList.remove('wm-cart-bump');
        void badge.offsetWidth;
        badge.classList.add('wm-cart-bump');
      });
    }

    async function handleAddToCart(openDrawer = true) {
      if (maxStock <= 0) return;
      const qty = parseInt(qtyInput?.value || '1', 10) || 1;
      const variantId = variantIdInput?.value || pdpRoot.getAttribute('data-product-id') || 'pet-grooming-glove';
      const title = pdpRoot.getAttribute('data-product-title') || 'Pet Grooming Glove';
      const image = mainImg?.src || '';

      if (atcBtnText) atcBtnText.textContent = 'Adding...';

      if (window.WagmartCart) {
        await window.WagmartCart.add(variantId, qty, openDrawer, {
          name: title,
          price: unitPriceRupees * 100,
          image: image,
        });
      }

      if (atcBtnText) atcBtnText.textContent = 'Added to Cart ✓';
      setTimeout(() => {
        if (atcBtnText && maxStock > 0) atcBtnText.textContent = 'Add to Cart';
      }, 1400);

      bumpCartBadge();
      showToast(`Added ${qty} × ${title} to cart ✓`);
    }

    const productForm = document.getElementById('product-form');
    if (productForm) {
      productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddToCart(true);
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', async () => {
        await handleAddToCart(true);
      });
    }

    if (stickyAtcBtn) {
      stickyAtcBtn.addEventListener('click', () => {
        handleAddToCart(true);
      });
    }

    // Wishlist Heart Toggle on PDP
    const pdpWishlistBtn = document.querySelector('[data-pdp-wishlist]');
    if (pdpWishlistBtn) {
      const prodId = pdpRoot.getAttribute('data-product-id') || 'pet-grooming-glove';
      const checkWishlisted = () => {
        try {
          const list = JSON.parse(localStorage.getItem('wagmart_wishlist') || '[]');
          const active = list.some((i) => i.id == prodId);
          pdpWishlistBtn.classList.toggle('is-active', active);
          pdpWishlistBtn.setAttribute('aria-pressed', String(active));
        } catch (e) {}
      };
      checkWishlisted();

      pdpWishlistBtn.addEventListener('click', () => {
        try {
          const list = JSON.parse(localStorage.getItem('wagmart_wishlist') || '[]');
          const idx = list.findIndex((i) => i.id == prodId);
          const title = pdpRoot.getAttribute('data-product-title') || 'Pet Grooming Glove';
          if (idx > -1) {
            list.splice(idx, 1);
            showToast('Removed from your wishlist');
          } else {
            list.push({
              id: prodId,
              name: title,
              price: unitPriceRupees,
              priceDisplay: formatINR(unitPriceRupees),
              image: mainImg?.src || '',
            });
            showToast('Saved to your wishlist ♥');
          }
          localStorage.setItem('wagmart_wishlist', JSON.stringify(list));
          checkWishlisted();
        } catch (e) {}
      });
    }

    // =========================================================================
    // 4. INDIAN PINCODE DELIVERY CHECKER
    // =========================================================================
    const pincodeForm = document.querySelector('[data-pincode-form]');
    const pincodeInput = document.getElementById('wm-pincode-input');
    const pincodeResult = document.querySelector('[data-pincode-result]');

    function formatDeliveryDate(daysToAdd) {
      const d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    // Default estimated delivery date on load
    const defaultDateEl = document.querySelector('[data-default-delivery-date]');
    if (defaultDateEl) {
      defaultDateEl.textContent = `Delivery by ${formatDeliveryDate(3)}`;
    }

    if (pincodeForm && pincodeInput && pincodeResult) {
      pincodeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pin = pincodeInput.value.trim();
        if (!/^[1-9][0-9]{5}$/.test(pin)) {
          pincodeResult.innerHTML = `<span class="wm-pincode__error">Please enter a valid 6-digit Indian pincode (e.g. 395004).</span>`;
          return;
        }
        const isSurat = pin.startsWith('395');
        const isGujaratOrMetro = pin.startsWith('38') || pin.startsWith('39') || pin.startsWith('40') || pin.startsWith('11') || pin.startsWith('56');
        const days = isSurat ? 1 : isGujaratOrMetro ? 2 : 4;
        const dateStr = formatDeliveryDate(days);
        const cityNote = isSurat ? 'Same/Next-Day Surat Express' : 'Fast Express Courier';

        pincodeResult.innerHTML = `
          <div class="wm-pincode__result-line">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span><strong>Delivery by ${dateStr}</strong> (${cityNote} to ${pin})</span>
          </div>
          <div class="wm-pincode__result-line">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Cash on Delivery (COD) available &bull; Free shipping above ₹499</span>
          </div>
        `;
      });
    }

    // =========================================================================
    // 5. SHARE BUTTONS (WhatsApp, Facebook, Copy Link)
    // =========================================================================
    const copyLinkBtn = document.querySelector('[data-share-copy]');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        const url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url);
        }
        showToast('Product link copied to clipboard ✓');
      });
    }

    // =========================================================================
    // 6. TABS (Desktop) & ACCORDIONS (Mobile)
    // =========================================================================
    const tabBtns = Array.from(document.querySelectorAll('[data-tab-target]'));
    const tabPanels = Array.from(document.querySelectorAll('[data-tab-panel]'));
    const accordionBtns = Array.from(document.querySelectorAll('[data-accordion-toggle]'));

    function activateTab(tabId) {
      tabBtns.forEach((btn) => {
        const active = btn.getAttribute('data-tab-target') === tabId;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
      });
      tabPanels.forEach((panel) => {
        const active = panel.getAttribute('data-tab-panel') === tabId;
        panel.classList.toggle('is-active', active);
      });
    }

    tabBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => activateTab(btn.getAttribute('data-tab-target')));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const next = tabBtns[(idx + 1) % tabBtns.length];
          next.focus();
          activateTab(next.getAttribute('data-tab-target'));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = tabBtns[(idx - 1 + tabBtns.length) % tabBtns.length];
          prev.focus();
          activateTab(prev.getAttribute('data-tab-target'));
        }
      });
    });

    accordionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('[data-tab-panel]');
        if (!panel) return;
        const isOpen = panel.classList.contains('is-active');
        panel.classList.toggle('is-active', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    // =========================================================================
    // 7. FREQUENTLY BOUGHT TOGETHER (Bundle Calculator & Add All)
    // =========================================================================
    const fbtCheckboxes = Array.from(document.querySelectorAll('[data-fbt-checkbox]'));
    const fbtTotalEl = document.querySelector('[data-fbt-total]');
    const fbtCompareEl = document.querySelector('[data-fbt-compare]');
    const fbtSaveEl = document.querySelector('[data-fbt-save]');
    const fbtAddBtn = document.querySelector('[data-fbt-add-btn]');

    function updateFbtSummary() {
      if (!fbtCheckboxes.length) return;
      let total = 0;
      let compareTotal = 0;
      let selectedCount = 0;

      fbtCheckboxes.forEach((cb) => {
        const card = cb.closest('[data-fbt-card]');
        const isMain = cb.hasAttribute('data-fbt-main');
        const price = isMain ? unitPriceRupees : parseInt(cb.getAttribute('data-price') || '0', 10);
        const compare = isMain ? comparePriceRupees : parseInt(cb.getAttribute('data-compare') || '0', 10);

        if (isMain) {
          const mainPriceLabel = card?.querySelector('[data-fbt-item-price]');
          if (mainPriceLabel) mainPriceLabel.textContent = formatINR(unitPriceRupees);
        }

        if (cb.checked) {
          total += price;
          compareTotal += compare;
          selectedCount++;
          if (card) card.classList.add('is-selected');
        } else {
          if (card) card.classList.remove('is-selected');
        }
      });

      if (fbtTotalEl) fbtTotalEl.textContent = formatINR(total);
      if (fbtCompareEl) {
        fbtCompareEl.textContent = formatINR(compareTotal);
        fbtCompareEl.style.display = compareTotal > total ? '' : 'none';
      }
      if (fbtSaveEl) {
        const saved = Math.max(0, compareTotal - total);
        fbtSaveEl.textContent = saved > 0 ? `You save ${formatINR(saved)} on this bundle` : 'Free Express Shipping Eligible';
      }
      if (fbtAddBtn) {
        fbtAddBtn.disabled = selectedCount === 0;
        fbtAddBtn.textContent = selectedCount > 0
          ? `Add All ${selectedCount} to Cart • ${formatINR(total)}`
          : 'Select items to add';
      }
    }

    fbtCheckboxes.forEach((cb) => cb.addEventListener('change', updateFbtSummary));
    updateFbtSummary();

    if (fbtAddBtn) {
      fbtAddBtn.addEventListener('click', async () => {
        const selected = fbtCheckboxes.filter((cb) => cb.checked);
        if (!selected.length) return;

        for (let i = 0; i < selected.length; i++) {
          const cb = selected[i];
          const id = cb.getAttribute('data-id');
          const name = cb.getAttribute('data-name');
          const isMain = cb.hasAttribute('data-fbt-main');
          const price = (isMain ? unitPriceRupees : parseInt(cb.getAttribute('data-price') || '299', 10)) * 100;
          const image = cb.getAttribute('data-image') || '';
          if (window.WagmartCart) {
            await window.WagmartCart.add(id, 1, i === selected.length - 1, { name, price, image });
          }
        }
        bumpCartBadge();
        showToast(`Added ${selected.length} bundle items to cart ✓`);
      });
    }

    // =========================================================================
    // 8. CUSTOMER REVIEWS SORTING & WRITE-A-REVIEW FORM
    // =========================================================================
    const reviewSort = document.getElementById('wm-reviews-sort');
    const reviewContainer = document.getElementById('wm-reviews-list');
    const writeReviewBtn = document.querySelector('[data-toggle-review-form]');
    const reviewFormBox = document.getElementById('wm-review-form-box');
    const reviewForm = document.getElementById('wm-new-review-form');

    if (writeReviewBtn && reviewFormBox) {
      writeReviewBtn.addEventListener('click', () => {
        reviewFormBox.classList.toggle('hidden');
        if (!reviewFormBox.classList.contains('hidden')) {
          reviewFormBox.querySelector('input, textarea')?.focus();
        }
      });
    }

    if (reviewSort && reviewContainer) {
      reviewSort.addEventListener('change', () => {
        const mode = reviewSort.value;
        const cards = Array.from(reviewContainer.querySelectorAll('[data-review-card]'));
        cards.sort((a, b) => {
          const rA = parseFloat(a.getAttribute('data-rating') || '5');
          const rB = parseFloat(b.getAttribute('data-rating') || '5');
          const dA = parseInt(a.getAttribute('data-date') || '0', 10);
          const dB = parseInt(b.getAttribute('data-date') || '0', 10);
          const pA = a.getAttribute('data-has-photo') === 'true' ? 1 : 0;
          const pB = b.getAttribute('data-has-photo') === 'true' ? 1 : 0;
          if (mode === 'highest') return rB - rA;
          if (mode === 'lowest') return rA - rB;
          if (mode === 'newest') return dB - dA;
          if (mode === 'photos') return pB - pA;
          return 0;
        });
        cards.forEach((c) => reviewContainer.appendChild(c));
      });
    }

    if (reviewForm && reviewContainer) {
      reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = reviewForm.querySelector('[name="reviewer_name"]')?.value.trim() || 'Pet Parent';
        const title = reviewForm.querySelector('[name="review_title"]')?.value.trim() || 'Great product!';
        const body = reviewForm.querySelector('[name="review_body"]')?.value.trim() || '';
        const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'PP';

        const newCard = document.createElement('article');
        newCard.className = 'wm-review-card';
        newCard.setAttribute('data-review-card', '');
        newCard.setAttribute('data-rating', '5');
        newCard.setAttribute('data-date', String(Date.now()));
        newCard.innerHTML = `
          <div class="wm-review-card__head">
            <div class="wm-review-card__author">
              <span class="wm-review-card__avatar">${initials}</span>
              <div>
                <div class="wm-review-card__name">
                  <span>${name}</span>
                  <span class="wm-verified-badge">✓ Verified Buyer</span>
                </div>
                <div class="wm-stars" aria-label="5 out of 5 stars">★★★★★</div>
              </div>
            </div>
            <span class="wm-review-card__date">Just now</span>
          </div>
          <h4 class="wm-review-card__title">${title}</h4>
          <p class="wm-review-card__body">${body}</p>
        `;
        reviewContainer.prepend(newCard);
        reviewForm.reset();
        reviewFormBox?.classList.add('hidden');
        showToast('Thank you! Your review has been published ✓');
      });
    }

    // =========================================================================
    // 9. RECENTLY VIEWED PRODUCTS (localStorage)
    // =========================================================================
    try {
      const currentProduct = {
        id: pdpRoot.getAttribute('data-product-id') || 'pet-grooming-glove',
        title: pdpRoot.getAttribute('data-product-title') || 'Pet Grooming Glove',
        price: formatINR(unitPriceRupees),
        image: mainImg?.src || '',
        url: window.location.pathname,
      };
      const stored = JSON.parse(localStorage.getItem('wagmart_recently_viewed') || '[]');
      const filtered = stored.filter((item) => item.id !== currentProduct.id);
      filtered.unshift(currentProduct);
      localStorage.setItem('wagmart_recently_viewed', JSON.stringify(filtered.slice(0, 6)));
    } catch (e) {}

    // =========================================================================
    // 10. MOBILE STICKY BOTTOM BAR (IntersectionObserver + Scroll Fallback)
    // =========================================================================
    const stickyBar = document.getElementById('wm-sticky-mobile-bar');
    if (stickyBar && atcBtn) {
      const checkStickyBar = () => {
        const rect = atcBtn.getBoundingClientRect();
        const scrolledPast = rect.bottom < 0;
        stickyBar.classList.toggle('is-visible', scrolledPast);
      };
      window.addEventListener('scroll', checkStickyBar, { passive: true });
      window.addEventListener('resize', checkStickyBar, { passive: true });
      checkStickyBar();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductPage);
  } else {
    initProductPage();
  }
})();

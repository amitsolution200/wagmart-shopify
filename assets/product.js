/**
 * WAGMART — Product Page Web Components & Controllers (assets/product.js)
 * Vanilla ES6+ Custom Elements (no jQuery, no external libraries):
 * 1. <product-page> — Gallery, Lightbox, Variant Picker, Quantity Stepper,
 *    Cart AJAX API (/cart/add.js) + Section Rendering API, Mobile Sticky CTA
 * 2. <pincode-checker> — 6-digit Indian Pincode validator, API proxy caller & localStorage persistence
 * 3. <product-recommendations> — Lazy-loaded carousel via /recommendations/products
 * 4. Accessible ARIA Tabs, Breed Guide Segmented Filter & Single-Source Reviews Controller
 */

(function () {
  'use strict';

  const formatINR = (cents) => {
    const rupees = Math.round((Number(cents) || 0) / 100);
    return '₹' + rupees.toLocaleString('en-IN');
  };

  const escapeHTML = (str) =>
    String(str || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));

  /* ==========================================================================
     1. <product-page> CUSTOM ELEMENT (Gallery, Variants, AJAX Cart, Sticky Bar)
     ========================================================================== */
  class ProductPage extends HTMLElement {
    connectedCallback() {
      this.currentIndex = 0;
      this.initGallery();
      this.initLightbox();
      this.initVariants();
      this.initQuantityAndCart();
      this.initCrossSell();
      this.initWishlist();
      this.initReviewAnchor();
      this.initStickyBar();
    }

    initGallery() {
      this.track = this.querySelector('[data-gallery-track]');
      this.viewport = this.querySelector('[data-gallery-viewport]');
      this.slides = Array.from(this.querySelectorAll('[data-gallery-slide]'));
      this.thumbs = Array.from(this.querySelectorAll('[data-gallery-thumb]'));
      this.dots = Array.from(this.querySelectorAll('[data-gallery-dot]'));

      if (!this.track || this.slides.length === 0) return;

      this.thumbs.forEach((thumb, idx) => {
        thumb.addEventListener('click', () => this.goToSlide(idx));
        thumb.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = (idx + 1) % this.thumbs.length;
            this.thumbs[next].focus();
            this.goToSlide(next);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = (idx - 1 + this.thumbs.length) % this.thumbs.length;
            this.thumbs[prev].focus();
            this.goToSlide(prev);
          }
        });
      });

      this.dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => this.goToSlide(idx));
      });

      // Touch swipe gesture support
      if (this.viewport && this.slides.length > 1) {
        let startX = 0;
        let startY = 0;
        let deltaX = 0;
        let dragging = false;

        this.viewport.addEventListener(
          'touchstart',
          (e) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            deltaX = 0;
            dragging = true;
            this.track.classList.add('is-dragging');
          },
          { passive: true }
        );

        this.viewport.addEventListener(
          'touchmove',
          (e) => {
            if (!dragging || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            if (Math.abs(dx) > Math.abs(dy)) {
              deltaX = dx;
            }
          },
          { passive: true }
        );

        const endSwipe = () => {
          if (!dragging) return;
          dragging = false;
          this.track.classList.remove('is-dragging');
          if (deltaX < -45) {
            this.goToSlide(this.currentIndex + 1);
          } else if (deltaX > 45) {
            this.goToSlide(this.currentIndex - 1);
          }
          deltaX = 0;
        };

        this.viewport.addEventListener('touchend', endSwipe, { passive: true });
        this.viewport.addEventListener('touchcancel', endSwipe, { passive: true });
      }
    }

    goToSlide(index) {
      const count = this.slides.length;
      if (count === 0 || !this.track) return;
      this.currentIndex = ((index % count) + count) % count;
      this.track.style.transform = `translate3d(-${this.currentIndex * 100}%, 0, 0)`;

      this.slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === this.currentIndex);
      });

      this.thumbs.forEach((thumb, i) => {
        const active = i === this.currentIndex;
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-selected', String(active));
      });

      this.dots.forEach((dot, i) => {
        const active = i === this.currentIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });

      this.syncLightboxImage();
    }

    initLightbox() {
      this.lightbox = this.querySelector('[data-gallery-lightbox]');
      const openBtn = this.querySelector('[data-lightbox-open]');
      const closeBtn = this.querySelector('[data-lightbox-close]');
      const prevBtn = this.querySelector('[data-lightbox-prev]');
      const nextBtn = this.querySelector('[data-lightbox-next]');
      this.lightboxImg = this.querySelector('[data-lightbox-img]');
      this.lightboxCounter = this.querySelector('[data-lightbox-counter]');

      if (!this.lightbox) return;

      const openModal = () => {
        this.syncLightboxImage();
        if (typeof this.lightbox.showModal === 'function') {
          this.lightbox.showModal();
        } else {
          this.lightbox.setAttribute('open', '');
        }
      };

      const closeModal = () => {
        if (typeof this.lightbox.close === 'function') {
          this.lightbox.close();
        } else {
          this.lightbox.removeAttribute('open');
        }
      };

      if (openBtn) openBtn.addEventListener('click', openModal);
      this.querySelectorAll('[data-zoom-container]').forEach((wrap) => {
        wrap.addEventListener('click', openModal);
      });

      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (prevBtn) prevBtn.addEventListener('click', () => this.goToSlide(this.currentIndex - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => this.goToSlide(this.currentIndex + 1));

      this.lightbox.addEventListener('click', (e) => {
        if (e.target === this.lightbox) closeModal();
      });

      this.lightbox.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') this.goToSlide(this.currentIndex - 1);
        if (e.key === 'ArrowRight') this.goToSlide(this.currentIndex + 1);
      });
    }

    syncLightboxImage() {
      if (!this.lightboxImg || !this.slides[this.currentIndex]) return;
      const activeSlide = this.slides[this.currentIndex];
      const zoomSrc =
        activeSlide.getAttribute('data-zoom-src') ||
        activeSlide.querySelector('img')?.src ||
        '';
      const altText = activeSlide.querySelector('img')?.alt || '';
      if (zoomSrc) this.lightboxImg.src = zoomSrc;
      this.lightboxImg.alt = altText;
      if (this.lightboxCounter) {
        this.lightboxCounter.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
      }
    }

    initVariants() {
      const picker = this.querySelector('[data-variant-picker]');
      const jsonEl = this.querySelector('[data-product-variants]');
      if (!picker || !jsonEl) return;

      let variants = [];
      try {
        variants = JSON.parse(jsonEl.textContent);
      } catch (e) {
        return;
      }

      const inputs = Array.from(picker.querySelectorAll('[data-variant-option-input]'));
      inputs.forEach((input) => {
        input.addEventListener('change', () => {
          const fieldset = input.closest('fieldset');
          if (fieldset) {
            fieldset.querySelectorAll('.wm-variants__pill').forEach((lbl) => {
              lbl.classList.toggle('is-selected', lbl.contains(input));
            });
            const selVal = fieldset.querySelector('[data-option-selected-value]');
            if (selVal) selVal.textContent = input.value;
          }

          const selectedOptions = Array.from(
            picker.querySelectorAll('[data-variant-option-input]:checked')
          ).map((el) => el.value);

          const matchedVariant = variants.find((v) =>
            selectedOptions.every((val, i) => v.options[i] === val)
          );

          this.updateVariantState(matchedVariant);
        });
      });
    }

    updateVariantState(variant) {
      const idInput = this.querySelector('[data-variant-id-input]');
      const atcBtn = this.querySelector('[data-atc-button]');
      const atcText = this.querySelector('[data-atc-text]');
      const buyNowWrap = this.querySelector('[data-buy-now-wrap]');
      const stickyBtn = this.querySelector('[data-sticky-atc-trigger]');
      const stickyText = this.querySelector('[data-sticky-atc-text]');

      if (!variant) {
        if (atcBtn) atcBtn.disabled = true;
        if (atcText && atcBtn) atcText.textContent = atcBtn.dataset.textUnavailable || 'Unavailable';
        if (buyNowWrap) buyNowWrap.hidden = true;
        return;
      }

      if (idInput) idInput.value = variant.id;

      // Update URL with ?variant=
      if (this.dataset.updateUrl === 'true' && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }

      // Switch gallery slide if variant has featured_media
      if (variant.featured_media && variant.featured_media.id) {
        const mediaIdx = this.slides.findIndex(
          (s) => Number(s.dataset.mediaId) === Number(variant.featured_media.id)
        );
        if (mediaIdx > -1) this.goToSlide(mediaIdx);
      }

      // Update price elements (matching product card format: ₹449 ₹561)
      const priceInr = Math.round((Number(variant.price) || 0) / 100);
      const compInr =
        variant.compare_at_price && variant.compare_at_price > variant.price
          ? Math.round(Number(variant.compare_at_price) / 100)
          : Math.round(priceInr * 1.25);
      this.querySelectorAll('[data-price-current]').forEach((el) => {
        el.textContent = '₹' + priceInr.toLocaleString('en-IN');
      });
      this.querySelectorAll('[data-price-compare]').forEach((el) => {
        el.textContent = '₹' + compInr.toLocaleString('en-IN');
        el.hidden = false;
      });

      // Update SKU elements across buy box and specifications tab (Shopify Admin SKU only)
      const adminSku = variant.sku && String(variant.sku).trim() !== '' ? String(variant.sku).trim() : '';
      document.querySelectorAll('[data-product-sku]').forEach((el) => {
        el.textContent = adminSku;
      });
      document.querySelectorAll('[data-sku-wrapper]').forEach((wrap) => {
        wrap.hidden = !adminSku;
      });

      // Update availability state
      const isAvail = Boolean(variant.available);
      if (atcBtn) atcBtn.disabled = !isAvail;
      if (atcText && atcBtn) {
        atcText.textContent = isAvail
          ? atcBtn.dataset.textDefault || 'Add to Cart'
          : atcBtn.dataset.textSoldOut || 'Sold Out';
      }
      if (buyNowWrap) buyNowWrap.hidden = !isAvail;
      if (stickyBtn) stickyBtn.disabled = !isAvail;
      if (stickyText && stickyBtn) {
        stickyText.textContent = isAvail
          ? stickyBtn.dataset.textDefault || '+ Add'
          : stickyBtn.dataset.textSoldOut || 'Sold Out';
      }

      // Update Stock Indicator dynamically on variant change
      const stockBox = this.querySelector('[data-stock-indicator]');
      if (stockBox) {
        const invJsonEl = stockBox.querySelector('[data-variant-inventory]');
        let invData = null;
        if (invJsonEl) {
          try {
            const map = JSON.parse(invJsonEl.textContent || '{}');
            invData = map[String(variant.id)] || null;
          } catch (e) {}
        }
        const lowThreshold = parseInt(stockBox.dataset.lowThreshold || '10', 10);
        const showQty = stockBox.dataset.showQty === 'true';
        const qty = invData ? Number(invData.quantity) || 0 : 0;
        const mgmt = invData ? invData.management : variant.inventory_management;

        stockBox.classList.remove('is-in-stock', 'is-low-stock', 'is-out-of-stock');
        const textEl = stockBox.querySelector('[data-stock-text]');
        const barEl = stockBox.querySelector('[data-stock-bar]');

        if (!isAvail) {
          stockBox.classList.add('is-out-of-stock');
          if (textEl) textEl.textContent = stockBox.dataset.labelOutOfStock || 'Out of stock';
        } else if (mgmt === 'shopify' && qty > 0 && qty <= lowThreshold) {
          stockBox.classList.add('is-low-stock');
          if (textEl) {
            textEl.textContent = showQty
              ? `Only ${qty} left in stock - order soon`
              : stockBox.dataset.labelLowStock || 'Low stock - order soon';
          }
        } else {
          stockBox.classList.add('is-in-stock');
          if (textEl) {
            textEl.textContent =
              mgmt === 'shopify' && qty > 0 && showQty
                ? `In stock (${qty} available), ready to ship`
                : stockBox.dataset.labelInStock || 'In stock, ready to ship';
          }
        }
      }
    }

    isVariantBusy(variantId) {
      const key = String(variantId || '');
      if (!key) return false;
      return Boolean(
        (this._varTimers && this._varTimers[key]) ||
        (this._inflightAdd && this._inflightAdd[key]) ||
        (this._inflightChange && this._inflightChange[key])
      );
    }

    optimisticUpsertCartItem(variantId, targetQty, meta = {}) {
      const key = String(variantId || '');
      if (!key) return;
      if (window.WagmartCart) {
        window.WagmartCart._updateSeq = (window.WagmartCart._updateSeq || 0) + 1;
      }
      if (!window.WagmartState || !window.WagmartState.cart) return;
      if (!Array.isArray(window.WagmartState.cart.items)) {
        window.WagmartState.cart.items = [];
      }
      const items = window.WagmartState.cart.items;
      const idx = items.findIndex(
        (i) => String(i.id) === key || String(i.variant_id) === key || String(i.key) === key
      );
      if (idx > -1) {
        if (targetQty <= 0) {
          items.splice(idx, 1);
        } else {
          items[idx].quantity = targetQty;
          const unitPrice = Number(items[idx].final_price) || Number(items[idx].price) || 0;
          items[idx].final_line_price = unitPrice * targetQty;
        }
      } else if (targetQty > 0) {
        const unitPrice = Number(meta.price) || 33000;
        const compPrice = Number(meta.compare_at_price) || Math.round(unitPrice * 1.25);
        items.push({
          _wm_v2: true,
          id: Number(key) || key,
          variant_id: Number(key) || key,
          key: key,
          title: meta.title || 'Product',
          product_title: meta.title || 'Product',
          url: meta.url || window.location.pathname,
          image: meta.image || '',
          price: unitPrice,
          final_price: unitPrice,
          compare_at_price: compPrice,
          original_price: compPrice,
          final_line_price: unitPrice * targetQty,
          quantity: targetQty,
          max_stock: Number(meta.max_stock) || this.getMaxVariantQty(key) || 99,
        });
      }
      if (window.WagmartCart && typeof window.WagmartCart._recalcLocalCart === 'function') {
        window.WagmartCart._recalcLocalCart();
        window.WagmartCart.render();
      }
    }

    syncVariantQtyDebounced(variantId, targetQty, prevQty, onRevert, meta = {}) {
      const key = String(variantId || '');
      if (!key) return;
      this._varSeq = this._varSeq || {};
      this._varTimers = this._varTimers || {};
      this._pendingQty = this._pendingQty || {};
      this._inflightAdd = this._inflightAdd || {};
      this._inflightChange = this._inflightChange || {};

      this._varSeq[key] = (this._varSeq[key] || 0) + 1;
      const seq = this._varSeq[key];
      this._pendingQty[key] = targetQty;

      // Optimistically keep WagmartState.cart and header count in sync immediately (0ms)
      this.optimisticUpsertCartItem(key, targetQty, meta);

      if (this._varTimers[key]) {
        clearTimeout(this._varTimers[key]);
      }

      this._varTimers[key] = setTimeout(async () => {
        delete this._varTimers[key];
        const finalQty = this._pendingQty[key];
        this._inflightChange[key] = true;
        try {
          if (this._inflightAdd[key]) {
            await this._inflightAdd[key].catch(() => {});
          }
          // If a newer click happened while waiting for add, let the newer timer handle it
          if (seq !== this._varSeq[key]) return;

          const res = await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ id: key, quantity: finalQty }),
          });

          if (!res.ok) {
            if (finalQty > prevQty) {
              window.WagmartMaxStock = window.WagmartMaxStock || {};
              window.WagmartMaxStock[key] = prevQty;
              if (typeof onRevert === 'function') onRevert(prevQty);
            }
            return;
          }

          const serverCart = await res.json().catch(() => null);
          if (seq === this._varSeq[key] && serverCart && Array.isArray(serverCart.items)) {
            if (window.WagmartState) {
              window.WagmartState.cart = serverCart;
            }
            if (window.WagmartCart && typeof window.WagmartCart._recalcLocalCart === 'function') {
              window.WagmartCart._recalcLocalCart();
              window.WagmartCart.render();
            }
            document.querySelectorAll('[data-cart-count], .wm-header__cart-count').forEach((el) => {
              el.textContent = String(serverCart.item_count || 0);
              el.classList.toggle('hidden', !serverCart.item_count);
            });
          }
        } catch (e) {
        } finally {
          if (seq === this._varSeq[key]) {
            delete this._inflightChange[key];
          }
        }
      }, 140);
    }

    getMaxVariantQty(variantId) {
      window.WagmartMaxStock = window.WagmartMaxStock || {};
      const key = String(variantId || this.querySelector('[data-variant-id-input]')?.value || '');
      if (!key) return 99;
      if (typeof window.WagmartMaxStock[key] === 'number') {
        return window.WagmartMaxStock[key];
      }
      const invJsonEl = this.querySelector('[data-variant-inventory]');
      if (invJsonEl) {
        try {
          const map = JSON.parse(invJsonEl.textContent || '{}');
          const inv = map[key];
          if (inv) {
            if (!inv.available) {
              window.WagmartMaxStock[key] = 0;
              return 0;
            }
            if (inv.management === 'shopify' && inv.policy === 'deny') {
              const q = Math.max(0, Number(inv.quantity) || 0);
              window.WagmartMaxStock[key] = q;
              return q;
            }
          }
        } catch (e) {}
      }
      return 99;
    }

    initQuantityAndCart() {
      const form = this.querySelector('[data-product-form]');
      const qtyInput = this.querySelector('[data-qty-input]');
      const minusBtn = this.querySelector('[data-qty-minus]');
      const plusBtn = this.querySelector('[data-qty-plus]');
      const atcBtn = this.querySelector('[data-atc-button]');
      const atcText = this.querySelector('[data-atc-text]');
      const atcSpinner = this.querySelector('[data-atc-spinner]');
      const atcStepper = this.querySelector('[data-pdp-atc-stepper]');
      const atcQtyVal = this.querySelector('[data-pdp-atc-qty]');
      const errorBox = this.querySelector('[data-form-error]');
      const errorText = this.querySelector('[data-form-error-text]');
      const buyNowBtn = this.querySelector('[data-buy-now-button]');

      if (minusBtn && qtyInput) {
        minusBtn.addEventListener('click', () => {
          const current = parseInt(qtyInput.value, 10) || 1;
          qtyInput.value = String(Math.max(1, current - 1));
        });
      }

      if (plusBtn && qtyInput) {
        plusBtn.addEventListener('click', () => {
          const maxQty = this.getMaxVariantQty();
          const current = parseInt(qtyInput.value, 10) || 1;
          qtyInput.value = String(Math.min(maxQty, current + 1));
        });
      }

      const stickyTrigger = this.querySelector('[data-sticky-atc-trigger]');
      const stickyStepper = this.querySelector('[data-sticky-atc-stepper]');
      const stickyQtyVal = this.querySelector('[data-sticky-atc-qty]');
      const pdpPlusBtn = atcStepper ? atcStepper.querySelector('[data-pdp-atc-delta="1"]') : null;
      const stickyPlusBtn = stickyStepper ? stickyStepper.querySelector('[data-sticky-atc-delta="1"]') : null;

      const showAtcStepper = (qty) => {
        const maxQty = this.getMaxVariantQty();
        const clampedQty = maxQty > 0 ? Math.min(maxQty, qty) : 0;
        const isAtMax = clampedQty >= maxQty;

        if (pdpPlusBtn) pdpPlusBtn.disabled = isAtMax;
        if (stickyPlusBtn) stickyPlusBtn.disabled = isAtMax;

        if (atcBtn && atcStepper) {
          if (clampedQty > 0) {
            atcBtn.hidden = true;
            atcStepper.hidden = false;
            if (atcQtyVal) atcQtyVal.textContent = String(clampedQty);
            if (qtyInput) qtyInput.value = String(clampedQty);
          } else {
            atcStepper.hidden = true;
            atcBtn.hidden = false;
            atcBtn.disabled = maxQty <= 0;
            if (atcSpinner) atcSpinner.hidden = true;
            if (atcText) {
              atcText.textContent =
                maxQty <= 0
                  ? atcBtn.dataset.textSoldOut || 'Sold Out'
                  : atcBtn.dataset.textDefault || 'Add to Cart';
            }
            if (qtyInput) qtyInput.value = '1';
          }
        }
        if (stickyTrigger && stickyStepper) {
          if (clampedQty > 0) {
            stickyTrigger.hidden = true;
            stickyStepper.hidden = false;
            if (stickyQtyVal) stickyQtyVal.textContent = String(clampedQty);
          } else {
            stickyStepper.hidden = true;
            stickyTrigger.hidden = false;
            stickyTrigger.disabled = maxQty <= 0;
          }
        }
      };
      this.showAtcStepper = showAtcStepper;

      // Handle - / + clicks on the PDP Add to Cart Stepper
      if (atcStepper) {
        atcStepper.querySelectorAll('[data-pdp-atc-delta]').forEach((deltaBtn) => {
          deltaBtn.addEventListener('click', () => {
            if (deltaBtn.disabled) return;
            const delta = parseInt(deltaBtn.getAttribute('data-pdp-atc-delta') || '0', 10);
            const currentQty = parseInt(atcQtyVal?.textContent?.trim() || '1', 10) || 1;
            const variantId = this.querySelector('[data-variant-id-input]')?.value;
            const maxQty = this.getMaxVariantQty(variantId);

            if (delta > 0 && currentQty >= maxQty) {
              deltaBtn.disabled = true;
              return;
            }

            const newQty = Math.min(maxQty, Math.max(0, currentQty + delta));
            showAtcStepper(newQty);

            if (!variantId) return;
            this.syncVariantQtyDebounced(variantId, newQty, currentQty, (revQty) => {
              showAtcStepper(revQty);
            });
          });
        });
      }

      // Sync stepper if cart updates from drawer
      document.addEventListener('wagmart:cart-updated', (e) => {
        const cart = e.detail;
        if (!cart || !Array.isArray(cart.items)) return;
        const variantId = String(this.querySelector('[data-variant-id-input]')?.value || '');
        if (!variantId || this.isVariantBusy(variantId)) return;
        const item = cart.items.find(
          (i) => String(i.id) === variantId || String(i.variant_id) === variantId
        );
        if (item && Number(item.quantity) > 0) {
          showAtcStepper(Number(item.quantity));
        } else if (atcStepper && !atcStepper.hidden) {
          showAtcStepper(0);
        }
      });

      if (form && atcBtn) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (atcBtn.disabled) return;

          const variantId = String(this.querySelector('[data-variant-id-input]')?.value || '');
          const quantity = 1;
          const checkedAddons = Array.from(this.querySelectorAll('[data-addon-checkbox]:checked'))
            .map((cb) => cb.value)
            .filter(Boolean);

          if (errorBox) errorBox.hidden = true;

          this._inflightAdd = this._inflightAdd || {};
          this._pendingQty = this._pendingQty || {};
          this._pendingQty[variantId] = 1;

          // Immediately switch Add to Cart button to - 1 + stepper and sync local cart state (0ms)
          showAtcStepper(1);
          const pdpTitle = this.querySelector('.wm-buy-box__title')?.textContent?.trim() || 'Product';
          const pdpImg = this.querySelector('.wm-gallery__img')?.src || '';
          this.optimisticUpsertCartItem(variantId, 1, {
            title: pdpTitle,
            image: pdpImg,
            url: window.location.pathname,
            max_stock: this.getMaxVariantQty(variantId),
          });

          const addReq = (async () => {
            const itemsPayload = [{ id: variantId, quantity }];
            checkedAddons.forEach((addonId) => {
              itemsPayload.push({ id: addonId, quantity: 1 });
            });

            const response = await fetch('/cart/add.js', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                items: itemsPayload,
                sections: ['header'],
              }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(data.description || data.message || 'Could not add item to cart.');
            }
            return data;
          })();

          this._inflightAdd[variantId] = addReq;

          try {
            await addReq;
            delete this._inflightAdd[variantId];
            // Only fetch full cart if no rapid +/- clicks are already queued for this variant
            if (!this.isVariantBusy(variantId)) {
              if (window.WagmartCart && typeof window.WagmartCart.fetch === 'function') {
                await window.WagmartCart.fetch();
              } else {
                await this.refreshCartCount();
              }
            }
          } catch (err) {
            delete this._inflightAdd[variantId];
            showAtcStepper(0);
            if (errorBox && errorText) {
              errorText.textContent = err.message || 'Unable to add item right now. Please try again.';
              errorBox.hidden = false;
            }
          }
        });
      }

      if (buyNowBtn) {
        buyNowBtn.addEventListener('click', async () => {
          const variantId = this.querySelector('[data-variant-id-input]')?.value;
          const quantity = Math.max(1, parseInt(qtyInput?.value || '1', 10));
          if (errorBox) errorBox.hidden = true;
          buyNowBtn.disabled = true;
          try {
            const res = await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ id: variantId, quantity }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(data.description || data.message || 'Could not proceed to checkout.');
            }
            window.location.href = '/checkout';
          } catch (err) {
            buyNowBtn.disabled = false;
            if (errorBox && errorText) {
              errorText.textContent = err.message || 'Unable to proceed to checkout right now. Please try again.';
              errorBox.hidden = false;
            }
          }
        });
      }
    }

    async refreshCartCount() {
      try {
        const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
        if (!res.ok) return;
        const cart = await res.json();
        document.querySelectorAll('[data-cart-count], .wm-header__cart-count').forEach((el) => {
          el.textContent = String(cart.item_count || 0);
          el.classList.toggle('hidden', !cart.item_count);
        });
        document.dispatchEvent(new CustomEvent('wagmart:cart-updated', { detail: cart }));
      } catch (e) {
        // Ignore network errors in local preview
      }
    }

    initCrossSell() {
      const buttons = this.querySelectorAll('[data-cross-sell-add]');
      const checkboxes = this.querySelectorAll('[data-addon-checkbox]');
      const bundleBtn = this.querySelector('[data-addon-bundle-btn]');
      const bundleText = this.querySelector('[data-addon-bundle-text]');

      const syncBundleBtn = () => {
        if (!bundleBtn || !bundleText) return;
        const checked = Array.from(checkboxes).filter((cb) => cb.checked && !cb.disabled);
        if (checked.length === 0) {
          bundleBtn.hidden = true;
          return;
        }
        const totalCents = checked.reduce((sum, cb) => sum + (Number(cb.dataset.addonPrice) || 0), 0);
        bundleBtn.hidden = false;
        bundleText.textContent = `Add ${checked.length} Selected Add-On${checked.length > 1 ? 's' : ''} (${formatINR(totalCents)})`;
      };

      checkboxes.forEach((cb) => {
        cb.addEventListener('change', syncBundleBtn);
      });

      if (bundleBtn) {
        bundleBtn.addEventListener('click', async () => {
          const checked = Array.from(checkboxes).filter((cb) => cb.checked && !cb.disabled);
          if (!checked.length || bundleBtn.disabled) return;
          bundleBtn.disabled = true;
          if (bundleText) bundleText.textContent = 'Adding selected add-ons...';

          try {
            const items = checked.map((cb) => ({ id: cb.value, quantity: 1 }));
            const response = await fetch('/cart/add.js', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({ items, sections: ['header'] }),
            });

            if (!response.ok) throw new Error('Could not add selected add-ons.');

            if (window.WagmartCart && typeof window.WagmartCart.fetch === 'function') {
              await window.WagmartCart.fetch();
              if (typeof window.WagmartCart.openDrawer === 'function') {
                window.WagmartCart.openDrawer();
              }
            }

            await this.refreshCartCount();

            checked.forEach((cb) => {
              cb.checked = false;
            });
            if (bundleText) bundleText.textContent = 'Added to Cart ✓';
            setTimeout(() => {
              bundleBtn.disabled = false;
              syncBundleBtn();
            }, 1400);
          } catch (err) {
            bundleBtn.disabled = false;
            syncBundleBtn();
          }
        });
      }

      if (!buttons.length) return;

      buttons.forEach((btn) => {
        const actionWrap = btn.closest('.wm-cross-sell__action');
        const stepper = actionWrap ? actionWrap.querySelector('[data-cross-sell-stepper]') : null;
        const qtyValEl = stepper ? stepper.querySelector('[data-cross-sell-qty-val]') : null;
        const plusDeltaBtn = stepper ? stepper.querySelector('[data-cross-sell-qty-delta="1"]') : null;
        const variantId = btn.dataset.variantId;
        let maxQty = parseInt(btn.dataset.maxQty || stepper?.dataset.maxQty || actionWrap?.dataset.maxQty || '99', 10);
        if (isNaN(maxQty)) maxQty = 99;
        window.WagmartMaxStock = window.WagmartMaxStock || {};
        if (variantId) window.WagmartMaxStock[String(variantId)] = maxQty;

        const showAddonStepper = (qty) => {
          if (!stepper) return;
          const clampedQty = maxQty > 0 ? Math.min(maxQty, qty) : 0;
          if (plusDeltaBtn) {
            plusDeltaBtn.disabled = clampedQty >= maxQty;
          }
          if (clampedQty > 0) {
            btn.hidden = true;
            stepper.hidden = false;
            if (qtyValEl) qtyValEl.textContent = String(clampedQty);
          } else {
            stepper.hidden = true;
            btn.hidden = false;
            btn.disabled = maxQty <= 0;
            const textEl = btn.querySelector('[data-cross-sell-btn-text]') || btn;
            textEl.textContent = maxQty <= 0 ? 'Sold out' : (btn.dataset.textDefault || '+ Add');
          }
        };

        if (stepper) {
          stepper.querySelectorAll('[data-cross-sell-qty-delta]').forEach((deltaBtn) => {
            deltaBtn.addEventListener('click', () => {
              if (deltaBtn.disabled) return;
              const delta = parseInt(deltaBtn.getAttribute('data-cross-sell-qty-delta') || '0', 10);
              const currentQty = parseInt(qtyValEl?.textContent?.trim() || '1', 10) || 1;
              if (delta > 0 && currentQty >= maxQty) {
                deltaBtn.disabled = true;
                return;
              }
              const newQty = Math.min(maxQty, Math.max(0, currentQty + delta));

              showAddonStepper(newQty);

              if (!variantId) return;
              this.syncVariantQtyDebounced(variantId, newQty, currentQty, (revQty) => {
                maxQty = revQty;
                showAddonStepper(revQty);
              });
            });
          });
        }

        document.addEventListener('wagmart:cart-updated', (e) => {
          const cart = e.detail;
          if (!cart || !Array.isArray(cart.items) || !variantId || this.isVariantBusy(variantId)) return;
          const item = cart.items.find(
            (i) => String(i.id) === String(variantId) || String(i.variant_id) === String(variantId)
          );
          if (item && Number(item.quantity) > 0) {
            showAddonStepper(Number(item.quantity));
          } else if (stepper && !stepper.hidden) {
            showAddonStepper(0);
          }
        });

        btn.addEventListener('click', async () => {
          if (btn.disabled) return;
          if (!variantId) return;

          const key = String(variantId);
          this._inflightAdd = this._inflightAdd || {};
          this._pendingQty = this._pendingQty || {};
          this._pendingQty[key] = 1;

          // Immediately switch + Add button to - 1 + stepper and sync local cart state (0ms)
          showAddonStepper(1);
          const cardEl = btn.closest('.wm-cross-sell__item');
          const addonTitle = cardEl?.querySelector('.wm-cross-sell__title')?.textContent?.trim() || 'Add-on';
          const addonUrl = cardEl?.querySelector('.wm-cross-sell__title')?.getAttribute('href') || '/collections/all';
          const addonImg = cardEl?.querySelector('.wm-cross-sell__img')?.src || '';
          const addonPriceRaw = parseInt(
            cardEl?.querySelector('[data-addon-checkbox]')?.getAttribute('data-addon-price') || '29900',
            10
          ) || 29900;
          this.optimisticUpsertCartItem(key, 1, {
            title: addonTitle,
            url: addonUrl,
            image: addonImg,
            price: addonPriceRaw,
            max_stock: maxQty,
          });

          const addReq = (async () => {
            const response = await fetch('/cart/add.js', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                id: variantId,
                quantity: 1,
                sections: ['header'],
              }),
            });

            if (!response.ok) {
              throw new Error('Could not add item to cart.');
            }
            return response.json().catch(() => ({}));
          })();

          this._inflightAdd[key] = addReq;

          try {
            await addReq;
            delete this._inflightAdd[key];
            if (!this.isVariantBusy(key)) {
              if (window.WagmartCart && typeof window.WagmartCart.fetch === 'function') {
                await window.WagmartCart.fetch();
              } else {
                await this.refreshCartCount();
              }
            }
          } catch (err) {
            delete this._inflightAdd[key];
            showAddonStepper(0);
          }
        });
      });
    }

    initWishlist() {
      const btn = this.querySelector('[data-pdp-wishlist]');
      if (!btn) return;
      const prodId = String(btn.dataset.productId || this.dataset.productId || 'pet-grooming-glove');

      const syncState = () => {
        try {
          const list = JSON.parse(localStorage.getItem('wagmart_wishlist') || '[]');
          const active = list.some((item) => String(item.id) === prodId);
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-pressed', String(active));
        } catch (e) {}
      };

      syncState();
      btn.addEventListener('click', () => {
        try {
          const list = JSON.parse(localStorage.getItem('wagmart_wishlist') || '[]');
          const idx = list.findIndex((item) => String(item.id) === prodId);
          if (idx > -1) {
            list.splice(idx, 1);
          } else {
            list.push({
              id: prodId,
              name: this.querySelector('.wm-buy-box__title')?.textContent?.trim() || 'Pet Grooming Glove',
              image: this.querySelector('.wm-gallery__img')?.src || '',
            });
          }
          localStorage.setItem('wagmart_wishlist', JSON.stringify(list));
          syncState();
        } catch (e) {}
      });
    }

    initReviewAnchor() {
      const anchor = this.querySelector('[data-review-anchor]');
      if (anchor) {
        anchor.addEventListener('click', (e) => {
          e.preventDefault();
          const reviewsTabBtn = document.querySelector('[data-tab-trigger="reviews"]');
          if (reviewsTabBtn) reviewsTabBtn.click();
          const target = document.getElementById('product-tabs-reviews');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      const descAnchor = this.querySelector('[data-description-anchor]');
      if (descAnchor) {
        descAnchor.addEventListener('click', (e) => {
          e.preventDefault();
          const descTabBtn = document.querySelector('[data-tab-trigger="description"]');
          if (descTabBtn) descTabBtn.click();
          const target =
            document.querySelector('[data-product-tabs]') ||
            document.querySelector('[data-tab-panel="description"]');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }

    initStickyBar() {
      const stickyBar = this.querySelector('[data-sticky-bar]');
      const ctaAnchor =
        this.querySelector('.wm-pdp-form__cta-grid') ||
        this.querySelector('[data-product-form]') ||
        this.querySelector('[data-atc-button]');
      const stickyTrigger = this.querySelector('[data-sticky-atc-trigger]');
      const stickyStepper = this.querySelector('[data-sticky-atc-stepper]');
      const stickyQtyVal = this.querySelector('[data-sticky-atc-qty]');
      const form = this.querySelector('[data-product-form]');
      if (!stickyBar || !ctaAnchor || !('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const passedBelow = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            stickyBar.classList.toggle('is-visible', passedBelow);
            stickyBar.setAttribute('aria-hidden', String(!passedBelow));
          });
        },
        { threshold: 0 }
      );

      observer.observe(ctaAnchor);

      if (stickyTrigger) {
        stickyTrigger.addEventListener('click', () => {
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        });
      }

      if (stickyStepper) {
        stickyStepper.querySelectorAll('[data-sticky-atc-delta]').forEach((deltaBtn) => {
          deltaBtn.addEventListener('click', () => {
            if (deltaBtn.disabled) return;
            const delta = parseInt(deltaBtn.getAttribute('data-sticky-atc-delta') || '0', 10);
            const currentQty = parseInt(stickyQtyVal?.textContent?.trim() || '1', 10) || 1;
            const variantId = this.querySelector('[data-variant-id-input]')?.value;
            const maxQty = this.getMaxVariantQty(variantId);

            if (delta > 0 && currentQty >= maxQty) {
              deltaBtn.disabled = true;
              return;
            }

            const newQty = Math.min(maxQty, Math.max(0, currentQty + delta));

            if (typeof this.showAtcStepper === 'function') {
              this.showAtcStepper(newQty);
            }

            if (!variantId) return;
            this.syncVariantQtyDebounced(variantId, newQty, currentQty, (revQty) => {
              if (typeof this.showAtcStepper === 'function') {
                this.showAtcStepper(revQty);
              }
            });
          });
        });
      }
    }
  }

  if (!customElements.get('product-page')) {
    customElements.define('product-page', ProductPage);
  }

  /* ==========================================================================
     2. <pincode-checker> CUSTOM ELEMENT (6-Digit Indian Pincode & Serviceability)
     ========================================================================== */
  class PincodeChecker extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('[data-pincode-input]');
      this.submitBtn = this.querySelector('[data-pincode-submit]');
      this.btnText = this.querySelector('[data-pincode-btn-text]');
      this.spinner = this.querySelector('[data-pincode-spinner]');
      this.statusEl = this.querySelector('[data-pincode-status]');

      if (!this.input || !this.submitBtn || !this.statusEl) return;

      this.input.addEventListener('input', () => {
        this.input.value = this.input.value.replace(/\D/g, '').slice(0, 6);
      });

      this.submitBtn.addEventListener('click', () => this.checkPincode(this.input.value.trim()));
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.checkPincode(this.input.value.trim());
        }
      });

      try {
        const saved = localStorage.getItem('wagmart_pincode');
        if (saved && /^[1-9][0-9]{5}$/.test(saved)) {
          this.input.value = saved;
          this.checkPincode(saved, false);
        }
      } catch (e) {}
    }

    async checkPincode(pin, showLoading = true) {
      if (!/^[1-9][0-9]{5}$/.test(pin)) {
        this.renderStatus('error', this.dataset.msgInvalid || 'Please enter a valid 6-digit Indian pincode.');
        return;
      }

      if (showLoading) {
        this.submitBtn.disabled = true;
        if (this.spinner) this.spinner.hidden = false;
        if (this.btnText) this.btnText.hidden = true;
      }

      const endpoint = (this.dataset.endpoint || '').trim();
      let days = parseInt(this.dataset.leadDays || '3', 10);
      let codAvailable = this.dataset.codEnabled !== 'false';
      let serviceable = true;

      if (endpoint) {
        try {
          const url = new URL(endpoint, window.location.origin);
          url.searchParams.set('pincode', pin);
          const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
          if (res.ok) {
            const payload = await res.json();
            serviceable = payload.serviceable !== false;
            if (payload.estimated_days) days = Number(payload.estimated_days);
            if (typeof payload.cod === 'boolean') codAvailable = payload.cod;
          }
        } catch (err) {
          // Fallback to postal zone calculation below
        }
      } else {
        // Indian Postal Zone heuristic (11/40/56/60/70/50 metro prefixes: 2-3 days; other zones: 4 days)
        const prefix2 = pin.slice(0, 2);
        const metroPrefixes = ['11', '12', '20', '40', '41', '50', '56', '60', '70', '38'];
        days = metroPrefixes.includes(prefix2) ? Math.max(2, days) : days + 1;
      }

      this.submitBtn.disabled = false;
      if (this.spinner) this.spinner.hidden = true;
      if (this.btnText) this.btnText.hidden = false;

      if (!serviceable) {
        this.renderStatus('error', this.dataset.msgUnserviceable || 'Delivery is unavailable for this pincode.');
        return;
      }

      try {
        localStorage.setItem('wagmart_pincode', pin);
      } catch (e) {}

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dateStr = targetDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      const prefixText = this.dataset.msgDeliveryPrefix || 'Estimated delivery by';
      const paymentNote = codAvailable
        ? this.dataset.msgCodAvailable || 'Free shipping · Cash on Delivery (COD) & UPI available'
        : this.dataset.msgPrepaidOnly || 'Free shipping · UPI & Card checkout available';

      this.renderStatus(
        'success',
        `<strong>${escapeHTML(prefixText)} ${escapeHTML(dateStr)} (PIN ${escapeHTML(pin)})</strong><br><span>${escapeHTML(paymentNote)}</span>`
      );
    }

    renderStatus(type, htmlContent) {
      this.statusEl.hidden = false;
      this.statusEl.className = `wm-pincode__status wm-pincode__status--${type}`;
      this.statusEl.innerHTML = htmlContent;
    }
  }

  if (!customElements.get('pincode-checker')) {
    customElements.define('pincode-checker', PincodeChecker);
  }

  /* ==========================================================================
     3. <product-recommendations> CUSTOM ELEMENT (Lazy Fetch + Horizontal Scroll)
     ========================================================================== */
  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      this.bindCarouselControls();
      const url = this.dataset.url;
      if (!url || !url.includes('product_id=')) return;

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
          (entries, obs) => {
            if (!entries[0].isIntersecting) return;
            obs.unobserve(this);
            this.fetchRecommendations(url);
          },
          { rootMargin: '0px 0px 240px 0px' }
        );
        observer.observe(this);
      } else {
        this.fetchRecommendations(url);
      }
    }

    async fetchRecommendations(url) {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const incoming = doc.querySelector('product-recommendations');
        const incomingSlides = incoming ? incoming.querySelectorAll('.wm-recommendations__slide') : [];
        if (
          incoming &&
          incomingSlides.length > 0 &&
          incoming.dataset.recommendationsPerformed === 'true'
        ) {
          const track = this.querySelector('[data-carousel-track]');
          const newTrack = incoming.querySelector('[data-carousel-track]');
          if (track && newTrack) {
            track.innerHTML = newTrack.innerHTML;
            this.bindQuickAddButtons();
          }
        }
      } catch (e) {
        // Keep server-rendered collection fallback
      }
      this.bindQuickAddButtons();
    }

    bindCarouselControls() {
      const track = this.querySelector('[data-carousel-track]');
      const prevBtn = this.querySelector('[data-carousel-prev]');
      const nextBtn = this.querySelector('[data-carousel-next]');
      if (!track) return;

      const scrollStep = () => {
        const slide = track.querySelector('.wm-recommendations__slide');
        return slide ? slide.getBoundingClientRect().width + 24 : 300;
      };

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          track.scrollBy({ left: -scrollStep(), behavior: 'smooth' });
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          track.scrollBy({ left: scrollStep(), behavior: 'smooth' });
        });
      }
      this.bindQuickAddButtons();
    }

    bindQuickAddButtons() {
      this.querySelectorAll('[data-quick-add-btn]').forEach((btn) => {
        if (btn.dataset.bound === 'true') return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const variantId = btn.dataset.variantId;
          const labelEl = btn.querySelector('[data-quick-add-text]');
          const originalText = labelEl ? labelEl.textContent : 'Add to Cart';
          btn.disabled = true;
          if (labelEl) labelEl.textContent = 'Adding...';
          try {
            await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ id: variantId, quantity: 1 }),
            });
            if (labelEl) labelEl.textContent = 'Added';
          } catch (err) {
            if (labelEl) labelEl.textContent = originalText;
          }
          setTimeout(() => {
            btn.disabled = false;
            if (labelEl) labelEl.textContent = originalText;
          }, 1400);
        });
      });
    }
  }

  if (!customElements.get('product-recommendations')) {
    customElements.define('product-recommendations', ProductRecommendations);
  }

  /* ==========================================================================
     4. BREED GUIDE SEGMENTED FILTER & ACCESSIBLE TABS + REVIEWS
     ========================================================================== */
  function initBreedGuideFilter() {
    document.querySelectorAll('[data-breed-guide-section]').forEach((section) => {
      const buttons = Array.from(section.querySelectorAll('[data-breed-filter]'));
      const rows = Array.from(section.querySelectorAll('[data-breed-row]'));
      if (!buttons.length || !rows.length) return;

      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.breedFilter;
          buttons.forEach((b) => {
            const active = b === btn;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', String(active));
          });
          rows.forEach((row) => {
            row.hidden = target !== 'all' && row.dataset.breedRow !== target;
          });
        });
      });
    });
  }

  function initProductTabsAndReviews() {
    document.querySelectorAll('[data-product-tabs]').forEach((tabsSection) => {
      const tabs = Array.from(tabsSection.querySelectorAll('[data-tab-trigger]'));
      const panels = Array.from(tabsSection.querySelectorAll('[data-tab-panel]'));

      const activateTab = (targetKey, focusTab = false) => {
        tabs.forEach((tab) => {
          const isMatch = tab.dataset.tabTrigger === targetKey;
          tab.classList.toggle('is-active', isMatch);
          tab.setAttribute('aria-selected', String(isMatch));
          tab.setAttribute('tabindex', isMatch ? '0' : '-1');
          if (isMatch && focusTab) tab.focus();
        });

        panels.forEach((panel) => {
          const isMatch = panel.dataset.tabPanel === targetKey;
          panel.classList.toggle('is-active', isMatch);
          panel.hidden = !isMatch;
        });
      };

      tabs.forEach((tab, idx) => {
        tab.addEventListener('click', () => activateTab(tab.dataset.tabTrigger, false));
        tab.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = tabs[(idx + 1) % tabs.length];
            activateTab(next.dataset.tabTrigger, true);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
            activateTab(prev.dataset.tabTrigger, true);
          } else if (e.key === 'Home') {
            e.preventDefault();
            activateTab(tabs[0].dataset.tabTrigger, true);
          } else if (e.key === 'End') {
            e.preventDefault();
            activateTab(tabs[tabs.length - 1].dataset.tabTrigger, true);
          }
        });
      });

      // Single-source-of-truth Reviews Controller (Exact Match to Shopify Reference Screenshots)
      const handle = tabsSection.dataset.productHandle || 'product';
      const storageKey = `wagmart_verified_reviews_${handle}`;
      const serverCount = parseInt(tabsSection.dataset.serverCount || '0', 10) || 0;
      const serverRating = parseFloat(tabsSection.dataset.serverRating || '0') || 0;

      // DOM Elements
      const modalEl = tabsSection.querySelector('[data-review-modal]');
      const modalTitleEl = tabsSection.querySelector('[data-review-modal-title]');
      const modalOpenBtns = tabsSection.querySelectorAll('[data-review-modal-trigger]');
      const modalCloseBtns = tabsSection.querySelectorAll('[data-review-modal-close]');
      const reviewForm = tabsSection.querySelector('[data-review-form]');
      const formErrorEl = tabsSection.querySelector('[data-review-form-error]');
      const editingIdInput = reviewForm ? reviewForm.querySelector('[data-review-editing-id]') : null;
      const statusBannerEl = tabsSection.querySelector('[data-review-status-banner]');
      let statusBannerTimeout = null;
      const submitBtn = tabsSection.querySelector('[data-review-submit-btn]');
      const submitTextEl = tabsSection.querySelector('[data-review-submit-text]');
      const starPicker = tabsSection.querySelector('[data-star-picker]');
      const starInput = tabsSection.querySelector('[data-star-input]');
      const starCaption = tabsSection.querySelector('[data-star-rating-text]');
      const emptyState = tabsSection.querySelector('[data-reviews-empty-state]');
      const reviewsList = tabsSection.querySelector('[data-reviews-list]');
      const loadMoreWrap = tabsSection.querySelector('[data-reviews-load-more-wrap]');
      const loadMoreBtn = tabsSection.querySelector('[data-reviews-load-more]');
      const avgScoreEl = tabsSection.querySelector('[data-reviews-avg]');
      const starsWrapEl = tabsSection.querySelector('[data-reviews-stars]');
      const headingCountEl = tabsSection.querySelector('[data-reviews-heading-count]');
      const tabBadgeEl = tabsSection.querySelector('[data-reviews-tab-badge]');
      const heroCountEl = document.querySelector('[data-pdp-rating-count]');
      const heroScoreEl = document.querySelector('.wm-rating-link__score');
      const filterFeedbackEl = tabsSection.querySelector('[data-reviews-filter-feedback]');
      const filterFeedbackText = tabsSection.querySelector('[data-reviews-filter-feedback-text]');
      const clearFilterBtn = tabsSection.querySelector('[data-reviews-clear-filter]');

      // Refine Popover Elements (Screenshot 2)
      const refineWrap = tabsSection.querySelector('[data-refine-dropdown-wrap]');
      const refineToggleBtn = tabsSection.querySelector('[data-refine-toggle-btn]');
      const refinePopover = tabsSection.querySelector('[data-refine-popover]');
      const refineCheckboxes = tabsSection.querySelectorAll('[data-refine-checkbox]');
      const refineApplyBtn = tabsSection.querySelector('[data-refine-apply-btn]');

      // Sort Popover Elements
      const sortWrap = tabsSection.querySelector('[data-sort-dropdown-wrap]');
      const sortToggleBtn = tabsSection.querySelector('[data-sort-toggle-btn]');
      const sortPopover = tabsSection.querySelector('[data-sort-popover]');
      const sortRadios = tabsSection.querySelectorAll('[data-sort-radio]');

      // Mobile Popover Backdrop & Close Buttons
      const popoverBackdrop = tabsSection.querySelector('[data-reviews-popover-backdrop]');
      const popoverCloseBtns = tabsSection.querySelectorAll('[data-reviews-popover-close]');

      // State Management
      let selectedFilterStars = []; // Array of star numbers e.g. [5] or [1, 2]
      let currentSortOption = 'recent'; // 'recent' | 'highest' | 'lowest' | 'oldest'
      let visibleLimit = 5;
      const expandedReviewIds = new Set();

      // Real Customer Reviews (No dummy/seed reviews - configured via Shopify Admin or submitted on store)
      // 1. Fetch real customer reviews configured in Shopify Admin (Section Blocks)
      const getAdminReviews = () => {
        const adminScript = tabsSection.querySelector('script[data-admin-reviews]');
        if (!adminScript) return [];
        try {
          const parsed = JSON.parse(adminScript.textContent || '[]');
          if (Array.isArray(parsed)) {
            return parsed.filter((r) => r && (r.author || r.title || r.body));
          }
        } catch (e) {}
        return [];
      };

      // 2. Fetch real reviews from Shopify Product Metafields (if populated in Shopify Admin)
      const getMetafieldReviews = () => {
        const metaScript = tabsSection.querySelector('script[data-metafield-reviews]');
        if (!metaScript) return [];
        try {
          const parsed = JSON.parse(metaScript.textContent || '[]');
          if (Array.isArray(parsed)) {
            return parsed.filter((r) => r && (r.author || r.title || r.body));
          }
        } catch (e) {}
        return [];
      };

      const escapeHTML = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      // In-memory fallback cache for customer reviews submitted in this session
      let inMemoryCustomerReviews = null;

      // 3. Fetch real customer-submitted reviews from store
      const getCustomerReviews = () => {
        if (inMemoryCustomerReviews && Array.isArray(inMemoryCustomerReviews)) {
          return [...inMemoryCustomerReviews];
        }
        try {
          const raw = localStorage.getItem(storageKey);
          if (!raw) {
            inMemoryCustomerReviews = [];
            return [];
          }
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Strip any legacy dummy reviews if previously cached in the browser
            const realReviews = parsed.filter((r) => r && !String(r.id || '').startsWith('seed_rev_'));
            inMemoryCustomerReviews = [...realReviews];
            return realReviews;
          }
          inMemoryCustomerReviews = [];
          return [];
        } catch (e) {
          return inMemoryCustomerReviews || [];
        }
      };

      const saveCustomerReview = (newReview) => {
        const list = getCustomerReviews();
        list.unshift(newReview);
        inMemoryCustomerReviews = [...list];
        try {
          localStorage.setItem(storageKey, JSON.stringify(list));
        } catch (e) {}
      };

      // 4. Combined real reviews source: Customer Submissions + Shopify Admin Blocks + Metafields
      const getAllReviews = () => {
        const customerList = getCustomerReviews();
        const adminList = getAdminReviews();
        const metaList = getMetafieldReviews();

        const seenIds = new Set();
        const merged = [];

        [...customerList, ...adminList, ...metaList].forEach((rev) => {
          if (!rev || (!rev.author && !rev.title && !rev.body)) return;
          // Ensure dummy reviews are never included
          if (String(rev.id || '').startsWith('seed_rev_')) return;

          const uid = String(rev.id || (rev.author + '_' + rev.title + '_' + rev.rating));
          if (!seenIds.has(uid)) {
            seenIds.add(uid);
            merged.push({
              ...rev,
              id: uid,
              rating: Math.min(5, Math.max(1, Number(rev.rating) || 5)),
              timestamp: Number(rev.timestamp) || (rev.date ? new Date(rev.date).getTime() : 0) || Date.now()
            });
          }
        });

        return merged;
      };

      const renderStarsHTML = (ratingValue) => {
        const val = Number(ratingValue) || 5;
        const half = Math.min(5, Math.max(0, Math.round(val * 2) / 2));
        let html = '';
        for (let i = 1; i <= 5; i++) {
          if (half >= i) {
            html += '<span class="wm-reviews__star-symbol is-filled" aria-hidden="true">★</span>';
          } else if (half >= i - 0.5) {
            html += '<span class="wm-reviews__star-symbol is-half" aria-hidden="true">★</span>';
          } else {
            html += '<span class="wm-reviews__star-symbol is-empty" aria-hidden="true">★</span>';
          }
        }
        return html;
      };

      const setStarValue = (val) => {
        if (!starPicker || !starInput) return;
        const clamped = Math.min(5, Math.max(1, Number(val) || 5));
        starInput.value = String(clamped);
        if (starCaption) {
          starCaption.textContent = `${clamped} out of 5 stars`;
        }
        const starBtns = Array.from(starPicker.querySelectorAll('[data-star-value]'));
        starBtns.forEach((b) => {
          const bVal = Number(b.dataset.starValue);
          const isSelected = bVal <= clamped;
          b.classList.toggle('is-selected', isSelected);
          b.setAttribute('aria-checked', String(bVal === clamped));
          const starIcon = b.querySelector('.wm-star-picker__star-icon');
          if (starIcon) {
            starIcon.style.fill = isSelected ? '#FFA41C' : '#D1D5DB';
          }
        });
      };

      const resetForm = () => {
        if (editingIdInput) editingIdInput.value = '';
        if (modalTitleEl) modalTitleEl.textContent = 'Write a review';
        if (submitTextEl) submitTextEl.textContent = 'Submit Review';
        if (formErrorEl) formErrorEl.hidden = true;
        if (reviewForm) {
          reviewForm.reset();
          reviewForm.querySelectorAll('.has-error').forEach((el) => {
            el.classList.remove('has-error');
            el.removeAttribute('aria-invalid');
          });
          reviewForm.querySelectorAll('[data-field-error]').forEach((el) => {
            el.hidden = true;
          });
        }
        setStarValue(5);
      };

      const openModal = () => {
        if (!modalEl) return;
        resetForm();
        modalEl.hidden = false;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('is-reviews-popover-open');
        const firstInput = modalEl.querySelector('input[name="author"]') || modalEl.querySelector('input[name="first_name"]');
        if (firstInput) setTimeout(() => firstInput.focus(), 80);
      };

      const closeModal = () => {
        if (!modalEl) return;
        modalEl.hidden = true;
        document.body.style.overflow = '';
        document.body.classList.remove('is-reviews-popover-open');
      };

      // Popover Management Helpers (Mobile Sheet & Desktop Dropdown)
      const openPopover = (popover, toggleBtn, otherPopover, otherBtn) => {
        if (!popover) return;
        if (otherPopover) {
          otherPopover.hidden = true;
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
        popover.hidden = false;
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
        if (popoverBackdrop) popoverBackdrop.hidden = false;
        document.body.classList.add('is-reviews-popover-open');
      };

      const closeAllPopovers = () => {
        if (refinePopover) refinePopover.hidden = true;
        if (sortPopover) sortPopover.hidden = true;
        if (refineToggleBtn) refineToggleBtn.setAttribute('aria-expanded', 'false');
        if (sortToggleBtn) sortToggleBtn.setAttribute('aria-expanded', 'false');
        if (popoverBackdrop) popoverBackdrop.hidden = true;
        document.body.classList.remove('is-reviews-popover-open');
      };

      // Close popovers on click outside or on backdrop
      document.addEventListener('click', (e) => {
        const isBackdrop = popoverBackdrop && e.target === popoverBackdrop;
        if (isBackdrop) {
          closeAllPopovers();
          return;
        }

        const insideRefine = refineWrap && refineWrap.contains(e.target);
        const insideSort = sortWrap && sortWrap.contains(e.target);

        if (!insideRefine && refinePopover && !refinePopover.hidden) {
          refinePopover.hidden = true;
          if (refineToggleBtn) refineToggleBtn.setAttribute('aria-expanded', 'false');
        }
        if (!insideSort && sortPopover && !sortPopover.hidden) {
          sortPopover.hidden = true;
          if (sortToggleBtn) sortToggleBtn.setAttribute('aria-expanded', 'false');
        }

        if ((!refinePopover || refinePopover.hidden) && (!sortPopover || sortPopover.hidden)) {
          if (popoverBackdrop) popoverBackdrop.hidden = true;
          document.body.classList.remove('is-reviews-popover-open');
        }
      });

      // Escape key handler for modal & popovers
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (modalEl && !modalEl.hidden) {
            closeModal();
          }
          closeAllPopovers();
        }
      });

      // Close buttons inside popovers
      popoverCloseBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllPopovers();
        });
      });

      // Refine Toggle Button Handler
      if (refineToggleBtn && refinePopover) {
        refineToggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (refinePopover.hidden) {
            openPopover(refinePopover, refineToggleBtn, sortPopover, sortToggleBtn);
          } else {
            closeAllPopovers();
          }
        });
      }

      // Sort Toggle Button Handler
      if (sortToggleBtn && sortPopover) {
        sortToggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (sortPopover.hidden) {
            openPopover(sortPopover, sortToggleBtn, refinePopover, refineToggleBtn);
          } else {
            closeAllPopovers();
          }
        });
      }

      // Refine Apply Button Handler (Screenshot 2)
      if (refineApplyBtn) {
        refineApplyBtn.addEventListener('click', () => {
          const checkedValues = [];
          refineCheckboxes.forEach((cb) => {
            if (cb.checked) {
              checkedValues.push(Number(cb.value));
            }
          });
          selectedFilterStars = checkedValues;
          closeAllPopovers();
          visibleLimit = 5;
          renderReviews();
        });
      }

      // Sort Radio Options Handler
      sortRadios.forEach((radio) => {
        radio.addEventListener('change', () => {
          currentSortOption = radio.value;
          closeAllPopovers();
          renderReviews();
        });
      });

      // Clear filter button
      if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
          selectedFilterStars = [];
          refineCheckboxes.forEach((cb) => (cb.checked = false));
          renderReviews();
        });
      }

      // Main Render Function
      const renderReviews = () => {
        const allReviews = getAllReviews();
        const totalCount = allReviews.length;

        // 1. Calculate overall average rating and star counts
        const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalRatingSum = 0;

        allReviews.forEach((r) => {
          const s = Math.min(5, Math.max(1, Number(r.rating) || 5));
          starCounts[s] = (starCounts[s] || 0) + 1;
          totalRatingSum += s;
        });

        // Round strictly to 0.5 increments: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
        const rawAvg = totalCount > 0 ? totalRatingSum / totalCount : 0;
        const halfScore = Math.min(5, Math.max(0, Math.round(rawAvg * 2) / 2));
        const formattedScore = totalCount > 0
          ? (halfScore % 1 === 0 ? String(halfScore) : halfScore.toFixed(1))
          : '0';

        // 2. Update Header Count & Badges
        const formattedTotal = totalCount.toLocaleString();
        if (headingCountEl) headingCountEl.textContent = `(${formattedTotal})`;
        if (tabBadgeEl) tabBadgeEl.textContent = `(${formattedTotal})`;
        if (heroCountEl) heroCountEl.textContent = `(${formattedTotal} reviews)`;
        if (heroScoreEl && totalCount > 0) heroScoreEl.textContent = formattedScore;

        // 3. Update Big Score & Header Stars (Half-star support)
        if (avgScoreEl) avgScoreEl.textContent = formattedScore;
        if (starsWrapEl) {
          const starSpans = starsWrapEl.querySelectorAll('.wm-reviews__star-symbol');
          starSpans.forEach((span, idx) => {
            span.classList.remove('is-filled', 'is-half', 'is-empty');
            const starNum = idx + 1;
            if (totalCount > 0 && halfScore >= starNum) {
              span.classList.add('is-filled');
            } else if (totalCount > 0 && halfScore >= starNum - 0.5) {
              span.classList.add('is-half');
            } else {
              span.classList.add('is-empty');
            }
          });
          starsWrapEl.setAttribute('aria-label', `${formattedScore} out of 5 stars`);
        }

        // 4. Update 5-to-1 Distribution Bars
        for (let s = 1; s <= 5; s++) {
          const count = starCounts[s] || 0;
          const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          const fill = tabsSection.querySelector(`[data-star-bar-fill="${s}"]`);
          const countBtn = tabsSection.querySelector(`[data-star-bar-count="${s}"]`);
          const refineCount = tabsSection.querySelector(`[data-refine-star-count="${s}"]`);

          if (fill) fill.style.width = `${pct}%`;
          if (countBtn) countBtn.textContent = count > 999 ? (count / 1000).toFixed(1) + 'K' : String(count);
          if (refineCount) refineCount.textContent = `(${count})`;
        }

        // 5. Filter reviews
        let filtered = [...allReviews];
        if (selectedFilterStars.length > 0) {
          filtered = filtered.filter((r) => selectedFilterStars.includes(Number(r.rating) || 5));
        }

        // Update filter feedback banner
        if (filterFeedbackEl && filterFeedbackText) {
          if (selectedFilterStars.length > 0) {
            const starText = selectedFilterStars.sort((a, b) => b - a).map((s) => `${s}★`).join(', ');
            filterFeedbackText.textContent = `Filtered by ${starText} (${filtered.length} review${filtered.length === 1 ? '' : 's'})`;
            filterFeedbackEl.hidden = false;
          } else {
            filterFeedbackEl.hidden = true;
          }
        }

        // 6. Sort reviews
        if (currentSortOption === 'highest') {
          filtered.sort((a, b) => (Number(b.rating) || 5) - (Number(a.rating) || 5));
        } else if (currentSortOption === 'lowest') {
          filtered.sort((a, b) => (Number(a.rating) || 5) - (Number(b.rating) || 5));
        } else if (currentSortOption === 'oldest') {
          filtered.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
        } else {
          // 'recent' by default
          filtered.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
        }

        // 7. Render Empty State or List
        if (filtered.length === 0) {
          if (reviewsList) reviewsList.innerHTML = '';
          if (emptyState) emptyState.hidden = false;
          if (loadMoreWrap) loadMoreWrap.hidden = true;
          return;
        }

        if (emptyState) emptyState.hidden = true;

        // 8. Render Review Cards
        const paged = filtered.slice(0, visibleLimit);
        if (reviewsList) {
          reviewsList.innerHTML = paged
            .map((rev) => {
              const isLong = (rev.body || '').length > 200;
              const isExpanded = expandedReviewIds.has(String(rev.id));
              const displayBody = isLong && !isExpanded
                ? rev.body.slice(0, 200).trim() + ' ...'
                : rev.body;

              return `
                <article class="wm-review-item" data-review-id="${escapeHTML(rev.id)}">
                  <div class="wm-review-item__reviewer-col">
                    <span class="wm-review-item__name">${escapeHTML(rev.author || 'Verified Customer')}</span>
                    ${rev.pet ? `<span class="wm-review-item__meta">${escapeHTML(rev.pet)}</span>` : '<span class="wm-review-item__meta">Verified Buyer</span>'}
                  </div>
                  <div class="wm-review-item__content-col">
                    <div class="wm-review-item__meta-row">
                      <span class="wm-review-item__stars" aria-label="${escapeHTML(rev.rating)} out of 5 stars">
                        ${renderStarsHTML(rev.rating)}
                      </span>
                      <span class="wm-review-item__date">${escapeHTML(rev.date || 'Recent')}</span>
                    </div>
                    ${rev.title ? `<h4 class="wm-review-item__headline">${escapeHTML(rev.title)}</h4>` : ''}
                    <p class="wm-review-item__body">${escapeHTML(displayBody)}</p>
                    ${
                      isLong
                        ? `<button type="button" class="wm-review-item__show-more" data-show-more-toggle="${escapeHTML(rev.id)}">
                            ${isExpanded ? 'Show less' : 'Show more'}
                          </button>`
                        : ''
                    }
                  </div>
                </article>
              `;
            })
            .join('');
        }

        // 9. Load More Button visibility
        if (loadMoreWrap) {
          loadMoreWrap.hidden = filtered.length <= visibleLimit;
        }
      };

      // Review List Event Delegation: Show more / Show less toggle
      if (reviewsList) {
        reviewsList.addEventListener('click', (e) => {
          const showMoreBtn = e.target.closest('[data-show-more-toggle]');
          if (!showMoreBtn) return;
          const revId = showMoreBtn.dataset.showMoreToggle;
          if (!revId) return;

          if (expandedReviewIds.has(revId)) {
            expandedReviewIds.delete(revId);
          } else {
            expandedReviewIds.add(revId);
          }
          renderReviews();
        });
      }

      // Bar count click to filter by that star rating
      for (let s = 1; s <= 5; s++) {
        const countBtn = tabsSection.querySelector(`[data-star-bar-count="${s}"]`);
        if (countBtn) {
          countBtn.addEventListener('click', () => {
            if (selectedFilterStars.includes(s) && selectedFilterStars.length === 1) {
              selectedFilterStars = [];
            } else {
              selectedFilterStars = [s];
            }
            refineCheckboxes.forEach((cb) => {
              cb.checked = selectedFilterStars.includes(Number(cb.value));
            });
            visibleLimit = 5;
            renderReviews();
          });
        }
      }

      // Load More Reviews Handler
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
          visibleLimit += 5;
          renderReviews();
        });
      }

      // Modal Open Triggers
      modalOpenBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          if (statusBannerTimeout) {
            clearTimeout(statusBannerTimeout);
            statusBannerTimeout = null;
          }
          if (statusBannerEl) statusBannerEl.hidden = true;
          openModal();
        });
      });

      // Modal Close Triggers (backdrop, close X, cancel button)
      modalCloseBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          closeModal();
        });
      });

      // Star Picker Inside Modal
      if (starPicker && starInput) {
        const starBtns = Array.from(starPicker.querySelectorAll('[data-star-value]'));
        starBtns.forEach((btn, idx) => {
          btn.addEventListener('click', () => setStarValue(btn.dataset.starValue));
          btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              const nextIdx = Math.min(starBtns.length - 1, idx + 1);
              setStarValue(starBtns[nextIdx].dataset.starValue);
              starBtns[nextIdx].focus();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              const prevIdx = Math.max(0, idx - 1);
              setStarValue(starBtns[prevIdx].dataset.starValue);
              starBtns[prevIdx].focus();
            }
          });
        });
      }

      // Review Form Submission Handler & Real-Time Inline Validation (Reference Image 2)
      if (reviewForm) {
        // Clear field validation error in real time as the user types
        reviewForm.addEventListener('input', (e) => {
          const target = e.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            const name = target.getAttribute('name');
            const val = target.value.trim();
            if (name === 'email') {
              const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
              if (isValidEmail) {
                target.classList.remove('has-error');
                target.removeAttribute('aria-invalid');
                const err = reviewForm.querySelector('[data-field-error="email"]');
                if (err) err.hidden = true;
              }
            } else if (val) {
              target.classList.remove('has-error');
              target.removeAttribute('aria-invalid');
              if (name) {
                const err = reviewForm.querySelector(`[data-field-error="${name}"]`);
                if (err) err.hidden = true;
              }
            }
          }
        });

        reviewForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (submitBtn && submitBtn.disabled) return;

          const fd = new FormData(reviewForm);
          const author = String(fd.get('author') || [fd.get('first_name'), fd.get('last_name')].filter(Boolean).join(' ') || '').trim();
          const email = String(fd.get('email') || '').trim();
          const title = String(fd.get('title') || '').trim();
          const body = String(fd.get('body') || '').trim();
          const rating = Number(fd.get('rating')) || 5;

          const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

          const fieldsToValidate = [
            { name: 'author', val: author, el: reviewForm.querySelector('[name="author"]') || reviewForm.querySelector('[name="first_name"]') },
            { name: 'email', val: isEmailValid, el: reviewForm.querySelector('[name="email"]') },
            { name: 'title', val: title, el: reviewForm.querySelector('[name="title"]') },
            { name: 'body', val: body, el: reviewForm.querySelector('[name="body"]') }
          ];

          let hasError = false;
          let firstInvalidEl = null;

          fieldsToValidate.forEach((field) => {
            const errSpan = reviewForm.querySelector(`[data-field-error="${field.name}"]`);
            if (!field.val) {
              hasError = true;
              if (field.el) {
                field.el.classList.add('has-error');
                field.el.setAttribute('aria-invalid', 'true');
                if (!firstInvalidEl) firstInvalidEl = field.el;
              }
              if (errSpan) errSpan.hidden = false;
            } else {
              if (field.el) {
                field.el.classList.remove('has-error');
                field.el.removeAttribute('aria-invalid');
              }
              if (errSpan) errSpan.hidden = true;
            }
          });

          if (hasError) {
            if (firstInvalidEl) firstInvalidEl.focus();
            return;
          }

          if (formErrorEl) formErrorEl.hidden = true;
          if (submitBtn) submitBtn.disabled = true;
          if (submitTextEl) submitTextEl.textContent = 'Submitting...';

          const now = new Date();
          const formattedDate = now.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });

          const newReview = {
            id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            author,
            pet: '',
            title,
            body,
            rating,
            date: formattedDate,
            timestamp: Date.now()
          };

          // 1. Post to Judge.me Public Review API via urlencoded payload (bypasses CORS preflight)
          const productId = tabsSection.dataset.productId || '';
          const shopDomain = tabsSection.dataset.shopDomain || (window.Shopify && window.Shopify.shop) || 'gk2scz-zu.myshopify.com';

          try {
            const jParams = new URLSearchParams();
            jParams.append('shop_domain', shopDomain);
            jParams.append('platform', 'shopify');
            jParams.append('id', String(productId));
            jParams.append('name', author);
            jParams.append('email', email);
            jParams.append('rating', String(rating));
            jParams.append('title', title);
            jParams.append('body', body);

            await fetch('https://api.judge.me/api/v1/reviews', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: jParams.toString()
            });
          } catch (err) {
            console.warn('[Judge.me] Review background sync error:', err);
          }

          // 2. Optimistic UI update so reviewer sees their review immediately
          saveCustomerReview(newReview);

          setTimeout(() => {
            if (submitBtn) submitBtn.disabled = false;
            closeModal();
            resetForm();
            selectedFilterStars = [];
            refineCheckboxes.forEach((cb) => (cb.checked = false));
            renderReviews();

            if (statusBannerEl) {
              if (statusBannerTimeout) {
                clearTimeout(statusBannerTimeout);
                statusBannerTimeout = null;
              }
              statusBannerEl.textContent = 'Thank you! Your review has been submitted successfully.';
              statusBannerEl.hidden = false;
              statusBannerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

              statusBannerTimeout = setTimeout(() => {
                if (statusBannerEl) {
                  statusBannerEl.hidden = true;
                }
                statusBannerTimeout = null;
              }, 2000);
            }
          }, 240);
        });
      }

      // Smooth link from hero rating anchor to Reviews tab
      document.querySelectorAll('[data-review-anchor]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
          e.preventDefault();
          activateTab('reviews', true);
          tabsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      // Initial Render
      renderReviews();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initBreedGuideFilter();
      initProductTabsAndReviews();
    });
  } else {
    initBreedGuideFilter();
    initProductTabsAndReviews();
  }
})();

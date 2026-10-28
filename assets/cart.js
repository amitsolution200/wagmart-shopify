/**
 * Wagmart Cart Page Controller (assets/cart.js)
 * Matches reference cart page design across all devices:
 * - 5-column item rows: Product (image + title + option), Price, Quantity (- qty +), Total, Trash remove icon
 * - Right summary card accordions: Cart note, Discount code (open by default), Share cart
 * - Live AJAX quantity updates, item removal, coupon discount calculation, and total synchronization
 */
(function () {
  'use strict';

  const VALID_COUPONS = {
    WAGMART10: { code: 'WAGMART10', type: 'percent', value: 10, label: '10% OFF' },
    PETLOVE15: { code: 'PETLOVE15', type: 'percent', value: 15, label: '15% OFF' },
    SAVE100: { code: 'SAVE100', type: 'fixed', value: 100, minOrderInr: 699, label: '₹100 OFF' },
    FREESHIP: { code: 'FREESHIP', type: 'freeship', value: 0, label: 'FREE SHIPPING' },
  };

  function formatInrDecimal(rupees) {
    const val = Math.max(0, Number(rupees) || 0);
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initCartPage() {
    const pageRoot = document.querySelector('[data-cart-page]');
    if (!pageRoot) return;

    const defaultImg = pageRoot.getAttribute('data-default-img') || '';
    const filledView = pageRoot.querySelector('[data-cart-filled-view]');
    const emptyContainer = pageRoot.querySelector('[data-cart-empty-container]');
    const itemsListEl = pageRoot.querySelector('[data-cart-page-items]');

    let activeCoupon = null;
    try {
      const savedCouponCode = localStorage.getItem('wagmart_active_coupon');
      if (savedCouponCode && VALID_COUPONS[savedCouponCode]) {
        activeCoupon = VALID_COUPONS[savedCouponCode];
      }
    } catch (e) {}

    // Set Share Cart URL to current origin + /cart
    const shareInput = pageRoot.querySelector('[data-share-cart-input]');
    if (shareInput && typeof window !== 'undefined' && window.location) {
      shareInput.value = window.location.origin + '/cart';
    }

    function getCartState() {
      if (window.WagmartState && window.WagmartState.cart) {
        return window.WagmartState.cart;
      }
      return { items: [], item_count: 0, total_price: 0 };
    }

    // -----------------------------------------------------------------------
    // 1. RENDER CART PAGE FROM WagmartState.cart
    // -----------------------------------------------------------------------
    function renderCartPage(cartData) {
      const cart = cartData || getCartState();
      const items = Array.isArray(cart.items) ? cart.items : [];
      const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

      // Keep header badge synced
      document.querySelectorAll('[data-cart-count]').forEach((badge) => {
        badge.textContent = totalQty;
        badge.classList.toggle('hidden', totalQty <= 0);
      });

      // Toggle Filled vs Empty views
      if (items.length === 0) {
        if (filledView) filledView.hidden = true;
        if (emptyContainer) emptyContainer.hidden = false;
        return;
      }

      if (filledView) filledView.hidden = false;
      if (emptyContainer) emptyContainer.hidden = true;

      // Render Cart Item Rows (5-column layout matching reference screenshot)
      if (itemsListEl) {
        itemsListEl.innerHTML = items
          .map((item) => {
            const key = escapeHtml(item.key || item.id);
            const title = escapeHtml(item.product_title || item.title || 'Pet Care Essential');
            const url = escapeHtml(item.url || '/products/pet-grooming-glove');
            const rawImg = item.featured_image?.url || item.image || defaultImg;
            const imgSrc = escapeHtml(rawImg);

            const hasVariant =
              !item.product_has_only_default_variant &&
              item.variant_title &&
              item.variant_title !== 'Default Title' &&
              item.variant_title !== 'Standard Pack';

            let variantHtml = '';
            if (Array.isArray(item.options_with_values) && item.options_with_values.length > 0) {
              variantHtml = item.options_with_values
                .filter((opt) => opt && opt.value && opt.value !== 'Default Title')
                .map(
                  (opt) =>
                    `<p class="wm-cart-item__variant"><span class="wm-cart-item__opt-label">${escapeHtml(opt.name)}:</span> ${escapeHtml(opt.value)}</p>`
                )
                .join('');
            } else if (hasVariant) {
              variantHtml = `<p class="wm-cart-item__variant"><span class="wm-cart-item__opt-label">Type:</span> ${escapeHtml(item.variant_title)}</p>`;
            }

            const qty = Math.max(1, Number(item.quantity) || 1);
            const unitCents = Number(item.final_price) || Number(item.price) || 33000;
            const unitInr = Math.round(unitCents / 100);
            const lineInr = unitInr * qty;
            const maxStock = Number(item.max_stock) || 99;

            return `
              <div class="wm-cart-item" data-cart-row="${key}" data-item-id="${escapeHtml(item.id)}" data-item-title="${title}" data-max-stock="${maxStock}">
                <div class="wm-cart-item__product">
                  <a href="${url}" class="wm-cart-item__media" aria-label="${title}">
                    <img src="${imgSrc}" alt="${title}" width="80" height="80" loading="lazy" onerror="this.onerror=null;if('${defaultImg}')this.src='${defaultImg}';">
                  </a>
                  <div class="wm-cart-item__details">
                    <a href="${url}" class="wm-cart-item__title">${title}</a>
                    ${variantHtml}
                    <div class="wm-cart-item__mobile-price">
                      ${formatInrDecimal(unitInr)}
                    </div>
                  </div>
                </div>

                <div class="wm-cart-item__unit-col">
                  <span class="wm-cart-item__unit-price">${formatInrDecimal(unitInr)}</span>
                </div>

                <div class="wm-cart-item__qty-col">
                  <div class="wm-cart-stepper" role="group" aria-label="Quantity for ${title}" data-cart-line-stepper="${key}">
                    <button type="button" class="wm-cart-stepper__btn" data-cart-page-qty-btn="-1" data-key="${key}" aria-label="Decrease quantity for ${title}">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <input type="number" class="wm-cart-stepper__input" value="${qty}" min="1" max="${maxStock}" data-cart-page-qty-input data-key="${key}" aria-label="Quantity for ${title}">
                    <button type="button" class="wm-cart-stepper__btn" data-cart-page-qty-btn="1" data-key="${key}" ${qty >= maxStock ? 'disabled' : ''} aria-label="Increase quantity for ${title}">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>
                </div>

                <div class="wm-cart-item__total-col">
                  <span class="wm-cart-item__line-total" data-line-total>${formatInrDecimal(lineInr)}</span>
                </div>

                <div class="wm-cart-item__remove-col">
                  <button type="button" class="wm-cart-item__trash-btn" data-cart-page-remove="${key}" aria-label="Remove ${title} from cart">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            `;
          })
          .join('');
      }

      updateOrderSummary(items);
    }

    // -----------------------------------------------------------------------
    // 2. ORDER SUMMARY & DISCOUNT CALCULATIONS
    // -----------------------------------------------------------------------
    function updateOrderSummary(items) {
      let subtotalInr = 0;

      items.forEach((item) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unitCents = Number(item.final_price) || Number(item.price) || 33000;
        const unitInr = Math.round(unitCents / 100);
        subtotalInr += unitInr * qty;
      });

      let couponDiscountInr = 0;
      if (activeCoupon) {
        if (activeCoupon.minOrderInr && subtotalInr < activeCoupon.minOrderInr) {
          couponDiscountInr = 0;
        } else if (activeCoupon.type === 'percent') {
          couponDiscountInr = Math.round((subtotalInr * activeCoupon.value) / 100);
        } else if (activeCoupon.type === 'fixed') {
          couponDiscountInr = Math.min(subtotalInr, activeCoupon.value);
        }
      }

      const grandTotalInr = Math.max(0, subtotalInr - couponDiscountInr);

      const sumTotal = pageRoot.querySelector('[data-summary-total]');
      if (sumTotal) {
        sumTotal.textContent = formatInrDecimal(grandTotalInr);
      }

      // Update Coupon Chip visibility
      const chipWrap = pageRoot.querySelector('[data-coupon-chip-wrap]');
      const chipCodeText = pageRoot.querySelector('[data-coupon-code-text]');
      if (chipWrap && chipCodeText) {
        if (activeCoupon) {
          chipWrap.hidden = false;
          chipCodeText.textContent = `${activeCoupon.code} (${activeCoupon.label})`;
        } else {
          chipWrap.hidden = true;
        }
      }
    }

    // -----------------------------------------------------------------------
    // 3. EVENT DELEGATION FOR CART INTERACTIONS
    // -----------------------------------------------------------------------
    pageRoot.addEventListener('click', (e) => {
      // A. Summary Accordion Toggles (Cart note, Discount code, Share cart)
      const accTrigger = e.target.closest('[data-summary-acc-trigger]');
      if (accTrigger) {
        e.preventDefault();
        const accItem = accTrigger.closest('[data-summary-acc]');
        if (!accItem) return;
        const body = accItem.querySelector('[data-summary-acc-body]');
        const isOpen = accItem.classList.contains('is-open');
        accItem.classList.toggle('is-open', !isOpen);
        accTrigger.setAttribute('aria-expanded', String(!isOpen));
        if (body) body.hidden = isOpen;
        return;
      }

      // B. Quantity Stepper (+ / -)
      const qtyBtn = e.target.closest('[data-cart-page-qty-btn]');
      if (qtyBtn) {
        e.preventDefault();
        const key = qtyBtn.getAttribute('data-key');
        const delta = parseInt(qtyBtn.getAttribute('data-cart-page-qty-btn'), 10) || 0;
        const row = pageRoot.querySelector(`[data-cart-row="${CSS.escape(key)}"]`);
        const maxStock = Number(row?.getAttribute('data-max-stock')) || 99;

        const cart = getCartState();
        const item = cart.items.find((i) => String(i.key || i.id) === String(key));
        if (!item) return;

        const currentQty = Number(item.quantity) || 1;
        const nextQty = currentQty + delta;

        if (nextQty > maxStock) return;

        if (row) row.classList.add('is-updating');
        setTimeout(() => {
          if (window.WagmartCart) {
            window.WagmartCart.update(key, Math.max(0, nextQty));
          }
        }, 80);
        return;
      }

      // C. Trash Remove Item Button
      const removeBtn = e.target.closest('[data-cart-page-remove]');
      if (removeBtn) {
        e.preventDefault();
        const key = removeBtn.getAttribute('data-cart-page-remove');
        const row = pageRoot.querySelector(`[data-cart-row="${CSS.escape(key)}"]`);
        if (row) row.classList.add('is-removing');

        setTimeout(() => {
          if (window.WagmartCart) {
            window.WagmartCart.update(key, 0);
          }
        }, 120);
        return;
      }

      // D. Apply Discount Code Button
      const applyCouponBtn = e.target.closest('[data-coupon-apply]');
      if (applyCouponBtn) {
        e.preventDefault();
        applyCouponCode();
        return;
      }

      // E. Remove Discount Code Chip
      const removeCouponBtn = e.target.closest('[data-coupon-remove]');
      if (removeCouponBtn) {
        e.preventDefault();
        activeCoupon = null;
        try {
          localStorage.removeItem('wagmart_active_coupon');
        } catch (err) {}
        const feedback = pageRoot.querySelector('[data-coupon-feedback]');
        if (feedback) {
          feedback.textContent = '';
          feedback.className = 'wm-cart-coupon__feedback';
        }
        renderCartPage(getCartState());
        return;
      }

      // F. Copy Share Cart Link Button
      const shareCopyBtn = e.target.closest('[data-share-cart-copy]');
      if (shareCopyBtn) {
        e.preventDefault();
        const shareFeedback = pageRoot.querySelector('[data-share-cart-feedback]');
        const shareUrl = shareInput ? shareInput.value : window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).catch(() => {});
        }
        if (shareFeedback) {
          shareFeedback.textContent = 'Cart link copied to clipboard!';
          shareFeedback.className = 'wm-cart-coupon__feedback is-success';
          setTimeout(() => {
            shareFeedback.textContent = '';
          }, 2500);
        }
        return;
      }
    });

    // Direct quantity input change handler
    pageRoot.addEventListener('change', (e) => {
      const qtyInput = e.target.closest('[data-cart-page-qty-input]');
      if (qtyInput) {
        const key = qtyInput.getAttribute('data-key');
        const row = pageRoot.querySelector(`[data-cart-row="${CSS.escape(key)}"]`);
        const maxStock = Number(row?.getAttribute('data-max-stock')) || 99;
        const val = Math.min(maxStock, Math.max(1, parseInt(qtyInput.value, 10) || 1));
        qtyInput.value = val;
        if (window.WagmartCart) {
          window.WagmartCart.update(key, val);
        }
      }
    });

    // Discount input Enter key handler
    const couponInput = pageRoot.querySelector('[data-coupon-input]');
    if (couponInput) {
      couponInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyCouponCode();
        }
      });
    }

    function applyCouponCode() {
      const input = pageRoot.querySelector('[data-coupon-input]');
      const feedback = pageRoot.querySelector('[data-coupon-feedback]');
      if (!input || !feedback) return;

      const raw = input.value.trim().toUpperCase();
      if (!raw) {
        feedback.textContent = 'Please enter a discount code.';
        feedback.className = 'wm-cart-coupon__feedback is-error';
        return;
      }

      const matched = VALID_COUPONS[raw];
      if (!matched) {
        feedback.textContent = 'Invalid discount code. Try WAGMART10 or PETLOVE15.';
        feedback.className = 'wm-cart-coupon__feedback is-error';
        return;
      }

      const cart = getCartState();
      const subtotalInr = Math.round((cart.total_price || 0) / 100);
      if (matched.minOrderInr && subtotalInr < matched.minOrderInr) {
        feedback.textContent = `Add ₹${matched.minOrderInr - subtotalInr} more to use ${matched.code}.`;
        feedback.className = 'wm-cart-coupon__feedback is-error';
        return;
      }

      activeCoupon = matched;
      try {
        localStorage.setItem('wagmart_active_coupon', matched.code);
      } catch (e) {}

      input.value = '';
      feedback.textContent = `Discount code ${matched.code} (${matched.label}) applied!`;
      feedback.className = 'wm-cart-coupon__feedback is-success';
      renderCartPage(getCartState());
    }

    // Order Note auto-save
    const noteInput = pageRoot.querySelector('[data-cart-note-input]');
    const noteStatus = pageRoot.querySelector('[data-cart-note-status]');
    let noteTimer = null;
    if (noteInput) {
      try {
        const savedNote = localStorage.getItem('wagmart_order_note');
        if (savedNote && !noteInput.value) {
          noteInput.value = savedNote;
        }
      } catch (e) {}

      noteInput.addEventListener('input', () => {
        const val = noteInput.value;
        try {
          localStorage.setItem('wagmart_order_note', val);
        } catch (e) {}

        if (noteTimer) clearTimeout(noteTimer);
        noteTimer = setTimeout(() => {
          fetch('/cart/update.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ note: val }),
          }).catch(() => {});
          if (noteStatus) {
            noteStatus.textContent = '✓ Cart note saved';
            setTimeout(() => {
              noteStatus.textContent = '';
            }, 2500);
          }
        }, 500);
      });
    }

    // Listen for global cart updates from assets/theme.js
    document.addEventListener('wagmart:cart-updated', (e) => {
      renderCartPage(e.detail || getCartState());
    });

    // Initial render
    renderCartPage(getCartState());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartPage);
  } else {
    initCartPage();
  }
})();

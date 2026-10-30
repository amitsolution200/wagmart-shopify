/**
 * Wagmart Cart Page Controller (assets/cart.js)
 * Matches reference cart page design across all devices:
 * - 5-column item rows: Product (image + title + option), Price, Quantity (- qty +), Total, Trash remove icon
 * - Right summary card accordions: Cart note, Discount code (open by default), Share cart
 * - Live AJAX quantity updates, item removal, coupon discount calculation, and total synchronization
 */
(function () {
  'use strict';

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
      localStorage.removeItem('wagmart_active_coupon');
    } catch (e) {}

    // Set Share Cart URL to current origin + /cart
    const shareInput = pageRoot.querySelector('[data-share-cart-input]');
    if (shareInput && typeof window !== 'undefined' && window.location) {
      shareInput.value = window.location.origin + '/cart';
    }

    function getCartState() {
      if (window.WagmartState && window.WagmartState.cart && Array.isArray(window.WagmartState.cart.items) && window.WagmartState.cart.items.length > 0) {
        return window.WagmartState.cart;
      }
      try {
        const initEl = document.getElementById('wm-cart-initial-json');
        if (initEl) {
          const parsed = JSON.parse(initEl.textContent || 'null');
          if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
            if (window.WagmartState) window.WagmartState.cart = parsed;
            return parsed;
          }
        }
      } catch (e) {}
      try {
        const local = JSON.parse(localStorage.getItem('wagmart_local_cart') || 'null');
        if (local && Array.isArray(local.items) && local.items.length > 0) {
          if (window.WagmartState) window.WagmartState.cart = local;
          return local;
        }
      } catch (e) {}
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
        const existingRows = Array.from(itemsListEl.querySelectorAll('.wm-cart-item[data-cart-row]'));
        const existingKeys = existingRows.map((el) => el.getAttribute('data-cart-row'));
        const nextKeys = items.map((item) => String(item.key || item.id));
        const canPatchInPlace =
          existingKeys.length === nextKeys.length &&
          existingKeys.every((k, idx) => k === nextKeys[idx]);

        if (canPatchInPlace) {
          items.forEach((item, idx) => {
            const rowEl = existingRows[idx];
            if (!rowEl) return;
            const qty = Math.max(1, Number(item.quantity) || 1);
            const unitCents = Number(item.original_price) || Number(item.price) || Number(item.final_price) || 33000;
            const unitInr = Math.round(unitCents / 100);
            const rawCompCents = Number(item.compare_at_price || 0);
            const unitCompInr =
              rawCompCents > unitCents
                ? Math.round(rawCompCents / 100)
                : Math.round(unitInr * 1.25);
            const lineInr = unitInr * qty;
            const lineCompInr = unitCompInr * qty;
            const maxStock = Number(item.max_stock) || Number(rowEl.getAttribute('data-max-stock')) || 99;
            rowEl.setAttribute('data-max-stock', String(maxStock));
            rowEl.classList.remove('is-updating');

            const qtyInput = rowEl.querySelector('[data-cart-page-qty-input]');
            if (qtyInput && Number(qtyInput.value) !== qty) {
              qtyInput.value = String(qty);
            }
            const plusBtn = rowEl.querySelector('[data-cart-page-qty-btn="1"]');
            if (plusBtn) {
              plusBtn.disabled = qty >= maxStock;
            }
            const lineTotalEl = rowEl.querySelector('[data-line-total]');
            if (lineTotalEl) {
              lineTotalEl.innerHTML = `₹${lineInr.toLocaleString('en-IN')} <s style="color:#9ca3af;font-weight:500;font-size:0.85em;margin-left:4px;">₹${lineCompInr.toLocaleString('en-IN')}</s>`;
            }
          });
        } else {
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
              const unitCents = Number(item.original_price) || Number(item.price) || Number(item.final_price) || 33000;
              const unitInr = Math.round(unitCents / 100);
              const rawCompCents = Number(item.compare_at_price || 0);
              const unitCompInr =
                rawCompCents > unitCents
                  ? Math.round(rawCompCents / 100)
                  : Math.round(unitInr * 1.25);
              const lineInr = unitInr * qty;
              const lineCompInr = unitCompInr * qty;
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
                        ₹${unitInr.toLocaleString('en-IN')} <s style="color:#9ca3af;font-weight:500;font-size:0.85em;margin-left:4px;">₹${unitCompInr.toLocaleString('en-IN')}</s>
                      </div>
                    </div>
                  </div>

                  <div class="wm-cart-item__unit-col">
                    <span class="wm-cart-item__unit-price">₹${unitInr.toLocaleString('en-IN')} <s style="color:#9ca3af;font-weight:500;font-size:0.85em;margin-left:4px;">₹${unitCompInr.toLocaleString('en-IN')}</s></span>
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
                    <span class="wm-cart-item__line-total" data-line-total>₹${lineInr.toLocaleString('en-IN')} <s style="color:#9ca3af;font-weight:500;font-size:0.85em;margin-left:4px;">₹${lineCompInr.toLocaleString('en-IN')}</s></span>
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
      }

      updateOrderSummary(items, cart);
    }

    // -----------------------------------------------------------------------
    // 2. ORDER SUMMARY & DISCOUNT CALCULATIONS
    // -----------------------------------------------------------------------
    function updateOrderSummary(items, cartObj) {
      const cart = cartObj || getCartState();
      let subtotalInr = 0;
      let compareTotalInr = 0;

      items.forEach((item) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unitCents = Number(item.original_price) || Number(item.price) || Number(item.final_price) || 33000;
        const unitInr = Math.round(unitCents / 100);
        const rawCompCents = Number(item.compare_at_price || 0);
        const unitCompInr =
          rawCompCents > unitCents
            ? Math.round(rawCompCents / 100)
            : Math.round(unitInr * 1.25);
        subtotalInr += unitInr * qty;
        compareTotalInr += unitCompInr * qty;
      });

      // Strictly sync activeCoupon from Shopify server cart (only Shopify Admin active discounts & minimum requirements apply)
      const serverDiscountCents = Number(cart.total_discount) || 0;
      const serverApp =
        Array.isArray(cart.cart_level_discount_applications) && cart.cart_level_discount_applications.length > 0
          ? cart.cart_level_discount_applications[0].discount_application || cart.cart_level_discount_applications[0]
          : null;
      const applicableCodeObj = Array.isArray(cart.discount_codes)
        ? cart.discount_codes.find((d) => d && d.applicable)
        : null;

      let couponDiscountInr = 0;
      if (serverDiscountCents > 0 || applicableCodeObj) {
        const codeTitle = String(applicableCodeObj?.code || serverApp?.title || 'DISCOUNT').toUpperCase();
        let label = serverDiscountCents > 0 ? `₹${Math.round(serverDiscountCents / 100)} OFF` : 'APPLIED';
        if (serverApp && serverApp.value_type === 'percentage' && Number(serverApp.value) > 0) {
          label = `${Math.round(Number(serverApp.value))}% OFF`;
        }
        activeCoupon = {
          code: codeTitle,
          type: 'shopify',
          value: Math.round(serverDiscountCents / 100),
          label,
        };
        couponDiscountInr = Math.round(serverDiscountCents / 100);
      } else {
        activeCoupon = null;
        const unapplicableObj = Array.isArray(cart.discount_codes)
          ? cart.discount_codes.find((d) => d && d.applicable === false && d.code)
          : null;
        const feedback = pageRoot.querySelector('[data-coupon-feedback]');
        if (unapplicableObj && feedback && feedback.classList.contains('is-success')) {
          feedback.textContent = `Discount code ${String(unapplicableObj.code).toUpperCase()} cannot be applied: minimum purchase requirement not met.`;
          feedback.className = 'wm-cart-coupon__feedback is-error';
        }
      }

      const grandTotalInr = Math.max(0, subtotalInr - couponDiscountInr);

      const sumTotal = pageRoot.querySelector('[data-summary-total]');
      if (sumTotal) {
        sumTotal.innerHTML = `₹${grandTotalInr.toLocaleString('en-IN')} <s style="color:#9ca3af;font-weight:500;font-size:0.82em;margin-left:5px;">₹${compareTotalInr.toLocaleString('en-IN')}</s>`;
      }

      // Real-time Free Shipping Progress Bar update
      const shipBox = pageRoot.querySelector('[data-free-shipping-box]');
      if (shipBox) {
        const threshold = Number(shipBox.getAttribute('data-free-shipping-threshold')) || 1000;
        const shipText = shipBox.querySelector('[data-free-shipping-text]');
        const shipFill = shipBox.querySelector('[data-free-shipping-fill]');
        const shipTrack = shipBox.querySelector('.wm-free-shipping__track');
        const pct = threshold > 0 ? Math.min(100, Math.max(0, Math.round((subtotalInr / threshold) * 100))) : 100;
        const remaining = Math.max(0, threshold - subtotalInr);
        if (shipFill) shipFill.style.width = `${pct}%`;
        if (shipTrack) shipTrack.setAttribute('aria-valuenow', String(pct));
        if (shipText) {
          if (remaining <= 0) {
            shipText.innerHTML = 'Congratulations! You qualify for Free Shipping';
          } else {
            shipText.innerHTML = `Spend <strong>₹${remaining.toLocaleString('en-IN')}</strong> more to qualify for Free Shipping`;
          }
        }
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

        if (window.WagmartCart) {
          window.WagmartCart.update(key, Math.max(0, nextQty));
        }
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
        fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ discount: '' }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((clearedCart) => {
            if (clearedCart && window.WagmartState) {
              window.WagmartState.cart = clearedCart;
              if (window.WagmartCart && typeof window.WagmartCart._recalcLocalCart === 'function') {
                window.WagmartCart._recalcLocalCart();
              }
            }
            renderCartPage(getCartState());
          })
          .catch(() => {
            renderCartPage(getCartState());
          });
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

    async function applyCouponCode() {
      const input = pageRoot.querySelector('[data-coupon-input]');
      const feedback = pageRoot.querySelector('[data-coupon-feedback]');
      const applyBtn = pageRoot.querySelector('[data-coupon-apply]');
      if (!input || !feedback) return;

      const raw = input.value.trim().toUpperCase();
      if (!raw) {
        feedback.textContent = 'Please enter a discount code.';
        feedback.className = 'wm-cart-coupon__feedback is-error';
        return;
      }

      if (applyBtn) applyBtn.disabled = true;

      let updatedCart = null;
      try {
        const res = await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ discount: raw }),
        });
        if (res.ok) {
          updatedCart = await res.json();
        }
      } catch (err) {}

      if (applyBtn) applyBtn.disabled = false;

      if (updatedCart) {
        const serverDiscountCents = Number(updatedCart.total_discount) || 0;
        const applicableCodeObj = Array.isArray(updatedCart.discount_codes)
          ? updatedCart.discount_codes.find(
              (d) => d && String(d.code || '').toUpperCase() === raw && d.applicable
            )
          : null;
        const serverApp =
          Array.isArray(updatedCart.cart_level_discount_applications) &&
          updatedCart.cart_level_discount_applications.length > 0
            ? updatedCart.cart_level_discount_applications[0].discount_application ||
              updatedCart.cart_level_discount_applications[0]
            : null;

        if (applicableCodeObj || serverDiscountCents > 0) {
          let label = serverDiscountCents > 0 ? `₹${Math.round(serverDiscountCents / 100)} OFF` : 'APPLIED';
          if (serverApp && serverApp.value_type === 'percentage' && Number(serverApp.value) > 0) {
            label = `${Math.round(Number(serverApp.value))}% OFF`;
          }

          activeCoupon = {
            code: raw,
            type: serverApp?.value_type === 'percentage' ? 'percent' : 'shopify',
            value: Number(serverApp?.value) || Math.round(serverDiscountCents / 100),
            label,
          };

          if (window.WagmartState) {
            window.WagmartState.cart = updatedCart;
            if (window.WagmartCart && typeof window.WagmartCart._recalcLocalCart === 'function') {
              window.WagmartCart._recalcLocalCart();
            }
          }

          input.value = '';
          feedback.textContent = `Discount code ${raw} (${label}) applied!`;
          feedback.className = 'wm-cart-coupon__feedback is-success';
          renderCartPage(updatedCart);
          return;
        }

        // Not applicable in Shopify Admin (either invalid code or minimum purchase requirement not met)
        const rejectedObj = Array.isArray(updatedCart.discount_codes)
          ? updatedCart.discount_codes.find(
              (d) => d && String(d.code || '').toUpperCase() === raw && d.applicable === false
            )
          : null;

        try {
          const clearRes = await fetch('/cart/update.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ discount: '' }),
          });
          if (clearRes.ok) {
            const clearedCart = await clearRes.json();
            if (window.WagmartState) {
              window.WagmartState.cart = clearedCart;
              if (window.WagmartCart && typeof window.WagmartCart._recalcLocalCart === 'function') {
                window.WagmartCart._recalcLocalCart();
              }
            }
            renderCartPage(clearedCart);
          } else {
            renderCartPage(updatedCart);
          }
        } catch (e) {
          renderCartPage(updatedCart);
        }

        activeCoupon = null;
        if (rejectedObj) {
          feedback.textContent = `Discount code ${raw} cannot be applied. Please verify the code or minimum purchase requirement.`;
        } else {
          feedback.textContent = 'Invalid discount code. Please check your code and try again.';
        }
        feedback.className = 'wm-cart-coupon__feedback is-error';
        return;
      }

      activeCoupon = null;
      feedback.textContent = 'Invalid discount code. Please check your code and try again.';
      feedback.className = 'wm-cart-coupon__feedback is-error';
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

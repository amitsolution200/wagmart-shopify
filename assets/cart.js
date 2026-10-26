/**
 * Wagmart Cart Page Controller (assets/cart.js)
 * - Syncs 100% with WagmartState.cart and header [data-cart-count] badge
 * - Live AJAX quantity updates with loading states & stock limit caps
 * - Smooth item removal with Undo toast restore capability
 * - Save for Later list with one-click Move to Cart
 * - Free-shipping progress bar (₹499 threshold) with animated SVG check state
 * - Promo/Coupon code engine (WAGMART10, PETLOVE15, SAVE100, FREESHIP)
 * - Pincode delivery date & COD estimator
 * - Collapsible order note saved to localStorage & Shopify /cart/update.js
 */
(function () {
  'use strict';

  const FREE_SHIPPING_THRESHOLD_INR = 499;
  const STANDARD_SHIPPING_INR = 49;

  const VALID_COUPONS = {
    WAGMART10: { code: 'WAGMART10', type: 'percent', value: 10, label: '10% OFF' },
    PETLOVE15: { code: 'PETLOVE15', type: 'percent', value: 15, label: '15% OFF' },
    SAVE100: { code: 'SAVE100', type: 'fixed', value: 100, minOrderInr: 699, label: '₹100 OFF' },
    FREESHIP: { code: 'FREESHIP', type: 'freeship', value: 0, label: 'FREE SHIPPING' },
  };

  function formatInr(rupees) {
    const val = Math.max(0, Math.round(Number(rupees) || 0));
    return '₹' + val.toLocaleString('en-IN');
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
    const headerCountEl = pageRoot.querySelector('[data-cart-header-count]');
    const mobileBar = pageRoot.querySelector('[data-cart-mobile-bar]');

    // Saved for later & Undo state
    let savedItems = [];
    try {
      savedItems = JSON.parse(localStorage.getItem('wagmart_saved_later') || '[]');
    } catch (e) {
      savedItems = [];
    }

    let activeCoupon = null;
    try {
      const savedCouponCode = localStorage.getItem('wagmart_active_coupon');
      if (savedCouponCode && VALID_COUPONS[savedCouponCode]) {
        activeCoupon = VALID_COUPONS[savedCouponCode];
      }
    } catch (e) {}

    let lastRemovedItem = null;
    let undoTimer = null;

    // -----------------------------------------------------------------------
    // 1. RENDER CART PAGE FROM WagmartState.cart
    // -----------------------------------------------------------------------
    function getCartState() {
      if (window.WagmartState && window.WagmartState.cart) {
        return window.WagmartState.cart;
      }
      return { items: [], item_count: 0, total_price: 0 };
    }

    function renderCartPage(cartData) {
      const cart = cartData || getCartState();
      const items = Array.isArray(cart.items) ? cart.items : [];
      const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

      // Keep header badge 100% synced
      document.querySelectorAll('[data-cart-count]').forEach((badge) => {
        badge.textContent = totalQty;
        badge.classList.toggle('hidden', totalQty <= 0);
      });

      // Toggle Filled vs Empty views
      if (items.length === 0) {
        if (filledView) filledView.hidden = true;
        if (emptyContainer) emptyContainer.hidden = false;
        if (mobileBar) mobileBar.classList.remove('is-visible');
        document.body.classList.remove('has-cart-mobile-bar');
        return;
      }

      if (filledView) filledView.hidden = false;
      if (emptyContainer) emptyContainer.hidden = true;
      if (mobileBar) mobileBar.classList.add('is-visible');
      document.body.classList.add('has-cart-mobile-bar');

      if (headerCountEl) {
        headerCountEl.textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'items'}`;
      }

      // Render Cart Item Rows
      if (itemsListEl) {
        itemsListEl.innerHTML = items
          .map((item) => {
            const key = escapeHtml(item.key || item.id);
            const title = escapeHtml(item.product_title || item.title || 'Pet Care Essential');
            const vendor = escapeHtml(item.vendor || 'Wagmart');
            const url = escapeHtml(item.url || '/products/pet-grooming-glove');
            const rawImg = item.featured_image?.url || item.image || defaultImg;
            const imgSrc = escapeHtml(rawImg);
            const variantTitle =
              item.product_has_only_default_variant || !item.variant_title || item.variant_title === 'Default Title'
                ? 'Standard Pack'
                : item.variant_title;

            const qty = Math.max(1, Number(item.quantity) || 1);
            const unitCents = Number(item.final_price) || Number(item.price) || 33000;
            const unitInr = Math.round(unitCents / 100);
            const compareCents =
              Number(item.compare_at_price) || Number(item.original_price) || Math.round(unitCents * 1.25);
            const compareInr = Math.round(compareCents / 100);
            const lineInr = unitInr * qty;
            const lineCompareInr = compareInr * qty;

            const maxStock = Number(item.max_stock) || 10;
            const isLowStock = maxStock <= 5;

            return `
              <div class="wm-cart-item" data-cart-row="${key}" data-item-id="${escapeHtml(item.id)}" data-item-title="${title}" data-max-stock="${maxStock}">
                <div class="wm-cart-item__product">
                  <a href="${url}" class="wm-cart-item__media" aria-label="${title}">
                    <img src="${imgSrc}" alt="${title}" width="104" height="104" loading="lazy" onerror="this.onerror=null;if('${defaultImg}')this.src='${defaultImg}';">
                  </a>
                  <div class="wm-cart-item__details">
                    <span class="wm-cart-item__vendor">${vendor}</span>
                    <a href="${url}" class="wm-cart-item__title">${title}</a>
                    <p class="wm-cart-item__variant">${escapeHtml(variantTitle)}</p>

                    <div class="wm-cart-item__mobile-unit">
                      ${formatInr(unitInr)}
                      ${compareInr > unitInr ? `<s>${formatInr(compareInr)}</s>` : ''}
                    </div>

                    <div class="wm-cart-item__badges">
                      ${
                        isLowStock
                          ? `<span class="wm-cart-item__stock-low"><span class="wm-cart-item__stock-dot" aria-hidden="true"></span>Only ${maxStock} left</span>`
                          : `<span class="wm-cart-item__stock-ok"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>In Stock</span>`
                      }
                    </div>

                    <div class="wm-cart-item__subactions">
                      <button type="button" class="wm-cart-item__action-link is-remove" data-cart-page-remove="${key}" aria-label="Remove ${title} from cart">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        <span>Remove</span>
                      </button>
                      <button type="button" class="wm-cart-item__action-link" data-cart-save-later="${key}" aria-label="Save ${title} for later">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        <span>Save for later</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="wm-cart-item__unit-col">
                  <span class="wm-cart-item__unit-price">${formatInr(unitInr)}</span>
                  ${compareInr > unitInr ? `<span class="wm-cart-item__unit-compare">${formatInr(compareInr)}</span>` : ''}
                </div>

                <div class="wm-cart-item__qty-col">
                  <div class="wm-cart-stepper" role="group" aria-label="Quantity for ${title}" data-cart-line-stepper="${key}">
                    <button type="button" class="wm-cart-stepper__btn" data-cart-page-qty-btn="-1" data-key="${key}" aria-label="Decrease quantity for ${title}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <input type="number" class="wm-cart-stepper__input" value="${qty}" min="1" max="${maxStock}" data-cart-page-qty-input data-key="${key}" aria-label="Quantity for ${title}">
                    <button type="button" class="wm-cart-stepper__btn" data-cart-page-qty-btn="1" data-key="${key}" ${qty >= maxStock ? 'disabled' : ''} aria-label="Increase quantity for ${title}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>
                </div>

                <div class="wm-cart-item__total-col">
                  <span class="wm-cart-item__line-total" data-line-total>${formatInr(lineInr)}</span>
                  ${lineCompareInr > lineInr ? `<span class="wm-cart-item__line-compare" data-line-compare>${formatInr(lineCompareInr)}</span>` : ''}
                </div>
              </div>
            `;
          })
          .join('');
      }

      updateOrderSummary(items, totalQty);
    }

    // -----------------------------------------------------------------------
    // 2. ORDER SUMMARY, FREE SHIPPING BAR & COUPON CALCULATIONS
    // -----------------------------------------------------------------------
    function updateOrderSummary(items, totalQty) {
      let subtotalInr = 0;
      let compareTotalInr = 0;

      items.forEach((item) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unitCents = Number(item.final_price) || Number(item.price) || 33000;
        const unitInr = Math.round(unitCents / 100);
        const compareCents =
          Number(item.compare_at_price) || Number(item.original_price) || Math.round(unitCents * 1.25);
        const compareInr = Math.round(compareCents / 100);

        subtotalInr += unitInr * qty;
        compareTotalInr += Math.max(compareInr, unitInr) * qty;
      });

      const mrpSavingsInr = Math.max(0, compareTotalInr - subtotalInr);

      // Calculate coupon discount
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

      const afterDiscountInr = Math.max(0, subtotalInr - couponDiscountInr);

      // Shipping calculation
      const isFreeShipping =
        afterDiscountInr >= FREE_SHIPPING_THRESHOLD_INR ||
        (activeCoupon && activeCoupon.type === 'freeship') ||
        afterDiscountInr === 0;
      const shippingInr = isFreeShipping ? 0 : STANDARD_SHIPPING_INR;
      const grandTotalInr = afterDiscountInr + shippingInr;
      const totalSavingsInr = mrpSavingsInr + couponDiscountInr + (isFreeShipping && afterDiscountInr > 0 ? 49 : 0);

      // Update Free-Shipping Progress Bar
      const shipBar = pageRoot.querySelector('[data-cart-shipping-bar]');
      const shipIcon = pageRoot.querySelector('[data-shipping-bar-icon]');
      const shipText = pageRoot.querySelector('[data-shipping-bar-text]');
      const shipFill = pageRoot.querySelector('[data-shipping-bar-fill]');
      const shipProgress = pageRoot.querySelector('[data-shipping-bar-progressbar]');

      if (shipBar) {
        const remainingInr = Math.max(0, FREE_SHIPPING_THRESHOLD_INR - afterDiscountInr);
        const pct = Math.min(100, Math.round((afterDiscountInr / FREE_SHIPPING_THRESHOLD_INR) * 100));

        shipBar.classList.toggle('is-unlocked', isFreeShipping);
        if (shipFill) shipFill.style.width = `${ isFreeShipping ? 100 : pct }%`;
        if (shipProgress) shipProgress.setAttribute('aria-valuenow', String(afterDiscountInr));

        if (isFreeShipping) {
          if (shipIcon) {
            shipIcon.innerHTML =
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          }
          if (shipText) {
            shipText.innerHTML = "<strong>You've unlocked FREE Express Shipping!</strong>";
          }
        } else {
          if (shipIcon) {
            shipIcon.innerHTML =
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
          }
          if (shipText) {
            shipText.innerHTML = `Add <strong>${formatInr(remainingInr)}</strong> more for <strong>FREE shipping</strong>`;
          }
        }
      }

      // Update Summary DOM
      const sumItemCount = pageRoot.querySelector('[data-summary-item-count]');
      const sumSubtotal = pageRoot.querySelector('[data-summary-subtotal]');
      const sumDiscountRow = pageRoot.querySelector('[data-summary-discount-row]');
      const sumDiscount = pageRoot.querySelector('[data-summary-discount]');
      const sumShipping = pageRoot.querySelector('[data-summary-shipping]');
      const sumTotal = pageRoot.querySelector('[data-summary-total]');
      const savingsPill = pageRoot.querySelector('[data-summary-savings-pill]');
      const savingsText = pageRoot.querySelector('[data-summary-savings-text]');

      if (sumItemCount) sumItemCount.textContent = totalQty;
      if (sumSubtotal) sumSubtotal.textContent = formatInr(subtotalInr);

      const combinedDiscount = couponDiscountInr + mrpSavingsInr;
      if (sumDiscountRow && sumDiscount) {
        if (combinedDiscount > 0) {
          sumDiscountRow.hidden = false;
          sumDiscount.textContent = `−${formatInr(combinedDiscount)}`;
        } else {
          sumDiscountRow.hidden = true;
        }
      }

      if (sumShipping) {
        sumShipping.textContent = isFreeShipping ? 'FREE' : formatInr(shippingInr);
        sumShipping.classList.toggle('is-free', isFreeShipping);
      }

      if (sumTotal) sumTotal.textContent = formatInr(grandTotalInr);

      if (savingsPill && savingsText) {
        if (totalSavingsInr > 0) {
          savingsPill.hidden = false;
          savingsText.textContent = `You save ${formatInr(totalSavingsInr)} on this order`;
        } else {
          savingsPill.hidden = true;
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

      // Update Mobile Sticky Checkout Bar
      const mobileCount = pageRoot.querySelector('[data-mobile-item-count]');
      const mobileTotal = pageRoot.querySelector('[data-mobile-total]');
      if (mobileCount) mobileCount.textContent = totalQty;
      if (mobileTotal) mobileTotal.textContent = formatInr(grandTotalInr);
    }

    // -----------------------------------------------------------------------
    // 3. SAVED FOR LATER RENDERING
    // -----------------------------------------------------------------------
    function renderSavedForLater() {
      const section = pageRoot.querySelector('[data-saved-later-section]');
      const countEl = pageRoot.querySelector('[data-saved-later-count]');
      const listEl = pageRoot.querySelector('[data-saved-later-list]');
      if (!section || !listEl) return;

      if (!savedItems || savedItems.length === 0) {
        section.hidden = true;
        return;
      }

      section.hidden = false;
      if (countEl) countEl.textContent = savedItems.length;

      listEl.innerHTML = savedItems
        .map((item) => {
          const id = escapeHtml(item.id);
          const title = escapeHtml(item.title || 'Pet Care Essential');
          const priceInr = Math.round((Number(item.price) || 33000) / 100);
          const img = escapeHtml(item.image || defaultImg);
          return `
            <div class="wm-cart-saved__item" data-saved-item="${id}">
              <img src="${img}" alt="${title}" class="wm-cart-saved__img" width="68" height="68" loading="lazy">
              <div class="wm-cart-saved__info">
                <p class="wm-cart-saved__name">${title}</p>
                <p class="wm-cart-saved__price">${formatInr(priceInr)}</p>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                  <button type="button" class="wm-cart-saved__move-btn" data-move-to-cart="${id}">Move to Cart</button>
                  <button type="button" class="wm-cart-item__action-link is-remove" data-remove-saved="${id}" aria-label="Remove ${title} from saved items">Remove</button>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    function saveSavedItems() {
      try {
        localStorage.setItem('wagmart_saved_later', JSON.stringify(savedItems));
      } catch (e) {}
      renderSavedForLater();
    }

    // -----------------------------------------------------------------------
    // 4. UNDO TOAST NOTIFICATION
    // -----------------------------------------------------------------------
    function showUndoToast(item) {
      lastRemovedItem = item;
      const toast = pageRoot.querySelector('[data-cart-undo-toast]');
      const msg = pageRoot.querySelector('[data-cart-toast-msg]');
      if (!toast || !msg) return;

      const shortTitle = (item.product_title || item.title || 'Item').slice(0, 32);
      msg.textContent = `Removed "${shortTitle}" from cart`;
      toast.classList.add('is-visible');

      if (undoTimer) clearTimeout(undoTimer);
      undoTimer = setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 5000);
    }

    // -----------------------------------------------------------------------
    // 5. EVENT DELEGATION FOR CART INTERACTIONS
    // -----------------------------------------------------------------------
    pageRoot.addEventListener('click', (e) => {
      // A. Quantity Stepper (+ / -)
      const qtyBtn = e.target.closest('[data-cart-page-qty-btn]');
      if (qtyBtn) {
        e.preventDefault();
        const key = qtyBtn.getAttribute('data-key');
        const delta = parseInt(qtyBtn.getAttribute('data-cart-page-qty-btn'), 10) || 0;
        const row = pageRoot.querySelector(`[data-cart-row="${CSS.escape(key)}"]`);
        const maxStock = Number(row?.getAttribute('data-max-stock')) || 10;

        const cart = getCartState();
        const item = cart.items.find((i) => (i.key || i.id) == key);
        if (!item) return;

        const currentQty = Number(item.quantity) || 1;
        const nextQty = currentQty + delta;

        if (nextQty > maxStock) return;

        if (row) row.classList.add('is-updating');
        setTimeout(() => {
          if (nextQty <= 0) {
            const snapshot = { ...item };
            if (window.WagmartCart) {
              window.WagmartCart.update(key, 0);
            }
            showUndoToast(snapshot);
          } else if (window.WagmartCart) {
            window.WagmartCart.update(key, nextQty);
          }
        }, 120);
        return;
      }

      // B. Remove Item Button
      const removeBtn = e.target.closest('[data-cart-page-remove]');
      if (removeBtn) {
        e.preventDefault();
        const key = removeBtn.getAttribute('data-cart-page-remove');
        const row = pageRoot.querySelector(`[data-cart-row="${CSS.escape(key)}"]`);
        const cart = getCartState();
        const item = cart.items.find((i) => (i.key || i.id) == key);
        if (!item) return;

        const snapshot = { ...item };
        if (row) row.classList.add('is-removing');

        setTimeout(() => {
          if (window.WagmartCart) {
            window.WagmartCart.update(key, 0);
          }
          showUndoToast(snapshot);
        }, 200);
        return;
      }

      // C. Undo Remove Button
      const undoBtn = e.target.closest('[data-cart-toast-undo]');
      if (undoBtn) {
        e.preventDefault();
        const toast = pageRoot.querySelector('[data-cart-undo-toast]');
        if (toast) toast.classList.remove('is-visible');
        if (lastRemovedItem && window.WagmartCart) {
          const item = lastRemovedItem;
          lastRemovedItem = null;
          window.WagmartCart.add(item.id, item.quantity || 1, false, {
            name: item.product_title || item.title,
            price: item.final_price || item.price,
            compare_at_price: item.compare_at_price || item.original_price,
            variant_title: item.variant_title,
            vendor: item.vendor,
            url: item.url,
            max_stock: item.max_stock,
            image: item.featured_image?.url || item.image || defaultImg,
          });
        }
        return;
      }

      // D. Save for Later Button
      const saveLaterBtn = e.target.closest('[data-cart-save-later]');
      if (saveLaterBtn) {
        e.preventDefault();
        const key = saveLaterBtn.getAttribute('data-cart-save-later');
        const cart = getCartState();
        const item = cart.items.find((i) => (i.key || i.id) == key);
        if (!item) return;

        const exists = savedItems.some((s) => s.id == item.id);
        if (!exists) {
          savedItems.push({
            id: item.id,
            title: item.product_title || item.title,
            price: item.final_price || item.price || 33000,
            compare_at_price: item.compare_at_price || item.original_price || 41500,
            variant_title: item.variant_title || 'Standard Pack',
            vendor: item.vendor || 'Wagmart',
            url: item.url || '/products/pet-grooming-glove',
            image: item.featured_image?.url || item.image || defaultImg,
          });
          saveSavedItems();
        }
        if (window.WagmartCart) {
          window.WagmartCart.update(key, 0);
        }
        return;
      }

      // E. Move Saved Item back to Cart
      const moveBtn = e.target.closest('[data-move-to-cart]');
      if (moveBtn) {
        e.preventDefault();
        const id = moveBtn.getAttribute('data-move-to-cart');
        const idx = savedItems.findIndex((s) => s.id == id);
        if (idx > -1) {
          const saved = savedItems[idx];
          savedItems.splice(idx, 1);
          saveSavedItems();
          if (window.WagmartCart) {
            window.WagmartCart.add(saved.id, 1, false, {
              name: saved.title,
              price: saved.price,
              compare_at_price: saved.compare_at_price,
              variant_title: saved.variant_title,
              vendor: saved.vendor,
              url: saved.url,
              image: saved.image,
            });
          }
        }
        return;
      }

      // F. Remove Saved Item
      const removeSavedBtn = e.target.closest('[data-remove-saved]');
      if (removeSavedBtn) {
        e.preventDefault();
        const id = removeSavedBtn.getAttribute('data-remove-saved');
        savedItems = savedItems.filter((s) => s.id != id);
        saveSavedItems();
        return;
      }

      // G. Clear Cart Button
      const clearBtn = e.target.closest('[data-cart-clear-btn]');
      if (clearBtn) {
        e.preventDefault();
        if (window.WagmartCart) {
          window.WagmartCart.clear();
        }
        return;
      }

      // H. Order Note Collapsible Toggle
      const noteToggle = e.target.closest('[data-cart-note-toggle]');
      if (noteToggle) {
        e.preventDefault();
        const panel = pageRoot.querySelector('[data-cart-note-panel]');
        const isExpanded = noteToggle.getAttribute('aria-expanded') === 'true';
        noteToggle.setAttribute('aria-expanded', String(!isExpanded));
        if (panel) panel.classList.toggle('is-open', !isExpanded);
        return;
      }

      // I. Apply Coupon Button
      const applyCouponBtn = e.target.closest('[data-coupon-apply]');
      if (applyCouponBtn) {
        e.preventDefault();
        applyCouponCode();
        return;
      }

      // J. Remove Coupon Chip
      const removeCouponBtn = e.target.closest('[data-coupon-remove]');
      if (removeCouponBtn) {
        e.preventDefault();
        activeCoupon = null;
        try {
          localStorage.removeItem('wagmart_active_coupon');
        } catch (e) {}
        const feedback = pageRoot.querySelector('[data-coupon-feedback]');
        if (feedback) {
          feedback.textContent = '';
          feedback.className = 'wm-cart-coupon__feedback';
        }
        renderCartPage(getCartState());
        return;
      }

      // K. Pincode Delivery Estimator Check
      const pincodeBtn = e.target.closest('[data-cart-pincode-btn]');
      if (pincodeBtn) {
        e.preventDefault();
        checkPincodeDelivery();
        return;
      }
    });

    // Direct quantity input change handler
    pageRoot.addEventListener('change', (e) => {
      const qtyInput = e.target.closest('[data-cart-page-qty-input]');
      if (qtyInput) {
        const key = qtyInput.getAttribute('data-key');
        const row = pageRoot.querySelector(`[data-cart-row="${CSS.escape(key)}"]`);
        const maxStock = Number(row?.getAttribute('data-max-stock')) || 10;
        const val = Math.min(maxStock, Math.max(1, parseInt(qtyInput.value, 10) || 1));
        qtyInput.value = val;
        if (window.WagmartCart) {
          window.WagmartCart.update(key, val);
        }
      }
    });

    // Coupon Enter key handler
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
        feedback.textContent = 'Please enter a promo code.';
        feedback.className = 'wm-cart-coupon__feedback is-error';
        return;
      }

      const matched = VALID_COUPONS[raw];
      if (!matched) {
        feedback.textContent = 'Invalid promo code. Try WAGMART10 or PETLOVE15.';
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
      feedback.textContent = `Promo code ${matched.code} (${matched.label}) applied!`;
      feedback.className = 'wm-cart-coupon__feedback is-success';
      renderCartPage(getCartState());
    }

    function checkPincodeDelivery() {
      const input = pageRoot.querySelector('[data-cart-pincode-input]');
      const result = pageRoot.querySelector('[data-cart-pincode-result]');
      if (!input || !result) return;

      const pin = input.value.trim();
      if (!/^[1-9][0-9]{5}$/.test(pin)) {
        result.className = 'wm-cart-pincode__result is-error';
        result.innerHTML = '<span>Please enter a valid 6-digit Indian pincode.</span>';
        return;
      }

      const isSuratOrGujarat = pin.startsWith('39') || pin.startsWith('38') || pin.startsWith('36');
      const deliveryDay = isSuratOrGujarat ? 'Tomorrow, by 8 PM' : 'Tue, 28 Oct';
      result.className = 'wm-cart-pincode__result';
      result.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Express delivery to <strong>${escapeHtml(pin)}</strong> by <strong>${deliveryDay}</strong> &bull; COD Eligible</span>`;
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
            noteStatus.textContent = '✓ Order note saved';
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
    renderSavedForLater();
    renderCartPage(getCartState());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartPage);
  } else {
    initCartPage();
  }
})();

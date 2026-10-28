/**
 * WAGMART — Product Details Page Controller (assets/product.js)
 * Converted from React ProductDetailsPage component:
 * 1. Mobile/Tablet Infinity Loop Slider (touch swipe, mouse drag, dot/pill indicators)
 * 2. Add to Cart button -> transforms into [- qty +] quantity stepper on click,
 *    decrements to 0 to revert back to Add to Cart, and syncs live with WagmartCart
 * 3. Buy Now button -> ensures item is in cart and redirects to /checkout
 * 4. Wishlist Heart toggle (fills black when active, syncs with header wishlist count)
 * 5. Accordions (Product Description open by default, Specifications, Benefits)
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
    // 1. MOBILE / TABLET INFINITY LOOP SLIDER
    // =========================================================================
    const slider = pdpRoot.querySelector('[data-pdp-slider]');
    const viewport = pdpRoot.querySelector('[data-pdp-slider-viewport]');
    const track = pdpRoot.querySelector('[data-pdp-slider-track]');
    const slides = track ? Array.from(track.querySelectorAll('[data-pdp-slide]')) : [];
    const dots = slider ? Array.from(slider.querySelectorAll('[data-pdp-dot]')) : [];
    const thumbs = slider ? Array.from(slider.querySelectorAll('[data-pdp-thumb]')) : [];
    const slideGapPx = 16;

    let selectedIndex = 0;
    const slideCount = slides.length;

    function selectSlide(index, animate = true) {
      if (slideCount === 0 || !track) return;
      // Infinity loop wrap-around
      selectedIndex = ((index % slideCount) + slideCount) % slideCount;

      if (animate) {
        track.classList.remove('is-dragging');
      } else {
        track.classList.add('is-dragging');
      }

      track.style.transform = `translate3d(calc(-${selectedIndex} * (100% + ${slideGapPx}px)), 0, 0)`;

      dots.forEach((dot, i) => {
        const isActive = i === selectedIndex;
        dot.classList.toggle('is-active', isActive);
        dot.classList.toggle('w-6', isActive);
        dot.classList.toggle('bg-black', isActive);
        dot.classList.toggle('w-1.5', !isActive);
        dot.classList.toggle('bg-black/25', !isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });

      const thumbsWrap = slider ? slider.querySelector('[data-pdp-thumbs]') : null;
      thumbs.forEach((thumb, i) => {
        const isActive = i === selectedIndex;
        thumb.classList.toggle('is-active', isActive);
        thumb.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive && thumbsWrap) {
          const targetLeft = thumb.offsetLeft - (thumbsWrap.clientWidth - thumb.clientWidth) / 2;
          thumbsWrap.scrollTo({ left: Math.max(0, targetLeft), behavior: animate ? 'smooth' : 'auto' });
        }
      });
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        selectSlide(idx, true);
      });
    });

    thumbs.forEach((thumb, idx) => {
      thumb.addEventListener('click', (e) => {
        e.preventDefault();
        selectSlide(idx, true);
      });
    });

    if (viewport && track && slideCount > 1) {
      let startX = 0;
      let startY = 0;
      let currentDeltaX = 0;
      let isDragging = false;
      let isHorizontalDrag = null;

      function onDragStart(clientX, clientY) {
        startX = clientX;
        startY = clientY;
        currentDeltaX = 0;
        isDragging = true;
        isHorizontalDrag = null;
        track.classList.add('is-dragging');
      }

      function onDragMove(clientX, clientY) {
        if (!isDragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;

        if (isHorizontalDrag === null) {
          if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
            isHorizontalDrag = Math.abs(dx) > Math.abs(dy);
          }
        }

        if (!isHorizontalDrag) return;
        currentDeltaX = dx;
        track.style.transform = `translate3d(calc(-${selectedIndex} * (100% + ${slideGapPx}px) + ${dx}px), 0, 0)`;
      }

      function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('is-dragging');

        const width = viewport.clientWidth || 300;
        const threshold = Math.min(60, width * 0.15);

        if (currentDeltaX < -threshold) {
          // Next slide (wraps infinitely from last -> 0)
          selectSlide(selectedIndex + 1, true);
        } else if (currentDeltaX > threshold) {
          // Previous slide (wraps infinitely from 0 -> last)
          selectSlide(selectedIndex - 1, true);
        } else {
          selectSlide(selectedIndex, true);
        }
        currentDeltaX = 0;
      }

      // Touch events
      viewport.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length === 1) {
            onDragStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );

      viewport.addEventListener(
        'touchmove',
        (e) => {
          if (e.touches.length === 1) {
            onDragMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );

      viewport.addEventListener('touchend', onDragEnd, { passive: true });
      viewport.addEventListener('touchcancel', onDragEnd, { passive: true });

      // Mouse drag events
      viewport.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        onDragStart(e.clientX, e.clientY);
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        onDragMove(e.clientX, e.clientY);
      });

      window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        onDragEnd();
      });
    }

    // =========================================================================
    // 2. ADD TO CART -> [- QTY +] STEPPER & BUY NOW (-> CHECKOUT)
    // =========================================================================
    const atcBtn = document.getElementById('wm-pdp-atc-btn') || pdpRoot.querySelector('[data-pdp-atc-btn]');
    const stepper = document.getElementById('wm-pdp-stepper') || pdpRoot.querySelector('[data-pdp-stepper]');
    const qtyDisplay = pdpRoot.querySelector('[data-pdp-qty-display]');
    const qtyInput = document.getElementById('wm-pdp-qty-input') || pdpRoot.querySelector('[data-qty-input]');
    const qtyMinus = pdpRoot.querySelector('[data-qty-minus]');
    const qtyPlus = pdpRoot.querySelector('[data-qty-plus]');
    const buyNowBtn = document.getElementById('wm-pdp-buy-now-btn') || pdpRoot.querySelector('[data-pdp-buy-now]');
    const variantIdInput = pdpRoot.querySelector('form#product-form input[name="id"]');
    const mainImg = document.getElementById('wm-main-product-image') || pdpRoot.querySelector('.wm-pdp-react__img');

    const maxStock = parseInt(pdpRoot.getAttribute('data-max-stock') || '99', 10);
    const unitPriceRupees = parseInt(pdpRoot.getAttribute('data-base-price') || '330', 10);
    const isTracked = pdpRoot.getAttribute('data-inventory-tracked') === 'true';

    function getCartItemForPDP() {
      if (!window.WagmartState || !window.WagmartState.cart || !Array.isArray(window.WagmartState.cart.items)) {
        return null;
      }
      const currentVariantId = String(variantIdInput?.value || pdpRoot.getAttribute('data-product-id') || '').trim();
      const shopifyProdId = String(pdpRoot.getAttribute('data-shopify-product-id') || '').trim();
      const prodId = String(pdpRoot.getAttribute('data-product-id') || '').trim();
      const handle = String(pdpRoot.getAttribute('data-handle') || '').trim();

      return (
        window.WagmartState.cart.items.find((item) => {
          const itemId = String(item.id != null ? item.id : '').trim();
          const itemVarId = String(item.variant_id != null ? item.variant_id : '').trim();
          const itemProdId = String(item.product_id != null ? item.product_id : '').trim();
          const itemHandle = String(item.handle != null ? item.handle : '').trim();
          const itemKey = String(item.key != null ? item.key : '').trim();

          if (currentVariantId && (itemId === currentVariantId || itemVarId === currentVariantId || itemKey.startsWith(currentVariantId + ':'))) {
            return true;
          }
          if (shopifyProdId && (itemProdId === shopifyProdId || itemId === shopifyProdId)) {
            return true;
          }
          if (prodId && (itemId === prodId || itemVarId === prodId || itemProdId === prodId)) {
            return true;
          }
          if (handle && (itemHandle === handle || (item.url && item.url.includes('/' + handle)))) {
            return true;
          }
          return false;
        }) || null
      );
    }

    function renderButtonOrStepper(qty) {
      const cleanQty = Math.max(0, parseInt(qty, 10) || 0);
      if (cleanQty > 0) {
        if (atcBtn) atcBtn.classList.add('hidden');
        if (stepper) stepper.classList.remove('hidden');
        if (qtyDisplay) qtyDisplay.textContent = String(cleanQty);
        if (qtyInput) qtyInput.value = String(cleanQty);
        if (qtyPlus) {
          qtyPlus.disabled = isTracked && maxStock > 0 && cleanQty >= maxStock;
        }
      } else {
        if (stepper) stepper.classList.add('hidden');
        if (atcBtn) atcBtn.classList.remove('hidden');
        if (qtyDisplay) qtyDisplay.textContent = '1';
        if (qtyInput) qtyInput.value = '1';
      }
    }

    function syncFromCartState() {
      const cartItem = getCartItemForPDP();
      const inCartQty = cartItem ? parseInt(cartItem.quantity, 10) || 0 : 0;
      renderButtonOrStepper(inCartQty);
    }

    // Click "Add to Cart" -> Show [- 1 +] stepper immediately and add 1 to cart
    if (atcBtn) {
      atcBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (isTracked && maxStock <= 0) return;

        const variantId = variantIdInput?.value || pdpRoot.getAttribute('data-product-id') || 'pet-grooming-glove';
        const title = pdpRoot.getAttribute('data-product-title') || 'Pet Grooming Glove';
        const image = mainImg?.src || '';

        // Immediately transform button into [- 1 +] stepper
        renderButtonOrStepper(1);

        if (window.WagmartCart) {
          await window.WagmartCart.add(variantId, 1, false, {
            name: title,
            title: title,
            price: unitPriceRupees * 100,
            image: image,
            url: window.location.pathname,
          });
        }
        syncFromCartState();
      });
    }

    // Click [+] on Stepper -> Increase quantity
    if (qtyPlus) {
      qtyPlus.addEventListener('click', async (e) => {
        e.preventDefault();
        const cartItem = getCartItemForPDP();
        const currentQty = parseInt(qtyDisplay?.textContent || qtyInput?.value || '1', 10) || 1;
        const limit = isTracked && maxStock > 0 ? maxStock : 99;
        const nextQty = Math.min(limit, currentQty + 1);

        renderButtonOrStepper(nextQty);

        const variantId = variantIdInput?.value || pdpRoot.getAttribute('data-product-id') || 'pet-grooming-glove';
        if (window.WagmartCart) {
          await window.WagmartCart.update(cartItem?.key || cartItem?.id || variantId, nextQty);
        }
      });
    }

    // Click [-] on Stepper -> Decrease quantity (or if 1 -> 0, remove & revert to Add to Cart)
    if (qtyMinus) {
      qtyMinus.addEventListener('click', async (e) => {
        e.preventDefault();
        const cartItem = getCartItemForPDP();
        const currentQty = parseInt(qtyDisplay?.textContent || qtyInput?.value || '1', 10) || 1;
        const nextQty = Math.max(0, currentQty - 1);

        renderButtonOrStepper(nextQty);

        const variantId = variantIdInput?.value || pdpRoot.getAttribute('data-product-id') || 'pet-grooming-glove';
        if (window.WagmartCart) {
          await window.WagmartCart.update(cartItem?.key || cartItem?.id || variantId, nextQty);
        }
      });
    }

    // Prevent form default submit
    const productForm = document.getElementById('product-form');
    if (productForm) {
      productForm.addEventListener('submit', (e) => {
        e.preventDefault();
      });
    }

    // Click "Buy Now" -> Ensure product is in cart and redirect to /checkout
    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (isTracked && maxStock <= 0) return;

        const cartItem = getCartItemForPDP();
        const variantId = variantIdInput?.value || pdpRoot.getAttribute('data-product-id') || 'pet-grooming-glove';
        const title = pdpRoot.getAttribute('data-product-title') || 'Pet Grooming Glove';
        const image = mainImg?.src || '';

        if (!cartItem && window.WagmartCart) {
          await window.WagmartCart.add(variantId, 1, false, {
            name: title,
            title: title,
            price: unitPriceRupees * 100,
            image: image,
            url: window.location.pathname,
          });
        }

        window.location.href = '/checkout';
      });
    }

    // Initial sync with cart state
    const initialInCart = parseInt(pdpRoot.getAttribute('data-in-cart-qty') || '0', 10);
    if (initialInCart > 0) {
      renderButtonOrStepper(initialInCart);
    }
    if (window.WagmartState && window.WagmartState.cart) {
      syncFromCartState();
    }
    document.addEventListener('wagmart:cart-updated', () => {
      syncFromCartState();
    });

    // =========================================================================
    // 3. WISHLIST HEART TOGGLE ON PDP
    // =========================================================================
    const pdpWishlistBtn = pdpRoot.querySelector('[data-pdp-wishlist]');
    if (pdpWishlistBtn) {
      const prodId = pdpRoot.getAttribute('data-product-id') || 'pet-grooming-glove';

      const checkWishlisted = () => {
        try {
          const list = JSON.parse(localStorage.getItem('wagmart_wishlist') || '[]');
          const active = list.some((i) => String(i.id) === String(prodId));
          pdpWishlistBtn.classList.toggle('is-active', active);
          pdpWishlistBtn.setAttribute('aria-pressed', String(active));
          const heartSvg = pdpWishlistBtn.querySelector('svg');
          if (heartSvg) {
            heartSvg.setAttribute('fill', active ? '#000000' : 'none');
          }
        } catch (err) {}
      };
      checkWishlisted();

      pdpWishlistBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const list = JSON.parse(localStorage.getItem('wagmart_wishlist') || '[]');
          const idx = list.findIndex((i) => String(i.id) === String(prodId));
          const title = pdpRoot.getAttribute('data-product-title') || 'Pet Grooming Glove';
          if (idx > -1) {
            list.splice(idx, 1);
          } else {
            list.push({
              id: prodId,
              name: title,
              price: unitPriceRupees,
              priceDisplay: formatINR(unitPriceRupees),
              image: mainImg?.src || '',
            });
          }
          localStorage.setItem('wagmart_wishlist', JSON.stringify(list));
          checkWishlisted();

          if (window.WagmartState && Array.isArray(window.WagmartState.wishlist)) {
            window.WagmartState.wishlist = list;
          }
          document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
            el.textContent = list.length;
            if (list.length > 0) {
              el.classList.remove('hidden');
            } else {
              el.classList.add('hidden');
            }
          });
        } catch (err) {}
      });
    }

    // =========================================================================
    // 4. ACCORDIONS (Product Description, Specifications, Benefits)
    // =========================================================================
    const accordionItems = Array.from(pdpRoot.querySelectorAll('[data-pdp-accordion]'));
    const accordionTriggers = Array.from(pdpRoot.querySelectorAll('[data-pdp-accordion-trigger]'));

    function toggleAccordion(targetKey) {
      accordionItems.forEach((item) => {
        const key = item.getAttribute('data-pdp-accordion');
        const trigger = item.querySelector('[data-pdp-accordion-trigger]');
        const body = item.querySelector('[data-pdp-accordion-body]');

        if (key === targetKey) {
          const willOpen = !item.classList.contains('is-open');
          item.classList.toggle('is-open', willOpen);
          if (trigger) trigger.setAttribute('aria-expanded', String(willOpen));
          if (body) body.hidden = !willOpen;
        } else {
          item.classList.remove('is-open');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
          if (body) body.hidden = true;
        }
      });
    }

    accordionTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const key = trigger.getAttribute('data-pdp-accordion-trigger');
        toggleAccordion(key);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductPage);
  } else {
    initProductPage();
  }
})();

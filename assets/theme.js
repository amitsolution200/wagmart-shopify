/**
 * Wagmart Shopify Theme Engine
 * High-performance, zero-dependency vanilla JavaScript handling:
 * - Shopify Ajax Cart API (fetch /cart.js, /cart/add.js, /cart/change.js, /cart/clear.js)
 * - Wishlist via localStorage & live state synchronization
 * - Predictive Search Modal & live filtering
 * - Quick View Modal with dynamic variant management
 * - Interactive Video Reels Modal with YouTube embed
 * - Hero Banner Carousel with autoplay, touch swipe, and cross-fade
 * - Product Carousel Scroll & Category Filter Pills
 * - FAQ Accordion with smooth transitions
 * - Mobile Navigation Drawer & Scroll-Spy
 */

(function () {
  'use strict';

  // State Management
  const WagmartState = {
    cart: { items: [], item_count: 0, total_price: 0 },
    wishlist: JSON.parse(localStorage.getItem('wagmart_wishlist') || '[]'),
    currencySymbol: '₹',
  };

  // Format Money Helper (cents to currency) using the shop's money format when available
  function formatMoney(cents) {
    const value = Number(cents) || 0;
    const val = Math.round(value / 100);
    return WagmartState.currencySymbol + val.toLocaleString('en-IN');
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================================================================
  // 1. AJAX CART INTEGRATION
  // =========================================================================
  const Cart = {
    _lastTrigger: null,

    setLoading(isLoading) {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) drawer.classList.toggle('is-loading', !!isLoading);
    },

    notify(message) {
      const notice = document.querySelector('[data-cart-notice]');
      if (notice) notice.textContent = message || '';
    },

    _recalcLocalCart() {
      WagmartState.cart.item_count = WagmartState.cart.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
      );
      WagmartState.cart.total_price = WagmartState.cart.items.reduce(
        (sum, item) => sum + ((Number(item.final_price) || Number(item.price) || 0) * (Number(item.quantity) || 0)),
        0
      );
      try {
        localStorage.setItem('wagmart_local_cart', JSON.stringify(WagmartState.cart));
      } catch (e) {}
    },

    async fetch() {
      let serverCart = null;
      try {
        const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
        if (res.ok) {
          serverCart = await res.json();
        }
      } catch (err) {}

      if (!serverCart) {
        const initialJsonEl = document.getElementById('wm-cart-initial-json');
        if (initialJsonEl) {
          try {
            serverCart = JSON.parse(initialJsonEl.textContent);
          } catch (e) {}
        }
      }

      let localCart = null;
      try {
        localCart = JSON.parse(localStorage.getItem('wagmart_local_cart') || 'null');
      } catch (e) {}

      const validLocalItems =
        localCart && Array.isArray(localCart.items)
          ? localCart.items.filter(
              (i) => i && i._wm_v2 === true && (Number(i.quantity) || 0) > 0 && (i.title || i.product_title)
            )
          : [];

      if (serverCart && Array.isArray(serverCart.items)) {
        const existingIds = new Set(serverCart.items.map((item) => String(item.id)));
        const mockItems = validLocalItems.filter(
          (i) => (isNaN(Number(i.id)) || Number(i.id) <= 0) && !existingIds.has(String(i.id))
        );
        WagmartState.cart = serverCart;
        if (mockItems.length > 0) {
          WagmartState.cart.items.push(...mockItems);
        }
        this._recalcLocalCart();
      } else if (validLocalItems.length > 0) {
        WagmartState.cart = { items: validLocalItems, item_count: 0, total_price: 0 };
        this._recalcLocalCart();
      } else {
        WagmartState.cart = { items: [], item_count: 0, total_price: 0 };
        try {
          localStorage.removeItem('wagmart_local_cart');
        } catch (e) {}
      }

      this.render();
    },

    async add(variantId, quantity = 1, openDrawer = true, mockItem = null) {
      if (typeof openDrawer === 'object' && openDrawer !== null) {
        mockItem = openDrawer;
        openDrawer = true;
      }
      this.notify('');
      this.setLoading(true);

      const targetQty = Math.max(1, Number(quantity) || 1);

      // 1. Instant optimistic update in local state
      let existing = WagmartState.cart.items.find(
        (i) => i.id == variantId || i.product_id == variantId || (i.variant_id && i.variant_id == variantId)
      );

      if (existing) {
        existing._wm_v2 = true;
        existing.quantity = Math.max(1, (Number(existing.quantity) || 1) + targetQty);
        existing.final_line_price = (existing.final_price || existing.price || 0) * existing.quantity;
      } else {
        const priceVal = (mockItem && mockItem.price) || 79900;
        const compareVal = (mockItem && (mockItem.compare_at_price || mockItem.original_price)) || Math.round(priceVal * 1.25);
        const itemTitle = (mockItem && (mockItem.name || mockItem.title)) || 'Product';
        const newItem = {
          _wm_v2: true,
          id: variantId,
          key: String(variantId),
          product_id: variantId,
          variant_id: variantId,
          title: itemTitle,
          product_title: itemTitle,
          variant_title: (mockItem && mockItem.variant_title) || 'Standard Pack',
          vendor: (mockItem && mockItem.vendor) || 'Wagmart',
          url: (mockItem && mockItem.url) || '/products/pet-grooming-glove',
          price: priceVal,
          final_price: priceVal,
          compare_at_price: compareVal,
          original_price: compareVal,
          original_line_price: compareVal * targetQty,
          final_line_price: priceVal * targetQty,
          quantity: targetQty,
          max_stock: (mockItem && mockItem.max_stock) || 10,
          image: (mockItem && mockItem.image) || '',
        };
        WagmartState.cart.items.push(newItem);
      }

      this._recalcLocalCart();
      this.render();
      if (openDrawer) this.openDrawer();

      // 2. If it's a numeric Shopify variant, post to /cart/add.js
      if (!isNaN(Number(variantId)) && Number(variantId) > 0) {
        try {
          const res = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ id: Number(variantId), quantity: targetQty }),
          });
          if (res.ok) {
            await this.fetch();
          }
        } catch (err) {
          console.warn('Shopify cart API warning (using local cart):', err);
        }
      }

      this.setLoading(false);
      return true;
    },

    async update(keyOrId, quantity) {
      this.notify('');
      this.setLoading(true);

      const targetQty = Number(quantity);

      // 1. Update in local state
      const itemIndex = WagmartState.cart.items.findIndex(
        (i) => i.id == keyOrId || i.key == keyOrId || i.product_id == keyOrId || (i.variant_id && i.variant_id == keyOrId)
      );

      if (itemIndex > -1) {
        if (targetQty <= 0) {
          WagmartState.cart.items.splice(itemIndex, 1);
        } else {
          WagmartState.cart.items[itemIndex].quantity = targetQty;
          WagmartState.cart.items[itemIndex].final_line_price =
            (WagmartState.cart.items[itemIndex].final_price || WagmartState.cart.items[itemIndex].price || 0) * targetQty;
        }
      } else if (targetQty > 0) {
        WagmartState.cart.items.push({
          id: keyOrId,
          key: String(keyOrId),
          product_id: keyOrId,
          variant_id: keyOrId,
          title: 'Product',
          product_title: 'Product',
          price: 79900,
          final_price: 79900,
          original_line_price: 79900,
          final_line_price: 79900 * targetQty,
          quantity: targetQty,
          image: '',
        });
      }

      this._recalcLocalCart();
      this.render();

      // 2. If it's a numeric Shopify variant, post to /cart/change.js
      if (!isNaN(Number(keyOrId)) && Number(keyOrId) > 0) {
        try {
          const res = await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ id: String(keyOrId), quantity: Math.max(0, targetQty) }),
          });
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data) {
              const mockItems = WagmartState.cart.items.filter((i) => isNaN(Number(i.id)) || Number(i.id) <= 0);
              WagmartState.cart = data;
              if (mockItems.length > 0) {
                WagmartState.cart.items.push(...mockItems);
                this._recalcLocalCart();
              }
              this.render();
            }
          }
        } catch (err) {
          console.warn('Shopify cart change API warning:', err);
        }
      }

      this.setLoading(false);
    },

    async clear() {
      this.setLoading(true);
      WagmartState.cart = { items: [], item_count: 0, total_price: 0 };
      try {
        localStorage.removeItem('wagmart_local_cart');
      } catch (e) {}
      this.render();
      try {
        await fetch('/cart/clear.js', { method: 'POST', headers: { Accept: 'application/json' } });
      } catch (err) {
        this.notify('Your cart could not be cleared.');
      }
      await this.fetch();
      this.setLoading(false);
    },

    ensureDrawer() {
      let drawer = document.getElementById('cart-drawer');
      if (drawer) return drawer;
      const isStaticPreview = window.location.pathname.endsWith('.html') || window.location.protocol === 'file:';
      const cartUrl = isStaticPreview ? './cart_preview.html' : '/cart';
      const shopUrl = isStaticPreview ? './collection_preview.html' : '/collections/all';
      const fallbackImg = isStaticPreview ? './assets/catalog-bath-massage-brush.webp' : '/assets/catalog-grooming-glove.webp';
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="wm-cart" id="cart-drawer" aria-hidden="true" data-cart-drawer data-fallback-image="${fallbackImg}">
          <div class="wm-backdrop" data-close-cart></div>
          <div class="wm-cart__panel" role="dialog" aria-modal="true" aria-labelledby="WmCartTitle" tabindex="-1">
            <div class="wm-cart__head">
              <h2 class="wm-cart__title" id="WmCartTitle">
                Your Cart<span class="wm-cart__count">(<span data-cart-total-qty id="cart-drawer-total-qty">0</span>)</span>
              </h2>
              <button type="button" class="wm-close-btn" data-close-cart aria-label="Close cart">
                <svg class="wm-icon wm-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="wm-cart__progress" aria-hidden="true"></div>
            <div class="wm-cart__body">
              <p class="wm-cart__notice" role="alert" data-cart-notice></p>
              <div id="cart-drawer-empty" class="wm-cart__empty">
                <span class="wm-cart__empty-icon">
                  <svg class="wm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 8h13l-.9 11.1a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9Z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></svg>
                </span>
                <h3>Your cart is empty</h3>
                <p>Find grooming, walking and feeding essentials your pet will love.</p>
                <a class="wm-btn wm-btn--primary" href="${shopUrl}">
                  <span class="wm-btn__label">Shop all products</span>
                </a>
              </div>
              <ul id="cart-drawer-items" class="wm-cart__items hidden" aria-label="Cart items"></ul>
            </div>
            <div id="cart-drawer-footer" class="wm-cart__foot hidden">
              <div class="wm-cart__row">
                <span>Subtotal</span>
                <strong id="cart-drawer-subtotal">₹0</strong>
              </div>
              <p class="wm-cart__fine">Taxes, discounts and shipping are calculated at checkout.</p>
              <form action="${cartUrl}" method="post" id="cart-drawer-form" class="wm-cart__actions">
                <a href="${cartUrl}" class="wm-btn wm-btn--outline">
                  <span class="wm-btn__label">View Cart</span>
                </a>
                <button type="submit" name="checkout" class="wm-btn wm-btn--primary">
                  <span class="wm-btn__label">Checkout</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      `;
      drawer = wrap.firstElementChild;
      document.body.appendChild(drawer);
      return drawer;
    },

    openDrawer() {
      const drawer = this.ensureDrawer();
      if (!drawer) return;
      this.render();
      if (!drawer.classList.contains('is-open')) {
        this._lastTrigger = document.activeElement;
      }
      document.dispatchEvent(new CustomEvent('wagmart:overlay-open', { detail: { id: 'cart-drawer' } }));
      requestAnimationFrame(() => {
        drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        document.querySelectorAll('[data-open-cart]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
        document.body.classList.add('overflow-hidden');
        document.body.style.overflow = 'hidden';
        const panel = drawer.querySelector('[role="dialog"]');
        if (panel) setTimeout(() => panel.focus({ preventScroll: true }), 60);
      });
    },

    closeDrawer() {
      const drawer = document.getElementById('cart-drawer');
      if (!drawer || !drawer.classList.contains('is-open')) return;
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('[data-open-cart]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      document.body.classList.remove('overflow-hidden');
      document.body.style.overflow = '';
      if (this._lastTrigger && typeof this._lastTrigger.focus === 'function') {
        this._lastTrigger.focus({ preventScroll: true });
      }
      this._lastTrigger = null;
    },

    render() {
      // Update badge counts across page
      const count = WagmartState.cart.item_count || 0;
      document.querySelectorAll('[data-cart-count], #header-cart-count, #cart-counter').forEach((el) => {
        el.textContent = count;
        if (count > 0) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      });
      document.querySelectorAll('[data-cart-count-label]').forEach((el) => {
        el.textContent = `${count} ${count === 1 ? 'item' : 'items'} in cart`;
      });

      // Update drawer elements
      const listContainer = document.getElementById('cart-drawer-items');
      const emptyContainer = document.getElementById('cart-drawer-empty');
      const footerContainer = document.getElementById('cart-drawer-footer');
      const subtotalEl = document.getElementById('cart-drawer-subtotal');
      const totalQuantityEl = document.getElementById('cart-drawer-total-qty');

      if (totalQuantityEl) totalQuantityEl.textContent = count;
      if (listContainer) {
        if (WagmartState.cart.items.length === 0) {
          listContainer.classList.add('hidden');
          listContainer.innerHTML = '';
          if (footerContainer) footerContainer.classList.add('hidden');
          if (emptyContainer) emptyContainer.classList.remove('hidden');
        } else {
          if (emptyContainer) emptyContainer.classList.add('hidden');
          listContainer.classList.remove('hidden');
          if (footerContainer) footerContainer.classList.remove('hidden');

          if (subtotalEl) {
            subtotalEl.textContent = formatMoney(WagmartState.cart.total_price || 0);
          }

          listContainer.innerHTML = WagmartState.cart.items
            .map((item) => {
              const key = escapeHtml(item.key || item.id);
              const title = escapeHtml(item.product_title || item.title);
              const url = escapeHtml(item.url || '#');
              const drawerFallback = document.getElementById('cart-drawer')?.getAttribute('data-fallback-image') || '';
              const rawImage = item.featured_image?.url || item.image || drawerFallback;
              const imageSrc = rawImage
                ? escapeHtml(rawImage + (rawImage.includes('?') ? '&' : '?') + 'width=200')
                : '';
              const variant =
                item.product_has_only_default_variant || !item.variant_title
                  ? ''
                  : `<p class="wm-line__variant">${escapeHtml(item.variant_title)}</p>`;
              const props = Object.entries(item.properties || {})
                .filter(([k, v]) => v && String(k).charAt(0) !== '_')
                .map(([k, v]) => `<p class="wm-line__variant">${escapeHtml(k)}: ${escapeHtml(v)}</p>`)
                .join('');
              const unit =
                item.quantity > 1
                  ? `<p class="wm-line__unit">${formatMoney(item.final_price || item.price || 0)} each</p>`
                  : '';
              const linePrice = item.final_line_price != null ? item.final_line_price : (item.price || 0) * item.quantity;
              const original =
                item.original_line_price > linePrice ? `<s>${formatMoney(item.original_line_price)}</s>` : '';

              return `
              <li class="wm-line" data-cart-item-id="${key}">
                <a class="wm-line__media" href="${url}" tabindex="-1" aria-hidden="true">
                  ${imageSrc ? `<img src="${imageSrc}" alt="${title}" width="84" height="84" loading="lazy" onerror="this.onerror=null;if('${drawerFallback}')this.src='${drawerFallback}';">` : ''}
                </a>
                <div>
                  <a class="wm-line__title" href="${url}">${title}</a>
                  ${variant}${props}${unit}
                  <div class="wm-line__actions">
                    <div class="wm-qty" role="group" aria-label="Quantity for ${title}">
                      <button type="button" data-cart-qty-btn="-1" data-key="${key}" aria-label="Decrease quantity">&minus;</button>
                      <output aria-live="polite">${Number(item.quantity) || 0}</output>
                      <button type="button" data-cart-qty-btn="1" data-key="${key}" aria-label="Increase quantity">+</button>
                    </div>
                    <button type="button" class="wm-line__remove" data-cart-remove="${key}" aria-label="Remove ${title}">Remove</button>
                  </div>
                </div>
                <p class="wm-line__price">${formatMoney(linePrice)}${original}</p>
              </li>
            `;
            })
            .join('');
        }
      }

      // Update Product Card Steppers across page
      document.querySelectorAll('[data-product-card]').forEach((card) => {
        const prodId = card.getAttribute('data-product-id');
        if (!prodId) return;
        const cartItem = WagmartState.cart.items.find(
          (i) =>
            String(i.id) === String(prodId) ||
            (i.variant_id && String(i.variant_id) === String(prodId)) ||
            (i.product_id && String(i.product_id) === String(prodId))
        );
        const qty = cartItem ? Number(cartItem.quantity) || 0 : 0;
        const addBtn = card.querySelector('[data-add-to-cart]');
        const stepper = card.querySelector('[data-card-stepper]');
        const qtyDisplay = card.querySelector('[data-card-qty]');

        if (addBtn && stepper) {
          if (qty > 0) {
            addBtn.classList.add('hidden');
            stepper.classList.remove('hidden');
            if (qtyDisplay) qtyDisplay.textContent = qty;
          } else {
            addBtn.classList.remove('hidden');
            stepper.classList.add('hidden');
          }
        }
      });

      document.dispatchEvent(new CustomEvent('wagmart:cart-updated', { detail: WagmartState.cart }));
    },
  };

  // =========================================================================
  // 2. WISHLIST INTEGRATION (LocalStorage)
  // =========================================================================
  const Wishlist = {
    init() {
      this.render();
    },

    toggle(product) {
      const index = WagmartState.wishlist.findIndex((p) => p.id == product.id);
      if (index > -1) {
        WagmartState.wishlist.splice(index, 1);
      } else {
        WagmartState.wishlist.push(product);
      }
      this.save();
      this.render();
    },

    remove(productId) {
      WagmartState.wishlist = WagmartState.wishlist.filter((p) => p.id != productId);
      this.save();
      this.render();
    },

    save() {
      localStorage.setItem('wagmart_wishlist', JSON.stringify(WagmartState.wishlist));
    },

    open() {
      const modal = document.getElementById('wishlist-modal');
      if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }
    },

    close() {
      const modal = document.getElementById('wishlist-modal');
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    },

    render() {
      const count = WagmartState.wishlist.length;
      document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
        el.textContent = count;
        if (count > 0) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      });

      // Update wishlist heart icons on all product cards
      document.querySelectorAll('[data-product-card]').forEach((card) => {
        const prodId = card.getAttribute('data-product-id');
        const isWishlisted = WagmartState.wishlist.some((p) => p.id == prodId);
        const heartSvg = card.querySelector('[data-wishlist-btn] svg');
        if (heartSvg) {
          if (isWishlisted) {
            heartSvg.classList.add('fill-[#E11D48]', 'text-[#E11D48]', 'scale-105');
            heartSvg.classList.remove('text-neutral-700');
          } else {
            heartSvg.classList.remove('fill-[#E11D48]', 'text-[#E11D48]', 'scale-105');
            heartSvg.classList.add('text-neutral-700');
          }
        }
      });

      // Update Wishlist Drawer Content
      const listContainer = document.getElementById('wishlist-items-container');
      const emptyContainer = document.getElementById('wishlist-empty-state');
      if (!listContainer) return;

      if (count === 0) {
        listContainer.classList.add('hidden');
        if (emptyContainer) emptyContainer.classList.remove('hidden');
      } else {
        if (emptyContainer) emptyContainer.classList.add('hidden');
        listContainer.classList.remove('hidden');

        listContainer.innerHTML = WagmartState.wishlist
          .map((prod) => `
            <div class="p-3.5 bg-neutral-50 rounded-2xl border border-[#EAE5D9] flex items-center gap-3.5" data-wishlist-item="${prod.id}">
              <div class="w-16 h-16 bg-white rounded-xl p-1.5 border border-[#F0EBE1] flex-shrink-0 flex items-center justify-center overflow-hidden">
                <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-contain">
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-[10px] font-bold text-gray-400 uppercase">WAGMART</span>
                <h4 class="font-bold text-sm text-[#111827] truncate">${prod.name}</h4>
                <p class="text-xs text-[#7a46e5] font-semibold">${prod.priceDisplay || '₹' + prod.price}</p>
                <div class="mt-2">
                  <button type="button" class="px-3 py-1.5 bg-[#7a46e5] hover:bg-[#6835d6] text-white text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer" data-wishlist-add-cart="${prod.id}">
                    <span>Move to Cart</span>
                  </button>
                </div>
              </div>
              <button type="button" class="p-2 text-gray-400 hover:text-red-500 transition cursor-pointer" data-wishlist-remove="${prod.id}">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          `)
          .join('');
      }
    },
  };

  // =========================================================================
  // 4. UNIFIED QUICK VIEW DRAWER CONTROLLER (#wm-quick-view-modal)
  // =========================================================================
  const QuickView = {
    get modal() {
      return document.getElementById('wm-quick-view-modal') || document.getElementById('quick-view-modal');
    },

    activeCard: null,
    lastTrigger: null,
    _closeTimer: null,
    _isSubmitting: false,
    _boundSwipe: false,
    images: [],
    currentImageIndex: 0,
    variants: [],
    options: [],
    selectedOptions: [],
    selectedVariantId: '47698787172524',
    isAvailable: true,
    currentProduct: {
      id: '47698787172524',
      title: 'Pet Grooming Glove',
      category: 'GROOMING',
      sku: 'PGG-001',
      priceVal: 330,
      compareVal: 0,
      image: '',
      url: '/products/pet-grooming-glove',
      desc: 'Crafted with pet-safe, vet-approved materials for daily comfort and care.',
    },

    // Strip unwanted kilogram / gram / per-kg pricing labels from Quick View display strings
    sanitizeWeightText(str) {
      if (!str) return '';
      return String(str)
        .replace(/\(\s*\d+(?:\.\d+)?\s*(?:kg|g|gm|grams|kilograms|lb|lbs)\s*\)/gi, '')
        .replace(/₹\s*\d+(?:,\d+)*(?:\.\d+)?\s*\/\s*(?:\d+\s*)?(?:kg|g|gm|500g|100g)\b/gi, '')
        .replace(/\b\d+(?:\.\d+)?\s*(?:kg|kilograms)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    },

    // Detect if an option group or option value is a weight/kilogram selector that must be hidden
    isWeightOption(optionName, values) {
      const nameNorm = String(optionName || '').trim().toLowerCase();
      if (
        nameNorm === 'weight' ||
        nameNorm.includes('weight') ||
        nameNorm.includes('kilogram') ||
        nameNorm === 'kg' ||
        nameNorm.includes('pack weight')
      ) {
        return true;
      }
      const weightPattern = /\b\d+(?:\.\d+)?\s*(?:kg|g|gm|grams|kilograms|lb|lbs)\b|\/\s*(?:\d+\s*)?(?:kg|g|500g)/i;
      if (Array.isArray(values) && values.some((v) => weightPattern.test(String(v || '')))) {
        return true;
      }
      return false;
    },

    deriveSku(title, prodId, rawSku) {
      if (rawSku && String(rawSku).trim()) {
        return this.sanitizeWeightText(String(rawSku).trim());
      }
      const words = String(title || 'Pet Care')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const prefix = words
        .slice(0, 3)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || 'WM';
      const numMatch = String(prodId || '').match(/\d+/);
      const suffix = numMatch ? String(numMatch[0]).slice(-3).padStart(3, '0') : '001';
      return `${prefix}-${suffix}`;
    },

    buildGalleryImages(primaryImg, card, extraImages) {
      const list = [];
      const addUnique = (src) => {
        if (!src || typeof src !== 'string') return;
        const clean = src.trim();
        if (!clean || clean === '#' || clean.endsWith('/undefined')) return;
        if (!list.includes(clean)) list.push(clean);
      };

      addUnique(primaryImg);

      if (Array.isArray(extraImages)) {
        extraImages.forEach(addUnique);
      } else if (typeof extraImages === 'string' && extraImages.trim()) {
        extraImages.split('|').forEach(addUnique);
      }

      if (list.length === 0 && card && card.querySelector) {
        const primaryEl = card.querySelector('.wm-plp-card__img--primary, img');
        if (primaryEl) {
          const s = primaryEl.getAttribute('src');
          if (s) addUnique(s);
        }
      }

      // Ensure gallery images always match the main product image when a product has a single image
      if (list.length === 1 && list[0]) {
        return [list[0], list[0], list[0]];
      }

      return list.slice(0, 8);
    },

    renderGallery() {
      const modal = this.modal;
      if (!modal) return;

      const qvImg = modal.querySelector('[data-qv-image]');
      const thumbsWrap = modal.querySelector('[data-qv-thumbs]');
      const pagerWrap = modal.querySelector('[data-qv-pager]');
      const dotsWrap = modal.querySelector('[data-qv-dots]');
      const prevBtn = modal.querySelector('[data-qv-prev]');
      const nextBtn = modal.querySelector('[data-qv-next]');

      const imgs = this.images.length > 0 ? this.images : [this.currentProduct.image].filter(Boolean);
      const count = imgs.length;
      if (this.currentImageIndex >= count || this.currentImageIndex < 0) {
        this.currentImageIndex = 0;
      }

      const activeSrc = imgs[this.currentImageIndex] || '';
      if (qvImg && activeSrc) {
        qvImg.src = activeSrc;
        qvImg.alt = `${this.currentProduct.title} - view ${this.currentImageIndex + 1}`;
      }

      if (pagerWrap) pagerWrap.hidden = count <= 1;
      if (prevBtn) prevBtn.hidden = count <= 1;
      if (nextBtn) nextBtn.hidden = count <= 1;

      if (thumbsWrap) {
        if (count <= 1) {
          thumbsWrap.hidden = true;
          thumbsWrap.innerHTML = '';
        } else {
          thumbsWrap.hidden = false;
          const secondaryItems = imgs
            .map((src, idx) => ({ src, idx }))
            .filter((item) => item.idx !== this.currentImageIndex);
          thumbsWrap.innerHTML = secondaryItems
            .map(
              ({ src, idx }) => `
              <button
                type="button"
                class="wm-plp-modal__thumb${idx === this.currentImageIndex ? ' is-active' : ''}"
                data-qv-thumb="${idx}"
                role="option"
                aria-selected="${idx === this.currentImageIndex ? 'true' : 'false'}"
                aria-label="View image ${idx + 1} of ${count}"
              >
                <img src="${escapeHtml(src)}" alt="${escapeHtml(this.currentProduct.title)} gallery image ${idx + 1}" width="420" height="420" loading="lazy">
              </button>
            `
            )
            .join('');
        }
      }

      if (dotsWrap) {
        if (count <= 1) {
          dotsWrap.hidden = true;
          dotsWrap.innerHTML = '';
        } else {
          dotsWrap.hidden = false;
          dotsWrap.innerHTML = imgs
            .map(
              (_, idx) => `
              <button
                type="button"
                class="wm-plp-modal__dot${idx === this.currentImageIndex ? ' is-active' : ''}"
                data-qv-dot="${idx}"
                role="tab"
                aria-selected="${idx === this.currentImageIndex ? 'true' : 'false'}"
                aria-label="Go to image ${idx + 1}"
              ></button>
            `
            )
            .join('');
        }
      }
    },

    setGalleryImage(index) {
      const count = this.images.length;
      if (count <= 1) return;
      this.currentImageIndex = ((index % count) + count) % count;
      this.renderGallery();
    },

    renderOptions() {
      const modal = this.modal;
      if (!modal) return;
      const optionsWrap = modal.querySelector('[data-qv-options]');
      if (!optionsWrap) return;

      // Filter out Default Title and any weight / kilogram options
      const validOptions = (this.options || []).filter((opt) => {
        if (!opt || !Array.isArray(opt.values) || opt.values.length === 0) return false;
        if (opt.values.length === 1 && String(opt.values[0]).toLowerCase() === 'default title') return false;
        if (String(opt.name || '').toLowerCase() === 'title' && opt.values.length <= 1) return false;
        if (this.isWeightOption(opt.name, opt.values)) return false;
        return true;
      });

      if (validOptions.length === 0) {
        optionsWrap.hidden = true;
        optionsWrap.innerHTML = '';
        return;
      }

      optionsWrap.hidden = false;
      optionsWrap.innerHTML = validOptions
        .map((opt) => {
          const optIdx = opt.position ? opt.position - 1 : 0;
          const currentVal = this.selectedOptions[optIdx] || opt.values[0];
          const buttonsHtml = opt.values
            .filter((val) => !this.isWeightOption('', [val]))
            .map((val) => {
              const isSelected = String(val) === String(currentVal);
              return `
                <button
                  type="button"
                  class="wm-plp-modal__option-btn${isSelected ? ' is-selected' : ''}"
                  data-qv-option-btn
                  data-option-index="${optIdx}"
                  data-option-value="${escapeHtml(val)}"
                  aria-pressed="${isSelected ? 'true' : 'false'}"
                >
                  ${escapeHtml(this.sanitizeWeightText(val))}
                </button>
              `;
            })
            .join('');

          if (!buttonsHtml.trim()) return '';
          return `
            <div class="wm-plp-modal__option-group">
              <span class="wm-plp-modal__option-label">${escapeHtml(this.sanitizeWeightText(opt.name))}: <strong>${escapeHtml(this.sanitizeWeightText(currentVal))}</strong></span>
              <div class="wm-plp-modal__option-values">
                ${buttonsHtml}
              </div>
            </div>
          `;
        })
        .join('');

      if (!optionsWrap.innerHTML.trim()) {
        optionsWrap.hidden = true;
      }
    },

    selectOption(optIndex, optValue) {
      this.selectedOptions[optIndex] = optValue;
      if (Array.isArray(this.variants) && this.variants.length > 0) {
        const matched = this.variants.find((v) =>
          Array.isArray(v.options) &&
          this.selectedOptions.every((sel, idx) => !sel || String(v.options[idx]) === String(sel))
        );
        if (matched) {
          this.selectedVariantId = String(matched.id);
          this.isAvailable = true;
          const pVal = Math.round((Number(matched.price) || 0) / 100);
          const cVal = Math.round((Number(matched.compare_at_price) || 0) / 100);
          if (pVal > 0) {
            this.currentProduct.priceVal = pVal;
            this.currentProduct.compareVal = cVal > pVal ? cVal : 0;
          }
          if (matched.sku) {
            this.currentProduct.sku = this.deriveSku(this.currentProduct.title, matched.id, matched.sku);
          }
          if (matched.featured_image && matched.featured_image.src) {
            const vImg = matched.featured_image.src.startsWith('//')
              ? 'https:' + matched.featured_image.src
              : matched.featured_image.src;
            const existingIdx = this.images.indexOf(vImg);
            if (existingIdx !== -1) {
              this.currentImageIndex = existingIdx;
            } else {
              this.images.unshift(vImg);
              this.currentImageIndex = 0;
            }
          }
          this.syncDetailsUI();
          this.renderGallery();
        }
      }
      this.renderOptions();
    },

    setQuantity(qty) {
      const modal = this.modal;
      if (!modal) return;
      const validQty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
      const input = modal.querySelector('[data-qv-qty-input]');
      const decBtn = modal.querySelector('[data-qv-qty-dec]');
      if (input) input.value = String(validQty);
      if (decBtn) decBtn.disabled = validQty <= 1;
    },

    getQuantity() {
      const input = this.modal?.querySelector('[data-qv-qty-input]');
      return Math.max(1, Math.min(99, parseInt(input?.value || '1', 10) || 1));
    },

    showFeedback(message, type = 'success') {
      const feedbackEl = this.modal?.querySelector('[data-qv-feedback]');
      if (!feedbackEl) return;
      if (!message) {
        feedbackEl.hidden = true;
        feedbackEl.textContent = '';
        feedbackEl.className = 'wm-plp-modal__feedback';
        return;
      }
      feedbackEl.textContent = message;
      feedbackEl.className = `wm-plp-modal__feedback ${type === 'error' ? 'is-error' : 'is-success'}`;
      feedbackEl.hidden = false;
    },

    syncDetailsUI() {
      const modal = this.modal;
      if (!modal) return;

      const p = this.currentProduct;
      const qvTitle = modal.querySelector('[data-qv-title]');
      const qvTitleLink = modal.querySelector('[data-qv-title-link]');
      const qvImageLink = modal.querySelector('[data-qv-image-link]');
      const qvCategory = modal.querySelector('[data-qv-category]');
      const qvSkuWrap = modal.querySelector('[data-qv-sku-wrap]');
      const qvSku = modal.querySelector('[data-qv-sku]');
      const qvRatingWrap = modal.querySelector('[data-qv-rating-wrap]');
      const qvRating = modal.querySelector('[data-qv-rating]');
      const qvReviews = modal.querySelector('[data-qv-reviews]');
      const qvPrice = modal.querySelector('[data-qv-price]');
      const qvCompare = modal.querySelector('[data-qv-compare]');
      const qvBadge = modal.querySelector('[data-qv-badge]');
      const qvDesc = modal.querySelector('[data-qv-desc]');
      const qvFullLink = modal.querySelector('[data-qv-full-link], [data-qv-link]');
      const qvAtcBtn = modal.querySelector('[data-qv-atc]');
      const qvAtcLabel = modal.querySelector('[data-qv-atc-label]');
      const qvBuyBtn = modal.querySelector('[data-qv-buy-now]');
      const qvBuyLabel = modal.querySelector('[data-qv-buy-label]');
      const qvProxy = modal.querySelector('[data-qv-card-proxy]');

      const cleanTitle = this.sanitizeWeightText(p.title) || 'Pet Care Essential';
      const cleanDesc = this.sanitizeWeightText(p.desc) || 'Crafted with pet-safe, vet-approved materials for daily comfort and care.';
      const priceStr = `₹${Math.round(p.priceVal).toLocaleString('en-IN')}`;
      const hasDiscount = p.compareVal > p.priceVal && p.compareVal > 0;
      const compareStr = hasDiscount ? `₹${Math.round(p.compareVal).toLocaleString('en-IN')}` : '';
      const discountPct = hasDiscount ? Math.round(((p.compareVal - p.priceVal) / p.compareVal) * 100) : 0;

      if (qvTitle) qvTitle.textContent = cleanTitle;
      if (qvTitleLink) qvTitleLink.href = p.url || '/products/pet-grooming-glove';
      if (qvImageLink) qvImageLink.href = p.url || '/products/pet-grooming-glove';

      if (qvCategory) {
        qvCategory.textContent = p.category || 'GROOMING';
        qvCategory.hidden = !p.category;
      }

      if (qvSku && qvSkuWrap) {
        qvSku.textContent = p.sku || 'WM-001';
        qvSkuWrap.hidden = !p.sku;
      }

      if (qvRatingWrap) {
        if (p.rating && Number(p.rating) > 0 && p.reviews && Number(p.reviews) > 0) {
          if (qvRating) qvRating.textContent = String(p.rating);
          if (qvReviews) qvReviews.textContent = `(${p.reviews} reviews)`;
          qvRatingWrap.hidden = false;
        } else {
          qvRatingWrap.hidden = true;
        }
      }

      if (qvPrice) qvPrice.textContent = priceStr;

      if (qvCompare) {
        if (hasDiscount && compareStr) {
          qvCompare.textContent = compareStr;
          qvCompare.hidden = false;
        } else {
          qvCompare.textContent = '';
          qvCompare.hidden = true;
        }
      }

      if (qvBadge) {
        if (hasDiscount && discountPct > 0) {
          qvBadge.textContent = `Save ${discountPct}%`;
          qvBadge.hidden = false;
        } else {
          qvBadge.textContent = '';
          qvBadge.hidden = true;
        }
      }

      if (qvDesc) qvDesc.textContent = cleanDesc;

      if (qvFullLink) {
        qvFullLink.href = p.url || '/products/pet-grooming-glove';
        qvFullLink.hidden = false;
      }

      if (qvAtcBtn) {
        qvAtcBtn.disabled = !this.isAvailable;
        if (qvAtcLabel) {
          qvAtcLabel.textContent = this.isAvailable ? 'Add to cart' : 'Out of stock';
        }
      }

      if (qvBuyBtn) {
        qvBuyBtn.disabled = !this.isAvailable;
        if (qvBuyLabel) {
          qvBuyLabel.textContent = this.isAvailable ? 'Buy it now' : 'Unavailable';
        }
      }

      if (qvProxy) {
        qvProxy.setAttribute('data-product-id', this.selectedVariantId);
        qvProxy.setAttribute('data-product-name', cleanTitle);
        qvProxy.setAttribute('data-product-price', priceStr);
        qvProxy.setAttribute('data-product-compare-price', compareStr);
        qvProxy.setAttribute('data-product-image', this.images[0] || p.image || '');
        qvProxy.setAttribute('data-product-url', p.url || '/products/pet-grooming-glove');
      }
    },

    initSwipeAndKeyboard() {
      if (this._boundSwipe) return;
      const modal = this.modal;
      if (!modal) return;
      this._boundSwipe = true;

      // Touch swipe on gallery stage
      const stage = modal.querySelector('[data-qv-stage]');
      if (stage) {
        let startX = null;
        stage.addEventListener(
          'touchstart',
          (e) => {
            if (e.touches && e.touches.length === 1) {
              startX = e.touches[0].clientX;
            }
          },
          { passive: true }
        );
        stage.addEventListener(
          'touchend',
          (e) => {
            if (startX === null || !e.changedTouches || !e.changedTouches.length) return;
            const diffX = e.changedTouches[0].clientX - startX;
            if (Math.abs(diffX) > 40) {
              if (diffX < 0) this.setGalleryImage(this.currentImageIndex + 1);
              else this.setGalleryImage(this.currentImageIndex - 1);
            }
            startX = null;
          },
          { passive: true }
        );
      }

      // Direct input change for quantity
      const qtyInput = modal.querySelector('[data-qv-qty-input]');
      if (qtyInput) {
        qtyInput.addEventListener('change', () => {
          this.setQuantity(qtyInput.value);
        });
        qtyInput.addEventListener('input', () => {
          if (qtyInput.value !== '' && Number(qtyInput.value) < 1) {
            this.setQuantity(1);
          }
        });
      }

      // Focus trap inside modal while open
      modal.addEventListener('keydown', (e) => {
        if (modal.hidden) return;
        if (e.key === 'ArrowLeft' && document.activeElement?.closest('[data-qv-stage], [data-qv-thumbs], [data-qv-dots]')) {
          e.preventDefault();
          this.setGalleryImage(this.currentImageIndex - 1);
          return;
        }
        if (e.key === 'ArrowRight' && document.activeElement?.closest('[data-qv-stage], [data-qv-thumbs], [data-qv-dots]')) {
          e.preventDefault();
          this.setGalleryImage(this.currentImageIndex + 1);
          return;
        }
        if (e.key !== 'Tab') return;
        const focusables = Array.from(
          modal.querySelectorAll(
            'a[href]:not([tabindex="-1"]), button:not(:disabled):not([hidden]), input:not(:disabled):not([hidden]), select:not(:disabled):not([hidden]), textarea:not(:disabled):not([hidden]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
    },

    async open(cardOrHandle, triggerEl = null) {
      const modal = this.modal;
      if (!modal) return;

      if (this._closeTimer) {
        clearTimeout(this._closeTimer);
        this._closeTimer = null;
      }

      this.initSwipeAndKeyboard();
      this.lastTrigger = triggerEl || document.activeElement;

      // Close open desktop header panels
      document.querySelectorAll('.wm-panel.is-open').forEach((p) => p.classList.remove('is-open'));
      document.querySelectorAll('.wm-header').forEach((h) => h.classList.remove('is-panel-open'));

      let title = '';
      let category = '';
      let img = '';
      let extraImages = '';
      let desc = '';
      let url = '/products/pet-grooming-glove';
      let prodId = '47698787172524';
      let handle = '';
      let rawSku = '';
      let priceVal = 330;
      let compareVal = 0;
      let rating = '';
      let reviews = '';
      let available = true;

      let card = null;
      if (typeof cardOrHandle === 'string') {
        handle = cardOrHandle;
        card = document.querySelector(
          `[data-product-card][data-product-id="${cardOrHandle}"], [data-product-card][data-handle="${cardOrHandle}"]`
        );
      } else if (cardOrHandle && cardOrHandle.nodeType) {
        card = cardOrHandle.closest('[data-product-card]') || cardOrHandle.closest('.wm-card') || cardOrHandle;
      }

      if (card && (card.getAttribute('data-title') || card.getAttribute('data-product-name'))) {
        this.activeCard = card;
        prodId = card.getAttribute('data-product-id') || '47698787172524';
        handle = card.getAttribute('data-handle') || '';
        rawSku = card.getAttribute('data-sku') || '';
        title = card.getAttribute('data-title') || card.getAttribute('data-product-name') || 'Pet Care Essential';
        const rawCat = card.getAttribute('data-category') || card.getAttribute('data-product-category') || 'GROOMING';
        category = (rawCat.split(',')[0] || 'GROOMING').trim().toUpperCase();
        const rawPriceStr = card.getAttribute('data-price') || card.getAttribute('data-product-price') || '330';
        const rawCompareStr =
          card.getAttribute('data-compare-price') ||
          card.getAttribute('data-product-compare-price') ||
          card.getAttribute('data-product-original-price') ||
          '0';
        priceVal = parseFloat(String(rawPriceStr).replace(/[^0-9.]/g, '')) || 330;
        compareVal = parseFloat(String(rawCompareStr).replace(/[^0-9.]/g, '')) || 0;
        img = card.getAttribute('data-image') || card.getAttribute('data-product-image') || '';
        extraImages = card.getAttribute('data-images') || '';
        desc =
          card.getAttribute('data-desc') ||
          card.getAttribute('data-product-desc') ||
          card.querySelector('.wm-plp-card__list-desc, .wm-plp-card__desc')?.textContent?.trim() ||
          'Crafted with pet-safe, vet-approved materials for daily comfort and care.';
        url = card.getAttribute('data-url') || card.getAttribute('data-product-url') || '/products/pet-grooming-glove';
        rating = card.getAttribute('data-rating') || '';
        reviews = card.getAttribute('data-reviews') || '';

        available = true;

        if (!handle && url && url.includes('/products/')) {
          const m = url.split('/products/')[1];
          if (m) handle = m.split(/[?#]/)[0];
        }
      } else {
        handle =
          typeof cardOrHandle === 'string'
            ? cardOrHandle
            : cardOrHandle?.getAttribute('data-quick-view') || 'pet-grooming-glove';
      }

      this.selectedVariantId = String(prodId);
      this.isAvailable = available;
      this.variants = [];
      this.options = [];
      this.selectedOptions = [];
      this.currentProduct = {
        id: String(prodId),
        title: this.sanitizeWeightText(title || 'Pet Grooming Glove'),
        category: category || 'GROOMING',
        sku: this.deriveSku(title, prodId, rawSku),
        priceVal,
        compareVal: compareVal > priceVal ? compareVal : 0,
        image: img,
        url,
        desc: this.sanitizeWeightText(desc),
        rating,
        reviews,
      };

      this.images = this.buildGalleryImages(img, card, extraImages);
      this.currentImageIndex = 0;

      // Reset quantity to 1 and clear old status messages
      this.setQuantity(1);
      this.showFeedback('');
      this.syncDetailsUI();
      this.renderGallery();
      this.renderOptions();

      // Reset scroll position inside drawer
      const scrollContainer = modal.querySelector('[data-qv-scroll-container]');
      if (scrollContainer) scrollContainer.scrollTop = 0;

      // Open Drawer with Smooth Animation
      modal.hidden = false;
      modal.classList.remove('hidden', 'is-closing');
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          modal.classList.add('is-open');
        });
      });

      const closeBtn = modal.querySelector('[data-qv-close], [data-close-quick-view]');
      if (closeBtn) {
        setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
      }

      // If a Shopify handle is available, asynchronously enrich with live /products/<handle>.js data
      if (handle && !url.endsWith('.html')) {
        try {
          const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
          const res = await fetch(`${root}products/${encodeURIComponent(handle)}.js`, {
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            const p = await res.json();
            const firstAvail = (p.variants || []).find((v) => v.available) || (p.variants && p.variants[0]);
            if (firstAvail) {
              this.selectedVariantId = String(firstAvail.id);
              this.isAvailable = true;
              this.selectedOptions = Array.isArray(firstAvail.options) ? [...firstAvail.options] : [];
              this.currentProduct.priceVal = Math.round((Number(firstAvail.price) || Number(p.price) || 0) / 100);
              const rawComp = Number(firstAvail.compare_at_price) || Number(p.compare_at_price) || 0;
              const compInr = Math.round(rawComp / 100);
              this.currentProduct.compareVal = compInr > this.currentProduct.priceVal ? compInr : 0;
              if (firstAvail.sku) {
                this.currentProduct.sku = this.deriveSku(p.title, firstAvail.id, firstAvail.sku);
              }
            }
            if (p.title) this.currentProduct.title = this.sanitizeWeightText(p.title);
            if (p.type && p.type !== 'My Store 2' && p.type !== 'My Store') {
              this.currentProduct.category = String(p.type).toUpperCase();
            }
            if (p.description) {
              const rawDesc = new DOMParser()
                .parseFromString(p.description, 'text/html')
                .body.textContent.trim();
              if (rawDesc) {
                this.currentProduct.desc = this.sanitizeWeightText(rawDesc);
              }
            }
            if (p.url) this.currentProduct.url = p.url;
            if (Array.isArray(p.images) && p.images.length > 0) {
              const liveImgs = p.images.map((u) => (u.startsWith('//') ? 'https:' + u : u));
              this.images = this.buildGalleryImages(liveImgs[0], null, liveImgs);
            }
            this.variants = Array.isArray(p.variants) ? p.variants : [];
            this.options = Array.isArray(p.options)
              ? p.options.map((o, idx) =>
                  typeof o === 'string'
                    ? {
                        name: o,
                        position: idx + 1,
                        values: Array.from(new Set(this.variants.map((v) => v.options && v.options[idx]).filter(Boolean))),
                      }
                    : o
                )
              : [];

            this.syncDetailsUI();
            this.renderGallery();
            this.renderOptions();
          }
        } catch (err) {
          // Offline or static preview environment: card data is already rendered
        }
      }
    },

    async addToCart() {
      if (this._isSubmitting) return;
      if (!this.isAvailable) {
        this.showFeedback('This product variant is currently out of stock.', 'error');
        return;
      }

      const modal = this.modal;
      if (!modal) return;

      const atcBtn = modal.querySelector('[data-qv-atc]');
      const atcSpinner = modal.querySelector('[data-qv-atc-spinner]');
      const atcIcon = modal.querySelector('[data-qv-atc-icon]');
      const atcLabel = modal.querySelector('[data-qv-atc-label]');

      const qty = this.getQuantity();
      const variantId = this.selectedVariantId || this.currentProduct.id;
      const p = this.currentProduct;

      this._isSubmitting = true;
      this.showFeedback('');

      if (atcBtn) {
        atcBtn.disabled = true;
        atcBtn.setAttribute('aria-busy', 'true');
      }
      if (atcSpinner) atcSpinner.hidden = false;
      if (atcIcon) atcIcon.style.display = 'none';
      if (atcLabel) atcLabel.textContent = 'Adding...';

      try {
        await Cart.add(variantId, qty, false, {
          name: p.title,
          title: p.title,
          price: Math.round(p.priceVal * 100),
          compare_at_price: p.compareVal > p.priceVal ? Math.round(p.compareVal * 100) : Math.round(p.priceVal * 100),
          image: this.images[0] || p.image || '',
          url: p.url || '/products/pet-grooming-glove',
        });

        this.showFeedback('');
        this.close({ keepScrollLock: true });
        Cart.openDrawer();
      } catch (err) {
        this.showFeedback('Could not add item to cart. Please try again.', 'error');
      } finally {
        this._isSubmitting = false;
        if (atcBtn) {
          atcBtn.disabled = !this.isAvailable;
          atcBtn.removeAttribute('aria-busy');
        }
        if (atcSpinner) atcSpinner.hidden = true;
        if (atcIcon) atcIcon.style.display = '';
        if (atcLabel) atcLabel.textContent = this.isAvailable ? 'Add to cart' : 'Out of stock';
      }
    },

    async buyNow() {
      if (this._isSubmitting) return;
      if (!this.isAvailable) {
        this.showFeedback('This product variant is currently out of stock.', 'error');
        return;
      }

      const modal = this.modal;
      if (!modal) return;

      const buyBtn = modal.querySelector('[data-qv-buy-now]');
      const buySpinner = modal.querySelector('[data-qv-buy-spinner]');
      const buyLabel = modal.querySelector('[data-qv-buy-label]');

      const qty = this.getQuantity();
      const variantId = this.selectedVariantId || this.currentProduct.id;
      const p = this.currentProduct;

      this._isSubmitting = true;
      this.showFeedback('');

      if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.setAttribute('aria-busy', 'true');
      }
      if (buySpinner) buySpinner.hidden = false;
      if (buyLabel) buyLabel.textContent = 'Redirecting to checkout...';

      try {
        await Cart.add(variantId, qty, false, {
          name: p.title,
          title: p.title,
          price: Math.round(p.priceVal * 100),
          compare_at_price: p.compareVal > p.priceVal ? Math.round(p.compareVal * 100) : Math.round(p.priceVal * 100),
          image: this.images[0] || p.image || '',
          url: p.url || '/products/pet-grooming-glove',
        });

        const isNumericShopifyVariant = !isNaN(Number(variantId)) && Number(variantId) > 0;
        const isStaticPreview = window.location.pathname.endsWith('.html') || window.location.protocol === 'file:';

        if (!isStaticPreview && isNumericShopifyVariant) {
          window.location.href = `/cart/${encodeURIComponent(variantId)}:${encodeURIComponent(qty)}`;
        } else if (!isStaticPreview) {
          window.location.href = '/checkout';
        } else {
          window.location.href = './cart_preview.html';
        }
      } catch (err) {
        this.showFeedback('Unable to start checkout. Please try again.', 'error');
        this._isSubmitting = false;
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.removeAttribute('aria-busy');
        }
        if (buySpinner) buySpinner.hidden = true;
        if (buyLabel) buyLabel.textContent = 'Buy it now';
      }
    },

    close(opts = {}) {
      const modal = this.modal;
      if (!modal || modal.hidden) return;

      modal.classList.remove('is-open');
      modal.classList.add('is-closing');

      const prefersReducedMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const delay = prefersReducedMotion ? 0 : 250;

      if (this._closeTimer) clearTimeout(this._closeTimer);
      this._closeTimer = setTimeout(() => {
        modal.hidden = true;
        modal.classList.add('hidden');
        modal.classList.remove('is-closing');
        const cartDrawerOpen = document.getElementById('cart-drawer')?.classList.contains('is-open');
        if (!opts.keepScrollLock && !cartDrawerOpen) {
          document.body.style.overflow = '';
        }
        this._closeTimer = null;

        if (
          !opts.keepScrollLock &&
          !cartDrawerOpen &&
          this.lastTrigger &&
          typeof this.lastTrigger.focus === 'function' &&
          document.body.contains(this.lastTrigger)
        ) {
          this.lastTrigger.focus({ preventScroll: true });
        }
        this.lastTrigger = null;
      }, delay);
    },
  };

  window.WagmartQuickView = QuickView;

  // =========================================================================
  // 5. REEL MODAL (YOUTUBE EMBED)
  // =========================================================================
  const ReelModal = {
    extractId(raw) {
      if (!raw) return '';
      const str = raw.trim();
      if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
      const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : str;
    },

    open(youtubeId, title, tag, story) {
      const modal = document.getElementById('reel-modal');
      if (!modal) return;

      const iframe = modal.querySelector('iframe');
      const titleEl = modal.querySelector('[data-reel-title]');
      const tagEl = modal.querySelector('[data-reel-tag]');
      const storyEl = modal.querySelector('[data-reel-story]');

      const cleanId = this.extractId(youtubeId);

      if (iframe && cleanId) {
        iframe.src = `https://www.youtube.com/embed/${cleanId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
      }
      if (titleEl) titleEl.textContent = title || '';
      if (tagEl) tagEl.textContent = tag || '';
      if (storyEl) storyEl.textContent = story || '';

      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    },

    close() {
      const modal = document.getElementById('reel-modal');
      if (modal) {
        const iframe = modal.querySelector('iframe');
        if (iframe) iframe.src = '';
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    },
  };

  // =========================================================================
  // 6. HERO BANNER CAROUSEL
  // =========================================================================
  function initHeroBanner() {
    const heroSection = document.getElementById('hero');
    if (!heroSection) return;

    const slides = Array.from(heroSection.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(heroSection.querySelectorAll('[data-hero-dot]'));
    const prevBtn = heroSection.querySelector('[data-hero-prev]');
    const nextBtn = heroSection.querySelector('[data-hero-next]');

    if (slides.length <= 1) return;

    let currentSlide = 0;
    let isPaused = false;
    let autoInterval = null;
    let touchStartX = null;

    function showSlide(index) {
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        if (i === currentSlide) {
          slide.classList.remove('opacity-0', '-z-10', 'pointer-events-none');
          slide.classList.add('opacity-100', 'z-10');
        } else {
          slide.classList.remove('opacity-100', 'z-10');
          slide.classList.add('opacity-0', '-z-10', 'pointer-events-none');
        }
      });

      dots.forEach((dot, i) => {
        if (i === currentSlide) {
          dot.classList.add('w-5', 'sm:w-6', 'bg-[#7a46e5]', 'shadow-xs');
          dot.classList.remove('w-2', 'sm:w-2', 'bg-black/25');
        } else {
          dot.classList.remove('w-5', 'sm:w-6', 'bg-[#7a46e5]', 'shadow-xs');
          dot.classList.add('w-2', 'sm:w-2', 'bg-black/25');
        }
      });
    }

    function startAuto() {
      stopAuto();
      autoInterval = setInterval(() => {
        if (!isPaused) showSlide(currentSlide + 1);
      }, 5000);
    }

    function stopAuto() {
      if (autoInterval) clearInterval(autoInterval);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        showSlide(currentSlide - 1);
        startAuto();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        showSlide(currentSlide + 1);
        startAuto();
      });
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        showSlide(idx);
        startAuto();
      });
    });

    heroSection.addEventListener('mouseenter', () => (isPaused = true));
    heroSection.addEventListener('mouseleave', () => (isPaused = false));

    // Touch Swipe
    heroSection.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.touches[0].clientX;
      },
      { passive: true }
    );

    heroSection.addEventListener(
      'touchend',
      (e) => {
        if (touchStartX === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (deltaX > 45) {
          showSlide(currentSlide - 1);
          startAuto();
        } else if (deltaX < -45) {
          showSlide(currentSlide + 1);
          startAuto();
        }
        touchStartX = null;
      },
      { passive: true }
    );

    startAuto();
  }

  // =========================================================================
  // 7. BEST SELLERS CAROUSEL & CATEGORY FILTERS
  // =========================================================================
  function initBestSellers() {
    const shopSection = document.getElementById('shop');
    if (!shopSection) return;

    const scrollContainer = shopSection.querySelector('[data-products-scroll]');
    const prevBtn = shopSection.querySelector('[data-scroll-prev]');
    const nextBtn = shopSection.querySelector('[data-scroll-next]');
    const dotsContainer = shopSection.querySelector('[data-products-dots]');
    const filterPills = Array.from(shopSection.querySelectorAll('[data-filter-tab]'));

    if (!scrollContainer) return;

    function getVisibleCards() {
      return Array.from(scrollContainer.querySelectorAll('[data-product-card]:not(.hidden)'));
    }

    function getCurrentIndex() {
      const cards = getVisibleCards();
      if (cards.length === 0) return 0;
      const currentScroll = scrollContainer.scrollLeft;
      let closestIdx = 0;
      let minDiff = Infinity;
      cards.forEach((c, idx) => {
        const diff = Math.abs(c.offsetLeft - currentScroll);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      return closestIdx;
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const cards = getVisibleCards();
        if (cards.length === 0) return;
        const currentIdx = getCurrentIndex();
        const targetIdx = Math.max(0, currentIdx - 1);
        scrollContainer.scrollTo({ left: cards[targetIdx].offsetLeft, behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const cards = getVisibleCards();
        if (cards.length === 0) return;
        const currentIdx = getCurrentIndex();
        const maxScroll = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
        const targetIdx = Math.min(cards.length - 1, currentIdx + 1);
        const targetLeft = Math.min(maxScroll, cards[targetIdx].offsetLeft);
        scrollContainer.scrollTo({ left: targetLeft, behavior: 'smooth' });
      });
    }

    // Clickable Pagination Dots Manager
    function updateDots() {
      if (!dotsContainer) return;
      const allDots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));
      if (allDots.length === 0) return;

      const visibleDots = allDots.filter((d) => window.getComputedStyle(d).display !== 'none');
      const pageCount = visibleDots.length;
      if (pageCount <= 1) return;

      visibleDots.forEach((dot, idx) => {
        if (!dot._hasThemeClick) {
          dot._hasThemeClick = true;
          dot.addEventListener('click', () => {
            const currentScrollWidth = scrollContainer.scrollWidth;
            const currentContainerWidth = scrollContainer.clientWidth;
            const currentMax = Math.max(1, currentScrollWidth - currentContainerWidth);
            const target = (currentMax / (pageCount - 1)) * idx;
            scrollContainer.scrollTo({ left: target, behavior: 'smooth' });
          });
        }
      });

      const currentScrollWidth = scrollContainer.scrollWidth;
      const currentContainerWidth = scrollContainer.clientWidth;
      const currentMax = Math.max(1, currentScrollWidth - currentContainerWidth);
      const scrollFraction = currentMax > 0 ? scrollContainer.scrollLeft / currentMax : 0;
      const activeIdx = Math.min(pageCount - 1, Math.max(0, Math.round(scrollFraction * (pageCount - 1))));

      visibleDots.forEach((dot, idx) => {
        if (idx === activeIdx) {
          dot.classList.add('is-active');
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.classList.remove('is-active');
          dot.removeAttribute('aria-current');
        }
      });
    }

    let ticking = false;
    scrollContainer.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateDots();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', updateDots, { passive: true });
    window.addEventListener('load', updateDots, { passive: true });

    // Category Tabs Filtering
    filterPills.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-filter-tab');
        filterPills.forEach((p) => {
          if (p === btn) {
            p.classList.add('bg-[#2B1B47]', 'text-white', 'shadow-xs');
            p.classList.remove('bg-white', 'text-[#4B5563]', 'border');
          } else {
            p.classList.remove('bg-[#2B1B47]', 'text-white', 'shadow-xs');
            p.classList.add('bg-white', 'text-[#4B5563]', 'border');
          }
        });

        // Filter cards (supports comma-separated multi-category matching)
        const cards = shopSection.querySelectorAll('[data-product-card]');
        cards.forEach((card) => {
          const cardCatRaw = (card.getAttribute('data-product-category') || '').toLowerCase();
          const cardCats = cardCatRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          if (cat === 'all' || cardCats.includes(cat.toLowerCase()) || cardCatRaw.includes(cat.toLowerCase())) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });

        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
        setTimeout(updateDots, 100);
      });
    });

    setTimeout(updateDots, 100);
    setTimeout(updateDots, 400);
    setTimeout(updateDots, 1000);
  }

  // =========================================================================
  // 8. PET REELS CAROUSEL & HOVER VIDEO PLAYBACK (WITH SOUND)
  // =========================================================================
  function initPetReels() {
    const section = document.getElementById('stories');
    if (!section) return;

    const carousel = section.querySelector('[data-reels-carousel]');
    const prevBtn = section.querySelector('[data-reels-prev]');
    const nextBtn = section.querySelector('[data-reels-next]');
    const dots = section.querySelectorAll('[data-reels-dot]');
    const cards = section.querySelectorAll('[data-reel-card]');

    const getStep = () => {
      const firstCard = carousel ? carousel.querySelector('[data-reel-card]') : null;
      return firstCard ? firstCard.offsetWidth + 16 : 320;
    };

    function updateArrowVisibility() {
      if (!carousel || !prevBtn || !nextBtn) return;
      const isScrollable = carousel.scrollWidth > carousel.clientWidth + 10;
      if (!isScrollable) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
      }
      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';
      prevBtn.disabled = carousel.scrollLeft <= 5;
      nextBtn.disabled = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 10;
    }

    function updateDots() {
      if (!carousel || !dots.length) return;
      const step = getStep();
      const activeIndex = Math.min(dots.length - 1, Math.max(0, Math.round(carousel.scrollLeft / step)));
      dots.forEach((dot, idx) => {
        if (idx === activeIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    if (carousel && prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        carousel.scrollBy({ left: -getStep(), behavior: 'smooth' });
      });
      nextBtn.addEventListener('click', () => {
        carousel.scrollBy({ left: getStep(), behavior: 'smooth' });
      });

      carousel.addEventListener('scroll', () => {
        updateArrowVisibility();
        updateDots();
      }, { passive: true });

      window.addEventListener('resize', () => {
        updateArrowVisibility();
        updateDots();
      }, { passive: true });

      setTimeout(() => {
        updateArrowVisibility();
        updateDots();
      }, 300);
    }

    // Pagination Dots Click Handler
    if (dots.length && carousel) {
      dots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          const targetIndex = parseInt(dot.getAttribute('data-reels-dot'), 10) || 0;
          const step = getStep();
          carousel.scrollTo({ left: targetIndex * step, behavior: 'smooth' });
        });
      });
    }

    // Quick Add Button Handler for each card
    const quickAddBtns = section.querySelectorAll('[data-reel-quick-add]');
    quickAddBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('[data-reel-card]');
        if (!card) return;

        const prodId = card.getAttribute('data-product-id') || 'reel-item-' + Date.now();
        const prodName = card.getAttribute('data-product-name') || 'Wagmart Pet Essential';
        const prodPriceStr = card.getAttribute('data-product-price') || '€24,95';
        const prodImg = card.getAttribute('data-product-image') || '';

        // Button feedback animation
        btn.classList.add('scale-115');
        const originalBg = btn.style.backgroundColor;
        btn.style.backgroundColor = '#111111';
        const icon = btn.querySelector('svg');
        if (icon) icon.style.color = '#ffffff';

        setTimeout(() => {
          btn.classList.remove('scale-115');
          btn.style.backgroundColor = originalBg;
          if (icon) icon.style.color = '';
        }, 300);

        // Parse price to cents
        const numeric = parseFloat(prodPriceStr.replace(/[^0-9.,]/g, '').replace(',', '.')) || 24.95;
        const priceCents = Math.round(numeric * 100);

        await Cart.add(prodId, 1, true, {
          name: prodName,
          price: priceCents,
          image: prodImg,
        });
      });
    });

    // Hover Video Playback with Sound for each card (proper fit, no cut/zoom)
    cards.forEach((card) => {
      const rawYtId = card.getAttribute('data-youtube-id');
      const cleanId = (typeof ReelModal !== 'undefined' && ReelModal.extractId)
        ? ReelModal.extractId(rawYtId)
        : (rawYtId ? rawYtId.trim() : '');
      const videoContainer = card.querySelector('[data-reel-video]');
      let hoverTimeout = null;

      function startVideo() {
        if (!cleanId || !videoContainer) return;
        card.setAttribute('data-playing', 'true');

        let iframe = videoContainer.querySelector('iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.className =
            'absolute inset-0 w-full h-full object-cover pointer-events-none border-0 rounded-[22px]';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.objectFit = 'cover';
          iframe.style.transform = 'none';
          iframe.setAttribute(
            'allow',
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
          );
          iframe.setAttribute(
            'title',
            card.getAttribute('data-reel-title') || 'Wagmart Reel'
          );

          iframe.addEventListener('load', () => {
            if (card.getAttribute('data-playing') === 'true') {
              videoContainer.classList.remove('opacity-0', 'pointer-events-none');
              videoContainer.classList.add('opacity-100');
            }
            try {
              iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
              iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
              iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
            } catch (e) {}
          });

          videoContainer.appendChild(iframe);
        }

        const targetSrc = `https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${cleanId}&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`;
        if (iframe.src !== targetSrc) {
          iframe.src = targetSrc;
        }

        videoContainer.classList.remove('opacity-0', 'pointer-events-none');
        videoContainer.classList.add('opacity-100');
      }

      function stopVideo() {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
        card.removeAttribute('data-playing');

        if (videoContainer) {
          videoContainer.classList.remove('opacity-100');
          videoContainer.classList.add('opacity-0', 'pointer-events-none');
          const iframe = videoContainer.querySelector('iframe');
          if (iframe) {
            try {
              iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }), '*');
            } catch (e) {}
            iframe.src = 'about:blank';
            iframe.remove();
          }
        }
      }

      card.addEventListener('mouseenter', () => {
        hoverTimeout = setTimeout(startVideo, 180);
      });

      card.addEventListener('mouseleave', () => {
        stopVideo();
      });

      // On click on the card: DO NOT OPEN POPUP MODAL (per user request)
      // Only navigate if clicking on product title/link with valid URL
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-reel-quick-add]')) return;

        const prodLink = e.target.closest('[data-product-link]');
        if (prodLink) {
          const url = card.getAttribute('data-product-url');
          if (url && url !== '#shop' && url !== '#') {
            window.location.href = url;
          }
        }
      });
    });
  }

  // =========================================================================
  // 9. FAQ ACCORDION
  // =========================================================================
  function initFAQ() {
    const faqContainer = document.getElementById('faq');
    if (!faqContainer) return;

    const buttons = faqContainer.querySelectorAll('[data-faq-toggle]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const row = btn.closest('[data-faq-item]');
        if (!row) return;

        const isCurrentlyOpen = row.getAttribute('data-faq-open') === 'true';

        // Close others
        faqContainer.querySelectorAll('[data-faq-item]').forEach((r) => {
          r.setAttribute('data-faq-open', 'false');
          r.classList.remove('shadow-[0_4px_20px_rgba(0,0,0,0.05)]');
          r.classList.add('shadow-[0_2px_10px_rgba(0,0,0,0.03)]');
          const num = r.querySelector('[data-faq-num]');
          if (num) {
            num.classList.remove('text-[#7a46e5]');
            num.classList.add('text-[#192226]');
          }
          const content = r.querySelector('[data-faq-content]');
          const icon = r.querySelector('[data-faq-icon]');
          if (content) {
            content.style.gridTemplateRows = '0fr';
            content.style.opacity = '0';
          }
          if (icon) {
            icon.innerHTML = '+';
            icon.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 bg-[#192226] text-white transition-colors';
          }
        });

        // Toggle clicked
        if (!isCurrentlyOpen) {
          row.setAttribute('data-faq-open', 'true');
          row.classList.remove('shadow-[0_2px_10px_rgba(0,0,0,0.03)]');
          row.classList.add('shadow-[0_4px_20px_rgba(0,0,0,0.05)]');
          const num = row.querySelector('[data-faq-num]');
          if (num) {
            num.classList.remove('text-[#192226]');
            num.classList.add('text-[#7a46e5]');
          }
          const content = row.querySelector('[data-faq-content]');
          const icon = row.querySelector('[data-faq-icon]');
          if (content) {
            content.style.gridTemplateRows = '1fr';
            content.style.opacity = '1';
          }
          if (icon) {
            icon.innerHTML = '&minus;';
            icon.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 bg-[#192226] text-white transition-colors';
          }
        }
      });
    });
  }

  // =========================================================================
  // 10. GLOBAL EVENT LISTENERS DELEGATION
  // =========================================================================
  function initEventListeners() {
    document.addEventListener('click', (e) => {
      // 1. Open Cart
      if (e.target.closest('[data-open-cart]')) {
        e.preventDefault();
        Cart.openDrawer();
        return;
      }

      // 2. Close Cart
      if (e.target.closest('[data-close-cart]')) {
        e.preventDefault();
        Cart.closeDrawer();
        return;
      }

      // 3. Open Wishlist
      if (e.target.closest('[data-open-wishlist]')) {
        e.preventDefault();
        Wishlist.open();
        return;
      }

      // 4. Close Wishlist
      if (e.target.closest('[data-close-wishlist]')) {
        e.preventDefault();
        Wishlist.close();
        return;
      }

      // 5-6. Search open/close is handled by assets/header.js

      // 7. Toggle Wishlist Button on Product Card
      const wishBtn = e.target.closest('[data-wishlist-btn]');
      if (wishBtn) {
        e.stopPropagation();
        e.preventDefault();
        const card = wishBtn.closest('[data-product-card]');
        if (card) {
          const id = card.getAttribute('data-product-id');
          const name = card.getAttribute('data-product-name');
          const price = card.getAttribute('data-product-price');
          const image = card.getAttribute('data-product-image');
          Wishlist.toggle({ id, name, price, priceDisplay: price, image });
        }
        return;
      }

      // 8. Add to Cart from Product Card (Do NOT open drawer, show stepper directly with default 1)
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        e.stopPropagation();
        e.preventDefault();
        const card = addBtn.closest('[data-product-card]');
        if (card) {
          const id = card.getAttribute('data-product-id');
          const name = card.getAttribute('data-product-name') || card.getAttribute('data-title') || 'Pet Care Essential';
          const priceRaw = card.getAttribute('data-product-price') || card.getAttribute('data-price') || '';
          const price =
            parseInt(String(priceRaw).replace(/[^0-9]/g, ''), 10) * 100 || 33000;
          const compareRaw =
            card.getAttribute('data-product-compare-price') ||
            card.getAttribute('data-product-original-price') ||
            card.getAttribute('data-compare-price') ||
            '';
          const compare_at_price =
            parseInt(String(compareRaw).replace(/[^0-9]/g, ''), 10) * 100 || Math.round(price * 1.25);
          const vendor = card.getAttribute('data-product-vendor') || 'Wagmart';
          const image = card.getAttribute('data-product-image') || card.getAttribute('data-image') || '';
          const url = card.getAttribute('data-product-url') || card.getAttribute('data-url') || '/products/pet-grooming-glove';

          // Immediately switch button to stepper with default quantity 1 on ONLY this card
          const stepper = card.querySelector('[data-card-stepper]');
          const qtyDisplay = card.querySelector('[data-card-qty]');
          addBtn.classList.add('hidden');
          if (stepper) stepper.classList.remove('hidden');
          if (qtyDisplay) qtyDisplay.textContent = '1';

          Cart.add(id, 1, true, { name, title: name, price, compare_at_price, vendor, image, url });
        }
        return;
      }

      // 9. Card Quantity Stepper (+ / -) -> When 1 is decremented, removes item and restores Add to Cart button
      const cardQtyBtn = e.target.closest('[data-card-stepper-btn]');
      if (cardQtyBtn) {
        e.stopPropagation();
        e.preventDefault();
        const card = cardQtyBtn.closest('[data-product-card]');
        if (card) {
          const id = card.getAttribute('data-product-id');
          const delta = parseInt(cardQtyBtn.getAttribute('data-delta'), 10) || 0;
          const currentItem = WagmartState.cart.items.find(
            (i) =>
              String(i.id) === String(id) ||
              (i.variant_id && String(i.variant_id) === String(id)) ||
              (i.product_id && String(i.product_id) === String(id))
          );
          const qtyDisplay = card.querySelector('[data-card-qty]');
          const domQty = parseInt(qtyDisplay?.textContent?.trim() || '1', 10);
          const currentQty = currentItem ? (Number(currentItem.quantity) || domQty || 1) : (domQty || 1);
          const newQty = Math.max(0, currentQty + delta);

          const addBtn = card.querySelector('[data-add-to-cart]');
          const stepper = card.querySelector('[data-card-stepper]');

          if (newQty <= 0) {
            // Remove item from cart and immediately revert card to Add to Cart button
            if (stepper) stepper.classList.add('hidden');
            if (addBtn) addBtn.classList.remove('hidden');
            if (qtyDisplay) qtyDisplay.textContent = '1';
            Cart.update(id, 0);
          } else {
            if (qtyDisplay) qtyDisplay.textContent = newQty;
            Cart.update(id, newQty);
          }
        }
        return;
      }

      // 9.1 Prevent clicks inside stepper from triggering navigation or modal
      const cardStepper = e.target.closest('[data-card-stepper]');
      if (cardStepper) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      // 10. Drawer Quantity Stepper
      const cartQtyBtn = e.target.closest('[data-cart-qty-btn]');
      if (cartQtyBtn) {
        e.preventDefault();
        const key = cartQtyBtn.getAttribute('data-key');
        const delta = parseInt(cartQtyBtn.getAttribute('data-cart-qty-btn'), 10);
        const item = WagmartState.cart.items.find((i) => (i.key || i.id) == key);
        if (item) {
          Cart.update(key, item.quantity + delta);
        }
        return;
      }

      // 11. Drawer Remove Item
      const cartRemoveBtn = e.target.closest('[data-cart-remove]');
      if (cartRemoveBtn) {
        e.preventDefault();
        const key = cartRemoveBtn.getAttribute('data-cart-remove');
        Cart.update(key, 0);
        return;
      }

      // 12. Drawer Clear All
      if (e.target.closest('[data-clear-cart]')) {
        e.preventDefault();
        Cart.clear();
        return;
      }

      // 13. Wishlist Remove Item
      const wishRemoveBtn = e.target.closest('[data-wishlist-remove]');
      if (wishRemoveBtn) {
        e.preventDefault();
        const id = wishRemoveBtn.getAttribute('data-wishlist-remove');
        Wishlist.remove(id);
        return;
      }

      // 14. Wishlist Move to Cart
      const wishAddCartBtn = e.target.closest('[data-wishlist-add-cart]');
      if (wishAddCartBtn) {
        e.preventDefault();
        const id = wishAddCartBtn.getAttribute('data-wishlist-add-cart');
        Cart.add(id, 1);
        Wishlist.remove(id);
        return;
      }

      // 15. Quick View Trigger (Universal for Collection Cards, Header Cards, and all eye buttons)
      const qvTrigger = e.target.closest('[data-plp-qv-trigger], [data-quick-view], [data-quick-view-trigger], .wm-card__qv');
      if (qvTrigger) {
        e.preventDefault();
        e.stopPropagation();
        const card = qvTrigger.closest('[data-product-card]') || qvTrigger.closest('.wm-card');
        const handle = qvTrigger.getAttribute('data-quick-view') || qvTrigger.getAttribute('data-product-id');
        QuickView.open(card || handle, qvTrigger);
        return;
      }

      // 15.1 Clicking a Product Card opens its Product Details Page (NOT a popup)
      const clickedCard = e.target.closest('[data-product-card], .wm-card');
      if (
        clickedCard &&
        !clickedCard.hasAttribute('data-pdp-action-root') &&
        !clickedCard.hasAttribute('data-qv-card-proxy') &&
        !e.target.closest('#wm-quick-view-modal') &&
        !e.target.closest('button') &&
        !e.target.closest('a') &&
        !e.target.closest('[data-card-stepper]') &&
        !e.target.closest('[data-plp-qv-trigger]') &&
        !e.target.closest('[data-quick-view]') &&
        !e.target.closest('[data-quick-view-trigger]')
      ) {
        const targetUrl =
          clickedCard.getAttribute('data-product-url') ||
          clickedCard.getAttribute('data-url') ||
          clickedCard.querySelector('a[href]')?.getAttribute('href');
        if (targetUrl && targetUrl !== '#') {
          window.location.href = targetUrl;
          return;
        }
      }

      // 16. Close Quick View
      if (e.target.closest('[data-close-quick-view], [data-qv-close]')) {
        e.preventDefault();
        e.stopPropagation();
        QuickView.close();
        return;
      }

      // 16.1 Quick View Gallery Thumbnails & Dots
      const qvThumb = e.target.closest('[data-qv-thumb]');
      if (qvThumb) {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(qvThumb.getAttribute('data-qv-thumb'), 10);
        if (!isNaN(idx)) QuickView.setGalleryImage(idx);
        return;
      }

      const qvDot = e.target.closest('[data-qv-dot]');
      if (qvDot) {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(qvDot.getAttribute('data-qv-dot'), 10);
        if (!isNaN(idx)) QuickView.setGalleryImage(idx);
        return;
      }

      // 16.2 Quick View Gallery Prev / Next Buttons
      if (e.target.closest('[data-qv-prev]')) {
        e.preventDefault();
        e.stopPropagation();
        QuickView.setGalleryImage(QuickView.currentImageIndex - 1);
        return;
      }

      if (e.target.closest('[data-qv-next]')) {
        e.preventDefault();
        e.stopPropagation();
        QuickView.setGalleryImage(QuickView.currentImageIndex + 1);
        return;
      }

      // 16.3 Quick View Option Selection
      const qvOptBtn = e.target.closest('[data-qv-option-btn]');
      if (qvOptBtn) {
        e.preventDefault();
        e.stopPropagation();
        const optIdx = parseInt(qvOptBtn.getAttribute('data-option-index'), 10) || 0;
        const optVal = qvOptBtn.getAttribute('data-option-value') || '';
        QuickView.selectOption(optIdx, optVal);
        return;
      }

      // 16.4 Quick View Quantity Stepper (- / +)
      const qvDec = e.target.closest('[data-qv-qty-dec]');
      if (qvDec) {
        e.preventDefault();
        e.stopPropagation();
        QuickView.setQuantity(QuickView.getQuantity() - 1);
        return;
      }

      const qvInc = e.target.closest('[data-qv-qty-inc]');
      if (qvInc) {
        e.preventDefault();
        e.stopPropagation();
        QuickView.setQuantity(QuickView.getQuantity() + 1);
        return;
      }

      // 17. Add to Cart from Quick View Drawer
      const qvAddBtn = e.target.closest('[data-qv-add], [data-qv-atc]');
      if (qvAddBtn) {
        e.preventDefault();
        e.stopPropagation();
        QuickView.addToCart();
        return;
      }

      // 17.1 Buy It Now from Quick View Drawer
      const qvBuyBtn = e.target.closest('[data-qv-buy-now]');
      if (qvBuyBtn) {
        e.preventDefault();
        e.stopPropagation();
        QuickView.buyNow();
        return;
      }

      // 18. Reel Trigger (Popup modal removed; inline video on hover active)
      const reelCard = e.target.closest('[data-reel-card]');
      if (reelCard) {
        return;
      }

      // 19. Close Reel Modal
      if (e.target.closest('[data-close-reel]')) {
        e.preventDefault();
        ReelModal.close();
        return;
      }

      // 20. Mobile menu drawer is handled by assets/header.js

      // 21. Navigate to Collection Page on [data-collection-url] cards
      const colCard = e.target.closest('[data-collection-url]');
      if (colCard && !e.target.closest('a[href]')) {
        const targetColUrl = colCard.getAttribute('data-collection-url');
        if (targetColUrl) {
          e.preventDefault();
          window.location.href = targetColUrl;
          return;
        }
      }

      // 22. Smooth Scroll to #shop (or navigate to /collections/all)
      const shopScrollBtn = e.target.closest('[data-scroll-to-shop]');
      if (shopScrollBtn) {
        e.preventDefault();
        Cart.closeDrawer();
        Wishlist.close();
        const shop = document.getElementById('shop');
        if (shop) {
          shop.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.href = '/collections/all';
        }
        return;
      }
    });

    // Keyboard ESC listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Cart.closeDrawer();
        const wishlistModal = document.getElementById('wishlist-modal');
        if (wishlistModal && !wishlistModal.classList.contains('hidden')) Wishlist.close();
        const qvModal = QuickView.modal;
        if (qvModal && !qvModal.hidden && !qvModal.classList.contains('hidden')) QuickView.close();
        const reelModal = document.getElementById('reel-modal');
        if (reelModal && !reelModal.classList.contains('hidden')) ReelModal.close();
      }
    });
  }

  // Shared with assets/header.js and assets/cart.js
  window.WagmartState = WagmartState;
  window.WagmartCart = Cart;
  window.WagmartFormatMoney = formatMoney;
  window.WagmartEscapeHtml = escapeHtml;
  window.WagmartQuickView = QuickView;
  window.WagmartInitFAQ = initFAQ;

  // =========================================================================
  // INITIALIZATION ON DOM READY
  // =========================================================================
  function bootTheme() {
    Cart.fetch();
    Wishlist.init();
    initHeroBanner();
    initBestSellers();
    initPetReels();
    initFAQ();
    initEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTheme);
  } else {
    bootTheme();
  }
})();

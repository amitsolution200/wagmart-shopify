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
          ? localCart.items.filter((i) => i && (Number(i.quantity) || 0) > 0 && (i.title || i.product_title))
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
      this.notify('');
      this.setLoading(true);

      const targetQty = Math.max(1, Number(quantity) || 1);

      // 1. Instant optimistic update in local state
      let existing = WagmartState.cart.items.find(
        (i) => i.id == variantId || i.product_id == variantId || (i.variant_id && i.variant_id == variantId)
      );

      if (existing) {
        existing.quantity = Math.max(1, (Number(existing.quantity) || 1) + targetQty);
        existing.final_line_price = (existing.final_price || existing.price || 0) * existing.quantity;
      } else {
        const priceVal = (mockItem && mockItem.price) || 79900;
        const compareVal = (mockItem && mockItem.compare_at_price) || Math.round(priceVal * 1.25);
        const newItem = {
          id: variantId,
          key: String(variantId),
          product_id: variantId,
          variant_id: variantId,
          title: (mockItem && mockItem.name) || 'Product',
          product_title: (mockItem && mockItem.name) || 'Product',
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
      if (openDrawer) this.openDrawer();
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

    openDrawer() {
      const drawer = document.getElementById('cart-drawer');
      if (!drawer) return;
      if (!drawer.classList.contains('is-open')) {
        this._lastTrigger = document.activeElement;
      }
      document.dispatchEvent(new CustomEvent('wagmart:overlay-open', { detail: { id: 'cart-drawer' } }));
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.querySelectorAll('[data-open-cart]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
      document.body.classList.add('overflow-hidden');
      const panel = drawer.querySelector('[role="dialog"]');
      if (panel) setTimeout(() => panel.focus({ preventScroll: true }), 60);
    },

    closeDrawer() {
      const drawer = document.getElementById('cart-drawer');
      if (!drawer || !drawer.classList.contains('is-open')) return;
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('[data-open-cart]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      document.body.classList.remove('overflow-hidden');
      if (this._lastTrigger && typeof this._lastTrigger.focus === 'function') {
        this._lastTrigger.focus({ preventScroll: true });
      }
      this._lastTrigger = null;
    },

    render() {
      // Update badge counts across page
      const count = WagmartState.cart.item_count || 0;
      document.querySelectorAll('[data-cart-count]').forEach((el) => {
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
              const rawImage = item.featured_image?.url || item.image || '';
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
                  ${imageSrc ? `<img src="${imageSrc}" alt="" width="84" height="84" loading="lazy">` : ''}
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
        const cartItem = WagmartState.cart.items.find(
          (i) =>
            i.id == prodId ||
            i.product_id == prodId ||
            (i.variant_id && i.variant_id == prodId)
        );
        const qty = cartItem ? cartItem.quantity : 0;
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
  // 4. QUICK VIEW MODAL
  // =========================================================================
  const QuickView = {
    open(productId) {
      const modal = document.getElementById('quick-view-modal');
      const card = document.querySelector(`[data-product-card][data-product-id="${productId}"]`);
      if (!modal || !card) return;

      const name = card.getAttribute('data-product-name') || 'Pet Care Essential';
      const price = card.getAttribute('data-product-price') || '₹799';
      const origPrice = card.getAttribute('data-product-original-price') || '';
      const image = card.getAttribute('data-product-image') || '';
      const category = card.getAttribute('data-product-category') || 'Pet Care';
      const desc =
        card.getAttribute('data-product-desc') ||
        'Thoughtfully crafted everyday pet supply designed for happy tails and easier pet parenting.';

      const titleEl = modal.querySelector('[data-qv-title]');
      const priceEl = modal.querySelector('[data-qv-price]');
      const origPriceEl = modal.querySelector('[data-qv-original-price]');
      const imageEl = modal.querySelector('[data-qv-image]');
      const catEl = modal.querySelector('[data-qv-category]');
      const descEl = modal.querySelector('[data-qv-desc]');
      const addBtn = modal.querySelector('[data-qv-add]');

      if (titleEl) titleEl.textContent = name;
      if (priceEl) priceEl.textContent = price;
      if (origPriceEl) {
        if (origPrice) {
          origPriceEl.textContent = origPrice;
          origPriceEl.classList.remove('hidden');
        } else {
          origPriceEl.classList.add('hidden');
        }
      }
      if (imageEl) {
        imageEl.src = image;
        imageEl.alt = name;
      }
      if (catEl) catEl.textContent = category;
      if (descEl) descEl.textContent = desc;
      if (addBtn) {
        addBtn.setAttribute('data-target-id', productId);
        addBtn.disabled = false;
      }
      // Reset state that the header quick view may have changed
      modal.querySelectorAll('[data-qv-specs]').forEach((el) => (el.hidden = false));
      modal.querySelectorAll('[data-qv-link], [data-qv-note]').forEach((el) => (el.hidden = true));
      const addLabel = modal.querySelector('[data-qv-add-label]');
      if (addLabel) addLabel.textContent = 'Add to Cart';

      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    },

    close() {
      const modal = document.getElementById('quick-view-modal');
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    },
  };

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

        // Filter cards
        const cards = shopSection.querySelectorAll('[data-product-card]');
        cards.forEach((card) => {
          const cardCat = card.getAttribute('data-product-category');
          if (cat === 'all' || cardCat === cat) {
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
          const name = card.getAttribute('data-product-name');
          const priceRaw = card.getAttribute('data-product-price') || '';
          const price =
            parseInt(priceRaw.replace(/[^0-9]/g, ''), 10) * 100 || 79900;
          const compareRaw = card.getAttribute('data-product-compare-price') || '';
          const compare_at_price =
            parseInt(compareRaw.replace(/[^0-9]/g, ''), 10) * 100 || Math.round(price * 1.25);
          const vendor = card.getAttribute('data-product-vendor') || 'Wagmart';
          const image = card.getAttribute('data-product-image');

          // Immediately switch button to stepper with default quantity 1
          const stepper = card.querySelector('[data-card-stepper]');
          const qtyDisplay = card.querySelector('[data-card-qty]');
          addBtn.classList.add('hidden');
          if (stepper) stepper.classList.remove('hidden');
          if (qtyDisplay) qtyDisplay.textContent = '1';

          Cart.add(id, 1, false, { name, price, compare_at_price, vendor, image });
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
            (i) => i.id == id || i.product_id == id || (i.variant_id && i.variant_id == id)
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

      // 9.1 Prevent clicks inside stepper from triggering Quick View modal
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

      // 15. Quick View Trigger
      const qvTrigger = e.target.closest('[data-quick-view-trigger]');
      if (qvTrigger) {
        e.preventDefault();
        const card = qvTrigger.closest('[data-product-card]');
        if (card) {
          const id = card.getAttribute('data-product-id');
          QuickView.open(id);
        }
        return;
      }

      // 16. Close Quick View
      if (e.target.closest('[data-close-quick-view]')) {
        e.preventDefault();
        QuickView.close();
        return;
      }

      // 17. Add to Cart from Quick View
      const qvAddBtn = e.target.closest('[data-qv-add]');
      if (qvAddBtn) {
        e.preventDefault();
        const id = qvAddBtn.getAttribute('data-target-id');
        if (id) {
          Cart.add(id, 1);
          QuickView.close();
        }
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

      // 21. Smooth Scroll to #shop
      const shopScrollBtn = e.target.closest('[data-scroll-to-shop]');
      if (shopScrollBtn) {
        e.preventDefault();
        const shop = document.getElementById('shop');
        if (shop) shop.scrollIntoView({ behavior: 'smooth' });
        Cart.closeDrawer();
        Wishlist.close();
        return;
      }
    });

    // Keyboard ESC listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Cart.closeDrawer();
        const wishlistModal = document.getElementById('wishlist-modal');
        if (wishlistModal && !wishlistModal.classList.contains('hidden')) Wishlist.close();
        const qvModal = document.getElementById('quick-view-modal');
        if (qvModal && !qvModal.classList.contains('hidden')) QuickView.close();
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

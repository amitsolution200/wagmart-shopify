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

  // Format Money Helper (cents to currency)
  function formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents);
    }
    const val = (cents / 100).toFixed(0);
    return WagmartState.currencySymbol + Number(val).toLocaleString('en-IN');
  }

  // =========================================================================
  // 1. AJAX CART INTEGRATION
  // =========================================================================
  const Cart = {
    async fetch() {
      try {
        const res = await fetch('/cart.js');
        if (!res.ok) throw new Error('Failed to fetch cart');
        const data = await res.json();
        WagmartState.cart = data;
        this.render();
      } catch (err) {
        console.warn('Cart fetch error (preview fallback):', err);
      }
    },

    async add(variantId, quantity = 1) {
      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity }),
        });
        if (!res.ok) throw new Error('Add to cart failed');
        await this.fetch();
        this.openDrawer();
      } catch (err) {
        console.error('Error adding to cart:', err);
        // Fallback for preview mode without live backend
        this.fallbackAdd(variantId, quantity);
      }
    },

    fallbackAdd(productId, quantity = 1) {
      const existing = WagmartState.cart.items.find(
        (i) => i.id == productId || i.product_id == productId
      );
      if (existing) {
        existing.quantity += quantity;
      } else {
        WagmartState.cart.items.push({
          id: productId,
          quantity: quantity,
          title: 'Pet Essential Item',
          price: 79900,
          image: '',
        });
      }
      WagmartState.cart.item_count = WagmartState.cart.items.reduce(
        (acc, i) => acc + i.quantity,
        0
      );
      this.render();
      this.openDrawer();
    },

    async update(keyOrId, quantity) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: keyOrId, quantity }),
        });
        if (!res.ok) throw new Error('Update cart failed');
        await this.fetch();
      } catch (err) {
        // Preview fallback
        const item = WagmartState.cart.items.find((i) => (i.key || i.id) == keyOrId);
        if (item) {
          if (quantity <= 0) {
            WagmartState.cart.items = WagmartState.cart.items.filter(
              (i) => (i.key || i.id) != keyOrId
            );
          } else {
            item.quantity = quantity;
          }
          WagmartState.cart.item_count = WagmartState.cart.items.reduce(
            (acc, i) => acc + i.quantity,
            0
          );
          this.render();
        }
      }
    },

    async clear() {
      try {
        await fetch('/cart/clear.js', { method: 'POST' });
        await this.fetch();
      } catch (err) {
        WagmartState.cart.items = [];
        WagmartState.cart.item_count = 0;
        this.render();
      }
    },

    openDrawer() {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) {
        drawer.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }
    },

    closeDrawer() {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) {
        drawer.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
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

      // Update drawer elements
      const listContainer = document.getElementById('cart-drawer-items');
      const emptyContainer = document.getElementById('cart-drawer-empty');
      const footerContainer = document.getElementById('cart-drawer-footer');
      const subtotalEl = document.getElementById('cart-drawer-subtotal');
      const totalQuantityEl = document.getElementById('cart-drawer-total-qty');

      if (!listContainer) return;

      if (WagmartState.cart.items.length === 0) {
        listContainer.classList.add('hidden');
        if (footerContainer) footerContainer.classList.add('hidden');
        if (emptyContainer) emptyContainer.classList.remove('hidden');
      } else {
        if (emptyContainer) emptyContainer.classList.add('hidden');
        listContainer.classList.remove('hidden');
        if (footerContainer) footerContainer.classList.remove('hidden');

        if (totalQuantityEl) totalQuantityEl.textContent = count;
        if (subtotalEl) {
          const total = WagmartState.cart.total_price || 0;
          subtotalEl.textContent = formatMoney(total);
        }

        listContainer.innerHTML = WagmartState.cart.items
          .map((item) => {
            const priceFormatted = formatMoney(item.final_price || item.price || 0);
            const imageSrc =
              item.image ||
              item.featured_image?.url ||
              item.product_featured_image ||
              '';

            return `
            <div class="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EAE5D9] flex items-center gap-3.5" data-cart-item-id="${item.key || item.id}">
              <div class="w-16 h-16 bg-white rounded-xl p-1.5 border border-[#F0EBE1] flex-shrink-0 flex items-center justify-center overflow-hidden">
                <img src="${imageSrc}" alt="${item.title || item.product_title}" class="w-full h-full object-contain">
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">WAGMART</span>
                <h4 class="font-bold text-sm text-[#111827] truncate">${item.product_title || item.title}</h4>
                <p class="text-xs text-[#7a46e5] font-semibold">${priceFormatted}</p>
                <div class="flex items-center gap-2 mt-2">
                  <button type="button" class="w-6 h-6 rounded-lg bg-white border border-[#D5CEBF] flex items-center justify-center text-gray-700 hover:bg-gray-100 cursor-pointer text-xs" data-cart-qty-btn="-1" data-key="${item.key || item.id}">-</button>
                  <span class="text-xs font-bold text-gray-800 min-w-[20px] text-center">${item.quantity}</span>
                  <button type="button" class="w-6 h-6 rounded-lg bg-white border border-[#D5CEBF] flex items-center justify-center text-gray-700 hover:bg-gray-100 cursor-pointer text-xs" data-cart-qty-btn="1" data-key="${item.key || item.id}">+</button>
                </div>
              </div>
              <button type="button" class="p-2 text-gray-400 hover:text-red-500 transition cursor-pointer" data-cart-remove="${item.key || item.id}" aria-label="Remove item">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          `;
          })
          .join('');
      }

      // Update Product Card Steppers across page
      document.querySelectorAll('[data-product-card]').forEach((card) => {
        const prodId = card.getAttribute('data-product-id');
        const cartItem = WagmartState.cart.items.find(
          (i) => i.id == prodId || i.product_id == prodId
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
            <div class="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EAE5D9] flex items-center gap-3.5" data-wishlist-item="${prod.id}">
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
  // 3. SEARCH MODAL & INSTANT FILTERING
  // =========================================================================
  const SearchModal = {
    open() {
      const modal = document.getElementById('search-modal');
      if (modal) {
        modal.classList.remove('hidden');
        const input = modal.querySelector('input[type="text"]');
        if (input) setTimeout(() => input.focus(), 50);
        document.body.classList.add('overflow-hidden');
      }
    },

    close() {
      const modal = document.getElementById('search-modal');
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    },

    async query(term) {
      const resultsContainer = document.getElementById('search-results-list');
      if (!resultsContainer) return;

      const trimmed = term.trim().toLowerCase();
      if (!trimmed) {
        resultsContainer.innerHTML = `
          <div class="text-center py-10 text-gray-400 text-sm">
            Type keywords above to search all authentic Wagmart catalog supplies.
          </div>
        `;
        return;
      }

      // First check local products on page
      const cards = Array.from(document.querySelectorAll('[data-product-card]'));
      const matches = cards
        .map((c) => {
          const name = c.getAttribute('data-product-name') || '';
          const category = c.getAttribute('data-product-category') || '';
          const price = c.getAttribute('data-product-price') || '';
          const image = c.getAttribute('data-product-image') || '';
          const id = c.getAttribute('data-product-id') || '';
          return { id, name, category, price, image };
        })
        .filter(
          (p) =>
            p.name.toLowerCase().includes(trimmed) ||
            p.category.toLowerCase().includes(trimmed)
        );

      if (matches.length === 0) {
        resultsContainer.innerHTML = `
          <div class="text-center py-10 text-gray-500 space-y-1">
            <p class="font-semibold text-base text-gray-800">No products found</p>
            <p class="text-xs text-gray-400">Try searching for "grooming", "bowl", "leash", "brush", or "wipes".</p>
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = `
        <div class="space-y-2.5">
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            ${matches.length} ${matches.length === 1 ? 'Product' : 'Products'} found
          </p>
          ${matches
            .map(
              (p) => `
            <div class="p-3 bg-[#FAF8F5] hover:bg-white rounded-2xl border border-[#EAE5D9] flex items-center justify-between gap-4 transition-all" data-search-item-id="${p.id}">
              <div class="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer" data-search-view="${p.id}">
                <div class="w-14 h-14 bg-white rounded-xl p-1.5 border border-[#F0EBE1] flex-shrink-0 flex items-center justify-center">
                  <img src="${p.image}" alt="${p.name}" class="w-full h-full object-contain">
                </div>
                <div class="min-w-0">
                  <span class="text-[10px] font-bold text-gray-400 uppercase">WAGMART</span>
                  <h4 class="font-bold text-sm text-[#111827] truncate">${p.name}</h4>
                  <p class="text-xs text-[#7a46e5] font-medium">${p.price}</p>
                </div>
              </div>
              <button type="button" class="px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer" data-search-add="${p.id}">
                <span>Add</span>
              </button>
            </div>
          `
            )
            .join('')}
        </div>
      `;
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
      if (addBtn) addBtn.setAttribute('data-target-id', productId);

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
    open(youtubeId, title, tag, story) {
      const modal = document.getElementById('reel-modal');
      if (!modal) return;

      const iframe = modal.querySelector('iframe');
      const titleEl = modal.querySelector('[data-reel-title]');
      const tagEl = modal.querySelector('[data-reel-tag]');
      const storyEl = modal.querySelector('[data-reel-story]');

      if (iframe && youtubeId) {
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
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
    const filterPills = Array.from(shopSection.querySelectorAll('[data-filter-tab]'));

    if (scrollContainer && prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        const w = scrollContainer.clientWidth * 0.75;
        scrollContainer.scrollBy({ left: -w, behavior: 'smooth' });
      });

      nextBtn.addEventListener('click', () => {
        const w = scrollContainer.clientWidth * 0.75;
        scrollContainer.scrollBy({ left: w, behavior: 'smooth' });
      });
    }

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
      });
    });
  }

  // =========================================================================
  // 8. PET REELS CAROUSEL
  // =========================================================================
  function initPetReels() {
    const section = document.getElementById('stories');
    if (!section) return;

    const carousel = section.querySelector('[data-reels-carousel]');
    const prevBtn = section.querySelector('[data-reels-prev]');
    const nextBtn = section.querySelector('[data-reels-next]');

    if (carousel && prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        carousel.scrollBy({ left: -320, behavior: 'smooth' });
      });
      nextBtn.addEventListener('click', () => {
        carousel.scrollBy({ left: 320, behavior: 'smooth' });
      });
    }
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
          const content = r.querySelector('[data-faq-content]');
          const icon = r.querySelector('[data-faq-icon]');
          if (content) content.style.gridTemplateRows = '0fr';
          if (icon) icon.innerHTML = '+';
        });

        // Toggle clicked
        if (!isCurrentlyOpen) {
          row.setAttribute('data-faq-open', 'true');
          const content = row.querySelector('[data-faq-content]');
          const icon = row.querySelector('[data-faq-icon]');
          if (content) content.style.gridTemplateRows = '1fr';
          if (icon) icon.innerHTML = '&minus;';
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

      // 5. Open Search
      if (e.target.closest('[data-open-search]')) {
        e.preventDefault();
        SearchModal.open();
        return;
      }

      // 6. Close Search
      if (e.target.closest('[data-close-search]')) {
        e.preventDefault();
        SearchModal.close();
        return;
      }

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

      // 8. Add to Cart from Product Card
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        e.stopPropagation();
        e.preventDefault();
        const card = addBtn.closest('[data-product-card]');
        if (card) {
          const id = card.getAttribute('data-product-id');
          Cart.add(id, 1);
        }
        return;
      }

      // 9. Card Quantity Stepper
      const cardQtyBtn = e.target.closest('[data-card-stepper-btn]');
      if (cardQtyBtn) {
        e.stopPropagation();
        e.preventDefault();
        const card = cardQtyBtn.closest('[data-product-card]');
        if (card) {
          const id = card.getAttribute('data-product-id');
          const delta = parseInt(cardQtyBtn.getAttribute('data-delta'), 10);
          const currentItem = WagmartState.cart.items.find(
            (i) => i.id == id || i.product_id == id
          );
          const currentQty = currentItem ? currentItem.quantity : 0;
          Cart.update(id, currentQty + delta);
        }
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

      // 18. Reel Trigger
      const reelCard = e.target.closest('[data-reel-card]');
      if (reelCard) {
        const id = reelCard.getAttribute('data-reel-id');
        const ytId = reelCard.getAttribute('data-youtube-id');
        const title = reelCard.getAttribute('data-reel-title');
        const tag = reelCard.getAttribute('data-reel-tag');
        const story = reelCard.getAttribute('data-reel-story');
        ReelModal.open(ytId, title, tag, story);
        return;
      }

      // 19. Close Reel Modal
      if (e.target.closest('[data-close-reel]')) {
        e.preventDefault();
        ReelModal.close();
        return;
      }

      // 20. Mobile Menu Toggle
      const mobileMenuToggle = e.target.closest('[data-mobile-menu-toggle]');
      if (mobileMenuToggle) {
        e.preventDefault();
        const drawer = document.getElementById('mobile-menu-drawer');
        if (drawer) {
          drawer.classList.toggle('hidden');
        }
        return;
      }

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
        Wishlist.close();
        SearchModal.close();
        QuickView.close();
        ReelModal.close();
      }
    });

    // Search Input Realtime Listener
    const searchInput = document.getElementById('search-modal-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        SearchModal.query(e.target.value);
      });
    }

    // Search Quick Pills
    document.querySelectorAll('[data-search-pill]').forEach((pill) => {
      pill.addEventListener('click', () => {
        const val = pill.getAttribute('data-search-pill');
        if (searchInput) {
          searchInput.value = val;
          SearchModal.query(val);
        }
      });
    });
  }

  // =========================================================================
  // INITIALIZATION ON DOM READY
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    Cart.fetch();
    Wishlist.init();
    initHeroBanner();
    initBestSellers();
    initPetReels();
    initFAQ();
    initEventListeners();
  });
})();

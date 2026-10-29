/**
 * WAGMART header interactions (vanilla JS, no dependencies)
 * - Desktop dropdown panels (Shop mega menu, Bestsellers) with hover intent + click/keyboard support
 * - Bestsellers carousel arrows
 * - Predictive search (Shopify Predictive Search API — real indexed products only)
 * - Account fallback popover + legacy customer login validation
 * - Mobile navigation drawer with accordions
 * - Quick view for header product cards
 * Cart drawer logic lives in theme.js (window.WagmartCart).
 */
(function () {
  'use strict';

  const header = document.querySelector('[data-wm-header]');
  if (!header) return;

  const shell = header.querySelector('[data-header-shell]');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const desktopMq = window.matchMedia('(min-width: 1100px)');
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

  const esc = (s) =>
    window.WagmartEscapeHtml
      ? window.WagmartEscapeHtml(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function money(cents) {
    const num = Math.round((Number(cents) || 0) / 100);
    return '₹' + num.toLocaleString('en-IN');
  }

  function announceOverlay(id) {
    document.dispatchEvent(new CustomEvent('wagmart:overlay-open', { detail: { id } }));
  }

  function lockScroll(lock) {
    document.body.classList.toggle('overflow-hidden', !!lock);
  }

  function trapFocus(container, event) {
    if (event.key !== 'Tab') return;
    const items = Array.from(container.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // ===========================================================================
  // 1. DESKTOP DROPDOWN PANELS
  // ===========================================================================
  const Panels = {
    triggers: Array.from(header.querySelectorAll('[data-panel-trigger]')),
    current: null,
    openTimer: null,
    closeTimer: null,

    get(name) {
      return header.querySelector(`[data-panel="${name}"]`);
    },

    open(name, { focusFirst = false } = {}) {
      this.cancelClose();
      if (this.current === name) return;
      if (!this.current) announceOverlay('panel');
      this.triggers.forEach((t) => {
        const isTarget = t.dataset.panelTrigger === name;
        t.setAttribute('aria-expanded', String(isTarget));
        const panel = this.get(t.dataset.panelTrigger);
        if (panel) panel.classList.toggle('is-open', isTarget);
      });
      this.current = name;
      header.classList.add('is-panel-open');
      const panel = this.get(name);
      if (panel) {
        Carousel.refresh(panel);
        if (focusFirst) {
          const first = panel.querySelector(FOCUSABLE);
          if (first) first.focus();
        }
      }
    },

    close({ returnFocus = false } = {}) {
      clearTimeout(this.openTimer);
      this.cancelClose();
      if (!this.current) return;
      const trigger = header.querySelector(`[data-panel-trigger="${this.current}"]`);
      this.triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
      header.querySelectorAll('[data-panel]').forEach((p) => p.classList.remove('is-open'));
      header.classList.remove('is-panel-open');
      this.current = null;
      if (returnFocus && trigger) trigger.focus();
    },

    scheduleClose(delay = 180) {
      clearTimeout(this.openTimer);
      if (this.closeTimer) return;
      this.closeTimer = setTimeout(() => {
        this.closeTimer = null;
        this.close();
      }, delay);
    },

    cancelClose() {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    },

    // True when the point is over the bar or the currently open panel (plus a small tolerance)
    isInside(x, y) {
      if (!shell || !this.current) return false;
      const bar = shell.getBoundingClientRect();
      const panel = this.get(this.current);
      const bottom = Math.max(bar.bottom, panel ? panel.getBoundingClientRect().bottom : 0) + 6;
      return x >= bar.left - 6 && x <= bar.right + 6 && y >= bar.top - 6 && y <= bottom;
    },

    init() {
      if (!this.triggers.length) return;

      this.triggers.forEach((trigger) => {
        const name = trigger.dataset.panelTrigger;

        trigger.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse' || !canHover.matches) return;
          this.cancelClose();
          clearTimeout(this.openTimer);
          // Switch instantly between panels, small intent delay for the first open
          this.openTimer = setTimeout(() => this.open(name), this.current ? 0 : 70);
        });

        trigger.addEventListener('pointerleave', () => clearTimeout(this.openTimer));

        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.current === name) {
            this.close({ returnFocus: true });
          } else {
            this.open(name);
          }
        });

        trigger.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.open(name, { focusFirst: true });
          }
        });
      });

      // Hovering a plain link (All Products, About, Contact, logo) closes any open panel
      header.querySelectorAll('[data-nav-plain]').forEach((link) => {
        link.addEventListener('pointerenter', (e) => {
          if (e.pointerType === 'mouse' && this.current) this.scheduleClose(80);
        });
      });

      if (shell) {
        // Geometric hover tracking: robust against pointer "jumps" and nested element transitions
        document.addEventListener(
          'pointermove',
          (e) => {
            if (!this.current || e.pointerType !== 'mouse') return;
            if (e.target.closest && e.target.closest('[data-nav-plain]')) {
              this.close();
              return;
            }
            if (this.isInside(e.clientX, e.clientY)) this.cancelClose();
            else this.scheduleClose(180);
          },
          { passive: true }
        );
        document.documentElement.addEventListener('pointerleave', (e) => {
          if (this.current && e.pointerType === 'mouse') this.scheduleClose(180);
        });
        shell.addEventListener('focusout', (e) => {
          if (this.current && e.relatedTarget && !shell.contains(e.relatedTarget)) this.close();
        });
      }

      document.addEventListener('pointerdown', (e) => {
        if (this.current && shell && !shell.contains(e.target)) this.close();
      });

      desktopMq.addEventListener('change', () => this.close());
    },
  };

  // ===========================================================================
  // 2. CAROUSEL (Bestsellers)
  // ===========================================================================
  const Carousel = {
    refresh(scope) {
      (scope || document).querySelectorAll('[data-carousel]').forEach((root) => this.update(root));
    },

    update(root) {
      const track = root.querySelector('[data-carousel-track]');
      if (!track) return;
      const viewport = track.parentElement;
      const media = track.querySelector('.wm-card__media');
      if (media && media.offsetHeight && viewport) {
        viewport.style.setProperty('--wm-media-h', `${media.offsetHeight + 8}px`);
      }
      const prev = root.querySelector('[data-carousel-prev]');
      const next = root.querySelector('[data-carousel-next]');
      const max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max - 2;
    },

    init() {
      document.querySelectorAll('[data-carousel]').forEach((root) => {
        const track = root.querySelector('[data-carousel-track]');
        if (!track) return;
        const step = (dir) => {
          const card = track.querySelector('.wm-card');
          const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
          const cardW = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
          const perView = Math.max(1, Math.floor((track.clientWidth + gap) / cardW));
          track.scrollBy({ left: dir * perView * cardW, behavior: 'smooth' });
        };
        const prev = root.querySelector('[data-carousel-prev]');
        const next = root.querySelector('[data-carousel-next]');
        if (prev) prev.addEventListener('click', () => step(-1));
        if (next) next.addEventListener('click', () => step(1));

        let raf = null;
        track.addEventListener(
          'scroll',
          () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
              raf = null;
              this.update(root);
            });
          },
          { passive: true }
        );

        if ('ResizeObserver' in window) {
          new ResizeObserver(() => this.update(root)).observe(track);
        }
        this.update(root);
      });
    },
  };

  // ===========================================================================
  // 3. STICKY & SMART HIDE-ON-SCROLL-DOWN / SHOW-ON-SCROLL-UP STATE
  // ===========================================================================
  function initScrollState() {
    const sectionWrap = header.closest('#shopify-section-header, .shopify-section-header');
    let lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
    let ticking = false;

    const syncHeaderHeight = () => {
      const h = (sectionWrap || header).offsetHeight;
      if (h > 0) {
        document.documentElement.style.setProperty('--wm-header-total', h + 'px');
      }
    };
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight, { passive: true });

    const setHidden = (hide) => {
      header.classList.toggle('is-hidden', hide);
      if (sectionWrap) sectionWrap.classList.toggle('is-header-hidden', hide);
    };

    const onScroll = () => {
      ticking = false;
      const currentY = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const delta = currentY - lastScrollY;
      const isHidden = header.classList.contains('is-hidden');

      header.classList.toggle('is-scrolled', currentY > 8);

      const overlayActive =
        header.classList.contains('is-panel-open') ||
        (Drawer && Drawer.isOpen && Drawer.isOpen()) ||
        (Search && Search.isOpen && Search.isOpen()) ||
        (Account && Account.isOpen && Account.isOpen());

      // Always show navbar near top of page or when any header overlay/drawer is open
      if (currentY <= 72 || overlayActive) {
        if (isHidden) setHidden(false);
        lastScrollY = currentY;
        return;
      }

      if (!isHidden) {
        // Navbar is currently visible: track highest scroll point when scrolling up, hide after scrolling down > 8px
        if (delta < 0) {
          lastScrollY = currentY;
        } else if (delta > 8) {
          setHidden(true);
          lastScrollY = currentY;
        }
      } else {
        // Navbar is currently hidden: track lowest scroll point when scrolling down, show immediately on slight upward scroll (> 4px)
        if (delta > 0) {
          lastScrollY = currentY;
        } else if (delta < -4) {
          setHidden(false);
          lastScrollY = currentY;
        }
      }
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );
    onScroll();
  }

  // ===========================================================================
  // 4. MOBILE DRAWER + ACCORDIONS
  // ===========================================================================
  const Drawer = {
    el: document.querySelector('[data-drawer]'),
    lastFocus: null,

    isOpen() {
      return !!(this.el && this.el.classList.contains('is-open'));
    },

    open() {
      if (!this.el || this.isOpen()) return;
      announceOverlay('drawer');
      this.lastFocus = document.activeElement;
      this.el.classList.add('is-open');
      this.el.setAttribute('aria-hidden', 'false');
      document.querySelectorAll('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
      lockScroll(true);
      const panel = this.el.querySelector('[role="dialog"]');
      setTimeout(() => panel && panel.focus({ preventScroll: true }), 50);
      requestAnimationFrame(() => Carousel.refresh(this.el));
    },

    close({ returnFocus = true } = {}) {
      if (!this.isOpen()) return;
      this.el.classList.remove('is-open');
      this.el.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      lockScroll(false);
      if (returnFocus && this.lastFocus && this.lastFocus.focus) this.lastFocus.focus({ preventScroll: true });
    },

    init() {
      if (!this.el) return;
      document.querySelectorAll('[data-drawer-open]').forEach((btn) => btn.addEventListener('click', () => this.open()));
      this.el.querySelectorAll('[data-drawer-close]').forEach((btn) => btn.addEventListener('click', () => this.close()));
      this.el.addEventListener('keydown', (e) => trapFocus(this.el.querySelector('[role="dialog"]'), e));
      // Follow links inside the drawer normally, but close it for in-page anchors
      this.el.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (link) this.close({ returnFocus: false });
      });
      desktopMq.addEventListener('change', (e) => {
        if (e.matches) this.close({ returnFocus: false });
      });

      // Accordions (top level + nested category groups)
      this.el.querySelectorAll('[data-accordion-toggle]').forEach((toggle) => {
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(toggle.getAttribute('aria-controls'));
          if (!target) return;
          const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
          const parentRow = toggle.closest('.wm-mnav__row');
          if (parentRow) {
            parentRow.querySelectorAll('[data-accordion-toggle]').forEach((el) => {
              el.setAttribute('aria-expanded', String(willOpen));
            });
          } else {
            toggle.setAttribute('aria-expanded', String(willOpen));
          }
          target.classList.toggle('is-open', willOpen);
          if (willOpen) setTimeout(() => Carousel.refresh(target), 260);
        });
      });
    },
  };

  // ===========================================================================
  // 5. ACCOUNT FALLBACK POPOVER (+ legacy login validation)
  // ===========================================================================
  const Account = {
    toggleBtn: header.querySelector('[data-account-toggle]'),
    pop: header.querySelector('[data-account-pop]'),

    isOpen() {
      return !!(this.pop && this.pop.classList.contains('is-open'));
    },

    open() {
      if (!this.pop) return;
      announceOverlay('account');
      Panels.close();
      this.pop.classList.add('is-open');
      this.pop.setAttribute('aria-hidden', 'false');
      this.toggleBtn.setAttribute('aria-expanded', 'true');
      const first = this.pop.querySelector('input:not([type="hidden"]), a[href], button:not([data-account-close])');
      setTimeout(() => first && first.focus({ preventScroll: true }), 60);
    },

    close({ returnFocus = false } = {}) {
      if (!this.isOpen()) return;
      this.pop.classList.remove('is-open');
      this.pop.setAttribute('aria-hidden', 'true');
      this.toggleBtn.setAttribute('aria-expanded', 'false');
      if (returnFocus) this.toggleBtn.focus();
    },

    initLogin() {
      const form = this.pop.querySelector('[data-login-form]');
      if (!form) return;
      const email = form.querySelector('[data-login-email]');
      const passRow = form.querySelector('[data-login-password-row]');
      const pass = form.querySelector('[data-login-password]');
      const error = form.querySelector('[data-login-error]');
      const submit = form.querySelector('[data-login-submit]');
      const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

      const setError = (field, msg) => {
        [email, pass].forEach((f) => f && f.removeAttribute('aria-invalid'));
        if (field) field.setAttribute('aria-invalid', 'true');
        if (error) error.textContent = msg || '';
      };

      // Server-side login error: open the popover on the password step
      if (error && error.textContent.trim()) {
        if (passRow) passRow.hidden = false;
        if (submit) submit.hidden = false;
        this.open();
      }

      email.addEventListener('input', () => {
        if (email.getAttribute('aria-invalid')) setError(null, '');
      });

      form.addEventListener('submit', (e) => {
        const value = email.value.trim();
        if (!isEmail(value)) {
          e.preventDefault();
          setError(email, value ? 'Enter a valid email address, e.g. name@example.com.' : 'Enter your email address.');
          email.focus();
          return;
        }
        if (passRow && passRow.hidden) {
          e.preventDefault();
          setError(null, '');
          passRow.hidden = false;
          if (submit) submit.hidden = false;
          pass.focus();
          return;
        }
        if (pass && !pass.value) {
          e.preventDefault();
          setError(pass, 'Enter your password.');
          pass.focus();
          return;
        }
        // Valid: real submission to Shopify's customer_login endpoint
        setError(null, '');
        if (submit) {
          submit.classList.add('is-loading');
          submit.setAttribute('aria-busy', 'true');
          if (!submit.querySelector('.wm-spinner')) submit.insertAdjacentHTML('afterbegin', '<span class="wm-spinner" aria-hidden="true"></span>');
        }
      });
    },

    init() {
      if (!this.toggleBtn || !this.pop) return;
      this.toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isOpen() ? this.close() : this.open();
      });
      this.pop.querySelectorAll('[data-account-close]').forEach((b) =>
        b.addEventListener('click', () => this.close({ returnFocus: true }))
      );
      document.addEventListener('pointerdown', (e) => {
        if (this.isOpen() && !this.pop.contains(e.target) && !this.toggleBtn.contains(e.target)) this.close();
      });
      this.pop.addEventListener('focusout', (e) => {
        if (e.relatedTarget && !this.pop.contains(e.relatedTarget) && e.relatedTarget !== this.toggleBtn) this.close();
      });
      this.initLogin();
    },
  };

  // ===========================================================================
  // 6. PREDICTIVE SEARCH
  // ===========================================================================
  const Search = {
    el: document.querySelector('[data-search]'),
    lastFocus: null,
    controller: null,
    timer: null,
    activeIndex: -1,

    isOpen() {
      return !!(this.el && this.el.classList.contains('is-open'));
    },

    open() {
      if (!this.el || this.isOpen()) return;
      announceOverlay('search');
      Panels.close();
      this.lastFocus = document.activeElement;
      this.el.classList.add('is-open');
      this.el.setAttribute('aria-hidden', 'false');
      document.querySelectorAll('[data-search-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
      lockScroll(true);
      setTimeout(() => {
        this.input.focus({ preventScroll: true });
        this.input.select();
      }, 60);
      if (this.input.value.trim()) this.query(this.input.value);
    },

    close({ returnFocus = true } = {}) {
      if (!this.isOpen()) return;
      this.el.classList.remove('is-open');
      this.el.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('[data-search-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      lockScroll(false);
      if (this.controller) this.controller.abort();
      if (returnFocus && this.lastFocus && this.lastFocus.focus) this.lastFocus.focus({ preventScroll: true });
    },

    setState(html, showResults) {
      if (this.body) this.body.hidden = !showResults;
      this.el.classList.toggle('has-results', !!showResults);
      if (this.idle) this.idle.hidden = !!showResults;
      if (this.results) {
        this.results.hidden = !showResults;
        this.results.innerHTML = showResults ? html : '';
      }
      if (this.input) {
        this.input.setAttribute('aria-expanded', String(!!showResults && !!(this.results && this.results.querySelector('[role="option"]'))));
        this.input.removeAttribute('aria-activedescendant');
      }
      this.activeIndex = -1;
    },

    skeleton() {
      const row =
        '<div class="wm-skeleton__row"><span class="wm-skeleton__thumb"></span><span style="flex:1;display:grid;gap:8px"><span class="wm-skeleton__line" style="width:62%"></span><span class="wm-skeleton__line" style="width:28%"></span></span></div>';
      return `<p class="wm-sr-only">Searching…</p><div class="wm-skeleton" aria-hidden="true">${row.repeat(3)}</div>`;
    },

    priceHtml(product) {
      const toCents = (v) => Math.round(parseFloat(v) * 100);
      const price = product.price != null ? toCents(product.price) : NaN;
      if (isNaN(price)) return '';
      const varies = product.price_min && product.price_max && product.price_min !== product.price_max;
      const compare = product.compare_at_price_max != null ? toCents(product.compare_at_price_max) : 0;
      let html = `${varies ? 'From ' : ''}${esc(money(price))}`;
      if (compare > price) html += ` <s>${esc(money(compare))}</s>`;
      if (product.available === false) {
        html += ` <span class="wm-sold-out-badge" style="display:inline-block;margin-left:6px;padding:2px 7px;font-size:11px;font-weight:700;border-radius:999px;background:#FEE2E2;color:#DC2626;">Sold out</span>`;
      }
      return html;
    },

    imageUrl(src, width) {
      if (!src) return '';
      return src + (src.includes('?') ? '&' : '?') + `width=${width}`;
    },

    render(data, term) {
      const products = (data && data.resources && data.resources.results && data.resources.results.products) || [];
      const collections = (data && data.resources && data.resources.results && data.resources.results.collections) || [];
      const searchUrl = `${this.el.dataset.searchUrl}?q=${encodeURIComponent(term)}&options%5Bprefix%5D=last`;

      if (!products.length && !collections.length) {
        this.setState(
          `<div class="wm-empty">
             <span class="wm-empty__icon">${this.icon('search')}</span>
             <div><strong>No results for “${esc(term)}”</strong>Try a different word, like “brush” or “leash”, or browse all products.</div>
           </div>`,
          true
        );
        return;
      }

      let i = 0;
      const pool = document.getElementById('WmSearchCardPool');
      const productItems = products
        .map((p) => {
          const cleanUrl = (p.url || '').split('?')[0];
          const handle = p.handle || cleanUrl.split('/products/')[1] || '';
          let cardHtml = '';
          if (pool && handle) {
            const match = pool.querySelector('[data-pool-handle="' + handle.replace(/"/g, '') + '"]');
            if (match) cardHtml = match.innerHTML;
          }
          if (!cardHtml) {
            const img = p.featured_image && p.featured_image.url ? p.featured_image.url : p.image;
            const imgSrc = img ? this.imageUrl(img, 600) : '';
            const priceVal = p.price != null ? '₹' + Math.round(parseFloat(p.price)) : '';
            const prodId = String(p.id || '');
            cardHtml = `<div class="wm-unified-card wm-react-card group relative w-full flex flex-col select-none transition-all duration-300 cursor-pointer" data-product-card data-product-id="${esc(prodId)}" data-handle="${esc(handle)}" data-title="${esc(p.title)}" data-price="${esc(String(Math.round(parseFloat(p.price || 0))))}" data-image="${esc(imgSrc)}" data-url="${esc(cleanUrl)}" data-product-url="${esc(cleanUrl)}">
              <div class="wm-react-card__image-box relative w-full aspect-[4/5] rounded-[20px] overflow-hidden bg-[#FBFBF7] border-0">
                <a href="${esc(p.url)}" class="wm-unified-card__media block w-full h-full relative">
                  ${imgSrc ? `<img src="${esc(imgSrc)}" alt="${esc(p.title)}" class="wm-react-card__img-primary absolute inset-0 w-full h-full object-cover" loading="lazy">` : ''}
                </a>
                <div class="wm-card__top-right-actions absolute top-3 right-3 z-20 flex flex-col items-center gap-2">
                  <button type="button" class="wm-card__wishlist-btn w-9 h-9 rounded-full bg-white text-neutral-900 shadow-[0_4px_14px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-300 ease-out hover:bg-neutral-900 hover:text-white active:scale-95 cursor-pointer" data-wishlist-toggle="${esc(prodId)}" aria-label="Add to wishlist" aria-pressed="false">
                    <svg class="wm-icon-heart w-[16px] h-[16px] transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                  <button type="button" class="wm-card__side-qv w-9 h-9 rounded-full bg-white text-neutral-900 shadow-[0_4px_14px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-300 ease-out opacity-100 lg:opacity-0 lg:translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 hover:bg-neutral-900 hover:text-white active:scale-95 cursor-pointer" data-quick-view-trigger data-quick-view="${esc(handle)}" aria-label="Quick view ${esc(p.title)}">
                    <svg class="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                <div class="wm-card__img-qv-wrap absolute inset-x-2.5 bottom-2.5 sm:bottom-3 z-20 flex justify-center pointer-events-none">
                  <button type="button" class="wm-card__img-qv-btn pointer-events-auto flex items-center justify-center gap-1.5 w-full h-7 sm:h-7.5 px-3 rounded-full bg-white/95 hover:bg-white text-neutral-900 text-[10.5px] sm:text-[11px] font-semibold shadow-md backdrop-blur-xs transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap" data-add-to-cart aria-label="Add ${esc(p.title)} to Bag">
                    <span>Add To Bag</span>
                  </button>
                  <div class="hidden pointer-events-auto w-full" data-card-stepper>
                    <button type="button" data-card-stepper-btn data-delta="-1" aria-label="Decrease quantity"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                    <span data-card-qty>1</span>
                    <button type="button" data-card-stepper-btn data-delta="1" aria-label="Increase quantity"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                  </div>
                </div>
              </div>
              <div class="wm-card__info pt-3 pb-1 text-left flex flex-col items-start gap-1">
                <h3 class="wm-card__title text-[15px] leading-[22px] font-normal text-neutral-900 truncate w-full">
                  <a href="${esc(p.url)}" class="hover:underline text-neutral-900 block truncate">${esc(p.title)}</a>
                </h3>
                <div class="wm-card__price-wrap text-[14px] leading-[20px] font-normal text-neutral-600 flex items-baseline gap-2">
                  <span class="wm-card__price font-medium text-neutral-900">${esc(priceVal)}</span>
                </div>
              </div>
            </div>`;
          }
          return `<div class="wm-search-cards-grid__item" id="WmSearchOpt${i++}" role="option" aria-selected="false">${cardHtml}</div>`;
        })
        .join('');

      const collectionItems = collections
        .map(
          (c) => `<a class="wm-search__tag" id="WmSearchOpt${i++}" role="option" aria-selected="false" href="${esc(c.url)}">${esc(c.title)}</a>`
        )
        .join('');

      this.setState(
        `${collections.length ? `<div class="wm-search__section"><div class="wm-search__head-row"><p class="wm-search__label">Collections</p></div><div class="wm-search__tags">${collectionItems}</div></div>` : ''}
         ${products.length ? `<div class="wm-search__section wm-search__section--products"><div class="wm-search__head-row"><p class="wm-search__label">Products</p></div><div class="wm-search-cards-grid" role="listbox" aria-label="Products">${productItems}</div></div>` : ''}`,
        true
      );
    },

    icon(name) {
      const paths = {
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
        paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
      };
      return `<svg class="wm-icon wm-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
    },

    async query(raw) {
      const term = raw.trim();
      this.clearBtn.hidden = !raw.length;
      clearTimeout(this.timer);
      if (this.controller) this.controller.abort();
      if (!term) {
        this.setState('', false);
        return;
      }
      this.setState(this.skeleton(), true);
      this.timer = setTimeout(async () => {
        this.controller = new AbortController();
        const params = new URLSearchParams({
          q: term,
          'resources[type]': 'product,collection',
          'resources[limit]': '6',
          'resources[options][unavailable_products]': 'last',
          'resources[options][fields]': 'title,product_type,variants.title,vendor,tag,body',
        });
        try {
          const res = await fetch(`${this.el.dataset.predictiveUrl}.json?${params}`, {
            signal: this.controller.signal,
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) throw new Error(`Search failed (${res.status})`);
          const data = await res.json();
          if (this.input.value.trim() === term) this.render(data, term);
        } catch (err) {
          if (err.name === 'AbortError') return;
          this.setState(
            `<div class="wm-empty"><div><strong>Search is unavailable right now</strong>Press Enter to see full results, or try again in a moment.</div></div>`,
            true
          );
        }
      }, 220);
    },

    move(delta) {
      const options = Array.from(this.results.querySelectorAll('[role="option"]'));
      if (!options.length) return;
      this.activeIndex = (this.activeIndex + delta + options.length) % options.length;
      options.forEach((o, idx) => o.setAttribute('aria-selected', String(idx === this.activeIndex)));
      const active = options[this.activeIndex];
      this.input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    },

    init() {
      if (!this.el) return;
      this.input = this.el.querySelector('[data-search-input]');
      this.results = this.el.querySelector('[data-search-results]');
      this.idle = this.el.querySelector('[data-search-idle]');
      this.body = this.el.querySelector('[data-search-body]');
      this.categorySelect = this.el.querySelector('[data-search-category]');
      this.clearBtn = this.el.querySelector('[data-search-clear]');
      const form = this.el.querySelector('[data-search-form]');

      document.querySelectorAll('[data-search-open], [data-open-search]').forEach((btn) =>
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        })
      );
      this.el.querySelectorAll('[data-search-close]').forEach((btn) => btn.addEventListener('click', () => this.close()));
      this.input.addEventListener('input', () => this.query(this.input.value));
      this.clearBtn.addEventListener('click', () => {
        this.input.value = '';
        this.query('');
        this.input.focus();
      });
      this.el.querySelectorAll('[data-search-term]').forEach((chip) =>
        chip.addEventListener('click', () => {
          this.input.value = chip.dataset.searchTerm;
          this.query(this.input.value);
          this.input.focus();
        })
      );
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.move(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.move(-1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        } else if (e.key === 'Enter' && this.activeIndex > -1) {
          const active = this.results.querySelectorAll('[role="option"]')[this.activeIndex];
          if (active) {
            e.preventDefault();
            window.location.href = active.href;
          }
        }
      });
      form.addEventListener('submit', (e) => {
        if (!this.input.value.trim()) {
          e.preventDefault();
          this.input.focus();
        }
      });
      this.el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
          return;
        }
        trapFocus(this.el.querySelector('[role="dialog"]'), e);
      });
    },
  };

  // ===========================================================================
  // 7. QUICK VIEW (header product cards → existing #quick-view-modal)
  // ===========================================================================
  const QuickView = {
    modal: document.getElementById('quick-view-modal'),
    lastFocus: null,

    els() {
      const m = this.modal;
      const q = (s) => m.querySelector(s);
      return {
        title: q('[data-qv-title]'),
        price: q('[data-qv-price]'),
        compare: q('[data-qv-original-price]'),
        image: q('[data-qv-image]'),
        category: q('[data-qv-category]'),
        desc: q('[data-qv-desc]'),
        add: q('[data-qv-add]'),
        addLabel: q('[data-qv-add-label]'),
        specs: q('[data-qv-specs]'),
        link: q('[data-qv-link]'),
        note: q('[data-qv-note]'),
      };
    },

    show() {
      Panels.close();
      Drawer.close({ returnFocus: false });
      this.modal.classList.remove('hidden');
      lockScroll(true);
      const closeBtn = this.modal.querySelector('[data-close-quick-view][aria-label]');
      setTimeout(() => closeBtn && closeBtn.focus({ preventScroll: true }), 60);
    },

    reset(e) {
      if (e.specs) e.specs.hidden = true; // static demo specs are never shown for header items
      if (e.compare) e.compare.classList.add('hidden');
      if (e.note) {
        e.note.hidden = true;
        e.note.textContent = '';
      }
      if (e.link) e.link.hidden = true;
      if (e.add) {
        e.add.disabled = false;
        e.add.removeAttribute('aria-disabled');
        e.add.style.opacity = '';
        e.add.style.cursor = '';
        e.add.removeAttribute('data-target-id');
      }
      if (e.addLabel) e.addLabel.textContent = 'Add to Cart';
    },

    disableAdd(e, label) {
      if (!e.add) return;
      e.add.disabled = true;
      e.add.setAttribute('aria-disabled', 'true');
      e.add.style.opacity = '0.5';
      e.add.style.cursor = 'not-allowed';
      if (e.addLabel) e.addLabel.textContent = label;
    },

    openPreview(btn) {
      if (!this.modal) return;
      const e = this.els();
      this.lastFocus = btn;
      this.reset(e);
      const title = btn.dataset.title || '';
      if (e.title) e.title.textContent = title;
      if (e.category) e.category.textContent = btn.dataset.category || '';
      if (e.price) e.price.textContent = '';
      if (e.image) {
        e.image.src = btn.dataset.image || '';
        e.image.alt = title;
      }
      if (e.desc) e.desc.textContent = '';
      if (e.note) {
        e.note.hidden = false;
        e.note.textContent = `Catalog preview (WAGMART catalog, page ${btn.dataset.page || '—'}). This product is not listed in the store yet, so price, details and checkout are unavailable.`;
      }
      this.disableAdd(e, 'Not available yet');
      this.show();
    },

    async openProduct(handle, btn) {
      if (!this.modal) return;
      this.lastFocus = btn;
      btn.setAttribute('aria-busy', 'true');
      try {
        const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
        const res = await fetch(`${root}products/${encodeURIComponent(handle)}.js`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Product not found');
        const p = await res.json();
        const e = this.els();
        this.reset(e);
        if (e.title) e.title.textContent = p.title;
        if (e.category) e.category.textContent = p.type || '';
        if (e.price) e.price.textContent = `${p.price_varies ? 'From ' : ''}${money(p.price)}`;
        if (e.compare && p.compare_at_price > p.price) {
          e.compare.textContent = money(p.compare_at_price);
          e.compare.classList.remove('hidden');
        }
        if (e.image) {
          const src = p.featured_image ? (p.featured_image.startsWith('//') ? 'https:' + p.featured_image : p.featured_image) : '';
          e.image.src = src ? this.imgWidth(src, 800) : '';
          e.image.alt = p.title;
        }
        if (e.desc) {
          const text = new DOMParser().parseFromString(p.description || '', 'text/html').body.textContent.trim();
          e.desc.textContent = text.length > 280 ? text.slice(0, 277).trimEnd() + '…' : text;
        }
        if (e.link) {
          e.link.href = p.url || `${root}products/${handle}`;
          e.link.hidden = false;
        }
        const variant = (p.variants || []).find((v) => v.available);
        if (variant && e.add) {
          e.add.setAttribute('data-target-id', variant.id);
          if (e.addLabel && p.variants.length > 1) e.addLabel.textContent = `Add ${variant.title}`;
        } else {
          this.disableAdd(e, 'Sold out');
        }
        this.show();
      } catch (err) {
        // Fall back to the product page if the quick view cannot load
        window.location.href = `/products/${encodeURIComponent(handle)}`;
      } finally {
        btn.removeAttribute('aria-busy');
      }
    },

    imgWidth(src, w) {
      return src + (src.includes('?') ? '&' : '?') + `width=${w}`;
    },

    init() {
      if (!this.modal) return;
      document.addEventListener('click', (ev) => {
        const preview = ev.target.closest('[data-quick-view-preview]');
        if (preview) {
          ev.preventDefault();
          this.openPreview(preview);
          return;
        }
        const real = ev.target.closest('[data-quick-view]');
        if (real) {
          ev.preventDefault();
          if (window.WagmartQuickView) {
            window.WagmartQuickView.open(real.closest('[data-product-card]') || real.closest('.wm-card') || real.dataset.quickView);
          } else {
            this.openProduct(real.dataset.quickView, real);
          }
        }
      });
      // Return focus to the card button when the modal closes
      new MutationObserver(() => {
        if (this.modal.classList.contains('hidden') && this.lastFocus) {
          const target = this.lastFocus;
          this.lastFocus = null;
          if (document.body.contains(target) && target.offsetParent !== null) target.focus({ preventScroll: true });
        }
      }).observe(this.modal, { attributes: true, attributeFilter: ['class'] });
    },
  };

  // ===========================================================================
  // 8. GLOBAL COORDINATION
  // ===========================================================================
  function initGlobal() {
    document.addEventListener('wagmart:overlay-open', (e) => {
      const id = e.detail && e.detail.id;
      if (id !== 'panel') Panels.close();
      if (id !== 'search') Search.close({ returnFocus: false });
      if (id !== 'drawer') Drawer.close({ returnFocus: false });
      if (id !== 'account') Account.close();
      if (id !== 'cart-drawer' && window.WagmartCart) window.WagmartCart.closeDrawer();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (Search.isOpen()) return Search.close();
      if (Drawer.isOpen()) return Drawer.close();
      if (Account.isOpen()) return Account.close({ returnFocus: true });
      if (Panels.current) return Panels.close({ returnFocus: true });
    });

    // Opening the cart from inside the mobile drawer
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-cart], [data-quick-view-trigger], [data-quick-view], [data-plp-qv-trigger]')) {
        Drawer.close({ returnFocus: false });
        Search.close({ returnFocus: false });
        Panels.close();
      }
    });
  }

  // ===========================================================================
  // MEGA MENU COLLECTION HOVER -> RELATED PRODUCTS SWITCHER
  // ===========================================================================
  const MegaCollectionSplit = {
    init() {
      const splitContainers = document.querySelectorAll('[data-mega-split]');
      if (!splitContainers.length) return;

      splitContainers.forEach((container) => {
        const tabs = Array.from(container.querySelectorAll('[data-mega-tab]'));
        const panels = Array.from(container.querySelectorAll('[data-mega-panel]'));

        function switchCollection(handle) {
          if (!handle) return;
          tabs.forEach((t) => {
            const match = t.getAttribute('data-mega-tab') === handle;
            t.classList.toggle('is-active', match);
            t.setAttribute('aria-selected', String(match));
          });

          panels.forEach((p) => {
            const match = p.getAttribute('data-mega-panel') === handle;
            p.classList.toggle('is-active', match);
          });
        }

        tabs.forEach((tab, idx) => {
          const handle = tab.getAttribute('data-mega-tab');

          // Hover switch (mouse pointerenter)
          tab.addEventListener('pointerenter', (e) => {
            if (e.pointerType === 'mouse') {
              switchCollection(handle);
            }
          });

          // Focus switch for keyboard accessibility
          tab.addEventListener('focus', () => {
            switchCollection(handle);
          });

          // Keyboard arrow navigation
          tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = tabs[(idx + 1) % tabs.length];
              next.focus();
              switchCollection(next.getAttribute('data-mega-tab'));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
              prev.focus();
              switchCollection(prev.getAttribute('data-mega-tab'));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              const activePanel = container.querySelector(`[data-mega-panel="${handle}"]`);
              if (activePanel) {
                const firstLink = activePanel.querySelector('a, button');
                if (firstLink) firstLink.focus();
              }
            }
          });
        });
      });
    },
  };

  function init() {
    Panels.init();
    MegaCollectionSplit.init();
    Carousel.init();
    initScrollState();
    Drawer.init();
    Account.init();
    Search.init();
    QuickView.init();
    initGlobal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

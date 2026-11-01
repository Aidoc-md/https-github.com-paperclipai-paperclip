/* Shared site code: header, footer, cart & wishlist store, product cards. */
(function () {
  const ICONS = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.3 3.9 4 7.3 4c2 0 3.5 1.1 4.7 2.7C13.2 5.1 14.7 4 16.7 4c3.4 0 5.7 3.3 4.5 6.7C19.5 15.4 12 20 12 20z"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  };

  const CATEGORY_NAMES = { women: 'Women', men: 'Men', fabrics: 'Fabrics', accessories: 'Accessories' };
  const SWATCH = {
    Blush: '#e6c7c2', Ivory: '#f6f1e7', Sage: '#b7c1a8', White: '#ffffff', Sand: '#d9c7a7', Sky: '#c4d4e0',
    Charcoal: '#3a3a3e', Oat: '#e4d9c6', Olive: '#7b7a52', Natural: '#e8dcc6', Grey: '#a9a7a8',
  };

  /* ---------- Storage helpers ---------- */
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const write = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage unavailable */ }
  };

  const Cart = {
    items() { return read('tlh_cart', []); },
    save(items) { write('tlh_cart', items); updateBadges(); },
    count() { return this.items().reduce((n, i) => n + i.qty, 0); },
    add(product, { size, color, qty = 1 } = {}) {
      const items = this.items();
      size = size || product.sizes[0];
      color = color || product.colors[0];
      const key = `${product.id}|${size}|${color}`;
      const existing = items.find((i) => i.key === key);
      if (existing) existing.qty = Math.min(20, existing.qty + qty);
      else items.push({ key, id: product.id, name: product.name, price: product.price, image: product.images[0], size, color, qty });
      this.save(items);
    },
    setQty(key, qty) {
      const items = this.items().map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(20, qty)) } : i));
      this.save(items);
    },
    remove(key) { this.save(this.items().filter((i) => i.key !== key)); },
    clear() { this.save([]); },
    subtotal() { return this.items().reduce((s, i) => s + i.price * i.qty, 0); },
  };

  const Wishlist = {
    ids() { return read('tlh_wishlist', []); },
    has(id) { return this.ids().includes(id); },
    toggle(id) {
      const ids = this.ids();
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      write('tlh_wishlist', next);
      updateBadges();
      return next.includes(id);
    },
  };

  /* ---------- Formatting ---------- */
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const stars = (r) => {
    const full = Math.round(r);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const discount = (p) => (p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);

  /* ---------- Header & footer ---------- */
  function renderHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const params = new URLSearchParams(location.search);
    const isActive = (cat) => (location.pathname.startsWith('/shop') && (params.get('category') === cat || params.get('filter') === cat) ? 'active' : '');
    el.outerHTML = `
      <div class="announce">Complimentary shipping on orders above ₹2,999 &nbsp;·&nbsp; Easy 15-day returns</div>
      <header class="site-header">
        <div class="wrap nav">
          <button class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false">${ICONS.menu}</button>
          <a href="/" class="logo" aria-label="The Linen House — home">
            <span class="logo-mark">The Linen House</span>
            <span class="logo-sub">Est. 2026 · Pure Linen</span>
          </a>
          <ul class="menu" id="main-menu">
            <li><a href="/shop?category=women" class="${isActive('women')}">Women</a></li>
            <li><a href="/shop?category=men" class="${isActive('men')}">Men</a></li>
            <li><a href="/shop?category=fabrics" class="${isActive('fabrics')}">Fabrics</a></li>
            <li><a href="/shop?category=accessories" class="${isActive('accessories')}">Accessories</a></li>
            <li><a href="/shop?filter=new" class="${isActive('new')}">New Arrivals</a></li>
          </ul>
          <div class="icons">
            <button class="icon-btn" data-search-toggle aria-label="Search">${ICONS.search}</button>
            <a class="icon-btn hide-sm" href="/shop?filter=wishlist" aria-label="Wishlist">${ICONS.heart}<span class="badge" data-wish-count data-count="0">0</span></a>
            <a class="icon-btn" href="/cart" aria-label="Cart">${ICONS.bag}<span class="badge" data-cart-count data-count="0">0</span></a>
            <a class="icon-btn hide-sm" href="/account" aria-label="Account">${ICONS.user}</a>
          </div>
        </div>
        <div class="search-panel" id="search-panel">
          <form class="wrap" action="/shop" method="get" role="search">
            <input type="search" name="q" placeholder="Search dresses, shirts, fabrics…" aria-label="Search products" value="${esc(params.get('q') || '')}">
            <button class="btn" type="submit">Search</button>
            <button class="icon-btn" type="button" data-search-toggle aria-label="Close search">${ICONS.close}</button>
          </form>
        </div>
      </header>`;

    document.querySelectorAll('[data-search-toggle]').forEach((b) =>
      b.addEventListener('click', () => {
        const panel = document.getElementById('search-panel');
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) panel.querySelector('input').focus();
      })
    );
    const toggle = document.querySelector('.menu-toggle');
    toggle.addEventListener('click', () => {
      const menu = document.getElementById('main-menu');
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.innerHTML = open ? ICONS.close : ICONS.menu;
    });
  }

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const faqs = [
      ['How do I care for linen?', 'Machine wash cold on a gentle cycle, line dry in the shade and iron while slightly damp. Linen gets softer with every wash.'],
      ['Will my linen shrink?', 'All our garments and fabrics are pre-washed, so shrinkage is minimal (under 2%).'],
      ['What is your return policy?', 'Unworn items with tags can be returned or exchanged within 15 days of delivery. Fabric cut to length is non-returnable.'],
      ['How long does delivery take?', 'Metro cities: 2–4 business days. Rest of India: 4–7 business days. You will get tracking by SMS and email.'],
      ['Which payment methods do you accept?', 'UPI, credit & debit cards, net banking and popular wallets, securely processed by Razorpay.'],
    ];
    el.outerHTML = `
      <footer class="site-footer">
        <div class="wrap footer-grid">
          <div>
            <a href="/" class="logo" style="margin-bottom:18px"><span class="logo-mark">The Linen House</span><span class="logo-sub">Est. 2026 · Pure Linen</span></a>
            <p>Thoughtfully made linen clothing and fabrics — breathable, honest and built to last.</p>
            <div class="socials" style="margin-top:18px"><a href="#" aria-label="Instagram">Instagram</a><a href="#" aria-label="Pinterest">Pinterest</a><a href="#" aria-label="Facebook">Facebook</a></div>
          </div>
          <div class="faq">
            <h4>FAQs</h4>
            ${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
          </div>
          <div>
            <h4>Contact</h4>
            <p><a href="mailto:hello@thelinenhouse.in">hello@thelinenhouse.in</a></p>
            <p><a href="tel:+919876543210">+91 98765 43210</a></p>
            <p>Mon – Sat, 10am – 7pm IST</p>
            <p><a href="https://wa.me/919876543210">WhatsApp us</a></p>
          </div>
          <div>
            <h4>Visit us</h4>
            <address>The Linen House Studio<br>14, Lavelle Road<br>Ashok Nagar, Bengaluru<br>Karnataka 560001, India</address>
          </div>
        </div>
        <div class="wrap footer-bottom">
          <span>© ${new Date().getFullYear()} The Linen House. All rights reserved.</span>
          <span><a href="#">Shipping</a> &nbsp;·&nbsp; <a href="#">Returns</a> &nbsp;·&nbsp; <a href="#">Privacy</a> &nbsp;·&nbsp; <a href="#">Terms</a></span>
        </div>
      </footer>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  }

  function updateBadges() {
    document.querySelectorAll('[data-cart-count]').forEach((b) => { const c = Cart.count(); b.textContent = c; b.dataset.count = c; });
    document.querySelectorAll('[data-wish-count]').forEach((b) => { const c = Wishlist.ids().length; b.textContent = c; b.dataset.count = c; });
  }

  let toastTimer;
  function toast(html) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- Product card ---------- */
  function productCard(p) {
    const off = discount(p);
    const flag = p.isNew ? 'New' : p.bestseller ? 'Bestseller' : '';
    return `
      <article class="card" data-id="${p.id}">
        <a href="/product/${p.id}" class="card-media" aria-label="${esc(p.name)}">
          ${flag ? `<span class="card-flag">${flag}</span>` : ''}
          <img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy">
          ${p.images[1] ? `<img class="alt" src="${p.images[1]}" alt="" loading="lazy" aria-hidden="true">` : ''}
        </a>
        <button class="wish ${Wishlist.has(p.id) ? 'on' : ''}" data-wish="${p.id}" aria-label="Add ${esc(p.name)} to wishlist">${ICONS.heart}</button>
        <div class="card-body">
          <span class="card-cat">${CATEGORY_NAMES[p.category] || p.category}</span>
          <h3 class="card-title"><a href="/product/${p.id}">${esc(p.name)}</a></h3>
          <div class="rating"><span class="stars" aria-label="${p.rating} out of 5">${stars(p.rating)}</span>${p.rating} (${p.reviews})</div>
          <div class="price"><strong>${inr(p.price)}</strong>${off ? `<s>${inr(p.mrp)}</s><span class="off">${off}% off</span>` : ''}</div>
          <button class="btn btn-outline" data-add="${p.id}">Add to cart</button>
        </div>
      </article>`;
  }

  // Delegated handlers for any product card on the page.
  function bindCards(container, products) {
    container.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      const wish = e.target.closest('[data-wish]');
      if (add) {
        const p = products.find((x) => x.id === add.dataset.add);
        Cart.add(p);
        toast(`${esc(p.name)} added to your cart <a href="/cart">View cart</a>`);
      }
      if (wish) {
        const on = Wishlist.toggle(wish.dataset.wish);
        wish.classList.toggle('on', on);
        toast(on ? 'Saved to your wishlist' : 'Removed from your wishlist');
      }
    });
  }

  /* ---------- Image fallback & reveal ---------- */
  const FALLBACK_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5e9e6"/><stop offset="1" stop-color="#e6c7c2"/></linearGradient></defs>' +
    '<rect width="400" height="500" fill="url(#g)"/>' +
    '<text x="200" y="262" text-anchor="middle" font-family="Georgia,serif" font-size="40" fill="#2e2e32" fill-opacity=".35">TLH</text></svg>');
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && !img.dataset.failed) {
      img.dataset.failed = '1';
      img.classList.add('img-fallback');
      img.src = FALLBACK_IMG;
    }
  }, true);

  // Catch images that failed before this script was loaded
  const fixBroken = () => document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src') && !img.dataset.failed) {
      img.dataset.failed = '1'; img.classList.add('img-fallback'); img.src = FALLBACK_IMG;
    }
  });
  window.addEventListener('load', fixBroken);

  function reveal() {
    const els = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('in'));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  async function api(url, opts) {
    const res = await fetch(url, opts && opts.body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...opts, body: JSON.stringify(opts.body) } : opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  }

  renderHeader();
  renderFooter();
  updateBadges();
  document.addEventListener('DOMContentLoaded', reveal);

  window.TLH = { Cart, Wishlist, inr, stars, esc, discount, productCard, bindCards, toast, reveal, api, ICONS, CATEGORY_NAMES, SWATCH, updateBadges };
})();

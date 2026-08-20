/* ============================================
   HOME PAGE — Instant "Add to Cart" (no Book flash)
   ============================================ */
(function () {
  if (typeof Cart === 'undefined' || typeof API === 'undefined') return;

  /* 1) Load item map IMMEDIATELY + cache for 10 min */
  const mapPromise = (async () => {
    try {
      const cached = JSON.parse(localStorage.getItem('ld_item_map') || 'null');
      if (cached && cached.map && Date.now() - cached.ts < 10 * 60 * 1000) return cached.map;
    } catch (e) {}

    let tests = [], packages = [];
    try {
      const [rt, rp] = await Promise.all([API.getTests(), API.getPackages()]);
      if (rt && rt.success) tests = rt.data || [];
      if (rp && rp.success) packages = rp.data || [];
    } catch (e) {}

    const tmap = {};
    tests.forEach(t => { tmap[t.test_id] = t.name; });
    const map = {};
    tests.forEach(t => { map[t.slug] = t; });
    packages.forEach(p => {
      p.isPackage = true;
      p.included_names = (p.test_ids || []).map(id => tmap[id]).filter(Boolean);
      map[p.slug] = p;
    });

    try { localStorage.setItem('ld_item_map', JSON.stringify({ ts: Date.now(), map: map })); } catch (e) {}
    return map;
  })();

  /* 2) Convert one card: <a> → <div>, Book → Add to Cart */
  function processCard(link, map) {
    const m = (link.getAttribute('href') || '').match(/[?&]slug=([^&]+)/);
    const slug = m ? decodeURIComponent(m[1]) : '';
    const item = map[slug];
    if (!item || link.dataset.cartDone) return;
    link.dataset.cartDone = '1';

    const card = document.createElement('div');
    card.className = link.className;
    card.style.cssText = (link.getAttribute('style') || '') + ';cursor:default;color:inherit;text-decoration:none;display:block;';
    while (link.firstChild) card.appendChild(link.firstChild);
    link.parentNode.replaceChild(card, link);

    let bookEl = null, best = Infinity;
    card.querySelectorAll('*').forEach(el => {
      const txt = (el.textContent || '').trim();
      if (/^Book(\s|$)/.test(txt) && txt.length < 20) {
        const d = el.querySelectorAll('*').length;
        if (d < best) { best = d; bookEl = el; }
      }
    });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = (bookEl && bookEl.className ? bookEl.className : 'btn btn-primary');
    if (bookEl && bookEl.getAttribute('style')) btn.setAttribute('style', bookEl.getAttribute('style'));
    btn.setAttribute('data-add-cart', '');
    btn.setAttribute('data-type', item.isPackage ? 'package' : 'test');
    btn.setAttribute('data-id', item.isPackage ? item.package_id : item.test_id);
    btn.setAttribute('data-slug', slug);
    btn.setAttribute('data-name', item.name);
    btn.setAttribute('data-price', item.isPackage ? (item.offer_price || item.original_price) : (item.discount_price || item.price));
    if (item.isPackage && item.included_names && item.included_names.length) {
      btn.setAttribute('data-includes', item.included_names.join(', '));
    }
    btn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart';

    if (bookEl) bookEl.parentNode.replaceChild(btn, bookEl);
    else card.appendChild(btn);
  }

  /* 3) Watch grids and replace within 100ms of cards appearing */
  async function run() {
    const map = await mapPromise;
    const grids = [
      document.getElementById('homeTestGrid'),
      document.getElementById('homePackageGrid')
    ].filter(Boolean);
    if (!grids.length) return;

    const sweep = () => {
    grids.forEach(g => {
        g.querySelectorAll('a[href*="bookings/"], a[href*="bookings/"]')
            .forEach(link => processCard(link, map));
    });
};

    sweep();
    const start = Date.now();
    const timer = setInterval(() => {
      sweep();
      if (Date.now() - start > 15000) clearInterval(timer);
    }, 100);
  }

  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();
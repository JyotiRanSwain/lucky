/* ============================================
   GLOBAL SEARCH — tests + packages in autocomplete
   ============================================ */
(function () {
    if (typeof APP_CONFIG === 'undefined') return;
    const R = (window.siteRoot ? siteRoot() : '');

    const input = document.getElementById('heroSearchInput') || document.getElementById('listingSearch');
    if (!input || input.dataset.globalSearchInit) return;
    input.dataset.globalSearchInit = '1';

    let cache = { tests: [], packages: [] };
    let loaded = false;

    async function ensureData() {
        if (loaded) return;
        try {
            const [t, p] = await Promise.all([
                fetch(R + 'data/tests.json').then(r => r.json()).then(j => j.data || []),
                fetch(R + 'data/packages.json').then(r => r.json()).then(j => j.data || [])
            ]);
            cache = { tests: t, packages: p };
            loaded = true;
        } catch (e) {}
    }

    let dropdown = document.getElementById('globalSearchDD');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'globalSearchDD';
        dropdown.style.cssText = `
            position: absolute; top: 100%; left: 0; right: 0;
            background: #fff; border: 1px solid var(--border);
            border-radius: 12px; box-shadow: 0 10px 40px rgba(15,23,42,.15);
            margin-top: 6px; max-height: 420px; overflow-y: auto;
            z-index: 100; display: none;
        `;
        const parent = input.closest('.hero-search') || input.closest('.search-input');
        if (parent) { parent.style.position = 'relative'; parent.appendChild(dropdown); }
    }

    const doSearch = debounce(async (q) => {
        if (!q || q.length < 2) { dropdown.style.display = 'none'; return; }
        await ensureData();
        const lc = q.toLowerCase();

        const tests = cache.tests.filter(t => (t.name + ' ' + (t.description || '')).toLowerCase().includes(lc)).slice(0, 5);
        const pkgs  = cache.packages.filter(p => (p.name + ' ' + (p.description || '')).toLowerCase().includes(lc)).slice(0, 4);

        const parts = [];

        if (tests.length) {
            parts.push(`<div style="padding:8px 12px; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.04em;">Tests</div>`);
            tests.forEach(t => {
                const price = t.discount_price || t.price;
                parts.push(`<a href="${R}tests/?slug=${t.slug}" class="sdd-item"><i class="fa-solid fa-flask-vial"></i><div><strong>${escapeHtml(t.name)}</strong><br><span class="text-sm text-muted">${formatPrice(price)}</span></div></a>`);
            });
        }

        if (pkgs.length) {
            parts.push(`<div style="padding:8px 12px; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.04em;">Packages</div>`);
            pkgs.forEach(p => {
                const price = p.offer_price || p.discount_price || p.original_price;
                parts.push(`<a href="${R}packages/?slug=${p.slug}" class="sdd-item"><i class="fa-solid fa-box-open"></i><div><strong>${escapeHtml(p.name)}</strong><br><span class="text-sm text-muted">${formatPrice(price)}</span></div></a>`);
            });
        }

        if (!parts.length) {
            parts.push(`<div style="padding:16px; text-align:center; color:var(--muted); font-size:14px;">No results for "${escapeHtml(q)}"</div>`);
        }

        // "See all" link to tests page (with search) — user can browse more
        parts.push(`<a href="${R}tests/?q=${encodeURIComponent(q)}" class="sdd-item" style="background:var(--surface-2);justify-content:center;font-weight:600;color:var(--primary);"><i class="fa-solid fa-magnifying-glass"></i><div><strong>See all results for "${escapeHtml(q)}"</strong></div></a>`);

        dropdown.innerHTML = parts.join('');
        dropdown.style.display = 'block';
    }, 250);

    input.addEventListener('input', (e) => doSearch(e.target.value.trim()));
    input.addEventListener('focus', () => { if (input.value.trim().length >= 2) doSearch(input.value.trim()); });
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.style.display = 'none';
    });
})();

// Inject styles (once)
if (!document.getElementById('globalSearchDDStyles')) {
    const s = document.createElement('style');
    s.id = 'globalSearchDDStyles';
    s.textContent = `.sdd-item{display:flex;gap:10px;align-items:center;padding:10px 12px;color:var(--text);border-bottom:1px solid var(--border);text-decoration:none;}.sdd-item:hover,.sdd-item:active{background:var(--surface-2);}.sdd-item:last-child{border-bottom:none;}.sdd-item i{color:var(--primary);width:24px;flex-shrink:0;}.sdd-item strong{display:block;font-size:14px;}`;
    document.head.appendChild(s);
}
/* Homepage dynamic lists — Add to Cart ONLY (no Book, no navigation) */
(function () {
    if (typeof APP_CONFIG === 'undefined') return;
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));
    const fmt = window.formatPrice || (n => '₹' + Number(n || 0).toLocaleString('en-IN'));

    async function load() {
        let tests = [], packages = [];
        try { const t = await API.getTests(); if (t.success) tests = t.data || []; } catch (e) {}
        try { const p = await API.getPackages(); if (p.success) packages = p.data || []; } catch (e) {}
        render(tests, packages);
    }

    function render(tests, packages) {
        const byId = {}; tests.forEach(t => byId[t.test_id] = t.name);

        /* ---- Most Booked Tests: Add to Cart only ---- */
        const tg = document.getElementById('homeTestGrid');
        if (tg) {
            tg.innerHTML = tests.slice(0, 4).map(t => {
                const price = t.discount_price || t.price;
                const disc = t.price > price ? Math.round(((t.price - price) / t.price) * 100) : 0;
                return `
                <div class="test-card" style="cursor:default;">
                    <div class="test-card-top">${t.badge ? `<span class="tc-badge">${esc(t.badge)}</span>` : ''}<h4>${esc(t.name)}</h4><p>${esc(t.description || '')}</p></div>
                    <div class="test-card-meta">
                        <div class="tc-meta-item"><i class="fa-solid fa-droplet"></i> ${esc(t.sample_type || 'Blood')}</div>
                        <div class="tc-meta-item"><i class="fa-solid fa-clock"></i> ${esc(t.report_time || '24h')}</div>
                        <div class="tc-meta-item"><i class="fa-solid fa-house"></i> Home</div>
                    </div>
                    <div class="test-card-footer">
                        <div class="tc-price">${disc ? `<div class="price-old">${fmt(t.price)}</div>` : ''}<div class="price-now"><strong>${fmt(price)}</strong>${disc ? `<span class="price-discount">${disc}% off</span>` : ''}</div></div>
                        <button type="button" class="btn btn-primary btn-sm"
                            data-add-cart data-type="test"
                            data-id="${esc(String(t.test_id || ''))}" data-slug="${esc(t.slug || '')}"
                            data-name="${esc(t.name || '')}" data-price="${price}">
                            <i class="fa-solid fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>`;
            }).join('');
        }

        /* ---- Health Packages: Add to Cart only ---- */
        const pg = document.getElementById('homePackageGrid');
        if (pg) {
            pg.innerHTML = packages.slice(0, 3).map(p => {
                const names = (p.test_ids || []).map(id => byId[id]).filter(Boolean);
                const price = p.offer_price || p.original_price;
                const save = (p.original_price || 0) - (p.offer_price || 0);
                return `
                <div class="package-card ${p.featured ? 'featured' : ''}" style="cursor:default;">
                    <div class="pc-head"><h4>${esc(p.name)}</h4><div class="pc-prices"><span class="old">${fmt(p.original_price)}</span><span class="now">${fmt(price)}</span>${save > 0 ? `<span class="save">Save ${fmt(save)}</span>` : ''}</div></div>
                    <div class="pc-body">
                        <div class="pc-includes-label">Includes</div>
                        <ul class="pc-includes">${names.map(n => `<li><i class="fa-solid fa-check"></i> ${esc(n)}</li>`).join('') || '<li>No tests linked</li>'}</ul>
                        <button type="button" class="btn btn-primary btn-block"
                            data-add-cart data-type="package"
                            data-id="${esc(String(p.package_id || ''))}" data-slug="${esc(p.slug || '')}"
                            data-name="${esc(p.name || '')}" data-price="${price}"
                            data-includes="${esc(names.join(', '))}">
                            <i class="fa-solid fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>`;
            }).join('');
        }
    }

    function start() { load(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    window.addEventListener('ld:updated', function () { load(); });
})();
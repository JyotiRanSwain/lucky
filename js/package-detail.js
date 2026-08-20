/* ============================================
   PACKAGE DETAIL — reads ?slug= and renders
   ============================================ */
(async function () {
    if (typeof APP_CONFIG === 'undefined') return;
    const R = (window.siteRoot ? siteRoot() : '');

    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    const container = document.getElementById('packageDetail');
    if (!container || !slug) { renderNotFound(container); return; }

    showSkeleton(container);

    let pkg = null, tests = [];
    try {
        const res = await API.getPackage(slug);
        if (res.success) pkg = res.data;
    } catch (e) {}

    if (!pkg) {
        try {
            const r = await fetch(R + 'data/packages.json');
            const j = await r.json();
            pkg = (j.data || []).find(p => p.slug === slug);
        } catch (e) {}
    }

    if (pkg) {
        try {
            const tr = await fetch(R + 'data/tests.json');
            tests = ((await tr.json()).data) || [];
        } catch (e) {}
    }

    if (!pkg) { renderNotFound(container); return; }

    const orig = pkg.original_price || pkg.price || 0;
    const price = pkg.offer_price || pkg.discount_price || orig;
    const save = orig - price;

    // Match included tests
    const testIds = Array.isArray(pkg.test_ids) ? pkg.test_ids : (pkg.test_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    const includedTests = testIds.map(id => tests.find(t => t.test_id === id)).filter(Boolean);

    container.innerHTML = `
        <div class="detail-hero">
            <a href="${R}packages/" class="detail-back"><i class="fa-solid fa-chevron-left"></i> Back to packages</a>
            <h1>${escapeHtml(pkg.name)}</h1>
            <div class="dh-meta">
                <span class="dh-badge"><i class="fa-solid fa-box-open"></i>${testIds.length} tests included</span>
                <span class="dh-badge"><i class="fa-solid fa-clock"></i>${escapeHtml(pkg.report_time || '24h')}</span>
                <span class="dh-badge"><i class="fa-solid fa-house"></i>Home collection</span>
            </div>
        </div>

        <div class="detail-section">
            <h3>About this package</h3>
            <p>${escapeHtml(pkg.description || '')}</p>
        </div>

        <div class="detail-section">
            <h3>Tests Included (${includedTests.length || testIds.length})</h3>
            <ul class="includes-list">
                ${includedTests.length
                    ? includedTests.map(t => `<li><i class="fa-solid fa-check-circle"></i><div><strong>${escapeHtml(t.name)}</strong><br><span class="text-sm text-muted">${escapeHtml(t.description || '')}</span></div></li>`).join('')
                    : testIds.map(id => `<li><i class="fa-solid fa-check-circle"></i>${escapeHtml(id)}</li>`).join('')
                }
            </ul>
        </div>

        ${pkg.preparation ? `
        <div class="detail-section">
            <h3>Preparation</h3>
            <p>${escapeHtml(pkg.preparation)}</p>
        </div>` : ''}

        <div class="price-card">
            <div class="pc-info">
                ${save > 0 ? `<div class="old">${formatPrice(orig)}</div>` : ''}
                <div><span class="now">${formatPrice(price)}</span>${save > 0 ? `<span class="save">Save ${formatPrice(save)}</span>` : ''}</div>
            </div>
            <button class="btn btn-primary" id="addPkgBtn" data-id="${pkg.package_id}" data-name="${escapeHtml(pkg.name)}" data-slug="${pkg.slug}" data-price="${price}" data-type="package">
                <i class="fa-solid fa-cart-plus"></i> Add to Cart
            </button>
        </div>
    `;

    document.getElementById('addPkgBtn').addEventListener('click', function () {
        if (window.Cart) {
            Cart.addItem({
                id: this.dataset.id,
                type: this.dataset.type,
                name: this.dataset.name,
                slug: this.dataset.slug,
                price: parseFloat(this.dataset.price)
            });
        }
    });

    function showSkeleton(c) {
        c.innerHTML = `<div style="padding:16px;"><div class="skeleton" style="height:20px; width:100px; margin-bottom:16px;"></div><div class="skeleton" style="height:28px; width:80%; margin-bottom:8px;"></div><div class="skeleton" style="height:16px; width:60%;"></div></div>`;
    }
    function renderNotFound(c) {
        c.innerHTML = `<div class="empty-state"><div class="ei"><i class="fa-solid fa-triangle-exclamation"></i></div><h3>Package not found</h3><p>This package may be unavailable.</p><a href="${R}packages/" class="btn btn-primary" style="margin-top:16px;">Browse all packages</a></div>`;
    }
})();
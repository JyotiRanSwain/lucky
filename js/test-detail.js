/* ============================================
   TEST DETAIL — API → JSON → built-in fallback
   ============================================ */
(async function () {
    const R = (window.siteRoot ? siteRoot() : '');
    const container = document.getElementById('testDetail');
    if (!container) return;

    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) { notFound(); return; }

    skeleton();

    let test = null;

    // 1) Live API (Google Sheets)
    try { const r = await API.getTest(slug); if (r && r.success && r.data) test = r.data; } catch (e) {}

    // 2) data/tests.json
    if (!test) {
        try { const r = await fetch(R + 'data/tests.json'); const j = await r.json(); test = (j.data || []).find(t => t.slug === slug); } catch (e) {}
    }

    // 3) Built-in fallback (guaranteed render)
    if (!test) test = FALLBACK.find(t => t.slug === slug);

    if (!test) { notFound(); return; }
    render(test);

    function skeleton() {
        container.innerHTML = `<div style="padding:16px;"><div class="skeleton" style="height:20px;width:100px;margin-bottom:16px;"></div><div class="skeleton" style="height:28px;width:80%;margin-bottom:8px;"></div><div class="skeleton" style="height:16px;width:60%;margin-bottom:24px;"></div><div class="skeleton" style="height:120px;"></div></div>`;
    }

    function notFound() {
        container.innerHTML = `<div class="empty-state"><div class="ei"><i class="fa-solid fa-triangle-exclamation"></i></div><h3>Test not found</h3><p>This test may be unavailable.</p><a href="${R}tests/" class="btn btn-primary" style="margin-top:16px;">Browse all tests</a></div>`;
    }

    function render(t) {
        const price = t.discount_price || t.price;
        const disc = t.price > price ? Math.round(((t.price - price) / t.price) * 100) : 0;
        let paramsHtml = '';
        try {
            const params = typeof t.parameters_json === 'string' ? JSON.parse(t.parameters_json) : (t.parameters_json || []);
            if (params && params.length) {
                paramsHtml = `<div class="detail-section"><h3>Parameters Included</h3><div style="overflow-x:auto;"><table class="param-table"><thead><tr><th>Parameter</th><th>Unit</th><th>Reference Range</th></tr></thead><tbody>${params.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.unit || '')}</td><td>${escapeHtml(p.reference_range || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
            }
        } catch (e) {}

        container.innerHTML = `
        <div class="detail-hero">
            <a href="${R}tests/" class="detail-back"><i class="fa-solid fa-chevron-left"></i> Back to tests</a>
            <h1>${escapeHtml(t.name)}</h1>
            <div class="dh-meta">
                ${t.badge ? `<span class="dh-badge"><i class="fa-solid fa-star"></i>${escapeHtml(t.badge)}</span>` : ''}
                <span class="dh-badge"><i class="fa-solid fa-droplet"></i>${escapeHtml(t.sample_type || 'Blood')}</span>
                <span class="dh-badge"><i class="fa-solid fa-clock"></i>${escapeHtml(t.report_time || '24h')}</span>
                <span class="dh-badge"><i class="fa-solid fa-utensils"></i>${t.fasting_required ? 'Fasting required' : 'No fasting'}</span>
                ${t.home_collection ? `<span class="dh-badge"><i class="fa-solid fa-house"></i>Home collection</span>` : ''}
            </div>
        </div>
        <div class="detail-section"><h3>About this test</h3><p>${escapeHtml(t.description || '')}</p></div>
        <div class="detail-section"><h3>Test Details</h3><div class="info-grid">
            <div class="info-cell"><strong>Sample Type</strong><span><i class="fa-solid fa-droplet"></i>${escapeHtml(t.sample_type || 'Blood')}</span></div>
            <div class="info-cell"><strong>Report Time</strong><span><i class="fa-solid fa-clock"></i>${escapeHtml(t.report_time || '24 hours')}</span></div>
            <div class="info-cell"><strong>Fasting</strong><span><i class="fa-solid fa-utensils"></i>${t.fasting_required ? 'Required' : 'Not required'}</span></div>
            <div class="info-cell"><strong>Collection</strong><span><i class="fa-solid fa-house"></i>${t.home_collection ? 'Home available' : 'Center only'}</span></div>
        </div></div>
        ${t.preparation ? `<div class="detail-section"><h3>Preparation</h3><p>${escapeHtml(t.preparation)}</p></div>` : ''}
        ${paramsHtml}
        <div class="price-card">
            <div class="pc-info">${disc > 0 ? `<div class="old">${formatPrice(t.price)}</div>` : ''}<div><span class="now">${formatPrice(price)}</span>${disc > 0 ? `<span class="save">${disc}% off</span>` : ''}</div></div>
            <button class="btn btn-primary" id="addTestBtn"><i class="fa-solid fa-cart-plus"></i> Add</button>
        </div>`;

        document.getElementById('addTestBtn').addEventListener('click', () => {
            if (window.Cart) Cart.addItem({ id: t.test_id, type: 'test', name: t.name, slug: t.slug, price: price });
        });
    }

    const FALLBACK = [
        { test_id: 't_cbc01', name: 'CBC — Complete Blood Count', slug: 'cbc-test', description: 'Measures overall health, detects anemia and infection.', sample_type: 'Blood', fasting_required: false, preparation: 'No special preparation needed', report_time: '6 hours', price: 400, discount_price: 299, home_collection: true, badge: 'Popular', parameters_json: [{ name: 'Hemoglobin', unit: 'g/dL', reference_range: '13.0 – 17.0' }, { name: 'WBC Count', unit: 'cells/µL', reference_range: '4,000 – 11,000' }, { name: 'Platelets', unit: 'lakh/µL', reference_range: '1.5 – 4.1' }] },
        { test_id: 't_hba1c01', name: 'HbA1c Test', slug: 'hba1c-test', description: 'Average blood sugar over the past 2–3 months.', sample_type: 'Blood', fasting_required: false, preparation: 'No fasting required', report_time: '24 hours', price: 600, discount_price: 449, home_collection: true, badge: 'Essential' },
        { test_id: 't_lipid01', name: 'Lipid Profile', slug: 'lipid-profile', description: 'Measures cholesterol and triglycerides for heart health.', sample_type: 'Blood', fasting_required: true, preparation: '10–12 hour fasting required', report_time: '24 hours', price: 700, discount_price: 499, home_collection: true, badge: 'Heart' },
        { test_id: 't_thyroid01', name: 'Thyroid Profile', slug: 'thyroid-profile', description: 'Tests T3, T4 and TSH to evaluate thyroid function.', sample_type: 'Blood', fasting_required: false, preparation: 'No special preparation needed', report_time: '24 hours', price: 650, discount_price: 449, home_collection: true, badge: 'Thyroid' },
        { test_id: 't_vitd01', name: 'Vitamin D Total', slug: 'vitamin-d', description: 'Check vitamin D levels for bone and immunity health.', sample_type: 'Blood', fasting_required: false, preparation: 'No fasting required', report_time: '24 hours', price: 1100, discount_price: 799, home_collection: true, badge: 'Vitamin' },
        { test_id: 't_vitb12_01', name: 'Vitamin B12', slug: 'vitamin-b12', description: 'Check B12 levels for nerve and energy health.', sample_type: 'Blood', fasting_required: false, preparation: 'No fasting required', report_time: '24 hours', price: 950, discount_price: 699, home_collection: true, badge: 'Vitamin' }
    ];
})();
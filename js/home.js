/* ============================================
   HOMEPAGE — Hero background banner slider,
   FAQ, animations, optional API refresh
   ============================================ */

(function initHome() {
    initBannerSlider();
    initFaq();
    initAnimations();
    enhanceFromApi();
})();

/* ---------- ROTATING HERO BACKGROUND (banner1 -> banner2) ---------- */
function initBannerSlider() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    const bgs = hero.querySelectorAll('.hero-bg-img');
    const dotsWrap = document.getElementById('bannerDots');
    const n = bgs.length;
    if (n < 1) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0, timer = null;

    function go(x) {
        i = (x + n) % n;
        bgs.forEach((b, bi) => b.classList.toggle('active', bi === i));
        if (dotsWrap) {
            dotsWrap.querySelectorAll('.dot').forEach((d, di) =>
                d.classList.toggle('active', di === i));
        }
    }
    function start() {
        if (reduce || n < 2) return;
        stop();
        timer = setInterval(() => go(i + 1), 6000); // auto change every 6s
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    if (dotsWrap) {
        dotsWrap.addEventListener('click', (e) => {
            const d = e.target.closest('.dot');
            if (!d) return;
            go([...dotsWrap.children].indexOf(d));
            start();
        });
    }

    document.addEventListener('visibilitychange', () => {
        document.hidden ? stop() : start();
    });

    go(0);
    start();
}

/* ---------- Optional live refresh (never destroys static content) ---------- */
async function enhanceFromApi() {
    try {
        const t = await API.getTests({ popular: true });
        if (t.success && Array.isArray(t.data) && t.data.length) {
            const track = document.getElementById('testsTrack');
            if (track) track.innerHTML = t.data.map(renderTestCard).join('');
        }
    } catch (e) { /* keep static */ }

    try {
        const p = await API.getPackages({ popular: true });
        if (p.success && Array.isArray(p.data) && p.data.length) {
            const track = document.getElementById('packagesTrack');
            if (track) track.innerHTML = p.data.map(renderPackageCard).join('');
        }
    } catch (e) { /* keep static */ }
}

function renderTestCard(t) {
    const price = t.discount_price || t.price;
    const disc = t.price > price ? Math.round(((t.price - price) / t.price) * 100) : 0;
    return `
    <div class="test-card">
        <a href="test-detail/?slug=${encodeURIComponent(t.slug || t.test_id)}" class="test-card-top">
            ${t.badge ? `<span class="tc-badge">${escapeHtml(t.badge)}</span>` : ''}
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.description || '')}</p>
        </a>
        <div class="test-card-meta">
            <div class="tc-meta-item"><i class="fa-solid fa-droplet"></i> ${escapeHtml(t.sample_type || 'Blood')}</div>
            <div class="tc-meta-item"><i class="fa-solid fa-clock"></i> ${escapeHtml(t.report_time || '24h')}</div>
            <div class="tc-meta-item"><i class="fa-solid fa-utensils"></i> ${t.fasting_required ? 'Fasting' : 'No fasting'}</div>
            <div class="tc-meta-item"><i class="fa-solid fa-house"></i> Home</div>
        </div>
        <div class="test-card-footer">
            <div class="tc-price">${disc > 0 ? `<div class="price-old">${formatPrice(t.price)}</div>` : ''}<div class="price-now"><strong>${formatPrice(price)}</strong>${disc > 0 ? `<span class="price-discount">${disc}% off</span>` : ''}</div></div>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();location.href='${R}bookings/?type=test&slug=${encodeURIComponent(t.slug || t.test_id)}'">Book</button>
        </div>
    </div>`;
}


function renderPackageCard(p) {
    const orig = p.price || p.original_price || 0;
    const price = p.offer_price || p.discount_price || orig;
    const save = orig - price;
    const tests = Array.isArray(p.tests) ? p.tests.slice(0, 5) : [];
    return `
    <div class="package-card ${p.featured ? 'featured' : ''}">
        <a href="packages/?slug=${encodeURIComponent(p.slug || p.package_id)}" class="pc-head">
            <h4>${escapeHtml(p.name)}</h4>
            <div class="pc-prices">${orig > price ? `<span class="old">${formatPrice(orig)}</span>` : ''}<span class="now">${formatPrice(price)}</span>${save > 0 ? `<span class="save">Save ${formatPrice(save)}</span>` : ''}</div>
        </a>
        <div class="pc-body">
            <div class="pc-includes-label">Includes</div>
            <ul class="pc-includes">${tests.map(t => `<li><i class="fa-solid fa-check"></i> ${escapeHtml(typeof t === 'string' ? t : t.name)}</li>`).join('')}</ul>
            <button class="btn btn-primary btn-block" onclick="event.stopPropagation();location.href='${R}bookings/?type=package&slug=${encodeURIComponent(p.slug || p.package_id)}'">Book Package</button>
        </div>
    </div>`;
}

/* ---------- FAQ ---------- */
function initFaq() {
    const wrap = document.getElementById('faqWrap');
    if (!wrap) return;
    wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.faq-q');
        if (!btn) return;
        const item = btn.closest('.faq-item');
        const answer = item.querySelector('.faq-a');
        const isOpen = item.classList.contains('open');

        wrap.querySelectorAll('.faq-item.open').forEach(o => {
            if (o !== item) {
                o.classList.remove('open');
                o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
                o.querySelector('.faq-a').style.maxHeight = '0';
            }
        });

        if (isOpen) {
            item.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
            answer.style.maxHeight = '0';
        } else {
            item.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
            answer.style.maxHeight = answer.scrollHeight + 'px';
        }
    });
}

/* ---------- Scroll animations ---------- */
function initAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('[data-anim]').forEach(el => obs.observe(el));
}

/* ---------- Search ---------- */
function handleSearch(e) {
    e.preventDefault();

    const input = document.getElementById('heroSearchInput');

    if (!input) return false;

    const q = input.value.trim();

    if (q) {
        const R = (typeof siteRoot === 'function')
            ? siteRoot()
            : '/';

        window.location.href =
            `${R}tests/?q=${encodeURIComponent(q)}`;
    }

    return false;
}
window.handleSearch = handleSearch;
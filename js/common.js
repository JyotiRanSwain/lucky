/* ============================================================
   LUCKY DIAGNOSTICS — js/common.js (CLEAN - single session source)
   ============================================================ */

window.siteRoot = function () {
    const path = location.pathname;

    // Local files: subfolder pages need ../
    if (location.protocol === 'file:') {
        return /\/(pages|tests|packages|categories|health-guide|locations|admin|collector|technician)\//.test(path) ? '../' : '';
    }

    // GitHub Pages: /repo-name/
    if (location.hostname.endsWith('.github.io')) {
        const seg = path.split('/').filter(Boolean)[0];
        return seg ? '/' + seg + '/' : '/';
    }

    // Production / localhost
    return '/';
};

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
window.escapeHtml = escapeHtml;
window.formatPrice = function (n) { return '₹' + (Number(n) || 0); };
window.debounce = function (fn, delay) {
    let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), delay || 300); };
};

window.showToast = function (message, type, duration) {
    type = type || 'info'; duration = duration || 3500;
    const wrap = document.getElementById('toastWrap');
    if (!wrap) { alert(message); return; }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<span>' + escapeHtml(message) + '</span>';
    wrap.appendChild(t);
    setTimeout(() => t.remove(), duration);
};

/* ========== SESSION (single definition, localStorage only) ========== */
window.setSession = function (s) {
    try {
        localStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify(Object.assign({}, s, { created_at: Date.now() })));
        console.log('[Session] Saved:', s.role, s.token);
    } catch (e) {
        console.error('[Session] Save failed:', e);
    }
};

window.getSession = function () {
    try {
        const raw = localStorage.getItem(APP_CONFIG.SESSION_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (Date.now() - s.created_at > APP_CONFIG.SESSION_MAX_AGE) {
            window.clearSession();
            return null;
        }
        return s;
    } catch (e) { return null; }
};

window.clearSession = function () {
    try { localStorage.removeItem(APP_CONFIG.SESSION_KEY); } catch (e) {}
};

window.requireAuth = function () {

    if (getSession()) {
        return true;
    }

    const currentPath =
        location.pathname + location.search;

    const loginPath = '/admin/';

    location.href =
        loginPath +
        '?next=' +
        encodeURIComponent(currentPath);

    return false;
};

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    try {
        const cart = JSON.parse(localStorage.getItem(APP_CONFIG.CART_KEY) || '[]');
        badge.textContent = cart.length;
    } catch (e) {}
}
window.updateCartBadge = updateCartBadge;

document.addEventListener('DOMContentLoaded', function () {
    updateCartBadge();

    /* Mobile menu */
    const menuBtn = document.getElementById('menuBtn');
    const drawer = document.getElementById('mobileDrawer');
    if (menuBtn && drawer) {
        menuBtn.addEventListener('click', () => drawer.classList.toggle('open'));
    }

    /* ---------- LOCATION DROPDOWN ---------- */
    (function () {
        const sel = document.getElementById('locSelector');
        if (!sel || sel.dataset.locInit) return;
        sel.dataset.locInit = '1';
        const btn = document.getElementById('locDropBtn');
        const menu = document.getElementById('locMenu');
        if (!btn || !menu) return;
        const shortEl = sel.querySelector('.loc-short');
        const longEl = sel.querySelector('.loc-long');

        function setLabel(loc) {
            const p = String(loc).split(',');
            if (shortEl) shortEl.textContent = p[0].trim();
            if (longEl) longEl.textContent = p.length > 1 ? ', ' + p.slice(1).join(',').trim() : '';
        }
        function close() { sel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }

        const saved = localStorage.getItem('ld_location');
        if (saved) {
            setLabel(saved);
            menu.querySelectorAll('.loc-option').forEach(o => o.classList.toggle('active', o.getAttribute('data-loc') === saved));
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.setAttribute('aria-expanded', String(sel.classList.toggle('open')));
        });

        menu.querySelectorAll('.loc-option').forEach((opt) => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation(); e.preventDefault();
                const loc = opt.getAttribute('data-loc') || '';
                if (opt.hasAttribute('data-soon')) {
                    showToast(loc + ' branch is coming soon!', 'warning', 4000);
                    close();
                    return;
                }
                localStorage.setItem('ld_location', loc);
                setLabel(loc);
                menu.querySelectorAll('.loc-option').forEach(o => o.classList.toggle('active', o === opt));
                showToast('Location set to ' + loc, 'success');
                close();
            });
        });

        document.addEventListener('click', (e) => { if (!sel.contains(e.target)) close(); });
    })();
});

console.log('%cLucky Diagnostics', 'color:#0d9488;font-size:18px;font-weight:800;');
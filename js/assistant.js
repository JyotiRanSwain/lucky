/* Lucky Diagnostics — Diagnostics Assistance — v4 FINAL (self-cleaning) */
(function () {
    if (typeof APP_CONFIG === 'undefined') return;

    // 1) KILL all old assistant UI from any previous version
    document.querySelectorAll('#assistFab,#assistPanel,#assistWrap,.assist-fab,.assist-panel,#ldaFab,#ldaPanel').forEach(el => el.remove());
    if (document.getElementById('ldaFab')) return;

    const R = (window.siteRoot ? siteRoot() : '');
    const fmt = window.formatPrice || (n => '₹' + n);
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));

    // 2) Inject styles (unique lda- classes)
    if (!document.getElementById('ldaStyles')) {
        const st = document.createElement('style');
        st.id = 'ldaStyles';
        st.textContent = `
        #ldaFab{position:fixed;z-index:9990;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(135deg,#12305a,#0f766e);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(18,48,90,.45);}
        #ldaFab:active{transform:scale(.92);}
        #ldaPanel{position:fixed;z-index:9991;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.4);display:none;flex-direction:column;overflow:hidden;}
        #ldaPanel.open{display:flex;}
        .lda-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(135deg,#12305a,#0f766e);color:#fff;flex-shrink:0;}
        .lda-head .av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .lda-head strong{display:block;font-size:14px;}
        .lda-head .on{font-size:11px;opacity:.85;}
        .lda-head .x{margin-left:auto;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;flex-shrink:0;}
        .lda-body{flex:1;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;}
        .lda-msg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.55;}
        .lda-msg.bot{background:#fff;border:1px solid #e2e8f0;color:#334155;border-bottom-left-radius:4px;}
        .lda-msg.user{align-self:flex-end;background:#0d9488;color:#fff;border-bottom-right-radius:4px;}
        .lda-msg a{color:#0d9488;font-weight:600;}
        .lda-msg.user a{color:#fff;}
        .lda-chips{display:flex;gap:8px;padding:10px 12px;overflow-x:auto;background:#f8fafc;border-top:1px solid #e2e8f0;flex-shrink:0;}
        .lda-chips button{flex-shrink:0;padding:8px 12px;border-radius:999px;background:#fff;border:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#334155;cursor:pointer;}
        .lda-in{display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0;}
        .lda-in input{flex:1;min-width:0;border:1.5px solid #e2e8f0;border-radius:999px;padding:10px 16px;font-size:14px;outline:none;}
        .lda-in button{width:44px;height:44px;border:0;border-radius:50%;background:#0d9488;color:#fff;cursor:pointer;flex-shrink:0;}`;
        document.head.appendChild(st);
    }

    const KB = { phone: APP_CONFIG.PHONE || '+91 98537 16027', phoneTel: APP_CONFIG.PHONE_TEL || '+919853716027',
        email: APP_CONFIG.EMAIL || 'info@luckydiagnosics.com', hours: 'Mon – Sun: 7 AM – 9 PM', tests: [], packages: [] };

    (async () => {
        try {
            const [t, p] = await Promise.all([API.getTests({}), API.getPackages({})]);
            if (t.success && t.data) KB.tests = t.data.map(x => ({ n: x.name, price: x.discount_price || x.price, old: x.price, report: x.report_time, fasting: x.fasting_required }));
            if (p.success && p.data) KB.packages = p.data.map(x => ({ n: x.name, price: x.offer_price || x.original_price, old: x.original_price }));
        } catch (e) {}
    })();

    function init() {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <button id="ldaFab" type="button" aria-label="Open assistant"><i class="fa-solid fa-robot"></i></button>
            <div id="ldaPanel" role="dialog">
                <div class="lda-head"><div class="av"><i class="fa-solid fa-robot"></i></div>
                    <div><strong>Diagnostics Assistance</strong><span class="on">● Online</span></div>
                    <button class="x" id="ldaClose" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>
                <div class="lda-body" id="ldaBody"></div>
                <div class="lda-chips" id="ldaChips"></div>
                <form class="lda-in" id="ldaForm"><input id="ldaText" placeholder="Ask: CBC price..." autocomplete="off"><button type="submit" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button></form>
            </div>`;
        document.body.appendChild(wrap);

        const fab = document.getElementById('ldaFab'), panel = document.getElementById('ldaPanel'),
              body = document.getElementById('ldaBody'), chips = document.getElementById('ldaChips'),
              form = document.getElementById('ldaForm'), input = document.getElementById('ldaText');

        // 3) Inline responsive layout — perfect on every device
        function layout() {
            const w = window.innerWidth;
            const navH = document.querySelector('.bottom-nav') ? 68 : 0;
            if (w >= 1024) {
                fab.style.right = '20px'; fab.style.bottom = '20px';
                panel.style.left = 'auto'; panel.style.right = '20px'; panel.style.bottom = '92px';
                panel.style.width = '370px'; panel.style.height = 'min(560px, calc(100vh - 120px))';
            } else if (w >= 640) {
                fab.style.right = '12px'; fab.style.bottom = (navH + 12) + 'px';
                panel.style.left = 'auto'; panel.style.right = '12px'; panel.style.bottom = (navH + 12) + 'px';
                panel.style.width = Math.min(400, w - 24) + 'px'; panel.style.height = 'min(520px, 70vh)';
            } else {
                fab.style.right = '14px'; fab.style.bottom = (navH + 80) + 'px';
                panel.style.left = '8px'; panel.style.right = '8px'; panel.style.width = 'auto';
                panel.style.bottom = (navH + 8) + 'px'; panel.style.height = 'min(480px, 65vh)';
            }
        }
        window.addEventListener('resize', layout);
        layout();

        ['Test prices', 'Packages', 'Home collection', 'Timings', 'Contact'].forEach(c => {
            const b = document.createElement('button'); b.type = 'button'; b.textContent = c;
            b.addEventListener('click', () => ask(c)); chips.appendChild(b);
        });

        let greeted = false;
        fab.addEventListener('click', () => {
            layout();
            panel.classList.add('open');
            fab.style.display = 'none';
            if (!greeted) { greeted = true; bot('Hello! 👋 Ask me about test prices, packages, home collection or timings.'); }
            setTimeout(() => input.focus(), 100);
        });
        document.getElementById('ldaClose').addEventListener('click', () => {
            panel.classList.remove('open');
            fab.style.display = 'flex';
        });
        form.addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (q) { input.value = ''; ask(q); } });

        function ask(q) { addMsg('user', esc(q)); setTimeout(() => addMsg('bot', answer(q)), 300); }
        function addMsg(t, h) { const m = document.createElement('div'); m.className = 'lda-msg ' + t; m.innerHTML = h; body.appendChild(m); body.scrollTop = body.scrollHeight; }

        function answer(raw) {
            const q = raw.toLowerCase();
            if (/hello|hi|namaste/.test(q)) return 'Hello! 👋 Try <em>"CBC price"</em> or <em>"packages"</em>.';
            if (/phone|contact|call|number/.test(q)) return `📞 <a href="tel:${KB.phoneTel}">${KB.phone}</a><br>✉️ ${KB.email}`;
            if (/time|hour|open|close/.test(q)) return `🕒 <strong>${KB.hours}</strong>`;
            if (/home|collection/.test(q)) return `🏠 Home collection available.<br><a href="${R}tests/">Book →</a>`;
            if (/package|checkup/.test(q)) { let s = '💚 <strong>Packages:</strong><br>'; KB.packages.forEach(p => s += `• ${esc(p.n)} — <strong>${fmt(p.price)}</strong><br>`); return s; }
            const t = KB.tests.find(x => q.includes(x.n.toLowerCase()));
            if (t) return `🧪 <strong>${esc(t.n)}</strong>: <strong>${fmt(t.price)}</strong> <s>${fmt(t.old)}</s>`;
            if (/test|price/.test(q)) { let s = '🧪 <strong>Tests:</strong><br>'; KB.tests.slice(0, 6).forEach(t => s += `• ${esc(t.n)} — ${fmt(t.price)}<br>`); return s; }
            return 'I can help with test prices, packages, home collection & timings 😊';
        }
        console.log('[assistant] v4 ready');
    }

    if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
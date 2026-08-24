/* Lucky Diagnostics — Diagnostics Assistance — v5 Robust Engine */
(function () {
    if (typeof APP_CONFIG === 'undefined') return;

    // 1) Self-cleaning duplicate cleanup
    document.querySelectorAll('#assistFab,#assistPanel,#assistWrap,.assist-fab,.assist-panel,#ldaFab,#ldaPanel').forEach(el => el.remove());
    if (document.getElementById('ldaFab')) return;

    const R = (window.siteRoot ? siteRoot() : '');
    const fmt = window.formatPrice || (n => '₹' + n);
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));

    // 2) CSS Styles Injection
    if (!document.getElementById('ldaStyles')) {
        const st = document.createElement('style');
        st.id = 'ldaStyles';
        st.textContent = `
        #ldaFab{position:fixed;z-index:9990;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(135deg,#12305a,#0f766e);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(18,48,90,.45);transition:transform .2s;}
        #ldaFab:active{transform:scale(.92);}
        #ldaPanel{position:fixed;z-index:9991;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.4);display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;}
        #ldaPanel.open{display:flex;}
        .lda-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(135deg,#12305a,#0f766e);color:#fff;flex-shrink:0;}
        .lda-head .av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .lda-head strong{display:block;font-size:14px;}
        .lda-head .on{font-size:11px;opacity:.85;}
        .lda-head .x{margin-left:auto;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
        .lda-body{flex:1;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;}
        .lda-msg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.55;word-wrap:break-word;}
        .lda-msg.bot{background:#fff;border:1px solid #e2e8f0;color:#334155;border-bottom-left-radius:4px;}
        .lda-msg.user{align-self:flex-end;background:#0d9488;color:#fff;border-bottom-right-radius:4px;}
        .lda-msg a{color:#0d9488;font-weight:600;}
        .lda-msg.user a{color:#fff;}
        .lda-chips{display:flex;gap:8px;padding:10px 12px;overflow-x:auto;background:#f8fafc;border-top:1px solid #e2e8f0;flex-shrink:0;}
        .lda-chips button{flex-shrink:0;padding:8px 12px;border-radius:999px;background:#fff;border:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#334155;cursor:pointer;}
        .lda-in{display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0;}
        .lda-in input{flex:1;min-width:0;border:1.5px solid #e2e8f0;border-radius:999px;padding:10px 16px;font-size:14px;outline:none;}
        .lda-in button{width:44px;height:44px;border:0;border-radius:50%;background:#0d9488;color:#fff;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;}`;
        document.head.appendChild(st);
    }

    // 3) Expanded Knowledge Base State
    const KB = {
        phone: APP_CONFIG.PHONE || '+91 99371 93790',
        phoneTel: APP_CONFIG.PHONE_TEL || '+919937193790',
        email: APP_CONFIG.EMAIL || 'info@luckydiagnostics.com',
        hours: 'Mon – Sun: 7:00 AM – 9:00 PM',
        address: APP_CONFIG.ADDRESS || 'Main Branch, Lucky Diagnostics',
        tests: [],
        packages: []
    };

    // Data Hydration from APIs
    (async () => {
        try {
            const [t, p] = await Promise.all([
                typeof API !== 'undefined' && API.getTests ? API.getTests({}) : Promise.resolve({}),
                typeof API !== 'undefined' && API.getPackages ? API.getPackages({}) : Promise.resolve({})
            ]);
            if (t.success && t.data) {
                KB.tests = t.data.map(x => ({
                    id: x.id,
                    n: x.name,
                    alias: (x.alias || x.short_code || '').toLowerCase(),
                    price: x.discount_price || x.price,
                    old: x.price,
                    report: x.report_time || 'Same Day',
                    fasting: x.fasting_required ? 'Fasting Required (8-12 hrs)' : 'No Fasting Required'
                }));
            }
            if (p.success && p.data) {
                KB.packages = p.data.map(x => ({
                    id: x.id,
                    n: x.name,
                    price: x.offer_price || x.original_price,
                    old: x.original_price,
                    desc: x.description || ''
                }));
            }
        } catch (e) {
            console.error('[Assistant Data Load Error]', e);
        }
    })();

    // 4) Initialization & Layout Logic
    function init() {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <button id="ldaFab" type="button" aria-label="Open assistant"><i class="fa-solid fa-robot"></i></button>
            <div id="ldaPanel" role="dialog">
                <div class="lda-head">
                    <div class="av"><i class="fa-solid fa-robot"></i></div>
                    <div><strong>Diagnostics Assistance</strong><span class="on">● Online</span></div>
                    <button class="x" id="ldaClose" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="lda-body" id="ldaBody"></div>
                <div class="lda-chips" id="ldaChips"></div>
                <form class="lda-in" id="ldaForm">
                    <input id="ldaText" placeholder="Ask CBC price, fasting rules, packages..." autocomplete="off">
                    <button type="submit" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </div>`;
        document.body.appendChild(wrap);

        const fab = document.getElementById('ldaFab'),
              panel = document.getElementById('ldaPanel'),
              body = document.getElementById('ldaBody'),
              chips = document.getElementById('ldaChips'),
              form = document.getElementById('ldaForm'),
              input = document.getElementById('ldaText');

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

        // Quick Suggestions
        ['Test prices', 'Packages', 'Home collection', 'Fasting Info', 'Contact'].forEach(c => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = c;
            b.addEventListener('click', () => ask(c));
            chips.appendChild(b);
        });

        let greeted = false;
        fab.addEventListener('click', () => {
            layout();
            panel.classList.add('open');
            fab.style.display = 'none';
            if (!greeted) {
                greeted = true;
                bot('Hello! 👋 I am your automated diagnostic assistant.<br>Ask me about test prices, report delivery, fasting rules, packages, or home collection.');
            }
            setTimeout(() => input.focus(), 100);
        });

        document.getElementById('ldaClose').addEventListener('click', () => {
            panel.classList.remove('open');
            fab.style.display = 'flex';
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            const q = input.value.trim();
            if (q) {
                input.value = '';
                ask(q);
            }
        });

        function ask(q) {
            addMsg('user', esc(q));
            setTimeout(() => addMsg('bot', answerEngine(q)), 250);
        }

        function bot(m) {
            addMsg('bot', m);
        }

        function addMsg(t, h) {
            const m = document.createElement('div');
            m.className = 'lda-msg ' + t;
            m.innerHTML = h;
            body.appendChild(m);
            body.scrollTop = body.scrollHeight;
        }

        // 5) Comprehensive Intent & Match Engine
        function answerEngine(raw) {
            const q = raw.toLowerCase().trim();

            // Greetings & Conversational
            if (/^(hi|hello|hey|namaste|good morning|good evening)/i.test(q)) {
                return 'Hello! 👋 How can I assist you today? You can search for a test like <em>"Thyroid"</em>, <em>"CBC price"</em>, or ask about <em>"packages"</em>.';
            }

            // Contact & Location Intent
            if (/phone|contact|call|number|mobile|whatsapp|reach|support/.test(q)) {
                return `📞 <strong>Phone:</strong> <a href="tel:${KB.phoneTel}">${KB.phone}</a><br>✉️ <strong>Email:</strong> ${KB.email}<br>📍 <strong>Address:</strong> ${esc(KB.address)}`;
            }
            if (/address|location|where|map|branch|center/.test(q)) {
                return `📍 <strong>Location:</strong> ${esc(KB.address)}<br>🕒 <strong>Timings:</strong> ${KB.hours}`;
            }

            // Operating Hours
            if (/time|hour|open|close|sunday|timing/.test(q)) {
                return `🕒 <strong>Working Hours:</strong><br>${KB.hours}<br><em>Note: Home sample collection starts at 7:00 AM.</em>`;
            }

            // Home Collection Booking
            if (/home|collection|sample|pickup|visit|doorstep/.test(q)) {
                return `🏠 <strong>Home Sample Collection</strong> is available!<br>• Convenient doorstep collection.<br>• Certified phlebotomists.<br><br><a href="${R}tests/">Book Home Visit Now →</a> or Call <a href="tel:${KB.phoneTel}">${KB.phone}</a>`;
            }

            // Report Status / Timing
            if (/report|result|time|duration|download|online report/.test(q)) {
                return `📄 <strong>Report Delivery:</strong><br>Most routine blood tests (CBC, LFT, KFT, Lipid) are delivered on the <strong>Same Day</strong> via WhatsApp/Email.<br><a href="${R}reports/">Download Reports Here →</a>`;
            }

            // Fasting / Preparation Queries
            if (/fasting|fast|food|eat|empty stomach|water/.test(q)) {
                return `🥣 <strong>Fasting Guidelines:</strong><br>• <strong>Required (10-12 hrs):</strong> Lipid Profile, Fasting Blood Sugar (FBS), Complete Health Checkups.<br>• <strong>Not Required:</strong> CBC, HbA1c, Thyroid Profile (TSH).<br><em>Only plain water is allowed during fasting.</em>`;
            }

            // Package / Checkup Intent
            if (/package|checkup|full body|profile|health check|offer/.test(q)) {
                if (KB.packages.length > 0) {
                    let s = '💚 <strong>Health Packages & Profiles:</strong><br>';
                    KB.packages.forEach(p => {
                        s += `• <strong>${esc(p.n)}</strong> — <strong>${fmt(p.price)}</strong> ${p.old > p.price ? `<s>${fmt(p.old)}</s>` : ''}<br>`;
                    });
                    s += `<br><a href="${R}packages/">View All Packages →</a>`;
                    return s;
                }
                return `💚 We offer comprehensive Full Body Health Checkups starting from attractive rates.<br><a href="${R}packages/">Browse All Packages →</a>`;
            }

            // Individual & Multi-Test Smart Matching Logic
            if (KB.tests.length > 0) {
                // Exact or Keyword Matching
                const matched = KB.tests.filter(t => {
                    const nameLower = t.n.toLowerCase();
                    return q.includes(nameLower) || (t.alias && q.includes(t.alias));
                });

                if (matched.length === 1) {
                    const t = matched[0];
                    return `🧪 <strong>${esc(t.n)}</strong><br>
                            • <strong>Price:</strong> <strong>${fmt(t.price)}</strong> ${t.old > t.price ? `<s>${fmt(t.old)}</s>` : ''}<br>
                            • <strong>Fasting:</strong> ${t.fasting}<br>
                            • <strong>Report Time:</strong> ${t.report}<br>
                            <a href="${R}tests/">Book Test Now →</a>`;
                }

                if (matched.length > 1) {
                    let s = `🔍 <strong>Found ${matched.length} matching tests:</strong><br>`;
                    matched.slice(0, 5).forEach(t => {
                        s += `• <strong>${esc(t.n)}</strong>: ${fmt(t.price)}<br>`;
                    });
                    s += `<br><a href="${R}tests/">View and Book Tests →</a>`;
                    return s;
                }

                // Partial Token Match Fallback
                const words = q.replace(/price|cost|rate|test|for|is|what|how|much/g, '').trim().split(/\s+/).filter(w => w.length >= 3);
                if (words.length > 0) {
                    const partialMatches = KB.tests.filter(t => {
                        const nameLower = t.n.toLowerCase();
                        return words.some(w => nameLower.includes(w));
                    });

                    if (partialMatches.length > 0) {
                        let s = `🧪 <strong>Tests related to "${esc(words.join(' '))}" :</strong><br>`;
                        partialMatches.slice(0, 5).forEach(t => {
                            s += `• <strong>${esc(t.n)}</strong>: ${fmt(t.price)}<br>`;
                        });
                        return s;
                    }
                }
            }

            // Generic Test Search Fallback
            if (/test|price|rate|cost|list/.test(q)) {
                if (KB.tests.length > 0) {
                    let s = '🧪 <strong>Popular Diagnostic Tests:</strong><br>';
                    KB.tests.slice(0, 5).forEach(t => {
                        s += `• ${esc(t.n)} — <strong>${fmt(t.price)}</strong><br>`;
                    });
                    s += `<br><a href="${R}tests/">Search All Tests →</a>`;
                    return s;
                }
                return `🧪 You can search for individual tests like CBC, Thyroid, HbA1c, LFT, or Vitamin D directly.<br><a href="${R}tests/">Explore Tests Catalog →</a>`;
            }

            // Default Smart Fallback
            return `I can answer queries about test prices, fasting rules, home collection, and packages.<br><br>Try typing: <em>"CBC price"</em>, <em>"Fasting for Lipid"</em>, or <em>"Packages"</em>.`;
        }

        console.log('[Assistant] v5 Engine initialized successfully.');
    }

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
/* ============================================
   LUCKY DIAGNOSTICS — API LAYER v2
   Stale-While-Revalidate cache + dedupe + retry + static fallback
   Same public interface as before (nothing else needs changing)
   ============================================ */
(function () {
  if (typeof APP_CONFIG === 'undefined' || !APP_CONFIG.API_URL) {
    window.API = { request: async () => ({ success: false, message: 'API not configured' }) };
    return;
  }

  const URL = APP_CONFIG.API_URL;
  const R = (typeof siteRoot === 'function') ? siteRoot() : '';
  const FRESH_MS = 10 * 60 * 1000;              // cache considered fresh for 10 min
  const CATALOG = ['getTests', 'getPackages', 'getCategories', 'getLocations', 'getArticles', 'getFaqs'];
  const STATIC = {
    getTests: R + 'data/tests.json',
    getPackages: R + 'data/packages.json',
    getCategories: R + 'data/categories.json'
  };
  const inflight = {};

  /* ---------- localStorage cache ---------- */
  const lsGet = k => { try { return JSON.parse(localStorage.getItem('ld_swr_' + k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem('ld_swr_' + k, JSON.stringify(v)); } catch (e) {} };
  const lsDel = k => { try { localStorage.removeItem('ld_swr_' + k); } catch (e) {} };

  function token() {
    try { if (typeof getSession === 'function') { const s = getSession(); if (s && s.token) return s.token; } } catch (e) {}
    return null;
  }

  /* ---------- raw POST (text/plain = no CORS preflight = faster) ---------- */
  function post(action, data, timeoutMs) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeoutMs);
    return fetch(URL, {
      method: 'POST',
      redirect: 'follow',
      signal: c.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, data: data || {}, session_token: token() })
    }).then(r => r.json()).finally(() => clearTimeout(t));
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const settledWithin = (p, ms) => Promise.race([p, wait(ms).then(() => null)]);
  const changed = (a, b) => { try { return JSON.stringify(a) !== JSON.stringify(b); } catch (e) { return true; } };
  const dispatch = action => window.dispatchEvent(new CustomEvent('ld:updated', { detail: action }));

  async function fetchStatic(action) {
    const u = STATIC[action]; if (!u) return null;
    try { const r = await fetch(u); if (!r.ok) return null; const j = await r.json(); return (j && j.data) ? j.data : null; } catch (e) { return null; }
  }

  /* ---------- network with 1 retry (safe GETs only) ---------- */
  async function netWithRetry(action) {
    let last = null;
    for (let i = 0; i < 2; i++) {
      try {
        const r = await post(action, {}, i === 0 ? 15000 : 30000);
        if (r && r.success) return r;
        last = r;
      } catch (e) { last = null; }
      if (i === 0) await wait(300);
    }
    return last;
  }

  /* ---------- background refresh (stale-while-revalidate) ---------- */
  function backgroundRefresh(action) {
    if (inflight[action]) return;
    inflight[action] = netWithRetry(action).then(r => {
      delete inflight[action];
      if (r && r.success && r.data) {
        const old = lsGet(action);
        lsSet(action, { ts: Date.now(), data: r.data });
        if (!old || changed(old.data, r.data)) dispatch(action);   // pages re-render
      }
    }).catch(() => { delete inflight[action]; });
  }

  /* ---------- catalog loader: cache → race(net, static) ---------- */
  async function catalog(action) {
    const c = lsGet(action);
    if (c && c.data && c.data.length) {
      if (Date.now() - c.ts < FRESH_MS) return { success: true, data: c.data, source: 'cache' };
      backgroundRefresh(action);                       // serve stale NOW, refresh behind
      return { success: true, data: c.data, source: 'stale' };
    }
    if (inflight[action]) return inflight[action];     // dedupe parallel calls

    const p = (async () => {
      const netP = netWithRetry(action);
      const first = await settledWithin(netP, 2500);   // give API 2.5s
      if (first && first.success && first.data && first.data.length) {
        lsSet(action, { ts: Date.now(), data: first.data });
        return first;
      }
      const st = await fetchStatic(action);            // API slow → static instantly
      if (st && st.length) {
        netP.then(r => {                               // keep warming cache in background
          if (r && r.success && r.data && r.data.length) { lsSet(action, { ts: Date.now(), data: r.data }); dispatch(action); }
        }).catch(() => {});
        return { success: true, data: st, source: 'static' };
      }
      const r2 = await netP;                           // no static → wait for API
      if (r2 && r2.success && r2.data) { lsSet(action, { ts: Date.now(), data: r2.data }); return r2; }
      return { success: false, message: 'Unable to load data. Please refresh.' };
    })();

    inflight[action] = p.finally(() => { if (inflight[action] === p) delete inflight[action]; });
    return inflight[action];
  }

  /* ---------- main request ---------- */
  async function request(action, data) {
    if (CATALOG.includes(action)) return catalog(action);
    try { return await post(action, data || {}, 60000); }   // mutating calls: single attempt, long timeout (no double-booking risk)
    catch (e) { return { success: false, message: 'Network error. Please try again.' }; }
  }

  const norm = d => (typeof d === 'string') ? { slug: d } : (d || {});
  const fromCache = (action, slug) => { const c = lsGet(action); return (c && c.data) ? (c.data.find(x => x.slug === slug) || null) : null; };

  window.API = {
    request,
    getTests: () => request('getTests'),
    getPackages: () => request('getPackages'),
    getCategories: () => request('getCategories'),
    getLocations: () => request('getLocations'),
    getArticles: () => request('getArticles'),
    getFaqs: () => request('getFaqs'),
    getTest: d => {
      const slug = (typeof d === 'string') ? d : (d && d.slug);
      const hit = slug && fromCache('getTests', slug);
      return hit ? Promise.resolve({ success: true, data: hit }) : request('getTest', { slug: slug });
    },
    getPackage: d => {
      const slug = (typeof d === 'string') ? d : (d && d.slug);
      const hit = slug && fromCache('getPackages', slug);
      return hit ? Promise.resolve({ success: true, data: hit }) : request('getPackage', { slug: slug });
    },
    getArticle: d => request('getArticle', norm(d)),
    validatePromo: d => request('validatePromo', d),
    createBooking: d => request('createBooking', d),
    clearCache: () => CATALOG.forEach(a => lsDel(a))
  };
  /* Pre-warm the Apps Script so cold-starts never hit the user */
(function prewarm() {
  if (typeof APP_CONFIG === 'undefined' || !APP_CONFIG.API_URL) return;
  const img = new Image();
  img.src = APP_CONFIG.API_URL + '?user_content_key=warm&t=' + Date.now();
})();

/* Offline / Online banner */
(function offlineBanner() {
  let banner = null;
  function show() {
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'offlineBanner';
    banner.innerHTML = '<i class="fa-solid fa-wifi"></i> You are offline — showing cached data. <button id="offlineRetry">Retry</button>';
    document.body.appendChild(banner);
    document.getElementById('offlineRetry').onclick = () => { if (navigator.onLine) hide(); else location.reload(); };
  }
  function hide() { if (banner) { banner.remove(); banner = null; } }
  window.addEventListener('online', hide);
  window.addEventListener('offline', show);
  if (!navigator.onLine) show();
})();
})();
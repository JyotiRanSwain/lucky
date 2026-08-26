/* ============================================
   LISTING PAGE — Tests / Packages
   Only "Add to Cart" button
   No Book button
   No card navigation
   ============================================ */

(function () {

    /* ---------- APP CONFIG ---------- */

    if (typeof APP_CONFIG === 'undefined') return;


    /* ---------- SITE ROOT ---------- */

    const R = (typeof siteRoot === 'function')
        ? siteRoot()
        : '/';


    /* ---------- CURRENT PAGE ---------- */

    const path = location.pathname.replace(/\/+$/, '');

    const isTestsPage =
        /\/tests\/index\.html$/.test(path) ||
        /\/tests$/.test(path);

    const isPackagesPage =
        /\/packages\/index\.html$/.test(path) ||
        /\/packages$/.test(path);


    /* ---------- SELECT LOADER ---------- */

    let loader = null;

    if (isTestsPage) {

        loader = loadTests;

    } else if (isPackagesPage) {

        loader = loadPackages;

    }

    /* listing.js should only run on Tests / Packages pages */

    if (!loader) return;


    /* ---------- URL PARAMETERS ---------- */

    const params = new URLSearchParams(location.search);

    const initialQuery =
    (params.get('q') || '').trim();

    const initialCat =
        (params.get('category') || params.get('slug') || '').trim();


    /* ---------- DOM ---------- */

    const grid =
        document.getElementById('listingGrid');

    const searchInput =
        document.getElementById('listingSearch');

    const filterRow =
        document.getElementById('filterRow');


    /* ---------- INITIAL SEARCH ---------- */

    if (searchInput && initialQuery) {

        searchInput.value = initialQuery;

    }


    /* ---------- STATE ---------- */

    let currentFilter =
        initialCat || 'all';

    let allData = [];


    /* ============================================
       FILTER
       ============================================ */

    const applyFilter = debounce(function (q, cat) {

        const query =
            (q || '').trim().toLowerCase();

        const filtered = allData.filter(function (item) {

            /* Category filter */

            const matchCat =
                cat === 'all' ||
                (
                    item.category &&
                    item.category.slug === cat
                );

            if (!matchCat) {
                return false;
            }


            /* Search filter */

            if (!query) {
                return true;
            }

            const searchableText = (
                (item.name || '') +
                ' ' +
                (item.description || '')
            ).toLowerCase();

            return searchableText.includes(query);

        });


        renderList(filtered);

    }, 200);


    /* ============================================
       INITIALIZE
       ============================================ */

    async function init() {

        showSkeleton();

        try {

            allData = await loader();

        } catch (e) {

            console.error(
                'Listing load error:',
                e
            );

            allData = [];

        }


        renderFilters();

        applyFilter(
            searchInput
                ? searchInput.value
                : '',
            currentFilter
        );

    }


    /* ============================================
       SKELETON
       ============================================ */

    function showSkeleton() {

        if (!grid) return;

        grid.className =
            'listing listing-skeleton';

        grid.innerHTML =
            Array(6)
                .fill(0)
                .map(function () {

                    return `
                        <div class="listing-skel-card">

                            <div class="listing-skel-icon skeleton"></div>

                            <div class="listing-skel-body">

                                <div class="listing-skel-line skeleton w80"></div>

                                <div class="listing-skel-line skeleton w60"></div>

                                <div class="listing-skel-line skeleton w40"></div>

                            </div>

                        </div>
                    `;

                })
                .join('');

    }


    /* ============================================
       CATEGORY FILTER BUTTONS
       ============================================ */

    function renderFilters() {

        if (!filterRow) return;

        const cats =
            extractCategories(allData);


        /*
         * No categories available
         */

        if (!cats.length) {

            filterRow.innerHTML = '';

            return;

        }


        /*
         * All button
         */

        const html = [

            `
                <button
                    type="button"
                    class="filter-chip ${currentFilter === 'all' ? 'active' : ''}"
                    data-cat="all"
                >
                    <i class="fa-solid fa-layer-group"></i>
                    All
                </button>
            `

        ];


        /*
         * Category buttons
         */

        cats.forEach(function (c) {

            html.push(`

                <button
                    type="button"
                    class="filter-chip ${currentFilter === c.slug ? 'active' : ''}"
                    data-cat="${escapeHtml(c.slug)}"
                >
                    ${escapeHtml(c.name)}
                </button>

            `);

        });


        filterRow.innerHTML =
            html.join('');

    }


    /* ============================================
       EXTRACT UNIQUE CATEGORIES
       ============================================ */

    function extractCategories(list) {

        const map = new Map();


        list.forEach(function (item) {

            if (
                item.category &&
                item.category.slug &&
                !map.has(item.category.slug)
            ) {

                map.set(
                    item.category.slug,
                    item.category
                );

            }

        });


        return Array
            .from(map.values())
            .sort(function (a, b) {

                return (
                    (a.sort_order || 0) -
                    (b.sort_order || 0)
                );

            });

    }


    /* ============================================
       CATEGORY FILTER CLICK
       ============================================ */

    if (filterRow) {

        filterRow.addEventListener(
            'click',
            function (e) {

                const btn =
                    e.target.closest('.filter-chip');

                if (!btn) return;


                currentFilter =
                    btn.dataset.cat || 'all';


                /*
                 * Update active button
                 */

                filterRow
                    .querySelectorAll('.filter-chip')
                    .forEach(function (b) {

                        b.classList.toggle(
                            'active',
                            b === btn
                        );

                    });


                /*
                 * Apply filter
                 */

                applyFilter(
                    searchInput
                        ? searchInput.value
                        : '',
                    currentFilter
                );

            }
        );

    }


    /* ============================================
       SEARCH INPUT
       ============================================ */

    if (searchInput) {

        searchInput.addEventListener(
            'input',
            function (e) {

                applyFilter(
                    e.target.value,
                    currentFilter
                );

            }
        );

    }


    /* ============================================
       RENDER LIST
       ============================================ */

    function renderList(items) {

        if (!grid) return;


        grid.className = 'listing';


        /*
         * No results
         */

        if (!items.length) {

            grid.innerHTML =
                emptyState();

            return;

        }


        /*
         * Render Tests / Packages
         */

        grid.innerHTML =
            items
                .map(function (item) {

                    /*
                     * Package detection
                     */

                    if (
                        item.package_id ||
                        item.offer_price !== undefined
                    ) {

                        return renderPackageCard(item);

                    }


                    /*
                     * Otherwise Test
                     */

                    return renderTestCard(item);

                })
                .join('');

    }


    /* ============================================
       EMPTY STATE
       ============================================ */

    function emptyState() {

        return `

            <div
                class="empty-state"
                style="grid-column:1/-1;"
            >

                <div class="ei">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>

                <h3>No results found</h3>

                <p>
                    Try a different search term
                    or remove filters.
                </p>

            </div>

        `;

    }


    /* ============================================
       TEST CARD
       Only Add to Cart
       ============================================ */

    function renderTestCard(t) {

        const originalPrice =
            Number(t.price || 0);

        const discountPrice =
            Number(
                t.discount_price ||
                t.price ||
                0
            );


        const price =
            discountPrice;


        const disc =
            originalPrice > price
                ? Math.round(
                    (
                        (originalPrice - price) /
                        originalPrice
                    ) * 100
                )
                : 0;


        return `

            <div class="listing-card">

                <!-- TEST ICON -->

                <div class="lc-icon">

                    <i class="fa-solid fa-flask-vial"></i>

                </div>


                <!-- TEST INFORMATION -->

                <div class="lc-body">

                    <h4>
                        ${escapeHtml(t.name || '')}
                    </h4>


                    <p>
                        ${escapeHtml(
                            t.description || ''
                        )}
                    </p>


                    <div class="lc-tags">

                        <span class="lc-tag">

                            <i class="fa-solid fa-droplet"></i>

                            ${escapeHtml(
                                t.sample_type || 'Blood'
                            )}

                        </span>


                        <span class="lc-tag">

                            <i class="fa-solid fa-clock"></i>

                            ${escapeHtml(
                                t.report_time || '24h'
                            )}

                        </span>


                        ${
                            t.home_collection
                                ? `
                                    <span class="lc-tag">

                                        <i class="fa-solid fa-house"></i>

                                        Home

                                    </span>
                                  `
                                : ''
                        }

                    </div>

                </div>


                <!-- PRICE + CART -->

                <div
                    class="lc-right"
                    style="
                        display:flex;
                        flex-direction:column;
                        gap:6px;
                        align-items:flex-end;
                        min-width:120px;
                    "
                >

                    <div
                        class="lc-price"
                        style="text-align:right;"
                    >

                        ${
                            disc > 0
                                ? `
                                    <div class="old">
                                        ${formatPrice(
                                            originalPrice
                                        )}
                                    </div>
                                  `
                                : ''
                        }


                        <div>

                            <strong>
                                ${formatPrice(price)}
                            </strong>


                            ${
                                disc > 0
                                    ? `
                                        <span class="disc">
                                            ${disc}% off
                                        </span>
                                      `
                                    : ''
                            }

                        </div>

                    </div>


                    <!-- ADD TO CART -->

                    <button
                        type="button"
                        class="btn btn-primary btn-sm add-to-cart-btn"
                        style="
                            padding:8px 12px;
                            font-size:12px;
                            min-height:34px;
                            width:100%;
                        "
                        data-add-cart
                        data-type="test"
                        data-id="${escapeHtml(
                            String(t.test_id || '')
                        )}"
                        data-slug="${escapeHtml(
                            t.slug || ''
                        )}"
                        data-name="${escapeHtml(
                            t.name || ''
                        )}"
                        data-price="${price}"
                    >

                        <i class="fa-solid fa-cart-plus"></i>

                        Add to Cart

                    </button>

                </div>

            </div>

        `;

    }


    /* ============================================
       PACKAGE CARD
       Only Add to Cart
       ============================================ */

    function renderPackageCard(p) {

        const orig =
            Number(
                p.original_price ||
                p.price ||
                0
            );


        const price =
            Number(
                p.offer_price ||
                p.discount_price ||
                orig
            );


        const save =
            orig - price;


        const includes =
            (p.included_names || [])
                .join(', ');


        return `

            <div class="listing-card">

                <!-- PACKAGE ICON -->

                <div class="lc-icon">

                    <i class="fa-solid fa-box-open"></i>

                </div>


                <!-- PACKAGE INFORMATION -->

                <div class="lc-body">

                    <h4>
                        ${escapeHtml(
                            p.name || ''
                        )}
                    </h4>


                    <p>
                        ${escapeHtml(
                            p.description || ''
                        )}
                    </p>


                    <div class="lc-tags">

                        <span class="lc-tag">

                            <i class="fa-solid fa-flask-vial"></i>

                            ${
                                (p.test_ids || []).length ||
                                '—'
                            }

                            tests

                        </span>


                        <span class="lc-tag">

                            <i class="fa-solid fa-clock"></i>

                            ${escapeHtml(
                                p.report_time || '24h'
                            )}

                        </span>

                    </div>


                    <!-- INCLUDED TESTS -->

                    ${
                        p.included_names &&
                        p.included_names.length
                            ? `

                                <div class="lc-includes">

                                    <span class="lc-inc-title">

                                        <i class="fa-solid fa-list-check"></i>

                                        Includes

                                    </span>


                                    ${
                                        p.included_names
                                            .map(function (n) {

                                                return `

                                                    <span class="lc-inc-item">

                                                        ${escapeHtml(n)}

                                                    </span>

                                                `;

                                            })
                                            .join('')
                                    }

                                </div>

                              `
                            : ''
                    }

                </div>


                <!-- PRICE + CART -->

                <div
                    class="lc-right"
                    style="
                        display:flex;
                        flex-direction:column;
                        gap:6px;
                        align-items:flex-end;
                        min-width:120px;
                    "
                >

                    <div
                        class="lc-price"
                        style="text-align:right;"
                    >

                        ${
                            save > 0
                                ? `

                                    <div class="old">

                                        ${formatPrice(orig)}

                                    </div>

                                  `
                                : ''
                        }


                        <div>

                            <strong>
                                ${formatPrice(price)}
                            </strong>

                        </div>

                    </div>


                    <!-- ADD TO CART -->

                    <button
                        type="button"
                        class="btn btn-primary btn-sm add-to-cart-btn"
                        style="
                            padding:8px 12px;
                            font-size:12px;
                            min-height:34px;
                            width:100%;
                        "
                        data-add-cart
                        data-type="package"
                        data-id="${escapeHtml(
                            String(p.package_id || '')
                        )}"
                        data-slug="${escapeHtml(
                            p.slug || ''
                        )}"
                        data-name="${escapeHtml(
                            p.name || ''
                        )}"
                        data-price="${price}"
                        data-includes="${escapeHtml(
                            includes
                        )}"
                    >

                        <i class="fa-solid fa-cart-plus"></i>

                        Add to Cart

                    </button>

                </div>

            </div>

        `;

    }


    /* ============================================
       LOAD CATEGORIES
       Used ONLY for filtering/enrichment.
       There is NO category page.
       ============================================ */

    async function loadCategories() {

        try {

            const r =
                await API.getCategories();


            if (
                r &&
                r.success &&
                Array.isArray(r.data) &&
                r.data.length
            ) {

                return r.data.sort(
                    function (a, b) {

                        return (
                            (a.sort_order || 0) -
                            (b.sort_order || 0)
                        );

                    }
                );

            }

        } catch (e) {

            console.warn(
                'Unable to load categories:',
                e
            );

        }


        return [];

    }


    /* ============================================
       LOAD TESTS
       ============================================ */

    async function loadTests() {

        try {

            const r =
                await API.getTests({});


            if (
                r &&
                r.success &&
                Array.isArray(r.data) &&
                r.data.length
            ) {

                return await enrich(r.data);

            }

        } catch (e) {

            console.error(
                'Unable to load tests:',
                e
            );

        }


        return [];

    }


    /* ============================================
       LOAD PACKAGES
       ============================================ */

    async function loadPackages() {

        try {

            const [
                pr,
                tr
            ] = await Promise.all([

                API.getPackages({}),

                API.getTests({})

            ]);


            if (
                pr &&
                pr.success &&
                Array.isArray(pr.data) &&
                pr.data.length
            ) {

                const tests =
                    (
                        tr &&
                        tr.success &&
                        Array.isArray(tr.data)
                    )
                        ? tr.data
                        : [];


                /* Test ID → Test Name */

                const tmap = {};


                tests.forEach(function (t) {

                    if (t.test_id) {

                        tmap[t.test_id] =
                            t.name || '';

                    }

                });


                /* Add included test names */

                const items =
                    pr.data.map(function (p) {

                        return {

                            ...p,

                            included_names:
                                (p.test_ids || [])
                                    .map(function (id) {

                                        return tmap[id];

                                    })
                                    .filter(Boolean)

                        };

                    });


                return await enrich(items);

            }

        } catch (e) {

            console.error(
                'Unable to load packages:',
                e
            );

        }


        return [];

    }


    /* ============================================
       ENRICH TESTS / PACKAGES WITH CATEGORY
       ============================================ */

    async function enrich(items) {

        const cats =
            await loadCategories();


        const map = {};


        cats.forEach(function (c) {

            if (c.category_id) {

                map[c.category_id] = c;

            }

        });


        return items

            .map(function (i) {

                return {

                    ...i,

                    category:
                        map[i.category_id] || null

                };

            })

            .sort(function (a, b) {

                return (
                    (a.sort_order || 0) -
                    (b.sort_order || 0)
                );

            });

    }


    /* ============================================
       START
       ============================================ */

    init();
    window.addEventListener('ld:updated', function () { init(); });   // ← ADD THIS
})();
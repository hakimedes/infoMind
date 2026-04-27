// public/js/app.js - Main application controller

// ── State ────────────────────────────────────────────────────────────────────
let state = {
    view: 'shelf',       // 'shelf' | 'timeline' | 'search' | 'dashboard'
    category: '',        // active category filter
    sort: 'created_at',
    searchQuery: '',
    allBooks: [],
    allEntries: [],
    categories: [],
};

// Apple-style spring ease
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

// ── Animation Helpers ────────────────────────────────────────────────────────
// These use inline styles + rAF so they work regardless of Tailwind's display:none

function animateIn(el, { duration = 300, fromY = 8, fromScale = 1, fromOpacity = 0 } = {}) {
    if (!el) return;
    el.classList.remove('hidden');
    el.style.opacity = String(fromOpacity);
    el.style.transform = `translateY(${fromY}px) scale(${fromScale})`;
    el.style.transition = 'none';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.transition = `opacity ${duration}ms ${EASE}, transform ${duration}ms ${EASE}`;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Clean up inline styles after animation settles
    setTimeout(() => {
        el.style.transition = '';
        el.style.opacity = '';
        el.style.transform = '';
    }, duration + 50);
}

function animateOut(el, { duration = 200, toY = 6, toScale = 1, toOpacity = 0 } = {}) {
    if (!el || el.classList.contains('hidden')) return Promise.resolve();
    return new Promise(resolve => {
        el.style.transition = `opacity ${duration}ms ${EASE}, transform ${duration}ms ${EASE}`;
        el.style.opacity = String(toOpacity);
        el.style.transform = `translateY(${toY}px) scale(${toScale})`;
        setTimeout(() => {
            el.classList.add('hidden');
            el.style.transition = '';
            el.style.opacity = '';
            el.style.transform = '';
            resolve();
        }, duration);
    });
}

// ── Data Loading ─────────────────────────────────────────────────────────────
async function loadData() {
    showLoading(true);
    try {
        const [catRes, booksRes, statsRes] = await Promise.all([
            api.listCategories(),
            api.listBooks({ limit: 500 }),
            api.getStats(),
        ]);

        state.categories = catRes.data;
        state.allBooks = booksRes.books || [];
        renderFilterPills(state.categories, state.allBooks);
        renderCurrentView();
        updateStatsBar(statsRes.data);
    } catch (err) {
        showToast('加载数据失败: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ── Filter Pills ─────────────────────────────────────────────────────────────
function renderFilterPills(categories, books) {
    const container = document.getElementById('filterCategories');
    const usedCategories = new Set(books.map(b => b.category));

    container.innerHTML = '<button class="px-4 py-2 rounded-full whitespace-nowrap font-label text-sm bg-primary text-on-primary filter-pill active" data-category="">全部</button>';

    for (const cat of categories) {
        if (!usedCategories.has(cat.name)) continue;
        const btn = document.createElement('button');
        btn.className = 'px-4 py-2 rounded-full whitespace-nowrap font-label text-sm bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest filter-pill';
        btn.dataset.category = cat.name;
        btn.innerHTML = `${escapeHtml(cat.name)}`;
        btn.addEventListener('click', () => setCategory(cat.name, btn));
        container.appendChild(btn);
    }

    // Re-attach listener for "全部"
    container.querySelector('[data-category=""]').addEventListener('click', function () {
        setCategory('', this);
    });
}

function setCategory(category, btn) {
    state.category = category;
    document.querySelectorAll('.filter-pill').forEach(p => {
        p.className = 'px-4 py-2 rounded-full whitespace-nowrap font-label text-sm bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest filter-pill';
    });
    btn.className = 'px-4 py-2 rounded-full whitespace-nowrap font-label text-sm bg-primary text-on-primary filter-pill active';
    if (state.view === 'search') setView('shelf');
    else renderCurrentView();
}

// ── View Switching (with animation) ──────────────────────────────────────────
const VIEW_MAP = {
    shelf: 'bookshelfContainer',
    timeline: 'timelineContainer',
    dashboard: 'dashboardContainer',
    search: 'searchResults',
};

function setView(view) {
    const prevView = state.view;
    state.view = view;

    // Update active styles in side nav
    const setActive = (el, isActive) => {
        if (!el) return;
        el.className = isActive
            ? "flex items-center space-x-3 px-4 py-3 bg-surface-container-lowest text-primary rounded-lg font-['Manrope'] text-sm tracking-wide uppercase font-semibold ease-out duration-300 cursor-pointer shadow-[0_4px_32px_rgba(28,28,22,0.04)]"
            : "flex items-center space-x-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:translate-x-1 transition-transform font-['Manrope'] text-sm tracking-wide uppercase font-semibold hover:bg-surface-container-highest rounded-lg ease-out duration-300 cursor-pointer";
    };

    setActive(document.getElementById('viewShelf'), view === 'shelf');
    setActive(document.getElementById('viewTimeline'), view === 'timeline');
    setActive(document.getElementById('viewDashboard'), view === 'dashboard');

    // Toggle filter pills: only show on shelf & timeline
    const filterEl = document.getElementById('filterCategories');
    if (filterEl) {
        if (view === 'shelf' || view === 'timeline') {
            filterEl.classList.remove('hidden');
        } else {
            filterEl.classList.add('hidden');
        }
    }

    // Animate out old panel, then animate in new panel
    const oldEl = document.getElementById(VIEW_MAP[prevView]);
    const newEl = document.getElementById(VIEW_MAP[view]);

    if (prevView === view) {
        // Same view — just re-render content
        renderCurrentView();
        return;
    }

    // Hide all panels except the one we're animating out
    Object.entries(VIEW_MAP).forEach(([key, id]) => {
        if (key !== prevView && key !== view) {
            document.getElementById(id).classList.add('hidden');
        }
    });

    // Fade out old panel
    animateOut(oldEl, { duration: 150, toY: -4 }).then(() => {
        // Fade in new panel
        animateIn(newEl, { duration: 280, fromY: 10 });
        renderCurrentView();
    });
}

// ── Render Current View ──────────────────────────────────────────────────────
function renderCurrentView() {
    const filtered = state.category
        ? state.allBooks.filter(b => b.category === state.category)
        : state.allBooks;

    const isEmpty = filtered.length === 0 && state.view !== 'search' && state.view !== 'dashboard';
    if (isEmpty && !state.category) {
        document.getElementById('emptyState').classList.remove('hidden');
    } else {
        document.getElementById('emptyState').classList.add('hidden');
    }

    if (state.view === 'shelf') {
        renderBookshelf(filtered, state.categories, document.getElementById('bookshelfContainer'));
    } else if (state.view === 'timeline') {
        const params = { limit: 1000, sort: state.sort };
        if (state.category) params.category = state.category;
        api.listEntries(params).then(res => {
            renderTimeline(res.entries, document.getElementById('timelineContainer'));
            initTimelinePicker();
        });
    }
}

// ── Search ───────────────────────────────────────────────────────────────────
async function handleSearch(query) {
    query = sanitizeSearchQuery(query);
    if (!query) {
        setView('shelf');
        return;
    }

    state.searchQuery = query;
    setView('search');

    try {
        const res = await api.searchEntries(query);
        renderSearchResults(res.data, query, document.getElementById('searchResults'));
    } catch (err) {
        showToast('搜索失败: ' + err.message, 'error');
    }
}

function sanitizeSearchQuery(query) {
    const value = String(query || '').trim();
    if (/^https:\/\/api\.kimi\.com\/coding\/?$/i.test(value)) return '';
    return value;
}

// ── Quick-Add Bar (animated) ─────────────────────────────────────────────────
function toggleQuickAdd() {
    const bar = document.getElementById('quickAddBar');
    if (bar.classList.contains('hidden')) {
        animateIn(bar, { duration: 250, fromY: -12 });
        setTimeout(() => document.getElementById('urlInput').focus(), 100);
    } else {
        animateOut(bar, { duration: 180, toY: -8 });
    }
}

function closeQuickAdd() {
    animateOut(document.getElementById('quickAddBar'), { duration: 180, toY: -8 });
}

// ── Add URL (with loading overlay + confetti) ────────────────────────────────
function _createSaveOverlay() {
    let overlay = document.getElementById('saveOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'saveOverlay';
    overlay.className = 'hidden';
    overlay.innerHTML = `
        <style>
            #saveOverlay {
                position: fixed; inset: 0; z-index: 9998;
                background: rgba(252,249,239, 0.85);
                backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                transition: opacity 0.3s cubic-bezier(0.22,1,0.36,1);
            }
            #saveOverlay.hidden { opacity: 0; pointer-events: none; display: none; }
            .save-spinner { animation: savePulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite; }
            @keyframes savePulse {
                0%, 100% { transform: scale(1); opacity: 0.7; }
                50% { transform: scale(1.08); opacity: 1; }
            }
            .save-dots span {
                display: inline-block; width: 6px; height: 6px; border-radius: 50%;
                background: #715915; margin: 0 3px;
                animation: saveDotBounce 1.4s infinite ease-in-out both;
            }
            .save-dots span:nth-child(1) { animation-delay: 0s; }
            .save-dots span:nth-child(2) { animation-delay: 0.16s; }
            .save-dots span:nth-child(3) { animation-delay: 0.32s; }
            @keyframes saveDotBounce {
                0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
                40% { transform: scale(1); opacity: 1; }
            }
        </style>
        <div class="save-spinner mb-6">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#715915" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
                <line x1="10" y1="22" x2="14" y2="22"/>
                <line x1="9" y1="17" x2="15" y2="17"/>
            </svg>
        </div>
        <p id="saveOverlayText" class="font-label text-sm text-on-surface-variant tracking-wide mb-4">正在解析链接，AI 分类中</p>
        <div class="save-dots"><span></span><span></span><span></span></div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function _showSaveOverlay(text) {
    const overlay = _createSaveOverlay();
    document.getElementById('saveOverlayText').textContent = text || '正在解析链接，AI 分类中';
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
}

function _hideSaveOverlay() {
    const overlay = document.getElementById('saveOverlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.classList.add('hidden'); overlay.style.display = 'none'; }, 300);
}

// ── Confetti Cannon System 🎉 ────────────────────────────────────────────────
function _injectCelebrationStyles() {
    if (document.getElementById('celebrationStyles')) return;
    const s = document.createElement('style');
    s.id = 'celebrationStyles';
    s.textContent = `
        /* ── Corner cannon particles ───────────────────────── */
        .confetti-cannon { position:fixed; z-index:10001; pointer-events:none; }
        .cannon-particle {
            position: absolute; border-radius: 2px;
            animation: cannonShoot var(--dur) var(--delay) cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes cannonShoot {
            0%   { transform: translate(0, 0) rotate(0deg) scale(0.3); opacity: 0; }
            8%   { opacity: 1; transform: translate(calc(var(--dx) * 0.1), calc(var(--dy) * 0.1)) rotate(calc(var(--rot) * 0.1)) scale(1); }
            40%  { opacity: 1; }
            100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.2); opacity: 0; }
        }

        /* ── Center burst ribbons ──────────────────────────── */
        .ribbon {
            position: absolute; left: 50%; top: 50%; border-radius: 1px;
            animation: ribbonBurst var(--dur) var(--delay) cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes ribbonBurst {
            0%   { transform: translate(-50%, -50%) rotate(0deg) scale(0); opacity: 0; }
            15%  { transform: translate(calc(-50% + var(--rx) * 0.15), calc(-50% + var(--ry) * 0.15)) rotate(calc(var(--rr) * 0.3)) scale(1.2); opacity: 1; }
            50%  { opacity: 0.8; }
            100% { transform: translate(calc(-50% + var(--rx)), calc(-50% + var(--ry))) rotate(var(--rr)) scale(0.3); opacity: 0; }
        }

        /* ── Success card ──────────────────────────────────── */
        .success-card-overlay {
            position: fixed; inset: 0; z-index: 10002;
            display: flex; align-items: center; justify-content: center;
            pointer-events: none;
        }
        .success-card {
            background: rgba(252,249,239,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(113,89,21,0.12); border-radius: 16px;
            padding: 32px 48px; text-align: center;
            box-shadow: 0 20px 60px rgba(28,28,22,0.12), 0 4px 16px rgba(28,28,22,0.06);
            animation: successCardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            pointer-events: auto;
        }
        .success-card.out {
            animation: successCardOut 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes successCardIn {
            0%   { transform: scale(0.6) translateY(20px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes successCardOut {
            0%   { transform: scale(1) translateY(0); opacity: 1; }
            100% { transform: scale(0.92) translateY(-10px); opacity: 0; }
        }
        .success-check {
            width: 48px; height: 48px; border-radius: 50%;
            background: linear-gradient(135deg, #446733, #5a8a42);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 16px; animation: checkPop 0.5s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes checkPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(s);
}

function playCelebration(categoryName) {
    _injectCelebrationStyles();
    const COLORS = ['#715915', '#446733', '#ba1a1a', '#00639b', '#8b5000', '#984061', '#006b5d', '#d4a017'];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:10001;pointer-events:none;overflow:hidden;';

    // ── PHASE 1: Corner cannons (4 corners → center) ─────────
    const vw = window.innerWidth, vh = window.innerHeight;
    const corners = [
        { x: 0, y: vh, dx: 1, dy: -1 },     // bottom-left
        { x: vw, y: vh, dx: -1, dy: -1 },    // bottom-right
        { x: 0, y: 0, dx: 1, dy: 1 },        // top-left
        { x: vw, y: 0, dx: -1, dy: 1 },      // top-right
    ];

    corners.forEach((corner, ci) => {
        for (let i = 0; i < 18; i++) {
            const p = document.createElement('div');
            p.className = 'cannon-particle';
            const size = 4 + Math.random() * 8;
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const spread = 0.5 + Math.random() * 0.8;
            const dx = corner.dx * (vw * 0.3 + Math.random() * vw * 0.25) * spread;
            const dy = corner.dy * (vh * 0.25 + Math.random() * vh * 0.25) * spread;
            const rot = (Math.random() - 0.5) * 900;
            const delay = ci * 0.06 + Math.random() * 0.15;
            const dur = 1.0 + Math.random() * 0.8;
            const isRect = Math.random() > 0.3;

            p.style.cssText = `
                left: ${corner.x}px; top: ${corner.y}px;
                width: ${isRect ? size * 2 : size}px; height: ${isRect ? size * 0.5 : size}px;
                background: ${color}; border-radius: ${isRect ? '1px' : '50%'};
                --dx: ${dx}px; --dy: ${dy}px; --rot: ${rot}deg;
                --delay: ${delay}s; --dur: ${dur}s;
            `;
            container.appendChild(p);
        }
    });

    // ── PHASE 2: Center burst ribbons (after cannons converge) ───
    setTimeout(() => {
        for (let i = 0; i < 50; i++) {
            const r = document.createElement('div');
            r.className = 'ribbon';
            const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.6;
            const dist = 80 + Math.random() * 280;
            const rx = Math.cos(angle) * dist;
            const ry = Math.sin(angle) * dist - 40; // slight upward bias
            const rr = (Math.random() - 0.5) * 720;
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const w = 3 + Math.random() * 10;
            const h = 6 + Math.random() * 16;
            const delay = Math.random() * 0.2;
            const dur = 0.8 + Math.random() * 0.6;

            r.style.cssText = `
                width: ${w}px; height: ${h}px; background: ${color};
                --rx: ${rx}px; --ry: ${ry}px; --rr: ${rr}deg;
                --delay: ${delay}s; --dur: ${dur}s;
            `;
            container.appendChild(r);
        }
    }, 350);

    document.body.appendChild(container);

    // ── PHASE 3: Success card (center, elegant) ──────────────
    setTimeout(() => {
        const cardOverlay = document.createElement('div');
        cardOverlay.className = 'success-card-overlay';
        cardOverlay.innerHTML = `
            <div class="success-card">
                <div class="success-check">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <h3 style="font-family:'Instrument Serif',serif; font-size:24px; color:#1c1c16; margin:0 0 6px; font-weight:normal;">收录成功</h3>
                <p style="font-family:'Manrope',sans-serif; font-size:13px; color:#7a7768; margin:0; letter-spacing:0.5px;">
                    已归入「${escapeHtml(categoryName || '知识库')}」
                </p>
            </div>
        `;
        cardOverlay.addEventListener('click', () => dismissSuccessCard(cardOverlay));
        document.body.appendChild(cardOverlay);

        // Auto dismiss
        setTimeout(() => dismissSuccessCard(cardOverlay), 2800);
    }, 500);

    // Clean up confetti
    setTimeout(() => container.remove(), 3500);
}

function dismissSuccessCard(overlay) {
    if (!overlay || overlay._dismissed) return;
    overlay._dismissed = true;
    const card = overlay.querySelector('.success-card');
    if (card) card.classList.add('out');
    setTimeout(() => overlay.remove(), 400);
}

async function handleAddUrl() {
    const urlInput = document.getElementById('urlInput');
    const noteInput = document.getElementById('noteInput');
    const statusEl = document.getElementById('addStatus');
    const btn = document.getElementById('addSubmitBtn');

    const url = urlInput.value.trim();
    if (!url) { urlInput.focus(); return; }

    btn.disabled = true;
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '';

    // Show elegant loading overlay
    _showSaveOverlay('正在解析链接，AI 分类中');

    try {
        const res = await api.addEntry(url, noteInput.value.trim());
        const entry = res.data;

        // Hide loading overlay
        _hideSaveOverlay();

        // 🎉 Corner cannons → center burst → success card
        playCelebration(entry.category);

        urlInput.value = '';
        noteInput.value = '';
        await loadData();
        setTimeout(() => closeQuickAdd(), 3200);
    } catch (err) {
        _hideSaveOverlay();
        statusEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>${escapeHtml(err.message)}`;
        showToast('添加失败: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ── Stats Bar ────────────────────────────────────────────────────────────────
function updateStatsBar(stats) {
    if (!stats) return;
    document.getElementById('statTotal').textContent = `${stats.total_entries} 条内容`;
    document.getElementById('statCategories').textContent = `${stats.total_categories_used} 个分类`;
    const platforms = (stats.by_platform || []).map(p => p.platform).slice(0, 3).join('、');
    document.getElementById('statPlatforms').textContent = platforms || '暂无平台数据';
}

// ── Loading ──────────────────────────────────────────────────────────────────
function showLoading(show) {
    if (show) {
        document.getElementById('loadingScreen').classList.remove('hidden');
        document.getElementById('bookshelfContainer').classList.add('hidden');
    } else {
        document.getElementById('loadingScreen').classList.add('hidden');
        if (state.view === 'shelf') document.getElementById('bookshelfContainer').classList.remove('hidden');
    }
}

// ── Timeline month-jump ──────────────────────────────────────────────────────
function initTimelinePicker() {
    const picker = document.getElementById('timelineMonthPicker');
    if (!picker) return;
    if (!picker.value) {
        const now = new Date();
        picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
}

function jumpToTimelineMonth() {
    const picker = document.getElementById('timelineMonthPicker');
    if (!picker || !picker.value) return;
    const anchor = document.getElementById(`month-${picker.value}`);
    if (!anchor) {
        window.showToast(`该月份暂无内容 (${picker.value})`, 'info');
        return;
    }
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Brief gold flash to confirm jump
    anchor.style.transition = 'background 0.3s';
    anchor.style.background = 'rgba(113,89,21,0.08)';
    setTimeout(() => { anchor.style.background = ''; }, 1200);
}

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><polyline points="20 6 9 17 4 12"/></svg>';
    else if (type === 'error') iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    else iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    toast.innerHTML = `<div style="display:flex;align-items:center;">${iconSvg}${escapeHtml(message)}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initSettings();

    // Add button (animated)
    document.getElementById('addBtn').addEventListener('click', toggleQuickAdd);
    document.getElementById('addCancelBtn').addEventListener('click', closeQuickAdd);
    document.getElementById('addSubmitBtn').addEventListener('click', handleAddUrl);
    document.getElementById('urlInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAddUrl();
    });

    // View toggle
    document.getElementById('viewShelf').addEventListener('click', () => setView('shelf'));
    document.getElementById('viewTimeline').addEventListener('click', () => setView('timeline'));
    document.getElementById('viewDashboard').addEventListener('click', () => setView('dashboard'));
    document.getElementById('sortSelect').addEventListener('change', e => {
        state.sort = e.target.value;
        renderCurrentView();
    });

    // Search
    let searchTimer;
    const searchInput = document.getElementById('searchInput');
    searchInput.value = sanitizeSearchQuery(searchInput.value);
    document.querySelectorAll('input[type="search"], input[name*="search" i]').forEach(input => {
        if (input !== searchInput) input.value = sanitizeSearchQuery(input.value);
    });
    document.getElementById('searchInput').addEventListener('input', e => {
        const cleanQuery = sanitizeSearchQuery(e.target.value);
        if (cleanQuery !== e.target.value.trim()) e.target.value = cleanQuery;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => handleSearch(cleanQuery), 350);
    });

    // Keyboard shortcut ⌘K
    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    });

    // Timeline month jump
    document.getElementById('timelineJumpBtn')?.addEventListener('click', jumpToTimelineMonth);
    document.getElementById('timelineMonthPicker')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') jumpToTimelineMonth();
    });

    loadData();
});

window.loadData = loadData;
window.showToast = showToast;

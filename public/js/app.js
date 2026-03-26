// public/js/app.js - Main application controller
let state = {
    view: 'shelf',       // 'shelf' | 'timeline' | 'search'
    category: '',        // active category filter
    sort: 'created_at',
    searchQuery: '',
    allBooks: [],
    allEntries: [],
    categories: [],
};

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

function renderFilterPills(categories, books) {
    const container = document.getElementById('filterCategories');
    const usedCategories = new Set(books.map(b => b.category));

    container.innerHTML = '<button class="filter-pill active" data-category="">全部</button>';

    for (const cat of categories) {
        if (!usedCategories.has(cat.name)) continue;
        const btn = document.createElement('button');
        btn.className = 'filter-pill';
        btn.dataset.category = cat.name;
        btn.textContent = `${cat.icon} ${cat.name}`;
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
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    if (state.view === 'search') setView('shelf');
    else renderCurrentView();
}

function setView(view) {
    state.view = view;
    document.getElementById('viewShelf').classList.toggle('active', view === 'shelf');
    document.getElementById('viewTimeline').classList.toggle('active', view === 'timeline');

    document.getElementById('bookshelfContainer').style.display = view === 'shelf' ? '' : 'none';
    document.getElementById('timelineContainer').style.display = view === 'timeline' ? '' : 'none';
    document.getElementById('searchResults').style.display = view === 'search' ? '' : 'none';

    renderCurrentView();
}

function renderCurrentView() {
    const filtered = state.category
        ? state.allBooks.filter(b => b.category === state.category)
        : state.allBooks;

    const isEmpty = filtered.length === 0 && state.view !== 'search';
    document.getElementById('emptyState').style.display = isEmpty && !state.category ? 'flex' : 'none';

    if (state.view === 'shelf') {
        renderBookshelf(filtered, state.categories, document.getElementById('bookshelfContainer'));
    } else if (state.view === 'timeline') {
        // Fetch entries for timeline
        const params = { limit: 200, sort: state.sort };
        if (state.category) params.category = state.category;
        api.listEntries(params).then(res => {
            renderTimeline(res.entries, document.getElementById('timelineContainer'));
        });
    }
}

async function handleSearch(query) {
    query = query.trim();
    if (!query) {
        setView('shelf');
        return;
    }

    state.searchQuery = query;
    state.view = 'search';
    document.getElementById('bookshelfContainer').style.display = 'none';
    document.getElementById('timelineContainer').style.display = 'none';
    document.getElementById('searchResults').style.display = '';

    try {
        const res = await api.searchEntries(query);
        renderSearchResults(res.data, query, document.getElementById('searchResults'));
    } catch (err) {
        showToast('搜索失败: ' + err.message, 'error');
    }
}

async function handleAddUrl() {
    const urlInput = document.getElementById('urlInput');
    const noteInput = document.getElementById('noteInput');
    const statusEl = document.getElementById('addStatus');
    const btn = document.getElementById('addSubmitBtn');

    const url = urlInput.value.trim();
    if (!url) { urlInput.focus(); return; }

    btn.disabled = true;
    statusEl.textContent = '🔍 正在解析链接，请稍候（LLM分类可能需要10秒）...';

    try {
        const res = await api.addEntry(url, noteInput.value.trim());
        const entry = res.data;
        statusEl.textContent = `✅ 已收录到「${entry.category}」- ${entry.title || url}`;
        urlInput.value = '';
        noteInput.value = '';
        showToast(`📚 收录成功！归入「${entry.category}」`, 'success');
        await loadData();
        setTimeout(() => {
            document.getElementById('quickAddBar').style.display = 'none';
            document.getElementById('mainContent').classList.remove('add-open');
            document.getElementById('filterBar')?.classList.remove('shifted');
        }, 2000);
    } catch (err) {
        statusEl.textContent = `❌ ${err.message}`;
        showToast('添加失败: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

function updateStatsBar(stats) {
    if (!stats) return;
    document.getElementById('statTotal').textContent = `${stats.total_entries} 条内容`;
    document.getElementById('statCategories').textContent = `${stats.total_categories_used} 个分类`;
    const platforms = (stats.by_platform || []).map(p => p.platform).slice(0, 3).join('、');
    document.getElementById('statPlatforms').textContent = platforms || '暂无平台数据';
}

function showLoading(show) {
    document.getElementById('loadingScreen').style.display = show ? 'flex' : 'none';
    document.getElementById('bookshelfContainer').style.display = show ? 'none' : '';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initSettings();

    // Add button
    document.getElementById('addBtn').addEventListener('click', () => {
        const bar = document.getElementById('quickAddBar');
        const isOpen = bar.style.display !== 'none';
        bar.style.display = isOpen ? 'none' : '';
        document.getElementById('mainContent').classList.toggle('add-open', !isOpen);
        if (!isOpen) document.getElementById('urlInput').focus();
    });
    document.getElementById('addCancelBtn').addEventListener('click', () => {
        document.getElementById('quickAddBar').style.display = 'none';
        document.getElementById('mainContent').classList.remove('add-open');
    });
    document.getElementById('addSubmitBtn').addEventListener('click', handleAddUrl);
    document.getElementById('urlInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAddUrl();
    });

    // View toggle
    document.getElementById('viewShelf').addEventListener('click', () => setView('shelf'));
    document.getElementById('viewTimeline').addEventListener('click', () => setView('timeline'));
    document.getElementById('sortSelect').addEventListener('change', e => {
        state.sort = e.target.value;
        renderCurrentView();
    });

    // Search
    let searchTimer;
    document.getElementById('searchInput').addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => handleSearch(e.target.value), 350);
    });

    // Keyboard shortcut ⌘K
    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    });

    loadData();
});

window.loadData = loadData;
window.showToast = showToast;

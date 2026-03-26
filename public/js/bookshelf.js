// public/js/bookshelf.js - Bookshelf and timeline rendering
const PLATFORM_LABELS = {
    bilibili: 'Bilibili',
    youtube: 'YouTube',
    twitter: 'Twitter',
    xiaohongshu: '小红书',
    zhihu: '知乎',
    wechat: '公众号',
    weibo: '微博',
    web: '网页',
};

function getPlatformColor(platform) {
    const colors = {
        bilibili: '#00a1d6', youtube: '#ff0000', twitter: '#1d9bf0',
        xiaohongshu: '#ff2442', zhihu: '#0084ff', wechat: '#07c160',
        weibo: '#e6162d',
    };
    return colors[platform] || '#6b7280';
}

// Render bookshelf grouped by category
function renderBookshelf(booksData, categoriesData, container) {
    container.innerHTML = '';

    // Group books by category, preserving category sort order
    const catMap = {};
    for (const cat of categoriesData) {
        catMap[cat.name] = { ...cat, books: [] };
    }

    for (const book of booksData) {
        if (catMap[book.category]) {
            catMap[book.category].books.push(book);
        } else {
            (catMap['其他'] ||= { name: '其他', icon: '📦', books: [] }).books.push(book);
        }
    }

    const sections = Object.values(catMap).filter(c => c.books.length > 0);
    if (sections.length === 0) {
        container.innerHTML = '';
        return;
    }

    for (const cat of sections) {
        const section = document.createElement('div');
        section.className = 'category-section';
        section.dataset.category = cat.name;

        section.innerHTML = `
      <div class="category-header">
        <span class="category-icon">${cat.icon || '📚'}</span>
        <span class="category-name">${cat.name}</span>
        <span class="category-count">${cat.books.length} 本</span>
      </div>
      <div class="shelf-row"></div>
    `;

        const row = section.querySelector('.shelf-row');
        cat.books.forEach((book, i) => {
            const card = buildBookCard(book, i);
            row.appendChild(card);
        });

        container.appendChild(section);
    }
}

// Build a book card element
function buildBookCard(book, index = 0) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.bookId = book.id;
    card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;

    const platformLabel = PLATFORM_LABELS[book.platform] || book.platform;
    const coverHtml = book.cover_url
        ? `<img src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title || '')}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="book-no-cover" style="display:none"><div class="no-cover-icon">📄</div><div class="no-cover-text">${escapeHtml(book.title || '无标题')}</div></div>`
        : `<div class="book-no-cover"><div class="no-cover-icon">📄</div><div class="no-cover-text">${escapeHtml(book.title || '无标题')}</div></div>`;

    card.innerHTML = `
    <div class="book-cover-wrapper">
      <div class="book-cover" style="--book-color:${getPlatformColor(book.platform)}">
        ${coverHtml}
        <div class="book-overlay">
          <span class="book-overlay-text">${escapeHtml(book.title || '')}</span>
        </div>
        <span class="book-platform-badge">${platformLabel}</span>
        ${book.entry_count > 1 ? `<span class="book-count-badge">${book.entry_count}篇</span>` : ''}
      </div>
    </div>
    <div class="book-info">
      <div class="book-title">${escapeHtml(book.title || '无标题')}</div>
      ${book.author ? `<div class="book-author">${escapeHtml(book.author)}</div>` : ''}
    </div>
  `;

    card.addEventListener('click', () => window.openBookModal(book.id));
    return card;
}

// Render timeline view
function renderTimeline(entries, container) {
    container.innerHTML = '';
    if (!entries.length) return;

    const list = document.createElement('div');
    list.className = 'timeline-list';

    entries.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        const date = new Date(entry.created_at).toLocaleDateString('zh-CN');
        const platLabel = PLATFORM_LABELS[entry.platform] || entry.platform;

        item.innerHTML = `
      <div class="timeline-cover">
        ${entry.cover_url
                ? `<img src="${escapeHtml(entry.cover_url)}" alt="" onerror="this.parentElement.innerHTML='📄'" />`
                : '📄'}
      </div>
      <div class="timeline-body">
        <div class="timeline-title">${escapeHtml(entry.title || '无标题')}</div>
        <div class="timeline-meta">
          <span class="platform-tag">${platLabel}</span>
          <span class="category-tag">${escapeHtml(entry.category)}</span>
          ${entry.author ? `<span>✍️ ${escapeHtml(entry.author)}</span>` : ''}
          <span>${date}</span>
        </div>
      </div>
    `;

        item.addEventListener('click', () => {
            if (entry.book_id) window.openBookModal(entry.book_id);
            else window.openEntryModal(entry);
        });
        list.appendChild(item);
    });

    container.appendChild(list);
}

// Render search results
function renderSearchResults(entries, query, container) {
    container.innerHTML = `<p class="search-header">搜索「<span class="search-highlight">${escapeHtml(query)}</span>」共 ${entries.length} 条结果</p>`;

    if (!entries.length) {
        container.innerHTML += '<p style="color:var(--text-muted);text-align:center;padding:40px">没有找到相关内容</p>';
        return;
    }

    const list = document.createElement('div');
    list.className = 'timeline-list';

    entries.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        const date = new Date(entry.created_at).toLocaleDateString('zh-CN');

        item.innerHTML = `
      <div class="timeline-cover">
        ${entry.cover_url ? `<img src="${escapeHtml(entry.cover_url)}" alt="" onerror="this.parentElement.innerHTML='📄'" />` : '📄'}
      </div>
      <div class="timeline-body">
        <div class="timeline-title">${escapeHtml(entry.title || '无标题')}</div>
        <div class="timeline-meta">
          <span class="category-tag">${escapeHtml(entry.category)}</span>
          ${entry.author ? `<span>✍️ ${escapeHtml(entry.author)}</span>` : ''}
          <span>${date}</span>
        </div>
      </div>
    `;

        item.addEventListener('click', () => window.openEntryModal(entry));
        list.appendChild(item);
    });
    container.appendChild(list);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.renderBookshelf = renderBookshelf;
window.renderTimeline = renderTimeline;
window.renderSearchResults = renderSearchResults;
window.buildBookCard = buildBookCard;
window.escapeHtml = escapeHtml;

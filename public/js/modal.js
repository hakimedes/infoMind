// public/js/modal.js - Book and entry detail modals

function openBookModal(bookId) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    _openOverlay(overlay);
    content.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span></div>';

    api.getBook(bookId).then(res => {
        const book = res.data;
        const entries = book.entries || [];
        const platformLabel = book.platform || 'web';
        const displayTitle = book.latest_entry_title || book.title || '无标题';
        
        const coverPath = book.cover_local || book.cover_url;
        const coverHtml = coverPath
            ? `<img alt="${escapeHtml(displayTitle)}" class="w-full h-full object-cover" src="${escapeHtml(coverPath)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
               <div class="w-full h-full bg-surface p-6 items-center justify-center" style="display:none"><span class="font-headline text-2xl text-on-surface text-center leading-tight">${escapeHtml(displayTitle)}</span></div>`
            : `<div class="w-full h-full bg-surface p-6 flex items-center justify-center"><span class="font-headline text-2xl text-on-surface text-center leading-tight">${escapeHtml(displayTitle)}</span></div>`;

        content.innerHTML = `
<!-- Left Column: Quick Info & Cover -->
<div class="w-full md:w-1/3 bg-surface-container-low p-8 flex flex-col items-center justify-center border-r border-outline-variant/10">
    <div class="w-48 md:w-64 aspect-[2/3] bg-surface-container-high rounded-lg overflow-hidden shadow-sm mb-8 relative border border-outline-variant/10">
        ${coverHtml}
    </div>
    <div class="w-full space-y-4 text-center">
        <h2 class="font-headline text-3xl md:text-3xl text-on-surface leading-tight tracking-tight">${escapeHtml(displayTitle)}</h2>
        ${book.author ? `<p class="font-body text-lg text-on-surface-variant">${escapeHtml(book.author)}</p>` : ''}
        <div class="flex flex-wrap items-center justify-center gap-2 pt-4">
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label text-sm">
                ${escapeHtml(book.category)}
            </span>
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label text-sm">
                ${platformLabel}
            </span>
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label text-sm">
                ${entries.length} Entries
            </span>
        </div>
    </div>
    <div class="w-full mt-12 space-y-3">
        ${entries[0] ? `<a href="${escapeHtml(entries[0].url)}" target="_blank" class="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 px-6 rounded-lg font-body font-medium transition-colors hover:bg-primary-container">
            <span class="material-symbols-outlined">menu_book</span> Open Original
        </a>` : ''}
        <button onclick="confirmDeleteBook('${bookId}')" class="w-full flex items-center justify-center gap-2 bg-transparent text-error py-3 px-6 rounded-lg font-body font-medium transition-colors hover:bg-error-container hover:text-on-error-container">
            <span class="material-symbols-outlined">delete</span> Delete Book
        </button>
    </div>
</div>

<!-- Right Column: Content & AI Summary -->
<div class="w-full md:w-2/3 bg-surface p-8 md:p-12 flex flex-col relative overflow-y-auto">
    <button onclick="closeModal()" class="absolute top-6 right-6 p-2 rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors">
        <span class="material-symbols-outlined">close</span>
    </button>
    
    <nav class="flex gap-8 mb-12 border-b border-outline-variant/20 pb-4">
        <button class="font-body text-primary font-bold border-b-2 border-primary pb-4 -mb-[18px]">AI Summary</button>
    </nav>
    
    <div class="space-y-12 max-w-2xl text-on-surface-variant font-body">
        ${entries[0]?.summary ? `
        <section>
            <div class="flex items-center gap-3 mb-6">
                <div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                    <span class="material-symbols-outlined text-on-secondary-container text-sm">auto_awesome</span>
                </div>
                <h3 class="font-headline text-2xl text-on-surface tracking-tight">AI Generated Insight</h3>
            </div>
            <p class="font-body text-lg leading-relaxed text-on-surface-variant break-words">
                ${escapeHtml(entries[0].summary).replace(/\n/g, '<br/>')}
            </p>
        </section>
        ` : '<p>No summary available.</p>'}
        
        ${entries.length > 0 ? `
        <section class="pt-8 border-t border-outline-variant/20">
            <h3 class="font-headline text-2xl text-on-surface tracking-tight mb-6">Contained Entries</h3>
            <div class="space-y-4">
                ${entries.map((e, i) => `
                <div class="flex items-start gap-4 p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
                    <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded bg-surface-container-high font-bold text-sm text-on-surface-variant">${i + 1}</div>
                    <div class="flex-1 min-w-0">
                        <div class="font-body font-medium text-sm text-on-surface truncate">${escapeHtml(e.title || e.url)}</div>
                        <div class="text-xs text-on-surface-variant mt-1">${formatDateTimeMinute(e.created_at)}</div>
                    </div>
                </div>`).join('')}
            </div>
        </section>
        ` : ''}
    </div>
</div>
        `;
    }).catch(err => {
        content.innerHTML = `<div style="padding:40px;text-align:center;color:#ba1a1a">加载失败: ${escapeHtml(err.message)}</div>`;
    });
}

function formatDateTimeMinute(value) {
    if (!value) return '';
    return new Date(value.replace(' ', 'T')).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function openEntryModal(entry) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    _openOverlay(overlay);
    
    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    const entryCoverPath = entry.cover_local || entry.cover_url;
    const coverHtml = entryCoverPath
        ? `<img alt="${escapeHtml(entry.title)}" class="w-full h-full object-cover" src="${escapeHtml(entryCoverPath)}" onerror="this.style.display='none'" />`
        : `<div class="w-full h-full bg-surface flex items-center justify-center"><span class="material-symbols-outlined text-4xl text-outline-variant">description</span></div>`;

    content.innerHTML = `
<div class="w-full md:w-1/3 bg-surface-container-low p-8 flex flex-col items-center justify-center border-r border-outline-variant/10">
    <div class="w-48 md:w-64 aspect-[2/3] bg-surface-container-high rounded-lg overflow-hidden shadow-sm mb-8 relative border border-outline-variant/10">
        ${coverHtml}
    </div>
    <div class="w-full space-y-4 text-center">
        <h2 class="font-headline text-3xl md:text-3xl text-on-surface leading-tight tracking-tight">${escapeHtml(entry.title || '无标题')}</h2>
        ${entry.author ? `<p class="font-body text-lg text-on-surface-variant">${escapeHtml(entry.author)}</p>` : ''}
        <div class="flex flex-wrap items-center justify-center gap-2 pt-4">
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label text-sm">
                ${escapeHtml(entry.category)}
            </span>
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label text-sm">
                ${entry.platform || 'web'}
            </span>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2">
            ${tags.map(t => `<span class="inline-flex items-center px-3 py-1 rounded-full bg-surface border border-outline-variant/30 text-on-surface-variant font-label text-xs">#${escapeHtml(t)}</span>`).join('')}
        </div>
    </div>
    <div class="w-full mt-12 space-y-3">
        <a href="${escapeHtml(entry.url)}" target="_blank" class="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 px-6 rounded-lg font-body font-medium transition-colors hover:bg-primary-container">
            <span class="material-symbols-outlined">menu_book</span> Open Original
        </a>
        <button onclick="confirmDeleteEntry('${entry.id}')" class="w-full flex items-center justify-center gap-2 bg-transparent text-error py-3 px-6 rounded-lg font-body font-medium transition-colors hover:bg-error-container hover:text-on-error-container">
            <span class="material-symbols-outlined">delete</span> Delete Entry
        </button>
    </div>
</div>

<div class="w-full md:w-2/3 bg-surface p-8 md:p-12 flex flex-col relative overflow-y-auto">
    <button onclick="closeModal()" class="absolute top-6 right-6 p-2 rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors">
        <span class="material-symbols-outlined">close</span>
    </button>
    
    <nav class="flex gap-8 mb-12 border-b border-outline-variant/20 pb-4">
        <button class="font-body text-primary font-bold border-b-2 border-primary pb-4 -mb-[18px]">AI Summary</button>
    </nav>
    
    <div class="space-y-12 max-w-2xl text-on-surface-variant font-body">
        ${entry.summary ? `
        <section>
            <div class="flex items-center gap-3 mb-6">
                <div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                    <span class="material-symbols-outlined text-on-secondary-container text-sm">auto_awesome</span>
                </div>
                <h3 class="font-headline text-2xl text-on-surface tracking-tight">AI Generated Insight</h3>
            </div>
            <p class="font-body text-lg leading-relaxed text-on-surface-variant break-words">
                ${escapeHtml(entry.summary).replace(/\n/g, '<br/>')}
            </p>
        </section>
        ` : ''}
        
        ${entry.note ? `
        <section class="pt-8 border-t border-outline-variant/20">
            <h3 class="font-headline text-2xl text-on-surface tracking-tight mb-6">Notes</h3>
            <p class="font-body text-lg leading-relaxed text-on-surface-variant">
                ${escapeHtml(entry.note).replace(/\n/g, '<br/>')}
            </p>
        </section>
        ` : ''}
    </div>
</div>
    `;
}

function confirmDeleteBook(bookId) {
    if (!confirm('确认删除这本书及其所有内容？')) return;
    api.getBook(bookId).then(res => {
        const entries = res.data.entries || [];
        return Promise.all(entries.map(e => api.deleteEntry(e.id)));
    }).then(() => {
        closeModal();
        window.showToast('已删除', 'success');
        window.loadData();
    }).catch(err => window.showToast('删除失败: ' + err.message, 'error'));
}

function confirmDeleteEntry(entryId) {
    if (!confirm('确认删除这条内容？')) return;
    api.deleteEntry(entryId).then(() => {
        closeModal();
        window.showToast('已删除', 'success');
        window.loadData();
    }).catch(err => window.showToast('删除失败: ' + err.message, 'error'));
}

// ── Animated overlay helpers ─────────────────────────────────────────────────
const EASE_SPRING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function _openOverlay(overlay) {
    overlay.classList.remove('hidden');
    const card = overlay.firstElementChild;
    overlay.style.opacity = '0';
    if (card) {
        card.style.transform = 'scale(0.96) translateY(12px)';
        card.style.opacity = '0';
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.style.transition = `opacity 0.25s ${EASE_SPRING}`;
            overlay.style.opacity = '1';
            if (card) {
                card.style.transition = `transform 0.38s ${EASE_SPRING}, opacity 0.28s ${EASE_SPRING}`;
                card.style.transform = 'scale(1) translateY(0)';
                card.style.opacity = '1';
            }
        });
    });
    // Clean up
    setTimeout(() => {
        overlay.style.transition = '';
        overlay.style.opacity = '';
        if (card) { card.style.transition = ''; card.style.opacity = ''; card.style.transform = ''; }
    }, 420);
}

function _closeOverlay(overlay) {
    const card = overlay.firstElementChild;
    overlay.style.transition = `opacity 0.2s ${EASE_SPRING}`;
    overlay.style.opacity = '0';
    if (card) {
        card.style.transition = `transform 0.2s ${EASE_SPRING}, opacity 0.15s ${EASE_SPRING}`;
        card.style.transform = 'scale(0.97) translateY(8px)';
        card.style.opacity = '0';
    }
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.style.transition = '';
        overlay.style.opacity = '';
        if (card) { card.style.transition = ''; card.style.opacity = ''; card.style.transform = ''; }
    }, 220);
}

function closeModal() {
    _closeOverlay(document.getElementById('modalOverlay'));
}

document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModal();
        _closeOverlay(document.getElementById('settingsOverlay'));
    }
});

window.openBookModal = openBookModal;
window.openEntryModal = openEntryModal;
window.closeModal = closeModal;
window.confirmDeleteBook = confirmDeleteBook;
window.confirmDeleteEntry = confirmDeleteEntry;

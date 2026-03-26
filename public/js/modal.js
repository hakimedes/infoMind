// public/js/modal.js - Book and entry detail modals
function openBookModal(bookId) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    overlay.style.display = 'flex';
    content.innerHTML = '<div style="text-align:center;padding:60px;"><div class="spinner" style="margin:0 auto"></div></div>';

    api.getBook(bookId).then(res => {
        const book = res.data;
        const entries = book.entries || [];
        const platformLabel = book.platform || 'web';

        content.innerHTML = `
      ${book.cover_url
                ? `<img class="modal-cover-hero" src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)}" onerror="this.classList.add('no-img');this.innerHTML='📚';this.removeAttribute('src')" />`
                : `<div class="modal-cover-hero no-img">📚</div>`
            }
      <div class="modal-body">
        <div class="modal-title">${escapeHtml(book.title || '无标题')}</div>
        <div class="modal-meta">
          ${book.author ? `<span class="modal-tag">✍️ ${escapeHtml(book.author)}</span>` : ''}
          <span class="modal-tag accent">${escapeHtml(book.category)}</span>
          <span class="modal-tag">${platformLabel}</span>
          <span class="modal-tag">${entries.length} 篇内容</span>
          <span class="modal-tag">📅 ${new Date(book.created_at).toLocaleDateString('zh-CN')}</span>
        </div>

        ${entries.length > 0 ? `
          <div class="modal-section">
            <div class="modal-section-title">📑 包含内容</div>
            <div class="entry-list">
              ${entries.map((e, i) => `
                <div class="entry-list-item">
                  <div class="entry-list-num">${i + 1}</div>
                  <div class="entry-list-title">${escapeHtml(e.title || e.url)}</div>
                  <div class="entry-list-date">${new Date(e.created_at).toLocaleDateString('zh-CN')}</div>
                  <a class="entry-list-link" href="${escapeHtml(e.url)}" target="_blank" rel="noopener" title="查看原文">🔗</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${entries[0]?.summary ? `
          <div class="modal-section">
            <div class="modal-section-title">📝 智能摘要</div>
            <div class="modal-summary">${escapeHtml(entries[0].summary)}</div>
          </div>
        ` : ''}

        <div class="modal-actions">
          ${entries[0] ? `<a href="${escapeHtml(entries[0].url)}" target="_blank" rel="noopener">🔗 查看原文</a>` : ''}
          <button class="modal-btn-delete" onclick="confirmDeleteBook('${bookId}')">🗑️ 删除</button>
        </div>
      </div>
    `;
    }).catch(err => {
        content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--error)">加载失败: ${escapeHtml(err.message)}</div>`;
    });
}

function openEntryModal(entry) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    overlay.style.display = 'flex';
    const tags = Array.isArray(entry.tags) ? entry.tags : [];

    content.innerHTML = `
    ${entry.cover_url
            ? `<img class="modal-cover-hero" src="${escapeHtml(entry.cover_url)}" alt="${escapeHtml(entry.title)}" onerror="this.classList.add('no-img');this.innerHTML='📄';this.removeAttribute('src')" />`
            : `<div class="modal-cover-hero no-img">📄</div>`
        }
    <div class="modal-body">
      <div class="modal-title">${escapeHtml(entry.title || '无标题')}</div>
      <div class="modal-meta">
        ${entry.author ? `<span class="modal-tag">✍️ ${escapeHtml(entry.author)}</span>` : ''}
        <span class="modal-tag accent">${escapeHtml(entry.category)}</span>
        <span class="modal-tag">${entry.platform || 'web'}</span>
        ${tags.map(t => `<span class="modal-tag">#${escapeHtml(t)}</span>`).join('')}
        <span class="modal-tag">📅 ${new Date(entry.created_at).toLocaleDateString('zh-CN')}</span>
      </div>

      ${entry.summary ? `
        <div class="modal-section">
          <div class="modal-section-title">📝 智能摘要</div>
          <div class="modal-summary">${escapeHtml(entry.summary)}</div>
        </div>
      ` : ''}

      ${entry.note ? `
        <div class="modal-section">
          <div class="modal-section-title">💬 备注</div>
          <div class="modal-summary">${escapeHtml(entry.note)}</div>
        </div>
      ` : ''}

      <div class="modal-actions">
        <a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener">🔗 查看原文</a>
        <button class="modal-btn-delete" onclick="confirmDeleteEntry('${entry.id}')">🗑️ 删除</button>
      </div>
    </div>
  `;
}

function confirmDeleteBook(bookId) {
    if (!confirm('确认删除这本书及其所有内容？')) return;
    // Get entries and delete them all
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

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

// Event listeners
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModal();
        document.getElementById('settingsOverlay').style.display = 'none';
    }
});

window.openBookModal = openBookModal;
window.openEntryModal = openEntryModal;
window.closeModal = closeModal;
window.confirmDeleteBook = confirmDeleteBook;
window.confirmDeleteEntry = confirmDeleteEntry;

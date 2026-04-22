// public/js/settings.js - Settings panel management
function initSettings() {
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('settingsClose').addEventListener('click', closeSettings);
    document.getElementById('settingsOverlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeSettings();
    });
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('testLlmBtn').addEventListener('click', testLlmConnection);
}

async function openSettings() {
    _openOverlay(document.getElementById('settingsOverlay'));

    // Load current config
    try {
        const res = await api.getConfig();
        const cfg = res.data;
        document.getElementById('cfgProvider').value = cfg['llm.provider'] || 'openai';
        document.getElementById('cfgBaseUrl').value = cfg['llm.base_url'] || '';
        const apiKeyInput = document.getElementById('cfgApiKey');
        apiKeyInput.value = ''; // never prefill key for security
        apiKeyInput.placeholder = cfg['llm.api_key'] ? `已保存: ${cfg['llm.api_key']}` : 'sk-...';
        document.getElementById('cfgModel').value = cfg['llm.model'] || '';
    } catch { }

    // Load stats
    try {
        const res = await api.getStats();
        const s = res.data;
        const grid = document.getElementById('settingsStats');
        grid.innerHTML = `
      <div class="stat-card"><div class="stat-num">${s.total_entries}</div><div class="stat-label">总条目</div></div>
      <div class="stat-card"><div class="stat-num">${s.total_books}</div><div class="stat-label">书架数量</div></div>
      <div class="stat-card"><div class="stat-num">${s.total_categories_used}</div><div class="stat-label">使用分类</div></div>
      <div class="stat-card"><div class="stat-num">${(s.by_platform || []).length}</div><div class="stat-label">收录平台</div></div>
    `;
    } catch { }

    // Set webhook URL
    document.getElementById('webhookUrl').textContent = `http://localhost:${window.location.port || 3456}/api/webhook/openclaw`;
}

function closeSettings() {
    _closeOverlay(document.getElementById('settingsOverlay'));
}

async function saveSettings() {
    const btn = document.getElementById('saveSettingsBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const updates = {};
    const provider = document.getElementById('cfgProvider').value;
    const baseUrl = document.getElementById('cfgBaseUrl').value.trim();
    const apiKey = document.getElementById('cfgApiKey').value.trim();
    const model = document.getElementById('cfgModel').value.trim();

    if (provider) updates['llm.provider'] = provider;
    if (baseUrl) updates['llm.base_url'] = baseUrl;
    if (apiKey) updates['llm.api_key'] = apiKey;
    if (model) updates['llm.model'] = model;

    try {
        await api.saveConfig(updates);
        window.showToast('设置已保存', 'success');
        const apiKeyInput = document.getElementById('cfgApiKey');
        apiKeyInput.value = ''; // clear after save
        try {
            const res = await api.getConfig();
            if (res.data['llm.api_key']) apiKeyInput.placeholder = `已保存: ${res.data['llm.api_key']}`;
        } catch {}
    } catch (err) {
        window.showToast('保存失败: ' + err.message, 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = 'Save Configuration';
    }
}

async function testLlmConnection() {
    const btn = document.getElementById('testLlmBtn');
    const result = document.getElementById('testResult');
    btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">autorenew</span> Testing...';
    result.textContent = ''; result.className = 'text-sm font-label';

    try {
        const res = await api.testLlm();
        result.innerHTML = `<span class="text-success flex items-center gap-1"><span class="material-symbols-outlined text-sm">check_circle</span> Success (${res.data.latency}ms)</span>`;
    } catch (err) {
        result.innerHTML = `<span class="text-error flex items-center gap-1"><span class="material-symbols-outlined text-sm">error</span> ${escapeHtml(err.message)}</span>`;
    } finally {
        btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-sm">network_check</span> Test Connection';
    }
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('cfgApiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function copyWebhookUrl() {
    const url = document.getElementById('webhookUrl').textContent;
    navigator.clipboard.writeText(url).then(() => window.showToast('已复制', 'success'));
}

window.initSettings = initSettings;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.copyWebhookUrl = copyWebhookUrl;

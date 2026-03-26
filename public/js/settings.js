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
    document.getElementById('settingsOverlay').style.display = 'flex';

    // Load current config
    try {
        const res = await api.getConfig();
        const cfg = res.data;
        document.getElementById('cfgProvider').value = cfg['llm.provider'] || 'openai';
        document.getElementById('cfgBaseUrl').value = cfg['llm.base_url'] || '';
        document.getElementById('cfgApiKey').value = ''; // never prefill key for security
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
    document.getElementById('settingsOverlay').style.display = 'none';
}

async function saveSettings() {
    const btn = document.getElementById('saveSettingsBtn');
    btn.disabled = true; btn.textContent = '保存中...';

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
        window.showToast('设置已保存 ✅', 'success');
        document.getElementById('cfgApiKey').value = ''; // clear after save
    } catch (err) {
        window.showToast('保存失败: ' + err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '💾 保存设置';
    }
}

async function testLlmConnection() {
    const btn = document.getElementById('testLlmBtn');
    const result = document.getElementById('testResult');
    btn.disabled = true; btn.textContent = '测试中...';
    result.textContent = ''; result.className = 'test-result';

    try {
        const res = await api.testLlm();
        result.textContent = `✅ 连接成功 (${res.data.model}, ${res.data.latency}ms)`;
        result.className = 'test-result';
    } catch (err) {
        result.textContent = `❌ ${err.message}`;
        result.className = 'test-result error';
    } finally {
        btn.disabled = false; btn.textContent = '🧪 测试连接';
    }
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('cfgApiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function copyWebhookUrl() {
    const url = document.getElementById('webhookUrl').textContent;
    navigator.clipboard.writeText(url).then(() => window.showToast('已复制 ✅', 'success'));
}

window.initSettings = initSettings;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.copyWebhookUrl = copyWebhookUrl;

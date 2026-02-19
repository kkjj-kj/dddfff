// 简单的 popup.js 更新逻辑参考
document.addEventListener('DOMContentLoaded', () => {
    // 字段 ID 列表
    const fields = ['serverIp', 'modelSelect', 'apiKey', 'personaSelect'];

    // 1. 加载配置
    chrome.storage.local.get(fields, (data) => {
        fields.forEach(id => {
            if (data[id]) document.getElementById(id).value = data[id];
        });
        // 默认值处理
        if (!document.getElementById('serverIp').value) {
            document.getElementById('serverIp').value = '127.0.0.1:3000';
        }
        updateLinks();
    });

    // 2. 保存配置
    document.getElementById('saveBtn').addEventListener('click', () => {
        const config = {};
        fields.forEach(id => {
            config[id] = document.getElementById(id).value.trim();
        });

        // 简单的格式清理
        config.serverIp = config.serverIp.replace(/^https?:\/\//, '').replace(/\/$/, '');

        chrome.storage.local.set(config, () => {
            const msg = document.getElementById('msg');
            msg.textContent = "✅ 配置已保存，战术面板已更新";
            msg.className = "msg-success";
            updateLinks();

            setTimeout(() => {
                msg.textContent = "";
                msg.className = "";
            }, 2000);
        });
    });

    function updateLinks() {
        const host = document.getElementById('serverIp').value || '127.0.0.1:3000';
        document.getElementById('openCrm').href = `http://${host}/client_crm.html`;
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('serverIp');
    const saveBtn = document.getElementById('saveBtn');
    const openBtn = document.getElementById('openCrm');
    const msg = document.getElementById('msg');

    // 1. 初始化：读取已保存的 IP，如果没有则默认为 localhost:3000
    chrome.storage.local.get(['server_host'], (result) => {
        const host = result.server_host || 'localhost:3000';
        input.value = host;
        updateLinks(host);
    });

    // 2. 保存配置
    saveBtn.addEventListener('click', () => {
        let host = input.value.trim();
        // 简单的格式清理：去掉 http:// 前缀，只存 IP:PORT，方便统一处理
        host = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
        
        if(host) {
            chrome.storage.local.set({ 'server_host': host }, () => {
                msg.textContent = "✅ 配置已保存，连接中...";
                updateLinks(host);
                
                // 3. 测试连接 (可选优化)
                fetch(`http://${host}/`)
                    .then(() => msg.textContent = "✅ 服务器连接成功！")
                    .catch(() => msg.textContent = "⚠️ 保存成功，但无法连接服务器");
            });
        }
    });

    // 更新按钮链接
    function updateLinks(host) {
        openBtn.href = `http://${host}/client_crm.html`;
    }
});
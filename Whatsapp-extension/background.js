// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "sync_client") {
        
        // === 核心修改：先读取存储的 IP ===
        chrome.storage.local.get(['server_host'], (result) => {
            // 默认 localhost，如果有设置则用设置的
            let host = result.server_host || 'localhost:3000';
            if (!host.startsWith('http')) host = 'http://' + host;

            console.log(`正在同步至: ${host}`);

            fetch(`${host}/api/plugin/sync-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request.data)
            })
            .then(res => res.json())
            .then(data => sendResponse({ success: true, msg: "同步成功!", data }))
            .catch(err => sendResponse({ success: false, msg: `连接失败: ${host}` }));
        });

        return true; // 保持异步通道
    }
});
// content.js - WhatsApp 页面潜伏者 v2.0

console.log("🚀 大芬战友插件: 注入成功");

// === 1. 智能抓取核心 ===
function scrapeCurrentContact() {
    try {
        // WhatsApp 的 DOM 结构经常变，我们用“特征寻找法”
        const mainHeader = document.querySelector('header');
        if (!mainHeader) throw new Error("未找到聊天窗口，请先点击左侧联系人");

        // A. 抓名字 (通常在 header 的主标题位置)
        // 策略：找 header 里字体最大的 span，或者 title 属性非空的元素
        let name = "未知客户";
        const titleEl = mainHeader.querySelector('span[title]') || 
                        mainHeader.querySelector('div[role="button"] span[dir="auto"]');
        if (titleEl) name = titleEl.innerText || titleEl.getAttribute('title');

        // B. 抓头像 (Header 里的 img)
        const imgEl = mainHeader.querySelector('img');
        const avatar = imgEl ? imgEl.src : "";

        // C. 抓电话 (尝试从名字里提取，或者这是个群组/陌生人)
        let phone = "";
        // 如果名字看起来像电话号码 (+开头 或 纯数字含空格)
        if (name.match(/^[\+\d \-]+$/) && name.length > 6) {
            phone = name.replace(/[^\d]/g, '');
        } else {
            // 如果名字是昵称，电话很难直接从 DOM 获取，暂且留空，依靠 CRM 后续补充
            // 或者把名字当做临时 ID
        }

        // D. [新增] 抓取最近聊天记录 (模拟抓取最后几条文本)
        // 这一步比较难，因为 class 是混淆的。我们尝试找 message-in / message-out
        const chatContainer = document.querySelector('div[role="application"]');
        let chats = [];
        if (chatContainer) {
            // 这是一个非常粗略的选择器，WhatsApp更新可能会失效
            // 策略：找所有包含文本的行
            const rows = document.querySelectorAll('div[data-pre-plain-text]'); 
            // 如果找不到 data 属性，就放弃抓取聊天，只抓人
            
            rows.forEach(row => {
                const meta = row.getAttribute('data-pre-plain-text'); // "[10:30, 2/12/2026] Name: "
                const textEl = row.querySelector('span.selectable-text span');
                if (meta && textEl) {
                    const isMe = !meta.includes(name); // 如果 meta 里不包含客户名，就是我发的
                    chats.push({
                        role: isMe ? 'me' : 'client',
                        text: textEl.innerText,
                        time: meta.split(']')[0].replace('[', '').trim()
                    });
                }
            });
            // 只取最近 10 条
            chats = chats.slice(-10);
        }

        // E. 组装数据包
        return {
            name: name,
            phone: phone || name, // 没电话用名字做 ID
            avatar: avatar,
            source: "WhatsApp Plugin",
            country: "Unknown", // 以后可以根据电话区号判断
            chats: chats // 带上聊天记录
        };

    } catch (e) {
        console.error("抓取失败:", e);
        alert("抓取失败: " + e.message);
        return null;
    }
}

// === 2. UI 注入：悬浮按钮 ===
function injectSyncButton() {
    if (document.getElementById('dafen-sync-btn')) return;

    const header = document.querySelector('header');
    if (header) {
        const btn = document.createElement('button');
        btn.id = 'dafen-sync-btn';
        btn.innerHTML = '<span>📥</span> 存入 CRM';
        
        // 样式美化
        btn.style.cssText = `
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: white; border: none; padding: 8px 16px; 
            border-radius: 20px; font-weight: 600; font-size: 13px;
            margin-left: 12px; cursor: pointer; z-index: 9999;
            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);
            display: flex; align-items: center; gap: 6px;
            transition: transform 0.1s, box-shadow 0.1s;
        `;
        
        btn.onmousedown = () => btn.style.transform = 'scale(0.95)';
        btn.onmouseup = () => btn.style.transform = 'scale(1)';

        btn.onclick = () => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span>⏳</span> 同步中...';
            btn.style.background = '#64748b'; // 变灰

            const data = scrapeCurrentContact();
            if (data) {
                // 发消息给 background.js
                chrome.runtime.sendMessage({ action: "sync_client", data: data }, (res) => {
                    if (res && res.success) {
                        btn.innerHTML = '<span>✅</span> 已归档';
                        btn.style.background = '#10b981'; // 变绿
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.style.background = 'linear-gradient(135deg, #4f46e5, #6366f1)';
                        }, 2000);
                    } else {
                        btn.innerHTML = '<span>❌</span> 失败';
                        btn.style.background = '#ef4444'; // 变红
                        alert(res ? res.msg : "服务器未连接");
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.style.background = 'linear-gradient(135deg, #4f46e5, #6366f1)';
                        }, 2000);
                    }
                });
            } else {
                btn.innerHTML = originalText;
                btn.style.background = 'linear-gradient(135deg, #4f46e5, #6366f1)';
            }
        };

        // 插入到 Header 靠右的位置
        // 通常 header 最后一个子元素是图标容器，插在它前面
        const iconsDiv = header.lastElementChild;
        if (iconsDiv) header.insertBefore(btn, iconsDiv);
    }
}

// === 3. 监听器 ===
const observer = new MutationObserver(() => injectSyncButton());
observer.observe(document.body, { childList: true, subtree: true });
/**
 * DafenCommander v2.0 - WhatsApp 智能战友面板
 * * 核心架构：
 * 1. Shadow DOM：确保样式完全隔离，不污染 WhatsApp 原生界面。
 * 2. OOP (面向对象)：DafenCommander 类管理全生命周期。
 * 3. 安全红线：严格遵守“你点击，才填入”原则，无自动化封号风险。
 */

class DafenCommander {
    constructor() {
        // === 配置常量 ===
        this.config = {
            sidebarId: 'dafen-commander-sidebar',
            theme: {
                bg: '#0f172a',        // 深蓝背景
                border: '#1e293b',    // 边框色
                primary: '#4f46e5',   // 主色调 (Indigo)
                success: '#10b981',   // 成功色 (Emerald)
                textSub: '#94a3b8'    // 次要文字
            }
        };

        // 状态管理
        this.state = {
            isSidebarVisible: false,
            currentContact: null
        };

        this.init();
    }

    /**
     * 🚀 启动引擎
     */
    init() {
        console.log("🚀 大芬战友系统: 智能指挥部已就绪");
        this.injectSidebar();
        this.startObserver();
    }

    /**
     * 👁️ 启动 DOM 监听器
     * 监听 WhatsApp 页面的 URL 或 DOM 变化，自动显示/隐藏侧边栏
     */
    startObserver() {
        const observer = new MutationObserver(() => {
            this.checkVisibility();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    checkVisibility() {
        // WhatsApp 的 header 存在通常意味着进入了聊天界面
        const header = document.querySelector('header');
        const sidebar = this.getShadowRoot();

        if (header && !this.state.isSidebarVisible) {
            if (sidebar) sidebar.host.style.display = 'block';
            this.state.isSidebarVisible = true;
            // 自动扫描一次当前联系人
            this.scanCurrentContact();
        } else if (!header && this.state.isSidebarVisible) {
            if (sidebar) sidebar.host.style.display = 'none';
            this.state.isSidebarVisible = false;
        }
    }

    /**
     * 🕵️‍♀️ 抓取核心 (Scraper)
     * 从混乱的 WhatsApp DOM 中提取有价值的商业情报
     */
    scrapeData() {
        try {
            const header = document.querySelector('header');
            if (!header) throw new Error("未找到聊天窗口 Header");

            // 1. 抓取头像
            const imgEl = header.querySelector('img');
            const avatar = imgEl ? imgEl.src : "";

            // 2. 抓取名字 (尝试多种选择器以应对 WhatsApp 更新)
            const nameEl = header.querySelector('span[title]') ||
                           header.querySelector('div[role="button"] span[dir="auto"]');
            const name = nameEl ? (nameEl.innerText || nameEl.getAttribute('title')) : "未知客户";

            // 3. 抓取/清洗电话
            // 如果名字本身就是电话格式（如 +86...），直接用；否则留空待后端处理
            let phone = "";
            if (name.match(/^[\+\d \-]+$/) && name.length > 6) {
                phone = name.replace(/[^\d]/g, '');
            }

            // 4. 抓取聊天记录 (用于意图分析)
            // 策略：寻找带有 data-pre-plain-text 属性的消息行
            const chatRows = Array.from(document.querySelectorAll('div[data-pre-plain-text]'));
            const recentChats = chatRows.slice(-15).map(row => {
                const meta = row.getAttribute('data-pre-plain-text'); // "[10:30, 2/12/2026] Name: "
                const textEl = row.querySelector('.selectable-text span');
                // 判断是谁发的：如果 meta 里不包含客户名字，大概率是我发的
                const isMe = !meta.includes(name);

                return {
                    role: isMe ? 'me' : 'client',
                    text: textEl ? textEl.innerText : "[非文本消息]",
                    time: meta.split(']')[0].replace('[', '').trim()
                };
            });

            return {
                name,
                phone: phone || name, // 没电话时用名字做唯一标识
                avatar,
                chats: recentChats,
                source: "WhatsApp Plugin",
                timestamp: new Date().toISOString()
            };

        } catch (e) {
            console.error("抓取失败:", e);
            return null;
        }
    }

    /**
     * 🎨 UI 渲染核心 (Shadow DOM)
     */
    injectSidebar() {
        if (document.getElementById(this.config.sidebarId)) return;

        // 创建宿主元素
        const host = document.createElement('div');
        host.id = this.config.sidebarId;
        document.body.appendChild(host);

        // 创建 Shadow Root
        const shadow = host.attachShadow({ mode: 'open' });

        // 注入样式与 HTML
        shadow.innerHTML = `
            <style>
                :host { 
                    position: fixed; right: 0; top: 0; bottom: 0;
                    width: 300px; z-index: 9999;
                    background-color: ${this.config.theme.bg};
                    border-left: 1px solid ${this.config.theme.border};
                    color: #e2e8f0; font-family: 'Segoe UI', sans-serif;
                    box-shadow: -4px 0 15px rgba(0,0,0,0.5);
                    display: none; /* 默认隐藏 */
                }
                .container { display: flex; flex-direction: column; height: 100%; }
                
                /* Header */
                .header { 
                    padding: 16px; background: rgba(255,255,255,0.05); 
                    border-bottom: 1px solid ${this.config.theme.border};
                    display: flex; align-items: center; gap: 8px;
                }
                .title { font-weight: 800; font-size: 14px; letter-spacing: 0.5px; color: #fff; }
                .badge { background: ${this.config.theme.primary}; font-size: 10px; padding: 2px 6px; border-radius: 4px; }

                /* Section Common */
                .section { padding: 16px; border-bottom: 1px solid ${this.config.theme.border}; }
                .label { font-size: 11px; color: ${this.config.theme.textSub}; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; }

                /* Radar Score */
                .score-area { text-align: center; padding: 10px 0; }
                .score-val { font-size: 32px; font-weight: 900; color: ${this.config.theme.success}; line-height: 1; }
                .score-tag { font-size: 12px; color: ${this.config.theme.success}; margin-top: 4px; }

                /* Input Area */
                textarea {
                    width: 100%; height: 80px; box-sizing: border-box;
                    background: rgba(0,0,0,0.2); border: 1px solid ${this.config.theme.border};
                    border-radius: 6px; padding: 10px; color: white; font-size: 12px;
                    resize: none; outline: none; transition: border 0.2s;
                }
                textarea:focus { border-color: ${this.config.theme.primary}; }
                
                /* Buttons */
                .btn {
                    width: 100%; padding: 10px; margin-top: 10px;
                    border: none; border-radius: 6px; cursor: pointer;
                    font-size: 12px; font-weight: 600; color: white;
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                    transition: opacity 0.2s;
                }
                .btn:hover { opacity: 0.9; }
                .btn:active { transform: scale(0.98); }
                .btn-primary { background: ${this.config.theme.primary}; }
                .btn-success { background: ${this.config.theme.success}; }

                /* Footer */
                .footer { margin-top: auto; padding: 10px; text-align: center; font-size: 10px; color: #475569; }
            </style>

            <div class="container">
                <div class="header">
                    <span class="badge">v2.0</span>
                    <span class="title">大芬战友·智能舱</span>
                </div>

                <div class="section">
                    <div class="label"><i class="icon">📡</i> 实时意向雷达</div>
                    <div class="score-area">
                        <div class="score-val" id="radar-score">--</div>
                        <div class="score-tag" id="radar-text">等待分析...</div>
                    </div>
                </div>

                <div class="section">
                    <div class="label">✨ 商务润色 (老板人设)</div>
                    <textarea id="ai-input" placeholder="输入中文意图 (例如: 价格可以降，但必须走海运)..."></textarea>
                    <button class="btn btn-primary" id="btn-gen">
                        <span>🪄</span> 生成地道回复 (Ctrl+Enter)
                    </button>
                </div>

                <div class="section">
                    <div class="label">📂 客户资产归档</div>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;" id="client-info">
                        未识别到客户
                    </div>
                    <button class="btn btn-success" id="btn-sync">
                        <span>📥</span> 存入 CRM 指挥部
                    </button>
                </div>

                <div class="footer">DafenArts &copy; 2026 Internal Tool</div>
            </div>
        `;

        // 绑定事件
        this.bindEvents(shadow);
    }

    /**
     * 🎮 控制器 (Controller)
     */
    bindEvents(shadow) {
        const btnGen = shadow.getElementById('btn-gen');
        const btnSync = shadow.getElementById('btn-sync');
        const aiInput = shadow.getElementById('ai-input');

        // 生成回复
        btnGen.onclick = () => this.handleGenerateReply(shadow);

        // 快捷键支持 (Ctrl + Enter)
        aiInput.onkeydown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.handleGenerateReply(shadow);
            }
        };

        // 同步 CRM
        btnSync.onclick = () => this.handleSyncCRM(shadow);

        // 鼠标悬停刷新客户信息
        shadow.host.addEventListener('mouseenter', () => this.scanCurrentContact(shadow));
    }

    // 辅助：获取 Shadow Root 便于操作
    getShadowRoot() {
        const host = document.getElementById(this.config.sidebarId);
        return host ? host.shadowRoot : null;
    }

    // === 业务逻辑 ===

    scanCurrentContact(shadowRoot = this.getShadowRoot()) {
        if (!shadowRoot) return;

        const data = this.scrapeData();
        const infoEl = shadowRoot.getElementById('client-info');

        if (data) {
            infoEl.innerHTML = `
                <div style="color:white; font-weight:bold">${data.name}</div>
                <div>${data.phone || '无电话'}</div>
            `;
            // 如果还没分析过，模拟一个初始分
            if (shadowRoot.getElementById('radar-score').innerText === '--') {
                shadowRoot.getElementById('radar-score').innerText = '50%';
                shadowRoot.getElementById('radar-text').innerText = '初步接触';
            }
        } else {
            infoEl.innerHTML = '未识别到客户';
        }
    }

    handleGenerateReply(shadow) {
        const input = shadow.getElementById('ai-input');
        const btn = shadow.getElementById('btn-gen');
        const text = input.value.trim();

        if (!text) return;

        // UI Loading
        const originText = btn.innerHTML;
        btn.innerHTML = '<span>⏳</span> 思考中...';
        btn.style.opacity = '0.7';

        // 模拟 AI 请求 (后期对接 background.js -> API)
        setTimeout(() => {
            // 这里放 Prompt 逻辑
            const reply = `[AI Suggestion]: Based on our wholesale policy, we can offer a 5% discount for 50pcs. However, sea freight is recommended to save costs.\n\n(Click to edit)`;

            // 恢复 UI
            btn.innerHTML = originText;
            btn.style.opacity = '1';

            // 填入 WhatsApp 输入框
            this.fillWhatsAppInput(reply);
        }, 1000);
    }

    handleSyncCRM(shadow) {
        const btn = shadow.getElementById('btn-sync');
        const data = this.scrapeData();

        if (!data) return alert("请先打开一个聊天窗口");

        // UI Loading
        const originText = btn.innerHTML;
        btn.innerHTML = '<span>🚀</span> 发送中...';

        // 发送消息给 background.js
        chrome.runtime.sendMessage({ action: "sync_client", data: data }, (response) => {
            if (response && response.success) {
                btn.innerHTML = '<span>✅</span> 已归档';
                setTimeout(() => btn.innerHTML = originText, 2000);
            } else {
                btn.innerHTML = '<span>❌</span> 失败';
                alert("同步失败: " + (response ? response.msg : "连接超时"));
                setTimeout(() => btn.innerHTML = originText, 2000);
            }
        });
    }

    /**
     * 安全注入文字
     * 模拟用户粘贴行为，不直接调用 WhatsApp 内部 API，防止封号
     */
    fillWhatsAppInput(text) {
        // 寻找 WhatsApp 的输入框 (contenteditable)
        const inputDiv = document.querySelector('div[contenteditable="true"][data-tab="10"]');

        if (inputDiv) {
            inputDiv.focus();
            // 使用 execCommand 模拟粘贴，是目前最安全的注入方式
            document.execCommand('insertText', false, text);
        } else {
            alert("请先点击 WhatsApp 的聊天输入框");
        }
    }
}

// === 🚀 启动插件 ===
// 延时一点启动，确保页面加载完毕
setTimeout(() => new DafenCommander(), 1000);
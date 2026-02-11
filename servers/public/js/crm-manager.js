/**
 * crm-manager.js v3.1 (智能增强版)
 * 对应 README 需求：
 * 1. 意图深度诊断 (Intent Radar)
 * 2. 历史订单数据穿透 (Data Sync)
 * 3. 智能排序与多维搜索
 */

const CRM = {
    clients: [],
    activeId: null,
    ordersCache: [], // 缓存订单数据
    API_BASE: (window.APP && window.APP.API_BASE) || '/api',
    isOnline: false,

    // === 1. 初始化系统 ===
    init() {
        this.loadData();
        this.initCountrySelect();
        this.bindEvents();
        // 初始按意向分排序
        this.sortClients('score');
        this.renderList();
        console.log('🚀 DafenArts CRM v3.1: 智能指挥部已就绪');
    },

    // === 2. 数据层 (Data Layer) ===
    loadData() {
        // 加载客户档案
        const savedClients = localStorage.getItem('dafen_crm_clients');
        this.clients = savedClients ? JSON.parse(savedClients) : this.getMockClients();

        // 加载订单数据 (来自 OrderManager)
        const savedOrders = localStorage.getItem('dafen_orders');
        this.ordersCache = savedOrders ? JSON.parse(savedOrders) : [];

        // 数据融合：计算每个客户的 LTV 和 订单数
        this.enrichClientData();

        this.updateGlobalCount();
    },

    // 数据清洗与融合
    enrichClientData() {
        this.clients.forEach(client => {
            // 归一化电话号码 (去除空格、加号等，用于匹配)
            const cleanPhone = (client.phone || '').replace(/[^\d]/g, '');

            // 查找该客户的所有订单
            const clientOrders = this.ordersCache.filter(order => {
                const orderPhone = (order.clientPhone || '').replace(/[^\d]/g, '');
                // 匹配逻辑：电话号码匹配 或 邮箱匹配
                return (cleanPhone && orderPhone.includes(cleanPhone)) ||
                       (client.email && order.clientEmail === client.email);
            });

            // 计算 LTV (Life Time Value)
            const ltv = clientOrders.reduce((sum, ord) => sum + (parseFloat(ord.total) || 0), 0);

            client.ltv = ltv;
            client.orderCount = clientOrders.length;
            client.lastOrderDate = clientOrders.length > 0 ? clientOrders[0].time : null;

            // 如果没有 AI 分析数据，初始化一个
            if (!client.aiAnalysis) {
                client.aiAnalysis = this.calculateIntentScore(client);
            }
        });
    },

    saveData() {
        localStorage.setItem('dafen_crm_clients', JSON.stringify(this.clients));
        this.updateGlobalCount();
    },

    updateGlobalCount() {
        const countEl = document.getElementById('clientCount');
        if (countEl) countEl.textContent = `${this.clients.length} Clients Loaded`;
    },

    // === 3. 智能搜索与列表渲染 ===
    renderList(keyword = '') {
        const container = document.getElementById('clientList');
        if (!container) return;
        container.innerHTML = '';

        const term = keyword.toLowerCase().trim();

        // 过滤逻辑
        const filtered = this.clients.filter(c => {
            const matchName = c.name.toLowerCase().includes(term);
            const matchPhone = (c.phone || '').includes(term);
            const matchTag = (c.tags || []).some(t => t.toLowerCase().includes(term));
            return matchName || matchPhone || matchTag;
        });

        filtered.forEach(client => {
            const el = document.createElement('div');
            const isActive = this.activeId === client.id;
            const score = client.aiAnalysis ? client.aiAnalysis.score : 0;

            // 意向分颜色逻辑
            let scoreColor = 'text-slate-500';
            if(score >= 80) scoreColor = 'text-emerald-400';
            else if(score >= 50) scoreColor = 'text-amber-400';
            else scoreColor = 'text-rose-400';

            el.className = `client-item p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${isActive ? 'bg-white/10 border-l-2 border-l-indigo-500' : ''}`;
            el.onclick = () => this.selectClient(client.id);

            const country = (CONFIG.COUNTRIES && CONFIG.COUNTRIES[client.country]) || { flag: '🏳️', name: client.country };

            el.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <div class="w-10 h-10 rounded bg-slate-800 flex items-center justify-center font-bold text-slate-300 border border-white/10">
                                ${client.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="absolute -top-1 -right-1 bg-slate-900 rounded-full px-1 border border-white/10 text-[9px] font-mono font-black ${scoreColor}">
                                ${score}
                            </div>
                        </div>
                        <div>
                            <div class="font-bold text-slate-200 text-sm flex items-center gap-2">
                                ${client.name}
                                ${client.orderCount > 0 ? '<i class="fas fa-crown text-amber-500 text-[10px]" title="已成交客户"></i>' : ''}
                            </div>
                            <div class="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                <span>${country.flag}</span>
                                <span>${client.phone || '无电话'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${this.getLevelClass(client.level)} inline-block mb-1">
                            ${client.level ? client.level.toUpperCase() : 'NEW'}
                        </div>
                        <div class="text-[9px] text-slate-600 font-mono">
                           LTV: $${MathUtils.formatNumber(client.ltv)}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
    },

    // 智能排序
    sortClients(criteria) {
        if (criteria === 'score') {
            this.clients.sort((a, b) => (b.aiAnalysis?.score || 0) - (a.aiAnalysis?.score || 0));
        } else if (criteria === 'time') {
            // 假设有个 lastInteractionTime，这里暂用 lastDate
            this.clients.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
        }
        this.renderList(document.getElementById('searchInput').value);
    },

    // === 4. 核心交互逻辑 ===
    selectClient(id) {
        const client = this.clients.find(c => c.id === id);
        if (!client) return;

        this.activeId = id;

        // 切换 UI 状态
        document.getElementById('emptyState').classList.add('hidden');
        const panel = document.getElementById('activeChatPanel');
        panel.classList.remove('hidden');
        panel.style.display = 'flex';

        // 刷新列表样式
        this.renderList(document.getElementById('searchInput').value);

        // A. 渲染头部
        this.renderHeader(client);

        // B. 渲染聊天 (模拟读取 JSON)
        this.renderChatHistory(client);

        // C. 渲染右侧情报 (雷达 + 精算)
        this.renderIntelligence(client);

        // D. 渲染历史订单 (从缓存读取)
        this.renderHistory(client);
    },

    // 头部信息
    renderHeader(client) {
        document.getElementById('headerName').textContent = client.name;
        document.getElementById('headerAvatar').textContent = client.name.charAt(0).toUpperCase();

        const country = (CONFIG.COUNTRIES && CONFIG.COUNTRIES[client.country]) || { flag: '🏳️', name: client.country };
        document.getElementById('headerCountry').innerHTML = `${country.flag} ${country.name}`;

        // 计算当地时间
        document.getElementById('headerTime').textContent = this.getLocalTime(client.country);

        // WhatsApp 链接
        const cleanPhone = (client.phone || '').replace(/[^\d]/g, '');
        const btn = document.getElementById('headerWaLink');
        if (cleanPhone) {
            btn.href = `https://wa.me/${cleanPhone}`;
            btn.classList.remove('hidden');
            btn.innerHTML = `<i class="fab fa-whatsapp"></i> Chat (${cleanPhone})`;
        } else {
            btn.classList.add('hidden');
        }
    },

    // === 5. 意图雷达算法 (The AI Logic) ===
    // 这是一个简化版的规则引擎，模拟 AI 分析
    calculateIntentScore(client) {
        let score = 50; // 基础分
        let signals = [];
        const chats = client.chats || [];
        const fullText = chats.map(c => c.text.toLowerCase()).join(' ');

        // 规则 1: 询问核心词 (+分)
        if (fullText.includes('price') || fullText.includes('cost') || fullText.includes('how much')) {
            score += 10;
            signals.push('询问价格 (Price Inquiry)');
        }
        if (fullText.includes('sample') || fullText.includes('quality')) {
            score += 15;
            signals.push('关注质量/样品 (Quality Check)');
        }
        if (fullText.includes('ship') || fullText.includes('delivery') || fullText.includes('ddp')) {
            score += 20;
            signals.push('询问物流/DDP (Logistics Intent)');
        }
        if (fullText.includes('discount') || fullText.includes('cheaper')) {
            score -= 5;
            signals.push('价格敏感 (Price Sensitive)');
        }
        if (fullText.includes('nft') || fullText.includes('crypto')) {
            score = 0;
            signals.push('🚨 警惕：疑似 NFT 杀猪盘');
        }

        // 规则 2: 历史成交 (+分)
        if (client.ltv > 0) {
            score += 30;
            signals.push(`历史成交客户 ($${client.ltv})`);
        }

        // 提取参数 (模拟 NLP)
        const params = {
            qty: fullText.match(/(\d+)\s*(pcs|pieces|paintings)/)?.[1] || null,
            size: fullText.match(/(\d+x\d+)/)?.[1] || null,
            country: client.country
        };

        return {
            score: Math.min(100, Math.max(0, score)),
            signals: signals,
            params: params
        };
    },

    // 渲染右侧情报
    renderIntelligence(client) {
        // 实时计算一次意向
        const ai = this.calculateIntentScore(client);
        client.aiAnalysis = ai; // 更新缓存

        // 更新大数字
        const scoreEl = document.getElementById('radarScore');
        scoreEl.textContent = `${ai.score}%`;

        // 颜色动态变化
        if(ai.score >= 80) scoreEl.className = "text-3xl font-mono font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]";
        else if(ai.score >= 50) scoreEl.className = "text-3xl font-mono font-black text-amber-400";
        else scoreEl.className = "text-3xl font-mono font-black text-rose-500";

        // 更新参数槽
        this.updateSlot('qty', ai.params.qty);
        this.updateSlot('size', ai.params.size);
        this.updateSlot('style', 'Impasto'); // 模拟
        this.updateSlot('country', ai.params.country);

        // 信号日志
        const log = document.getElementById('aiSignalLog');
        log.innerHTML = ai.signals.length
            ? ai.signals.map(s => `<div class="mb-1 ${s.includes('警惕') ? 'text-rose-400 font-bold' : 'text-emerald-400/80'}">> ${s}</div>`).join('')
            : '<div class="opacity-50 italic text-center mt-2">暂无明显意图信号</div>';

        // 触发利润精算
        // 如果提取到了数量，自动填入计算器
        if (ai.params.qty) {
            this.runCalculation(parseInt(ai.params.qty), client.country);
        } else {
            // 默认算 10 幅
            this.runCalculation(10, client.country);
        }
    },

    updateSlot(key, val) {
        const el = document.getElementById(`slot-${key}`);
        if (!el) return;
        if (val) {
            el.classList.add('filled');
            el.querySelector('.value').textContent = val;
            el.querySelector('.bar-fill').style.width = '100%';
        } else {
            el.classList.remove('filled');
            el.querySelector('.value').textContent = '---';
            el.querySelector('.bar-fill').style.width = '0%';
        }
    },

    // 利润精算 (调用 CalculationEngine)
    runCalculation(qty, countryCode) {
        if (typeof CalculationEngine === 'undefined') return;

        // 获取全局默认配置
        const globalValues = StateManager.getAllValues();
        const countryConfig = (CONFIG.COUNTRIES && CONFIG.COUNTRIES[countryCode]) || CONFIG.COUNTRIES.USA;

        // 构造计算参数
        const mockValues = {
            ...globalValues,
            quoteQty: qty,
            quoteCountry: countryCode,
            manualUSD: 0 // 强制使用建议价
        };

        const params = CalculationEngine.getBaseParams(mockValues, countryConfig);

        // 计算成本 (基于当前数量分摊)
        const costs = CalculationEngine.getUnitCosts(params, qty);

        // 计算建议售价 (期望利润率 35%)
        const suggestPrice = CalculationEngine.calculateSuggestedPrice(costs, params, 35, countryConfig);

        // 计算利润
        const profitData = CalculationEngine.calculateManualProfit(suggestPrice, params, costs, countryConfig);

        // 更新 UI
        document.getElementById('calcPrice').textContent = `$ ${MathUtils.round(suggestPrice, 1)}`;
        document.getElementById('calcProfit').textContent = `￥ ${MathUtils.round(profitData.netProfitCNY, 0)}`;
        document.getElementById('calcTotal').textContent = `$ ${MathUtils.round(suggestPrice * qty, 0)}`;
    },

    // === 6. 聊天记录 ===
    renderChatHistory(client) {
        const container = document.getElementById('chatHistoryContainer');
        container.innerHTML = '';

        // 使用 mock 数据，或者 client.chats
        const chats = client.chats || this.getMockChats(client);

        container.innerHTML += `<div class="text-center py-4"><span class="text-[10px] bg-white/5 px-2 py-1 rounded text-slate-500 font-mono">ENCRYPTED CHAT SESSION</span></div>`;

        chats.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${msg.role === 'me' ? 'me' : 'client'} animate-fade-in`;
            bubble.innerHTML = `
                <div>${msg.text}</div>
                <div class="chat-meta">${msg.time}</div>
            `;
            container.appendChild(bubble);
        });

        setTimeout(() => container.scrollTop = container.scrollHeight, 50);
    },

    // === 7. 历史订单列表 (Real Data) ===
    renderHistory(client) {
        const list = document.getElementById('historyList');
        if (!list) return;

        const cleanPhone = (client.phone || '').replace(/[^\d]/g, '');

        // 从缓存中查找真实订单
        const orders = this.ordersCache.filter(order => {
            const orderPhone = (order.clientPhone || '').replace(/[^\d]/g, '');
            return (cleanPhone && orderPhone.includes(cleanPhone)) ||
                   (client.email && order.clientEmail === client.email);
        });

        if (orders.length === 0) {
            list.innerHTML = `<div class="text-center text-xs text-slate-600 italic py-8 border border-dashed border-white/10 rounded">暂无历史成交</div>`;
            return;
        }

        list.innerHTML = orders.map(o => `
            <div class="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 text-xs mb-2 hover:bg-indigo-600/10 transition cursor-pointer group">
                <div>
                    <div class="flex items-center gap-2">
                         <span class="text-slate-300 font-bold">${o.qty} 幅</span>
                         <span class="text-[9px] px-1.5 rounded bg-slate-700 text-slate-300">${o.status}</span>
                    </div>
                    <span class="text-slate-500 text-[10px]">${o.time ? o.time.split(' ')[0] : '-'}</span>
                </div>
                <div class="text-right">
                    <div class="font-mono font-bold text-emerald-400">$${o.total}</div>
                    <div class="text-[9px] text-slate-500 group-hover:text-indigo-400 transition">View ID: ${o.id.slice(-4)}</div>
                </div>
            </div>
        `).join('');
    },

    // === 8. 辅助功能 ===

    // AI 分析按钮点击
    analyzeChat() {
        if (!this.activeId) return;
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> 正在读取上下文...';
        btn.classList.add('opacity-50', 'cursor-not-allowed');

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');

            const client = this.clients.find(c => c.id === this.activeId);

            // 重新运行分析
            this.renderIntelligence(client);

            showNotification('AI 意图分析已更新', 'success');
        }, 800);
    },

    // 生成回复
    generateReply() {
        const input = document.getElementById('aiInput');
        const text = input.value.trim();
        if (!text) return showNotification('请输入中文意图', 'warning');

        const btn = event.currentTarget;
        btn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Generating...';

        setTimeout(() => {
            btn.innerHTML = '生成地道回复 <i class="fas fa-paper-plane"></i>';
            const client = this.clients.find(c => c.id === this.activeId);

            // 简单的模板替换 (模拟 GPT)
            let reply = `Hi ${client.name.split(' ')[0]},\n\n`;

            if(text.includes('价格') || text.includes('钱')) {
                reply += `Regarding the price, for ${client.aiAnalysis?.params?.qty || 'the'} pieces, we can offer $${document.getElementById('calcPrice').innerText.replace('$','').trim()}/each. This includes the gallery-quality canvas and protective packaging.\n\nLet me know if this fits your budget?`;
            } else if (text.includes('发货') || text.includes('时间')) {
                reply += `For shipping to ${client.country}, we usually use DHL/FedEx. It takes about 5-7 days after the painting is dry.\n\nSince these are hand-painted, we need about 10 days for creation.`;
            } else {
                reply += `Thanks for the info. I've noted that down. We focus on high-quality textures, unlike cheap prints.\n\nIs there a specific deadline you need these by?`;
            }

            input.value = reply;
            // 自动选中
            input.select();
            showNotification('回复已生成，可直接复制', 'success');
        }, 1000);
    },

    // 模态框操作
    openModal(id = null) {
        const modal = document.getElementById('clientModal');
        modal.classList.remove('hidden');

        // Reset inputs
        document.getElementById('editId').value = '';
        document.getElementById('cName').value = '';
        document.getElementById('cPhone').value = '';
        document.getElementById('cEmail').value = '';
        document.getElementById('cTags').value = '';
        document.getElementById('cLevel').value = 'new';
        document.getElementById('cCountry').value = 'USA';

        if (id) {
            const c = this.clients.find(x => x.id === id);
            if (c) {
                document.getElementById('editId').value = c.id;
                document.getElementById('cName').value = c.name;
                document.getElementById('cPhone').value = c.phone || '';
                document.getElementById('cEmail').value = c.email || '';
                document.getElementById('cLevel').value = c.level;
                document.getElementById('cCountry').value = c.country;
                document.getElementById('cTags').value = (c.tags || []).join(', ');
            }
        }
    },

    closeModal() {
        document.getElementById('clientModal').classList.add('hidden');
    },

    saveClient() {
        const id = document.getElementById('editId').value;
        const name = document.getElementById('cName').value;

        if (!name) return alert('姓名必填');

        const clientData = {
            id: id || 'C' + Date.now(),
            name: name,
            level: document.getElementById('cLevel').value,
            phone: document.getElementById('cPhone').value,
            email: document.getElementById('cEmail').value,
            country: document.getElementById('cCountry').value,
            tags: document.getElementById('cTags').value.split(/[,，]/).map(t => t.trim()).filter(t => t),
            lastDate: new Date().toISOString().split('T')[0]
        };

        if (id) {
            const idx = this.clients.findIndex(c => c.id === id);
            if (idx > -1) {
                // 保留旧数据中未被修改的字段 (如 chats, ltv)
                this.clients[idx] = { ...this.clients[idx], ...clientData };
            }
        } else {
            // 新增
            clientData.chats = []; // 初始化空聊天
            clientData.aiAnalysis = { score: 50, signals: ['新录入客户'], params: {} };
            this.clients.unshift(clientData);
        }

        this.saveData();
        this.closeModal();
        this.renderList();

        // 如果是正在编辑的客户，刷新右侧
        if (this.activeId === clientData.id) {
            this.selectClient(clientData.id);
        }
    },

    // 工具函数
    initCountrySelect() {
        const sel = document.getElementById('cCountry');
        if (!sel || typeof CONFIG === 'undefined') return;
        sel.innerHTML = Object.entries(CONFIG.COUNTRIES).map(([k, v]) =>
            `<option value="${k}">${v.flag} ${v.name}</option>`
        ).join('');
    },

    getLocalTime(code) {
        try {
            const zone = CONFIG.COUNTRIES[code].timeZone;
            return new Intl.DateTimeFormat('en-US', {
                timeZone: zone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(new Date());
        } catch(e) { return '00:00'; }
    },

    getLevelClass(level) {
        const map = {
            gold: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
            new: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
            b2b: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
            black: 'text-slate-500 border-slate-600 bg-black'
        };
        return map[level] || 'text-slate-400 border-white/10 bg-white/5';
    },

    bindEvents() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.renderList(e.target.value));
        }

        // 绑定快捷键 Ctrl+Enter 生成回复
        const aiInput = document.getElementById('aiInput');
        if (aiInput) {
            aiInput.addEventListener('keydown', (e) => {
                if((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    this.generateReply();
                }
            });
        }
    },

    // 模拟初始数据 (用于空状态)
    getMockClients() {
        return [
            {
                id: 'C1',
                name: 'Gallery Horizon (Mike)',
                level: 'b2b',
                country: 'USA',
                phone: '12125550199',
                email: 'mike@horizon.art',
                tags: ['批发', '风景画'],
                chats: [
                    { role: 'client', text: 'Hi, do you have a catalog for large landscape oils?', time: 'Yesterday' },
                    { role: 'me', text: 'Sure Mike, sending you the PDF now.', time: 'Yesterday' },
                    { role: 'client', text: 'Thanks. What is the wholesale price for 50 pcs 24x36?', time: '10:30' }
                ]
            },
            {
                id: 'C2',
                name: 'Sarah Jenkins',
                level: 'new',
                country: 'GBR',
                phone: '447700900000',
                email: 'sarah.j@gmail.com',
                tags: ['定制', '肖像'],
                chats: [
                    { role: 'client', text: 'Can you paint my dog from a photo?', time: '09:15' },
                    { role: 'me', text: 'Absolutely! We specialize in pet portraits.', time: '09:20' }
                ]
            }
        ];
    }
};

// 启动 CRM
document.addEventListener('DOMContentLoaded', () => CRM.init());
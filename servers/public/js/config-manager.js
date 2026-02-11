/**
 * config-manager.js
 * 全球市场配置管理模块
 * 职责：CRUD 国家配置、读写 LocalStorage、渲染配置弹窗
 */

const ConfigManager = {
    // 存储键名常量
    STORAGE_KEY: 'dafen_global_countries',

    /**
     * 初始化：系统启动时第一时间调用
     */
    init() {
        this.loadFromStorage();
        console.log('🌍 [ConfigManager] 全球市场配置模块已就绪');
    },

    /**
     * 从本地存储加载配置，并覆盖全局 CONFIG
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved && typeof CONFIG !== 'undefined') {
                const customData = JSON.parse(saved);
                // 深度合并或直接覆盖 (这里选择覆盖 COUNTRIES 节点)
                CONFIG.COUNTRIES = customData;
            }
        } catch (e) {
            console.error('配置加载失败:', e);
        }
    },

    /**
     * 保存当前配置到本地存储
     */
    saveToStorage() {
        if (typeof CONFIG === 'undefined') return;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(CONFIG.COUNTRIES));

        // 通知 UI 更新 (如果有 APP 全局对象)
        if (typeof APP !== 'undefined' && APP.UIManager) {
            APP.UIManager.initCountrySelect(); // 刷新下拉框
            APP.UIManager.calculateAll();      // 刷新计算结果
        }
    },

    /**
     * 打开配置窗口
     */
    openModal() {
        const modal = document.getElementById('configModal');
        if (!modal) return;
        this.renderTable();
        modal.classList.remove('hidden');
    },

    /**
     * 关闭配置窗口
     */
    closeModal() {
        const modal = document.getElementById('configModal');
        if (modal) modal.classList.add('hidden');
    },

    /**
     * 渲染列表 (View)
     */
    renderTable() {
        const tbody = document.getElementById('configTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        Object.entries(CONFIG.COUNTRIES).forEach(([code, data]) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-white/5 border-b border-white/5 transition-colors';
            tr.innerHTML = `
                <td class="py-3 pl-4 font-mono font-bold text-emerald-400">${code}</td>
                <td class="py-3 flex items-center gap-2"><span class="text-lg">${data.flag}</span> ${data.name}</td>
                <td class="py-3 font-mono text-slate-300">${(data.vat * 100).toFixed(1)}%</td>
                <td class="py-3 font-mono text-slate-300">${(data.duty * 100).toFixed(1)}%</td>
                <td class="py-3 text-xs text-slate-500 font-mono">${data.timeZone || '-'}</td>
                <td class="py-3 text-right pr-4">
                    <button onclick="ConfigManager.editItem('${code}')" class="text-indigo-400 hover:text-white mr-3 transition"><i class="fas fa-edit"></i></button>
                    <button onclick="ConfigManager.deleteItem('${code}')" class="text-rose-500 hover:text-white transition"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * 编辑某一项 (把数据填入表单)
     */
    editItem(code) {
        const data = CONFIG.COUNTRIES[code];
        if (!data) return;

        // 填充表单
        this._setVal('cfgCode', code);
        this._setVal('cfgName', data.name);
        this._setVal('cfgVat', data.vat);
        this._setVal('cfgDuty', data.duty);
        this._setVal('cfgZone', data.timeZone || '');
        this._setVal('cfgFlag', data.flag);

        // 锁定代码输入框 (主键不可改)
        const codeInput = document.getElementById('cfgCode');
        codeInput.readOnly = true;
        codeInput.classList.add('opacity-50', 'cursor-not-allowed');
    },

    /**
     * 保存单项 (新增或修改)
     */
    saveItem() {
        const code = this._getVal('cfgCode').toUpperCase().trim();
        if (!code) return alert('请输入国家代码 (如 USA)');

        const newData = {
            name: this._getVal('cfgName'),
            flag: this._getVal('cfgFlag') || '🏳️',
            vat: parseFloat(this._getVal('cfgVat')) || 0,
            duty: parseFloat(this._getVal('cfgDuty')) || 0,
            timeZone: this._getVal('cfgZone'),
            isEU: false // 暂不支持 UI 配置这个，默认 false
        };

        // 更新内存 & 硬盘
        CONFIG.COUNTRIES[code] = newData;
        this.saveToStorage();

        // 刷新界面
        this.renderTable();
        this.clearForm();

        // 简单反馈
        const btn = document.querySelector('#configModal button i.fa-save').parentElement;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check"></i> 已保存`;
        setTimeout(() => btn.innerHTML = originalText, 1000);
    },

    /**
     * 删除某一项
     */
    deleteItem(code) {
        if (confirm(`确定要从配置中删除 [${code}] 吗？`)) {
            delete CONFIG.COUNTRIES[code];
            this.saveToStorage();
            this.renderTable();
        }
    },

    /**
     * 重置为默认
     */
    resetToDefault() {
        if (confirm('确定要丢弃所有自定义修改，恢复到代码默认值吗？')) {
            localStorage.removeItem(this.STORAGE_KEY);
            location.reload();
        }
    },

    /**
     * 清空表单
     */
    clearForm() {
        this._setVal('cfgCode', '');
        this._setVal('cfgName', '');
        this._setVal('cfgVat', '');
        this._setVal('cfgDuty', '');
        this._setVal('cfgZone', '');
        this._setVal('cfgFlag', '');

        const codeInput = document.getElementById('cfgCode');
        codeInput.readOnly = false;
        codeInput.classList.remove('opacity-50', 'cursor-not-allowed');
    },

    // --- 内部辅助函数 ---
    _getVal(id) { return document.getElementById(id).value.trim(); },
    _setVal(id, val) { document.getElementById(id).value = val; }
};
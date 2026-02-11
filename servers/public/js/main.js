/**
 * main.js
 * 功能：应用程序主入口，模块集成和初始化
 * 业务：整合所有模块，启动应用程序，处理全局事件
 */

// 全局应用对象
window.APP = {
    API_BASE: '/api',
    // 配置模块
    CONFIG: CONFIG,
    STORAGE_KEYS: STORAGE_KEYS,

    // 工具模块
    MathUtils: MathUtils,

    // 管理模块
    StateManager: StateManager,
    CalculationEngine: CalculationEngine,
    OrderManager: OrderManager,
    PaymentManager: PaymentManager,
    UIManager: CalculationManager,

    // 状态常量
    ORDER_STATUS: CONFIG.ORDER_STATUS,
    PAYMENT_TYPES: CONFIG.PAYMENT_TYPES,
    SHIPPING_STATUS: CONFIG.SHIPPING_STATUS,
    PAYMENT_STATUS: CONFIG.PAYMENT_STATUS,
    BUSINESS_MODES: CONFIG.BUSINESS_MODES
};

// 全局工具函数
/**
 * 安全执行函数，防止错误中断应用
 * @param {Function} fn - 要执行的函数
 * @param {string} context - 上下文描述
 * @param {any} defaultValue - 出错时的默认返回值
 * @returns {any} 函数执行结果或默认值
 */
function safeExecute(fn, context = '未知操作', defaultValue = null) {
    try {
        return fn();
    } catch (error) {
        console.error(`${context}执行失败:`, error);
        return defaultValue;
    }
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制(毫秒)
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * 验证表单数据
 * @param {Object} data - 表单数据
 * @param {Array} requiredFields - 必填字段
 * @returns {Object} 验证结果
 */
function validateFormData(data, requiredFields = []) {
    const errors = {};
    let isValid = true;

    // 检查必填字段
    requiredFields.forEach(field => {
        if (!data[field] || String(data[field]).trim() === '') {
            errors[field] = `请填写${field}`;
            isValid = false;
        }
    });

    // 验证数字字段
    if (data.price !== undefined && (isNaN(data.price) || data.price <= 0)) {
        errors.price = '请输入有效的价格';
        isValid = false;
    }

    if (data.qty !== undefined && (isNaN(data.qty) || data.qty <= 0)) {
        errors.qty = '请输入有效的数量';
        isValid = false;
    }

    if (data.actualDeposit !== undefined && isNaN(data.actualDeposit)) {
        errors.actualDeposit = '请输入有效的定金金额';
        isValid = false;
    }

    return {isValid, errors};
}

/**
 * 格式化日期时间
 * @param {Date|string} date - 日期
 * @param {string} format - 格式
 * @returns {string} 格式化后的日期字符串
 */
function formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = date instanceof Date ? date : new Date(date);

    if (isNaN(d.getTime())) {
        return '无效日期';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 获取URL参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 设置URL参数
 * @param {string} name - 参数名
 * @param {string} value - 参数值
 */
function setUrlParameter(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('复制失败:', error);

        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

/**
 * 下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} type - MIME类型
 */
function downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * 显示加载指示器
 * @param {boolean} show - 是否显示
 * @param {string} message - 加载消息
 */
function showLoading(show = true, message = '加载中...') {
    let loader = document.getElementById('global-loader');

    if (!loader && show) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        loader.innerHTML = `
            <div class="bg-slate-800 rounded-lg p-6 flex flex-col items-center">
                <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-slate-300">${message}</p>
            </div>
        `;
        document.body.appendChild(loader);
    } else if (loader && !show) {
        document.body.removeChild(loader);
    }
}

/**
 * 显示通知消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型：success, error, warning, info
 * @param {number} duration - 显示时间(毫秒)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // 移除现有通知
    const existing = document.querySelector('.global-notification');
    if (existing) {
        existing.remove();
    }

    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `global-notification fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in ${getNotificationClass(type)}`;
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="${getNotificationIcon(type)} text-lg"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // 自动隐藏
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.add('animate-fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    return notification;
}

/**
 * 获取通知CSS类
 * @param {string} type - 通知类型
 * @returns {string} CSS类
 */
function getNotificationClass(type) {
    const classes = {
        success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        error: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
        warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        info: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    };
    return classes[type] || classes.info;
}

/**
 * 获取通知图标
 * @param {string} type - 通知类型
 * @returns {string} 图标类
 */
function getNotificationIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

/**
 * 确认对话框
 * @param {string} message - 消息内容
 * @param {string} title - 标题
 * @returns {Promise<boolean>} 用户是否确认
 */
function confirmDialog(message, title = '确认操作') {
    return new Promise((resolve) => {
        Swal.fire({
            title: title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            background: '#1e293b',
            color: '#f1f5f9',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#64748b'
        }).then((result) => {
            resolve(result.isConfirmed);
        });
    });
}

/**
 * 输入对话框
 * @param {string} message - 消息内容
 * @param {string} defaultValue - 默认值
 * @param {string} title - 标题
 * @returns {Promise<string|null>} 用户输入的值或null
 */
function inputDialog(message, defaultValue = '', title = '请输入') {
    return new Promise((resolve) => {
        Swal.fire({
            title: title,
            text: message,
            input: 'text',
            inputValue: defaultValue,
            showCancelButton: true,
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            background: '#1e293b',
            color: '#f1f5f9',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#64748b',
            inputValidator: (value) => {
                if (!value) {
                    return '请输入内容';
                }
                return null;
            }
        }).then((result) => {
            resolve(result.isConfirmed ? result.value : null);
        });
    });
}

// 全局事件处理
/**
 * 注册全局事件监听器
 */
function registerGlobalEvents() {
    // 窗口大小变化时重新计算布局
    window.addEventListener('resize', debounce(() => {
        if (StateManager.chart) {
            StateManager.chart.resize();
        }
        if (StateManager.statusChart) {
            StateManager.statusChart.resize();
        }
    }, 250));

    // 页面可见性变化时保存数据
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            StateManager.saveAllData();
        }
    });

    // 页面卸载前保存数据
    window.addEventListener('beforeunload', () => {
        StateManager.saveAllData();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // Ctrl+S 保存
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            StateManager.saveAllData();
            showNotification('数据已保存', 'success');
        }

        // Ctrl+E 导出
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            APP.UIManager.exportCSV();
        }

        // Ctrl+N 新建订单
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            APP.UIManager.showDealModal();
        }

        // Esc 关闭模态框
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal-overlay.active');
            modals.forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });

    // 主题切换按钮
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => APP.UIManager.toggleTheme());
    }
}

/**
 * 初始化应用程序
 */
function initApplication() {
    console.log('正在初始化大芬油画外贸利润精算系统...');

    // 显示加载指示器
    showLoading(true, '正在初始化系统...');

    try {
        if (typeof ConfigManager !== 'undefined') ConfigManager.init();

        // 1. 初始化UI管理器
        APP.UIManager.init();

        // 2. 注册全局事件
        registerGlobalEvents();

        // 3. 更新版本信息
        updateVersionInfo();

        // 4. 检查更新
        checkForUpdates();

        // 5. 恢复上次会话
        restoreLastSession();

        console.log('系统初始化完成');
        showNotification('系统初始化完成', 'success');

    } catch (error) {
        console.error('应用程序初始化失败:', error);
        showNotification('系统初始化失败，请刷新页面重试', 'error');

        // 显示错误详情
        setTimeout(() => {
            Swal.fire({
                title: '初始化失败',
                text: '应用程序初始化过程中发生错误，建议刷新页面重试。',
                icon: 'error',
                confirmButtonText: '刷新页面',
                background: '#1e293b',
                color: '#f1f5f9'
            }).then(() => {
                window.location.reload();
            });
        }, 1000);

    } finally {
        // 隐藏加载指示器
        setTimeout(() => showLoading(false), 500);
    }
}

/**
 * 更新版本信息
 */
function updateVersionInfo() {
    const versionInfo = document.getElementById('versionInfo');
    if (versionInfo) {
        versionInfo.textContent = `v1.0.${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
    }
}

/**
 * 检查更新
 */
function checkForUpdates() {
    // 这里可以添加检查更新的逻辑
    // 例如：从服务器获取最新版本信息
    const currentVersion = '1.0.0';

    // 模拟检查更新
    setTimeout(() => {
        const lastCheck = localStorage.getItem('last_update_check');
        const now = Date.now();

        // 每天只检查一次
        if (!lastCheck || (now - parseInt(lastCheck)) > 24 * 60 * 60 * 1000) {
            localStorage.setItem('last_update_check', now.toString());

            // 这里可以发起实际的更新检查请求
            console.log('检查更新...');
        }
    }, 5000);
}

/**
 * 恢复上次会话
 */
function restoreLastSession() {
    // 恢复滚动位置
    const scrollY = localStorage.getItem('scroll_position');
    if (scrollY) {
        setTimeout(() => {
            window.scrollTo(0, parseInt(scrollY));
            localStorage.removeItem('scroll_position');
        }, 100);
    }

    // 保存滚动位置
    window.addEventListener('scroll', throttle(() => {
        localStorage.setItem('scroll_position', window.scrollY.toString());
    }, 1000));
}

/**
 * 导出应用程序数据
 * @returns {Object} 应用程序数据
 */
function exportAppData() {
    return {
        config: CONFIG,
        state: {
            orders: StateManager.orders,
            userModifiedSizes: StateManager.userModifiedSizes,
            inputs: StateManager.getAllValues()
        },
        meta: {
            exportTime: new Date().toISOString(),
            version: '1.0.0',
            totalOrders: StateManager.orders.length,
            totalProfit: StateManager.getOrderStats().completedProfit
        }
    };
}

/**
 * 导入应用程序数据
 * @param {Object} data - 应用程序数据
 * @returns {boolean} 是否导入成功
 */
function importAppData(data) {
    if (!data || !data.state || !data.meta) {
        showNotification('导入失败：数据格式错误', 'error');
        return false;
    }

    try {
        // 备份当前数据
        const backup = exportAppData();
        localStorage.setItem('app_data_backup', JSON.stringify(backup));

        // 导入订单数据
        if (data.state.orders && Array.isArray(data.state.orders)) {
            StateManager.orders = data.state.orders;
        }

        // 导入尺寸修改记录
        if (data.state.userModifiedSizes) {
            StateManager.userModifiedSizes = data.state.userModifiedSizes;
        }

        // 导入输入值
        if (data.state.inputs) {
            Object.entries(data.state.inputs).forEach(([key, value]) => {
                const element = StateManager.inputs[key];
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            });
        }

        // 保存数据
        StateManager.saveAllData();

        // 刷新界面
        APP.UIManager.renderAll();
        APP.UIManager.calculateAll();

        showNotification('数据导入成功', 'success');
        return true;

    } catch (error) {
        console.error('导入数据失败:', error);

        // 尝试恢复备份
        try {
            const backup = localStorage.getItem('app_data_backup');
            if (backup) {
                const backupData = JSON.parse(backup);
                importAppData(backupData);
            }
        } catch (e) {
            console.error('恢复备份失败:', e);
        }

        showNotification('数据导入失败', 'error');
        return false;
    }
}

/**
 * 备份应用程序数据
 */
function backupAppData() {
    const data = exportAppData();
    const filename = `大芬油画系统备份_${formatDateTime(new Date(), 'YYYYMMDD_HHmmss')}.json`;

    downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
    showNotification('数据备份已下载', 'success');
}

/**
 * 从备份恢复数据
 */
function restoreFromBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                Swal.fire({
                    title: '确认恢复',
                    text: '这将覆盖当前所有数据，是否继续？',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: '恢复',
                    cancelButtonText: '取消',
                    background: '#1e293b',
                    color: '#f1f5f9'
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (importAppData(data)) {
                            showNotification('数据恢复成功', 'success');
                        }
                    }
                });

            } catch (error) {
                console.error('解析备份文件失败:', error);
                showNotification('备份文件格式错误', 'error');
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

/**
 * 重置应用程序
 */
function resetApplication() {
    Swal.fire({
        title: '重置系统',
        text: '这将清除所有数据并重置系统，是否继续？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '重置',
        cancelButtonText: '取消',
        background: '#1e293b',
        color: '#f1f5f9',
        confirmButtonColor: '#ef4444'
    }).then((result) => {
        if (result.isConfirmed) {
            // 备份当前数据
            const backup = exportAppData();
            localStorage.setItem('app_data_backup_reset', JSON.stringify(backup));

            // 清除所有数据
            localStorage.clear();

            // 重新加载页面
            window.location.reload();
        }
    });
}

/**
 * 获取系统统计信息
 * @returns {Object} 系统统计信息
 */
function getSystemStats() {
    const stats = StateManager.getOrderStats();
    const financialData = APP.UIManager.getCurrentFinancialData();

    return {
        // 订单统计
        orders: {
            total: stats.total,
            byStatus: {
                completed: stats.completed,
                shippedUnpaid: stats.shippedUnpaid,
                unshippedPaid: stats.unshippedPaid,
                preorder: stats.preorder,
                cancelled: stats.cancelled
            },
            byAmount: {
                total: stats.completedAmount + stats.shippedUnpaidAmount +
                    stats.unshippedPaidAmount + stats.preorderAmount,
                completed: stats.completedAmount,
                shippedUnpaid: stats.shippedUnpaidAmount,
                unshippedPaid: stats.unshippedPaidAmount,
                preorder: stats.preorderAmount
            }
        },

        // 财务统计
        financial: financialData ? {
            totalRevenue: financialData.totalRevenueCNY,
            totalCost: financialData.totalCost,
            totalProfit: financialData.finalProfit,
            profitMargin: financialData.finalProfitPct
        } : null,

        // 系统信息
        system: {
            version: '1.0.0',
            lastSave: localStorage.getItem('last_save_time') || '从未保存',
            storageUsage: JSON.stringify(localStorage).length,
            chartCount: (StateManager.chart ? 1 : 0) + (StateManager.statusChart ? 1 : 0)
        }
    };
}

/**
 * 打印报表
 * @param {string} type - 报表类型：orders, financial, summary
 */
function printReport(type = 'summary') {
    const stats = getSystemStats();
    let content = '';

    switch (type) {
        case 'orders':
            content = this.generateOrderReport(stats);
            break;
        case 'financial':
            content = this.generateFinancialReport(stats);
            break;
        default:
            content = this.generateSummaryReport(stats);
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>大芬油画报表 - ${formatDateTime(new Date(), 'YYYY年MM月DD日')}</title>
                <style>
                    body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
                    h1, h2 { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; }
                    .total { font-weight: bold; background-color: #f0f0f0; }
                    @media print {
                        .no-print { display: none; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <h1>大芬油画外贸利润精算系统报表</h1>
                <p>生成时间：${formatDateTime(new Date(), 'YYYY年MM月DD日 HH:mm:ss')}</p>
                ${content}
                <div class="no-print" style="margin-top: 20px;">
                    <button onclick="window.print()">打印</button>
                    <button onclick="window.close()">关闭</button>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
}

/**
 * 生成订单报表
 * @param {Object} stats - 统计信息
 * @returns {string} HTML内容
 */
function generateOrderReport(stats) {
    let html = '<h2>订单统计报表</h2>';

    html += '<table>';
    html += '<tr><th>状态</th><th>订单数</th><th>金额(USD)</th><th>占比</th></tr>';

    const totalAmount = stats.orders.byAmount.total;

    Object.entries(stats.orders.byStatus).forEach(([status, count]) => {
        const amount = stats.orders.byAmount[status] || 0;
        const percentage = totalAmount > 0 ? MathUtils.round((amount / totalAmount) * 100, 1) : 0;

        html += `<tr>
            <td>${getStatusName(status)}</td>
            <td>${count}</td>
            <td>$${MathUtils.formatNumber(amount)}</td>
            <td>${percentage}%</td>
        </tr>`;
    });

    html += `<tr class="total">
        <td>总计</td>
        <td>${stats.orders.total}</td>
        <td>$${MathUtils.formatNumber(totalAmount)}</td>
        <td>100%</td>
    </tr>`;
    html += '</table>';

    return html;
}

/**
 * 获取状态名称
 * @param {string} status - 状态代码
 * @returns {string} 状态名称
 */
function getStatusName(status) {
    const names = {
        completed: '已完成',
        shipped_unpaid: '已发货待收款',
        unshipped_paid: '待发货已收款',
        preorder: '预订单',
        cancelled: '已取消'
    };
    return names[status] || status;
}

/**
 * 生成财务报表
 * @param {Object} stats - 统计信息
 * @returns {string} HTML内容
 */
function generateFinancialReport(stats) {
    if (!stats.financial) {
        return '<p>暂无财务数据</p>';
    }

    const {financial} = stats;

    let html = '<h2>财务统计报表</h2>';
    html += '<table>';
    html += '<tr><th>项目</th><th>金额(CNY)</th><th>占比</th></tr>';
    html += `<tr><td>总营收</td><td>${MathUtils.formatCurrency(financial.totalRevenue, '￥', 0)}</td><td>100%</td></tr>`;
    html += `<tr><td>总成本</td><td>${MathUtils.formatCurrency(financial.totalCost, '￥', 0)}</td><td>${MathUtils.round((financial.totalCost / financial.totalRevenue) * 100, 1)}%</td></tr>`;
    html += `<tr class="total"><td>净利润</td><td>${MathUtils.formatCurrency(financial.totalProfit, '￥', 0)}</td><td>${financial.profitMargin}%</td></tr>`;
    html += '</table>';

    return html;
}

/**
 * 生成摘要报表
 * @param {Object} stats - 统计信息
 * @returns {string} HTML内容
 */
function generateSummaryReport(stats) {
    let html = '<h2>系统摘要报表</h2>';

    html += '<h3>订单概览</h3>';
    html += `<p>总订单数：${stats.orders.total}</p>`;
    html += `<p>总成交金额：$${MathUtils.formatNumber(stats.orders.byAmount.total)}</p>`;

    if (stats.financial) {
        html += '<h3>财务概览</h3>';
        html += `<p>总营收：${MathUtils.formatCurrency(stats.financial.totalRevenue, '￥', 0)}</p>`;
        html += `<p>净利润：${MathUtils.formatCurrency(stats.financial.totalProfit, '￥', 0)}</p>`;
        html += `<p>利润率：${stats.financial.profitMargin}%</p>`;
    }

    html += '<h3>系统信息</h3>';
    html += `<p>版本：${stats.system.version}</p>`;
    html += `<p>最后保存：${stats.system.lastSave}</p>`;
    html += `<p>数据大小：${MathUtils.formatFileSize(stats.system.storageUsage)}</p>`;

    return html;
}

/**
 * 显示关于对话框
 */
function showAboutDialog() {
    Swal.fire({
        title: '关于大芬油画外贸利润精算系统',
        html: `
            <div class="text-left space-y-3">
                <div>
                    <p class="font-bold text-slate-300">版本信息</p>
                    <p class="text-sm text-slate-400">版本：v1.0.0</p>
                    <p class="text-sm text-slate-400">构建日期：2024年</p>
                </div>
                
                <div>
                    <p class="font-bold text-slate-300">功能特性</p>
                    <ul class="text-sm text-slate-400 list-disc pl-4">
                        <li>实时成本利润计算</li>
                        <li>多国家税率支持</li>
                        <li>智能报价建议</li>
                        <li>订单全生命周期管理</li>
                        <li>财务对账分析</li>
                        <li>数据导入导出</li>
                    </ul>
                </div>
                
                <div>
                    <p class="font-bold text-slate-300">技术支持</p>
                    <p class="text-sm text-slate-400">如有问题或建议，请联系技术支持</p>
                </div>
            </div>
        `,
        width: 500,
        confirmButtonText: '确定',
        background: '#1e293b',
        color: '#f1f5f9'
    });
}

/**
 * 显示帮助文档
 */
function showHelpDocument() {
    Swal.fire({
        title: '使用帮助',
        html: `
            <div class="text-left space-y-4 max-h-96 overflow-y-auto">
                <div>
                    <h4 class="font-bold text-slate-300 mb-2">快速开始</h4>
                    <p class="text-sm text-slate-400 mb-2">1. 在左侧面板配置基础参数</p>
                    <p class="text-sm text-slate-400 mb-2">2. 在报价器中设置期望利润率</p>
                    <p class="text-sm text-slate-400 mb-2">3. 点击"成交录入"保存订单</p>
                    <p class="text-sm text-slate-400">4. 在财务面板查看对账结果</p>
                </div>
                
                <div>
                    <h4 class="font-bold text-slate-300 mb-2">功能介绍</h4>
                    <div class="space-y-2">
                        <div>
                            <p class="text-sm font-medium text-slate-300">实时报价器</p>
                            <p class="text-xs text-slate-400">根据成本、税率和利润率计算建议价格</p>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-slate-300">定金红线</p>
                            <p class="text-xs text-slate-400">分析定金是否覆盖实际成本，避免风险</p>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-slate-300">订单管理</p>
                            <p class="text-xs text-slate-400">记录、跟踪和管理所有成交订单</p>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-slate-300">财务对账</p>
                            <p class="text-xs text-slate-400">月末财务核算和现金流分析</p>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="font-bold text-slate-300 mb-2">快捷键</h4>
                    <ul class="text-sm text-slate-400 list-disc pl-4">
                        <li>Ctrl+S：保存数据</li>
                        <li>Ctrl+E：导出数据</li>
                        <li>Ctrl+N：新建订单</li>
                        <li>Esc：关闭弹窗</li>
                    </ul>
                </div>
            </div>
        `,
        width: 600,
        showConfirmButton: false,
        showCloseButton: true,
        background: '#1e293b',
        color: '#f1f5f9'
    });
}

/**
 * 添加开发者工具
 */
function addDeveloperTools() {
    // 只在开发环境中添加
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('开发者工具已启用');

        // 添加调试面板
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.className = 'fixed bottom-4 right-4 bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-xs font-mono z-40';
        debugPanel.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <span class="text-slate-300">调试面板</span>
                <button onclick="toggleDebugPanel()" class="text-slate-400 hover:text-slate-300">×</button>
            </div>
            <div class="space-y-1">
                <button onclick="APP.UIManager.calculateAll()" class="block w-full text-left px-2 py-1 hover:bg-slate-700/50 rounded">重新计算</button>
                <button onclick="console.log(APP.StateManager.getAllValues())" class="block w-full text-left px-2 py-1 hover:bg-slate-700/50 rounded">查看状态</button>
                <button onclick="console.log(APP.StateManager.orders)" class="block w-full text-left px-2 py-1 hover:bg-slate-700/50 rounded">查看订单</button>
                <button onclick="APP.StateManager.saveAllData(); showNotification('数据已保存', 'success')" class="block w-full text-left px-2 py-1 hover:bg-slate-700/50 rounded">保存数据</button>
            </div>
        `;

        document.body.appendChild(debugPanel);

        // 添加调试函数
        window.toggleDebugPanel = function () {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        };
    }
}

/**
 * 页面加载完成后初始化
 */
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始初始化应用...');

    // 添加开发者工具
    addDeveloperTools();

    // 延迟初始化，确保所有资源加载完成
    setTimeout(() => {
        initApplication();
    }, 100);
});

/**
 * 页面完全加载完成后执行
 */
window.addEventListener('load', () => {
    console.log('页面加载完成');

    // 添加加载完成动画
    document.body.classList.add('loaded');

    // 显示欢迎消息
    setTimeout(() => {
        const firstVisit = !localStorage.getItem('first_visit_time');
        if (firstVisit) {
            localStorage.setItem('first_visit_time', new Date().toISOString());
            showNotification('欢迎使用大芬油画外贸利润精算系统！', 'success', 5000);
        }
    }, 1000);
});

/**
 * 页面卸载前保存数据
 */
window.addEventListener('beforeunload', (e) => {
    // 如果数据未保存，提示用户
    const hasUnsavedChanges = localStorage.getItem('has_unsaved_changes') === 'true';

    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
        return e.returnValue;
    }
});

/**
 * 全局错误处理
 */
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);

    // 显示友好的错误提示
    if (!event.message.includes('ResizeObserver')) { // 忽略常见的无害错误
        showNotification('应用程序发生错误，部分功能可能不可用', 'error', 5000);
    }
});

/**
 * 未处理的Promise拒绝
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);

    // 显示友好的错误提示
    showNotification('异步操作失败，请重试', 'error', 3000);
});

// 导出全局函数
window.safeExecute = safeExecute;
window.debounce = debounce;
window.throttle = throttle;
window.validateFormData = validateFormData;
window.formatDateTime = formatDateTime;
window.getUrlParameter = getUrlParameter;
window.setUrlParameter = setUrlParameter;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.showLoading = showLoading;
window.showNotification = showNotification;
window.confirmDialog = confirmDialog;
window.inputDialog = inputDialog;
window.exportAppData = exportAppData;
window.importAppData = importAppData;
window.backupAppData = backupAppData;
window.restoreFromBackup = restoreFromBackup;
window.resetApplication = resetApplication;
window.getSystemStats = getSystemStats;
window.printReport = printReport;
window.showAboutDialog = showAboutDialog;
window.showHelpDocument = showHelpDocument;
window.generateOrderReport = generateOrderReport;
window.generateFinancialReport = generateFinancialReport;
window.generateSummaryReport = generateSummaryReport;

// 为APP对象添加工具函数
APP.utils = {
    safeExecute,
    debounce,
    throttle,
    validateFormData,
    formatDateTime,
    getUrlParameter,
    setUrlParameter,
    copyToClipboard,
    downloadFile,
    showLoading,
    showNotification,
    confirmDialog,
    inputDialog
};

// 为APP对象添加数据管理函数
APP.data = {
    exportAppData,
    importAppData,
    backupAppData,
    restoreFromBackup,
    resetApplication,
    getSystemStats
};

// 为APP对象添加报表函数
APP.report = {
    printReport,
    generateOrderReport,
    generateFinancialReport,
    generateSummaryReport
};

// 为APP对象添加帮助函数
APP.help = {
    showAboutDialog,
    showHelpDocument
};

console.log('主模块加载完成');
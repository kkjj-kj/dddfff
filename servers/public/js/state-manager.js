/**
 * state-manager.js
 * 功能：全局状态管理
 * 业务：管理输入值、显示元素、订单数据等全局状态
 */

/**
 * 定义输入框的结构，解决 IDE 无法解析变量的问题
 * @typedef {Object} AppInputs
 * @property {HTMLInputElement} exRate - 汇率输入
 * @property {HTMLSelectElement} sizePreset - 尺寸预设
 * @property {HTMLInputElement} baseCost - 单幅进价
 * @property {HTMLInputElement} weight - 均重
 * @property {HTMLInputElement} dealQty - 订单数量
 * @property {HTMLInputElement} dealPrice - 成交单价
 * @property {HTMLInputElement} actualDeposit - 实收定金
 * @property {HTMLInputElement} manualUSD - 手动报价
 * @property {HTMLElement} dealModal - 成交模态框
 * @property {HTMLElement} statsModal - 统计模态框
 * @property {HTMLInputElement} depPercentSlider - 定金滑块
 * @property {HTMLInputElement} quoteCountry - 国家选择
 * @property {HTMLInputElement} shipRate - 国际运费费率
 * @property {HTMLInputElement} packCost - 包装杂费
 * @property {HTMLInputElement} domesticShipping - 国内快递费
 * @property {HTMLInputElement} feeRate - 支付手续费率
 * @property {HTMLInputElement} lossRate - 结汇损失率
 * @property {HTMLInputElement} commissionRate - 业务提成率
 * @property {HTMLInputElement} declareRate - 报关比例
 * @property {HTMLInputElement} salary - 员工工资
 * @property {HTMLInputElement} rent - 房租水电
 * @property {HTMLInputElement} targetProfit - 目标利润
 * @property {HTMLInputElement} quoteQty - 报价数量
 * @property {HTMLInputElement} expMargin - 期望利润率
 * @property {HTMLInputElement} actDeductions - 代扣费用
 * @property {HTMLInputElement} actAd - 广告支出
 * @property {HTMLInputElement} insuranceRate - [新增] CIP保险费率
 * @property {HTMLInputElement} insuranceMarkup - [新增] 投保加成比例
 */
// 全局状态管理器
const StateManager = {
    // 存储所有输入元素
    /** @type {AppInputs} */
    inputs: {},

    // 存储所有显示元素
    displays: {},

    // 用户修改的尺寸配置
    userModifiedSizes: {},

    // 订单数据
    orders: [],

    // 图表实例
    chart: null,
    statusChart: null,

    // 当前模式
    currentMode: CONFIG.BUSINESS_MODES.STANDARD,

    // 订单统计缓存
    orderStatsCache: null,

    /**
     * 获取所有输入值
     * @returns {Object} 所有输入值的键值对
     */
    getAllValues() {
        const values = {};

        for (const [id, element] of Object.entries(this.inputs)) {
            if (!element) continue;

            if (element.type === 'checkbox') {
                values[id] = element.checked;
            } else if (element.type === 'select-one') {
                values[id] = element.value || 'USA';
            } else {
                const val = element.value;
                if (val === '' || val === null || val === undefined) {
                    values[id] = null;
                } else {
                    const parsed = parseFloat(val);
                    values[id] = isNaN(parsed) ? val : parsed;
                }
            }
        }

        return values;
    },

    /**
     * 更新输入值
     * @param {string} id - 元素ID
     * @param {any} value - 新值
     */
    updateValue(id, value) {
        if (this.inputs[id]) {
            this.inputs[id].value = value;
        }
    },

    /**
     * 注册所有输入和显示元素
     */
    registerElements() {
        // 注册输入元素
        document.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.id) {
                this.inputs[element.id] = element;
            }
        });

        // 注册模态框
        const dealModal = document.getElementById('dealModal');
        if (dealModal) this.inputs.dealModal = dealModal;

        const statsModal = document.getElementById('statsModal');
        if (statsModal) this.inputs.statsModal = statsModal;

        // 注册显示元素
        document.querySelectorAll('[id]').forEach(element => {
            if (!this.inputs[element.id] && element.id && this.isDisplayElement(element)) {
                this.displays[element.id] = element;
            }
        });
    },

    /**
     * 判断是否为显示元素
     * @param {HTMLElement} element - HTML元素
     * @returns {boolean} 是否为显示元素
     */
    isDisplayElement(element) {
        const displayTags = ['SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'TD', 'TH'];
        return displayTags.includes(element.tagName);
    },

    /**
     * 获取显示元素
     * @param {string} id - 元素ID
     * @returns {HTMLElement|null} 显示元素
     */
    getDisplay(id) {
        return this.displays[id] || document.getElementById(id);
    },

    /**
     * 更新显示内容
     * @param {string} id - 元素ID
     * @param {string} content - 显示内容
     * @param {string} className - 可选CSS类名
     */
    updateDisplay(id, content, className = null) {
        const element = this.getDisplay(id);
        if (element) {
            element.textContent = content;
            if (className !== null) {
                element.className = className;
            }
        }
    },

    /**
     * 初始化订单状态
     */
    initOrderStatus() {
        // 确保所有订单都有必要的状态字段
        this.orders = this.orders.map(order => ({
            // 基础信息
            id: order.id || MathUtils.generateId('DA'),
            time: order.time || new Date().toLocaleString('zh-CN'),
            clientName: order.clientName || '',
            clientPhone: order.clientPhone || '',
            clientEmail: order.clientEmail || '',
            qty: MathUtils.safeParse(order.qty, 1),
            price: MathUtils.safeParse(order.price, 0),
            total: MathUtils.safeParse(order.total, 0),
            notes: order.notes || '',

            // 状态信息
            status: order.status || CONFIG.ORDER_STATUS.PREORDER,
            paymentStatus: order.paymentStatus || CONFIG.PAYMENT_STATUS.UNPAID,
            shippingStatus: order.shippingStatus || CONFIG.SHIPPING_STATUS.UNSHIPPED,

            // 收款信息
            totalReceived: MathUtils.safeParse(order.totalReceived, 0),
            paymentRecords: order.paymentRecords || [],
            actualDeposit: MathUtils.safeParse(order.actualDeposit, 0),

            // 配置快照
            configSnapshot: order.configSnapshot || {},

            // 时间戳
            createdAt: order.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),

            // 计算利润
            profit: order.profit || 0
        }));

        this.saveOrders();
    },

    /**
     * 保存订单数据到本地存储
     */
    saveOrders() {
        try {
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
        } catch (error) {
            console.warn('保存订单失败:', error);
        }
    },

    /**
     * 加载订单数据从本地存储
     */
    loadOrders() {
        try {
            const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
            if (savedOrders) {
                this.orders = JSON.parse(savedOrders);
                this.initOrderStatus(); // 确保状态正确
            }
        } catch (error) {
            console.warn('加载订单失败:', error);
        }
    },

    /**
     * 保存所有应用数据
     */
    saveAllData() {
        const data = {
            values: this.getAllValues(),
            userModifiedSizes: this.userModifiedSizes,
            orders: this.orders
        };

        try {
            localStorage.setItem(STORAGE_KEYS.APP_DATA, JSON.stringify(data));
        } catch (error) {
            console.warn('保存数据失败:', error);
        }
    },

    /**
     * 加载所有应用数据
     */
    loadAllData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.APP_DATA);
            if (saved) {
                const data = JSON.parse(saved);

                // 加载修改的尺寸
                if (data.userModifiedSizes) {
                    this.userModifiedSizes = data.userModifiedSizes;
                }

                // 加载订单
                if (data.orders) {
                    this.orders = data.orders;
                }

                // 加载输入值
                if (data.values) {
                    Object.entries(data.values).forEach(([id, value]) => {
                        const element = this.inputs[id];
                        if (element) {
                            if (element.type === 'checkbox') {
                                element.checked = value;
                            } else {
                                element.value = value !== null ? value : '';
                            }
                        }
                    });
                }
            }

            // 独立加载订单数据（兼容旧版本）
            this.loadOrders();
        } catch (error) {
            console.warn('加载数据失败:', error);
        }
    },

    /**
     * 清空所有数据
     */
    clearAllData() {
        if (confirm('确定要清空所有数据吗？此操作不可撤销。')) {
            this.orders = [];
            this.userModifiedSizes = {};

            // 重置输入值到默认值
            Object.entries(CONFIG.DEFAULTS).forEach(([key, defaultValue]) => {
                const element = this.inputs[key];
                if (element) {
                    element.value = defaultValue;
                }
            });

            // 重置其他输入
            const resetInputs = ['clientName', 'clientPhone', 'clientEmail', 'dealNotes', 'actualDeposit'];
            resetInputs.forEach(id => {
                if (this.inputs[id]) {
                    this.inputs[id].value = '';
                }
            });

            this.saveAllData();
            return true;
        }
        return false;
    },

    /**
     * 获取订单统计（带缓存）
     * @returns {Object} 订单统计数据
     */
    getOrderStats() {
        // 如果缓存有效，直接返回
        if (this.orderStatsCache && this.orderStatsCache.timestamp > Date.now() - 1000) {
            return this.orderStatsCache.data;
        }

        const stats = {
            total: 0,
            completed: 0,
            shippedUnpaid: 0,
            unshippedPaid: 0,
            preorder: 0,
            cancelled: 0,

            // 金额统计
            completedAmount: 0,
            shippedUnpaidAmount: 0,
            unshippedPaidAmount: 0,
            preorderAmount: 0,
            cancelledAmount: 0,

            // 数量统计
            completedQty: 0,
            shippedUnpaidQty: 0,
            unshippedPaidQty: 0,
            preorderQty: 0,
            cancelledQty: 0,

            // 利润统计
            completedProfit: 0,
            shippedUnpaidProfit: 0,
            unshippedPaidProfit: 0,
            preorderProfit: 0,
            cancelledProfit: 0
        };

        this.orders.forEach(order => {
            const amount = order.total || 0;
            const qty = order.qty || 0;
            const profit = order.profit || 0;

            stats.total++;

            switch (order.status) {
                case CONFIG.ORDER_STATUS.COMPLETED:
                    stats.completed++;
                    stats.completedAmount += amount;
                    stats.completedQty += qty;
                    stats.completedProfit += profit;
                    break;

                case CONFIG.ORDER_STATUS.SHIPPED_UNPAID:
                    stats.shippedUnpaid++;
                    stats.shippedUnpaidAmount += amount;
                    stats.shippedUnpaidQty += qty;
                    stats.shippedUnpaidProfit += profit;
                    break;

                case CONFIG.ORDER_STATUS.UNSHIPPED_PAID:
                    stats.unshippedPaid++;
                    stats.unshippedPaidAmount += amount;
                    stats.unshippedPaidQty += qty;
                    stats.unshippedPaidProfit += profit;
                    break;

                case CONFIG.ORDER_STATUS.PREORDER:
                    stats.preorder++;
                    stats.preorderAmount += amount;
                    stats.preorderQty += qty;
                    stats.preorderProfit += profit;
                    break;

                case CONFIG.ORDER_STATUS.CANCELLED:
                    stats.cancelled++;
                    stats.cancelledAmount += amount;
                    stats.cancelledQty += qty;
                    stats.cancelledProfit += profit;
                    break;
            }
        });

        // 更新缓存
        this.orderStatsCache = {
            data: stats,
            timestamp: Date.now()
        };

        return stats;
    },

    /**
     * 获取当前业务模式
     * @returns {string} 业务模式
     */
    getCurrentMode() {
        const values = this.getAllValues();
        if (values.isFOB) return CONFIG.BUSINESS_MODES.FOB;
        if (values.isCIP) return 'cip'; // 【新增】
        if (values.isTax) return CONFIG.BUSINESS_MODES.DDP;
        return CONFIG.BUSINESS_MODES.STANDARD;
    },

    /**
     * 获取当前选中的国家
     * @returns {Object} 国家配置
     */
    getSelectedCountry() {
        const values = this.getAllValues();
        const countryCode = values.quoteCountry || 'USA';
        return CONFIG.COUNTRIES[countryCode] || CONFIG.COUNTRIES.USA;
    }
};

// 导出状态管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateManager };
} else {
    window.StateManager = StateManager;
}
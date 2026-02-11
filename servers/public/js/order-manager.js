/**
 * order-manager.js
 * 功能：订单管理核心逻辑
 * 业务：订单CRUD、状态管理、利润计算
 */

// 订单管理器
const OrderManager = {
    /**
     * 创建新订单
     * @param {Object} orderData - 订单数据
     * @returns {Object} 创建的订单
     */
    createOrder(orderData) {
        // 生成订单ID
        const orderId = orderData.id || MathUtils.generateId('DA');

        // 获取当前配置快照
        const configSnapshot = this.getCurrentConfigSnapshot();

        // 计算应收定金
        let depositPercent = CONFIG.DEFAULTS.depPercent; // 默认30
        const slider = document.getElementById('depPercentSlider');
        if (slider) {
            depositPercent = parseFloat(slider.value);
        }
        const expectedDeposit = (orderData.price * orderData.qty * depositPercent) / 100;

        // 计算订单利润
        const profit = this.calculateOrderProfit(orderData, configSnapshot);

        // 构建完整订单对象
        const order = {
            // 基础信息
            id: orderId,
            time: new Date().toLocaleString('zh-CN'),
            clientName: orderData.clientName || '',
            clientPhone: orderData.clientPhone || '',
            clientEmail: orderData.clientEmail || '',
            qty: MathUtils.safeParse(orderData.qty, 1),
            price: MathUtils.safeParse(orderData.price, 0),
            total: MathUtils.round(orderData.qty * orderData.price, 2),
            notes: orderData.notes || '',

            // 定金信息
            expectedDeposit: MathUtils.round(expectedDeposit, 2),
            actualDeposit: MathUtils.safeParse(orderData.actualDeposit, 0),

            // 状态信息（根据定金判断初始状态）
            status: this.determineInitialStatus(orderData.actualDeposit),
            paymentStatus: this.determinePaymentStatus(orderData.actualDeposit, expectedDeposit),
            shippingStatus: CONFIG.SHIPPING_STATUS.UNSHIPPED,

            // 财务信息
            profit: profit,
            totalReceived: MathUtils.safeParse(orderData.actualDeposit, 0),

            // 配置快照
            configSnapshot: configSnapshot,

            // 收款记录
            paymentRecords: [],

            // 时间戳
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 如果有实际定金，添加收款记录
        if (order.actualDeposit > 0) {
            const paymentRecord = {
                id: MathUtils.generateId('PAY'),
                date: new Date().toISOString(),
                amountUSD: order.actualDeposit,
                amountCNY: order.actualDeposit * configSnapshot.exRate,
                exRate: configSnapshot.exRate,
                type: CONFIG.PAYMENT_TYPES.DEPOSIT,
                notes: '创建订单时收取的定金',
                status: 'completed'
            };

            order.paymentRecords.push(paymentRecord);
        }

        return order;
    },

    /**
     * 获取当前配置快照
     * @returns {Object} 配置快照
     */
    getCurrentConfigSnapshot() {
        const values = StateManager.getAllValues();
        const country = StateManager.getSelectedCountry();

        return {
            // 成本参数
            exRate: MathUtils.safeParse(values.exRate, CONFIG.DEFAULTS.exRate),
            baseCost: MathUtils.safeParse(values.baseCost, CONFIG.DEFAULTS.baseCost),
            weight: MathUtils.safeParse(values.weight, CONFIG.DEFAULTS.weight),
            shipRate: MathUtils.safeParse(values.shipRate, CONFIG.DEFAULTS.shipRate),
            packCost: MathUtils.safeParse(values.packCost, CONFIG.DEFAULTS.packCost),
            domesticShipping: MathUtils.safeParse(values.domesticShipping, CONFIG.DEFAULTS.domesticShipping),

            // 财务参数
            feeRate: MathUtils.safeParse(values.feeRate, CONFIG.DEFAULTS.feeRate),
            lossRate: MathUtils.safeParse(values.lossRate, CONFIG.DEFAULTS.lossRate),
            commissionRate: MathUtils.safeParse(values.commissionRate, CONFIG.DEFAULTS.commissionRate),
            declareRate: MathUtils.safeParse(values.declareRate, CONFIG.DEFAULTS.declareRate),

            // 【新增】保险参数
            insuranceRate: MathUtils.safeParse(values.insuranceRate, CONFIG.DEFAULTS.insuranceRate) / 100,
            insuranceMarkup: MathUtils.safeParse(values.insuranceMarkup, CONFIG.DEFAULTS.insuranceMarkup) / 100,

            // 模式参数
            isFOB: values.isFOB || false,
            isTax: values.isTax || false,
            isCIP: values.isCIP || false, // 【新增】CIP状态

            quoteCountry: values.quoteCountry || 'USA',

            // 订单参数
            depositPercent: MathUtils.safeParse(StateManager.inputs.depPercentSlider?.value, CONFIG.DEFAULTS.depPercent),

            // 国家税率
            countryVat: country.vat,
            countryDuty: country.duty,
            isEU: country.isEU || false, // 【新增】欧盟状态

            // 快照时间
            snapshotTime: new Date().toISOString()
        };
    },

    /**
     * 计算订单利润
     * @param {Object} orderData - 订单数据
     * @param {Object} config - 配置快照
     * @returns {number} 订单利润（CNY）
     */
    calculateOrderProfit(orderData, config) {
        const qty = MathUtils.safeParse(orderData.qty, 1);
        const priceUSD = MathUtils.safeParse(orderData.price, 0);

        if (priceUSD <= 0) return 0;

        try {
            // 使用计算引擎计算利润
            const countryCode = config.quoteCountry || 'USA';
            const country = CONFIG.COUNTRIES[countryCode] || CONFIG.COUNTRIES.USA;

            const params = CalculationEngine.getBaseParams(config, country);
            const costs = CalculationEngine.getUnitCosts(params);
            const profitData = CalculationEngine.calculateManualProfit(priceUSD, params, costs, country);

            return MathUtils.round(profitData.netProfitCNY * qty, 2);
        } catch (error) {
            console.warn('计算订单利润失败:', error);
            return 0;
        }
    },

    /**
     * 确定订单初始状态
     * @param {number} actualDeposit - 实收定金
     * @returns {string} 初始状态
     */
    determineInitialStatus(actualDeposit) {
        return actualDeposit > 0 ?
            CONFIG.ORDER_STATUS.UNSHIPPED_PAID :
            CONFIG.ORDER_STATUS.PREORDER;
    },

    /**
     * 确定付款状态
     * @param {number} actualDeposit - 实收定金
     * @param {number} expectedDeposit - 应收定金
     * @returns {string} 付款状态
     */
    determinePaymentStatus(actualDeposit, expectedDeposit) {
        if (actualDeposit <= 0) {
            return CONFIG.PAYMENT_STATUS.UNPAID;
        } else if (actualDeposit < expectedDeposit) {
            return CONFIG.PAYMENT_STATUS.PARTIAL_PAID;
        } else if (actualDeposit === expectedDeposit) {
            return CONFIG.PAYMENT_STATUS.DEPOSIT_PAID;
        } else {
            return CONFIG.PAYMENT_STATUS.FULL_PAID;
        }
    },

    /**
     * 保存订单
     * @param {Object} order - 订单对象
     * @returns {boolean} 是否保存成功
     */
    saveOrder(order) {
        try {
            // 添加到订单列表
            StateManager.orders.push(order);

            // 保存到本地存储
            StateManager.saveOrders();

            // 清除统计缓存
            StateManager.orderStatsCache = null;

            return true;
        } catch (error) {
            console.error('保存订单失败:', error);
            return false;
        }
    },

    /**
     * 更新订单
     * @param {string} orderId - 订单ID
     * @param {Object} updates - 更新数据
     * @returns {boolean} 是否更新成功
     */
    updateOrder(orderId, updates) {
        const index = StateManager.orders.findIndex(o => o.id === orderId);
        if (index === -1) return false;

        try {
            // 合并更新
            StateManager.orders[index] = {
                ...StateManager.orders[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            // 重新计算利润（如果价格或数量变化）
            if (updates.price !== undefined || updates.qty !== undefined) {
                const order = StateManager.orders[index];
                const config = order.configSnapshot;
                const profit = this.calculateOrderProfit(order, config);
                StateManager.orders[index].profit = profit;
                StateManager.orders[index].total = MathUtils.round(order.qty * order.price, 2);
            }

            // 保存更新
            StateManager.saveOrders();

            // 清除统计缓存
            StateManager.orderStatsCache = null;

            return true;
        } catch (error) {
            console.error('更新订单失败:', error);
            return false;
        }
    },

    /**
     * 删除订单
     * @param {string} orderId - 订单ID
     * @returns {boolean} 是否删除成功
     */
    deleteOrder(orderId) {
        const index = StateManager.orders.findIndex(o => o.id === orderId);
        if (index === -1) return false;

        try {
            StateManager.orders.splice(index, 1);
            StateManager.saveOrders();

            // 清除统计缓存
            StateManager.orderStatsCache = null;

            return true;
        } catch (error) {
            console.error('删除订单失败:', error);
            return false;
        }
    },

    /**
     * 获取订单
     * @param {string} orderId - 订单ID
     * @returns {Object|null} 订单对象
     */
    getOrder(orderId) {
        return StateManager.orders.find(o => o.id === orderId) || null;
    },

    /**
     * 获取所有订单
     * @returns {Array} 订单数组
     */
    getAllOrders() {
        return StateManager.orders;
    },

    /**
     * 根据状态筛选订单
     * @param {string} status - 状态
     * @returns {Array} 筛选后的订单
     */
    getOrdersByStatus(status) {
        return StateManager.orders.filter(order => order.status === status);
    },

    /**
     * 标记订单为已发货
     * @param {string} orderId - 订单ID
     * @param {string} shippingNotes - 物流备注
     * @returns {boolean} 是否操作成功
     */
    markAsShipped(orderId, shippingNotes = '') {
        const order = this.getOrder(orderId);
        if (!order) return false;

        const updates = {
            shippingStatus: CONFIG.SHIPPING_STATUS.SHIPPED,
            shippedAt: new Date().toISOString(),
            shippingNotes: shippingNotes
        };

        // 更新状态：根据付款状态决定订单状态
        if (order.paymentStatus === CONFIG.PAYMENT_STATUS.FULL_PAID) {
            updates.status = CONFIG.ORDER_STATUS.COMPLETED;
        } else {
            updates.status = CONFIG.ORDER_STATUS.SHIPPED_UNPAID;
        }

        return this.updateOrder(orderId, updates);
    },

    /**
     * 标记订单为已完成
     * @param {string} orderId - 订单ID
     * @returns {boolean} 是否操作成功
     */
    markAsCompleted(orderId) {
        const order = this.getOrder(orderId);
        if (!order) return false;

        const updates = {
            status: CONFIG.ORDER_STATUS.COMPLETED,
            shippingStatus: order.shippingStatus === CONFIG.SHIPPING_STATUS.UNSHIPPED ?
                CONFIG.SHIPPING_STATUS.SHIPPED : order.shippingStatus
        };

        // 如果没有发货时间，添加发货时间
        if (!order.shippedAt) {
            updates.shippedAt = new Date().toISOString();
        }

        return this.updateOrder(orderId, updates);
    },

    /**
     * 更新订单状态
     * @param {string} orderId - 订单ID
     * @param {string} newStatus - 新状态
     * @param {string} notes - 备注
     * @returns {boolean} 是否操作成功
     */
    updateOrderStatus(orderId, newStatus, notes = '') {
        const validStatuses = Object.values(CONFIG.ORDER_STATUS);
        if (!validStatuses.includes(newStatus)) {
            console.error('无效的订单状态:', newStatus);
            return false;
        }

        const updates = {
            status: newStatus,
            statusNotes: notes,
            statusUpdatedAt: new Date().toISOString()
        };

        // 根据状态自动更新其他字段
        switch (newStatus) {
            case CONFIG.ORDER_STATUS.COMPLETED:
                if (!this.getOrder(orderId).shippedAt) {
                    updates.shippedAt = new Date().toISOString();
                    updates.shippingStatus = CONFIG.SHIPPING_STATUS.SHIPPED;
                }
                break;

            case CONFIG.ORDER_STATUS.SHIPPED_UNPAID:
                updates.shippingStatus = CONFIG.SHIPPING_STATUS.SHIPPED;
                updates.shippedAt = new Date().toISOString();
                break;
        }

        return this.updateOrder(orderId, updates);
    },

    /**
     * 批量更新订单状态
     * @param {Array} orderIds - 订单ID数组
     * @param {string} newStatus - 新状态
     * @returns {number} 成功更新的数量
     */
    batchUpdateOrderStatus(orderIds, newStatus) {
        let successCount = 0;

        orderIds.forEach(orderId => {
            if (this.updateOrderStatus(orderId, newStatus)) {
                successCount++;
            }
        });

        return successCount;
    },

    /**
     * 搜索订单
     * @param {string} keyword - 关键词
     * @returns {Array} 搜索结果
     */
    searchOrders(keyword) {
        if (!keyword.trim()) return StateManager.orders;

        const searchTerm = keyword.toLowerCase();

        return StateManager.orders.filter(order => {
            return (
                order.id.toLowerCase().includes(searchTerm) ||
                order.clientName.toLowerCase().includes(searchTerm) ||
                order.clientPhone.includes(searchTerm) ||
                order.clientEmail.toLowerCase().includes(searchTerm) ||
                order.notes.toLowerCase().includes(searchTerm)
            );
        });
    },

    /**
     * 获取订单统计摘要
     * @returns {Object} 统计摘要
     */
    getStatsSummary() {
        const stats = StateManager.getOrderStats();

        return {
            totalOrders: stats.total,
            totalAmountUSD: MathUtils.round(
                stats.completedAmount +
                stats.shippedUnpaidAmount +
                stats.unshippedPaidAmount +
                stats.preorderAmount, 2
            ),
            totalProfitCNY: MathUtils.round(
                stats.completedProfit +
                stats.shippedUnpaidProfit +
                stats.unshippedPaidProfit +
                stats.preorderProfit, 2
            ),
            byStatus: {
                completed: stats.completed,
                shippedUnpaid: stats.shippedUnpaid,
                unshippedPaid: stats.unshippedPaid,
                preorder: stats.preorder,
                cancelled: stats.cancelled
            },
            byAmount: {
                completed: stats.completedAmount,
                shippedUnpaid: stats.shippedUnpaidAmount,
                unshippedPaid: stats.unshippedPaidAmount,
                preorder: stats.preorderAmount,
                cancelled: stats.cancelledAmount
            },
            byQuantity: {
                completed: stats.completedQty,
                shippedUnpaid: stats.shippedUnpaidQty,
                unshippedPaid: stats.unshippedPaidQty,
                preorder: stats.preorderQty,
                cancelled: stats.cancelledQty
            }
        };
    },

    /**
     * 导出订单数据为CSV
     * @returns {string} CSV字符串
     */
    exportOrdersToCSV() {
        if (StateManager.orders.length === 0) return '';

        const headers = [
            '订单ID', '创建时间', '客户姓名', '联系电话', '客户邮箱',
            '数量(幅)', '单价(USD)', '总额(USD)', '利润(CNY)', '状态',
            '付款状态', '发货状态', '实收定金(USD)', '应收定金(USD)',
            '订单备注', '汇率', '画布进价(￥)', '均重(KG)', '国际运费(￥/KG)',
            '包装杂费(￥)', '国内快递(￥)', '支付手续费(%)', '结汇损失(%)',
            '报关比例(%)', '保险费率(%)', '投保加成', // 【新增】
            'FOB模式', 'DDP模式', 'CIP模式', // 【新增】
            '目标国家', '是否欧盟', // 【新增】
            '创建时间戳'
        ];

        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        let csvContent = headers.join(',') + '\n';

        StateManager.orders.forEach(order => {
            const config = order.configSnapshot || {};

            const row = [
                escapeCSV(order.id),
                escapeCSV(order.time),
                escapeCSV(order.clientName),
                escapeCSV(order.clientPhone),
                escapeCSV(order.clientEmail),
                escapeCSV(order.qty),
                escapeCSV(order.price),
                escapeCSV(order.total),
                escapeCSV(order.profit),
                escapeCSV(order.status),
                escapeCSV(order.paymentStatus),
                escapeCSV(order.shippingStatus),
                escapeCSV(order.actualDeposit),
                escapeCSV(order.expectedDeposit),
                escapeCSV(order.notes),
                escapeCSV(config.exRate),
                escapeCSV(config.baseCost),
                escapeCSV(config.weight),
                escapeCSV(config.shipRate),
                escapeCSV(config.packCost),
                escapeCSV(config.domesticShipping),
                escapeCSV(config.feeRate),
                escapeCSV(config.lossRate),
                escapeCSV(config.declareRate),

                // 【新增】保险数据
                escapeCSV((config.insuranceRate || 0) * 100),
                escapeCSV(config.insuranceMarkup || 1.1),

                config.isFOB ? '是' : '否',
                config.isTax ? '是' : '否',
                config.isCIP ? '是' : '否', // 【新增】

                escapeCSV(config.quoteCountry),
                config.isEU ? '是' : '否', // 【新增】

                escapeCSV(order.createdAt)
            ];

            csvContent += row.join(',') + '\n';
        });

        return csvContent;
    },

    /**
     * 导入订单数据
     * @param {string} csvData - CSV数据
     * @returns {number} 成功导入的数量
     */
    importOrdersFromCSV(csvData) {
        // 简化的CSV解析（实际项目中应该使用完整的CSV解析器）
        const lines = csvData.split('\n').filter(line => line.trim());
        if (lines.length <= 1) return 0; // 只有标题行

        const headers = lines[0].split(',');
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i]);
                if (values.length !== headers.length) continue;

                // 构建订单对象（简化版，实际需要根据CSV结构调整）
                const orderData = {
                    clientName: values[2] || '',
                    clientPhone: values[3] || '',
                    clientEmail: values[4] || '',
                    qty: MathUtils.safeParse(values[5]),
                    price: MathUtils.safeParse(values[6]),
                    notes: values[14] || ''
                };

                const order = this.createOrder(orderData);
                if (this.saveOrder(order)) {
                    importedCount++;
                }
            } catch (error) {
                console.warn('导入订单失败:', error);
            }
        }

        return importedCount;
    },

    /**
     * 解析CSV行
     * @param {string} line - CSV行
     * @returns {Array} 解析后的值
     */
    parseCSVLine(line) {
        const values = [];
        let inQuotes = false;
        let currentValue = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        values.push(currentValue);
        return values.map(value => value.replace(/^"|"$/g, '').replace(/""/g, '"'));
    }
};

// 导出订单管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {OrderManager};
} else {
    window.OrderManager = OrderManager;
}
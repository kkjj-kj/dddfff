/**
 * payment-manager.js
 * 功能：收款记录管理
 * 业务：收款记录CRUD、状态更新、财务统计
 */

// 收款管理器
const PaymentManager = {
    /**
     * 添加收款记录
     * @param {string} orderId - 订单ID
     * @param {number} amountUSD - 金额（USD）
     * @param {string} paymentType - 收款类型
     * @param {string} notes - 备注
     * @returns {boolean} 是否添加成功
     */
    addPayment(orderId, amountUSD, paymentType = CONFIG.PAYMENT_TYPES.DEPOSIT, notes = '') {
        const order = OrderManager.getOrder(orderId);
        if (!order) return false;

        // 验证金额
        const validAmount = MathUtils.safeParse(amountUSD, 0);
        if (validAmount === 0) {
            console.error('收款金额不能为0');
            return false;
        }

        // 获取当前汇率
        const currentExRate = MathUtils.safeParse(
            StateManager.inputs.exRate?.value,
            CONFIG.DEFAULTS.exRate
        );

        try {
            // 创建收款记录
            const paymentRecord = {
                id: MathUtils.generateId('PAY'),
                date: new Date().toISOString(),
                amountUSD: MathUtils.round(validAmount, 2),
                amountCNY: MathUtils.round(validAmount * currentExRate, 2),
                exRate: currentExRate,
                type: paymentType,
                notes: notes || `添加${this.getPaymentTypeName(paymentType)}记录`,
                status: 'completed'
            };

            // 初始化收款记录数组
            if (!order.paymentRecords) {
                order.paymentRecords = [];
            }

            // 添加收款记录
            order.paymentRecords.push(paymentRecord);

            // 更新订单总收款金额
            this.updateOrderTotalReceived(order);

            // 更新订单状态
            this.updateOrderStatus(order);

            // 保存订单
            StateManager.saveOrders();

            // 清除统计缓存
            StateManager.orderStatsCache = null;

            return true;
        } catch (error) {
            console.error('添加收款记录失败:', error);
            return false;
        }
    },

    /**
     * 添加退款记录
     * @param {string} orderId - 订单ID
     * @param {number} amountUSD - 退款金额（正数）
     * @param {string} reason - 退款原因
     * @returns {boolean} 是否添加成功
     */
    addRefund(orderId, amountUSD, reason = '') {
        // 退款就是负数的收款
        const refundAmount = -Math.abs(amountUSD);
        const notes = reason ? `退款原因: ${reason}` : '退款';

        return this.addPayment(orderId, refundAmount, CONFIG.PAYMENT_TYPES.REFUND, notes);
    },

    /**
     * 删除收款记录
     * @param {string} orderId - 订单ID
     * @param {string} paymentId - 收款记录ID
     * @returns {boolean} 是否删除成功
     */
    deletePaymentRecord(orderId, paymentId) {
        const order = OrderManager.getOrder(orderId);
        if (!order || !order.paymentRecords) return false;

        const index = order.paymentRecords.findIndex(record => record.id === paymentId);
        if (index === -1) return false;

        try {
            // 删除记录
            order.paymentRecords.splice(index, 1);

            // 更新订单总收款金额
            this.updateOrderTotalReceived(order);

            // 更新订单状态
            this.updateOrderStatus(order);

            // 保存订单
            StateManager.saveOrders();

            // 清除统计缓存
            StateManager.orderStatsCache = null;

            return true;
        } catch (error) {
            console.error('删除收款记录失败:', error);
            return false;
        }
    },

    /**
     * 更新订单总收款金额
     * @param {Object} order - 订单对象
     */
    updateOrderTotalReceived(order) {
        if (!order.paymentRecords || order.paymentRecords.length === 0) {
            order.totalReceived = 0;
            order.totalReceivedCNY = 0;
            return;
        }

        // 计算总收款金额（USD）
        const totalUSD = order.paymentRecords.reduce((sum, record) => {
            return sum + (record.amountUSD || 0);
        }, 0);

        // 使用最新的汇率计算CNY（或使用记录时的汇率加权平均）
        const currentExRate = MathUtils.safeParse(
            StateManager.inputs.exRate?.value,
            CONFIG.DEFAULTS.exRate
        );

        order.totalReceived = MathUtils.round(totalUSD, 2);
        order.totalReceivedCNY = MathUtils.round(totalUSD * currentExRate, 2);
    },

    /**
     * 更新订单状态（基于收款情况）
     * @param {Object} order - 订单对象
     */
    updateOrderStatus(order) {
        const totalReceived = order.totalReceived || 0;
        const orderTotal = order.total || 0;

        // 获取定金比例（从配置快照）
        const config = order.configSnapshot || {};
        const depositPercent = config.depositPercent || CONFIG.DEFAULTS.depPercent;
        const depositAmount = (orderTotal * depositPercent) / 100;

        // 确定付款状态
        let paymentStatus;
        if (totalReceived >= orderTotal) {
            paymentStatus = CONFIG.PAYMENT_STATUS.FULL_PAID;
        } else if (totalReceived >= depositAmount) {
            paymentStatus = CONFIG.PAYMENT_STATUS.DEPOSIT_PAID;
        } else if (totalReceived > 0) {
            paymentStatus = CONFIG.PAYMENT_STATUS.PARTIAL_PAID;
        } else {
            paymentStatus = CONFIG.PAYMENT_STATUS.UNPAID;
        }

        // 确定订单状态
        let orderStatus;
        if (paymentStatus === CONFIG.PAYMENT_STATUS.FULL_PAID) {
            // 已全款
            if (order.shippingStatus === CONFIG.SHIPPING_STATUS.SHIPPED) {
                orderStatus = CONFIG.ORDER_STATUS.COMPLETED;
            } else {
                orderStatus = CONFIG.ORDER_STATUS.UNSHIPPED_PAID;
            }
        } else if (paymentStatus === CONFIG.PAYMENT_STATUS.DEPOSIT_PAID) {
            // 已付定金
            if (order.shippingStatus === CONFIG.SHIPPING_STATUS.SHIPPED) {
                orderStatus = CONFIG.ORDER_STATUS.SHIPPED_UNPAID;
            } else {
                orderStatus = CONFIG.ORDER_STATUS.UNSHIPPED_PAID;
            }
        } else if (paymentStatus === CONFIG.PAYMENT_STATUS.PARTIAL_PAID) {
            // 部分付款
            orderStatus = CONFIG.ORDER_STATUS.PREORDER;
        } else {
            // 未付款
            orderStatus = CONFIG.ORDER_STATUS.PREORDER;
        }

        // 更新订单
        order.paymentStatus = paymentStatus;
        order.status = orderStatus;
        order.updatedAt = new Date().toISOString();
    },

    /**
     * 获取收款记录
     * @param {string} orderId - 订单ID
     * @returns {Array} 收款记录数组
     */
    getPaymentRecords(orderId) {
        const order = OrderManager.getOrder(orderId);
        return order?.paymentRecords || [];
    },

    /**
     * 获取收款类型名称
     * @param {string} paymentType - 收款类型
     * @returns {string} 类型名称
     */
    getPaymentTypeName(paymentType) {
        const typeNames = {
            [CONFIG.PAYMENT_TYPES.DEPOSIT]: '定金',
            [CONFIG.PAYMENT_TYPES.BALANCE]: '尾款',
            [CONFIG.PAYMENT_TYPES.REFUND]: '退款',
            [CONFIG.PAYMENT_TYPES.OTHER]: '其他'
        };

        return typeNames[paymentType] || '未知';
    },

    /**
     * 获取收款统计
     * @param {string} orderId - 订单ID（可选）
     * @returns {Object} 收款统计数据
     */
    getPaymentStats(orderId = null) {
        let orders = StateManager.orders;

        // 如果指定了订单ID，只统计该订单
        if (orderId) {
            const order = OrderManager.getOrder(orderId);
            orders = order ? [order] : [];
        }

        const stats = {
            totalOrders: orders.length,
            totalReceivedUSD: 0,
            totalReceivedCNY: 0,
            totalExpectedUSD: 0,
            totalExpectedCNY: 0,
            byType: {
                [CONFIG.PAYMENT_TYPES.DEPOSIT]: { count: 0, amountUSD: 0, amountCNY: 0 },
                [CONFIG.PAYMENT_TYPES.BALANCE]: { count: 0, amountUSD: 0, amountCNY: 0 },
                [CONFIG.PAYMENT_TYPES.REFUND]: { count: 0, amountUSD: 0, amountCNY: 0 },
                [CONFIG.PAYMENT_TYPES.OTHER]: { count: 0, amountUSD: 0, amountCNY: 0 }
            },
            byStatus: {
                unpaid: 0,
                partial_paid: 0,
                deposit_paid: 0,
                full_paid: 0
            }
        };

        orders.forEach(order => {
            // 统计总金额
            const expectedTotal = order.total || 0;
            const receivedTotal = order.totalReceived || 0;
            const currentExRate = order.configSnapshot?.exRate || CONFIG.DEFAULTS.exRate;

            stats.totalExpectedUSD += expectedTotal;
            stats.totalExpectedCNY += expectedTotal * currentExRate;
            stats.totalReceivedUSD += receivedTotal;
            stats.totalReceivedCNY += receivedTotal * currentExRate;

            // 统计付款状态
            stats.byStatus[order.paymentStatus] = (stats.byStatus[order.paymentStatus] || 0) + 1;

            // 统计收款类型
            if (order.paymentRecords) {
                order.paymentRecords.forEach(record => {
                    const type = record.type || CONFIG.PAYMENT_TYPES.OTHER;
                    if (!stats.byType[type]) {
                        stats.byType[type] = { count: 0, amountUSD: 0, amountCNY: 0 };
                    }

                    stats.byType[type].count++;
                    stats.byType[type].amountUSD += record.amountUSD || 0;
                    stats.byType[type].amountCNY += record.amountCNY || 0;
                });
            }
        });

        // 四舍五入
        stats.totalReceivedUSD = MathUtils.round(stats.totalReceivedUSD, 2);
        stats.totalReceivedCNY = MathUtils.round(stats.totalReceivedCNY, 2);
        stats.totalExpectedUSD = MathUtils.round(stats.totalExpectedUSD, 2);
        stats.totalExpectedCNY = MathUtils.round(stats.totalExpectedCNY, 2);

        // 计算回款率
        stats.collectionRate = stats.totalExpectedUSD > 0 ?
            MathUtils.calculatePercentage(stats.totalReceivedUSD, stats.totalExpectedUSD) : 0;

        return stats;
    },

    /**
     * 获取待收款订单
     * @returns {Array} 待收款订单数组
     */
    getPendingPaymentOrders() {
        return StateManager.orders.filter(order => {
            const totalReceived = order.totalReceived || 0;
            const orderTotal = order.total || 0;
            return totalReceived < orderTotal;
        });
    },

    /**
     * 获取超期未收款订单
     * @param {number} daysThreshold - 超期天数阈值
     * @returns {Array} 超期订单数组
     */
    getOverduePaymentOrders(daysThreshold = 30) {
        const pendingOrders = this.getPendingPaymentOrders();
        const now = new Date();

        return pendingOrders.filter(order => {
            // 检查订单创建时间
            const createdDate = MathUtils.parseTime(order.createdAt);
            const daysPassed = (now - createdDate) / (1000 * 60 * 60 * 24);

            return daysPassed > daysThreshold;
        });
    },

    /**
     * 标记订单为已收款
     * @param {string} orderId - 订单ID
     * @param {string} notes - 备注
     * @returns {boolean} 是否操作成功
     */
    markAsPaid(orderId, notes = '') {
        const order = OrderManager.getOrder(orderId);
        if (!order) return false;

        const remaining = order.total - (order.totalReceived || 0);
        if (remaining <= 0) return true; // 已经全款

        // 添加尾款收款记录
        return this.addPayment(
            orderId,
            remaining,
            CONFIG.PAYMENT_TYPES.BALANCE,
            notes || '标记为已收款'
        );
    },

    /**
     * 批量标记为已收款
     * @param {Array} orderIds - 订单ID数组
     * @returns {number} 成功操作的数量
     */
    batchMarkAsPaid(orderIds) {
        let successCount = 0;

        orderIds.forEach(orderId => {
            if (this.markAsPaid(orderId, '批量标记为已收款')) {
                successCount++;
            }
        });

        return successCount;
    },

    /**
     * 导出收款记录为CSV
     * @param {string} orderId - 订单ID（可选）
     * @returns {string} CSV字符串
     */
    exportPaymentRecordsToCSV(orderId = null) {
        let orders = StateManager.orders;

        // 如果指定了订单ID，只导出该订单
        if (orderId) {
            const order = OrderManager.getOrder(orderId);
            orders = order ? [order] : [];
        }

        const headers = [
            '订单ID', '客户姓名', '收款时间', '收款金额(USD)', '收款金额(CNY)',
            '汇率', '收款类型', '备注', '状态'
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
        let recordCount = 0;

        orders.forEach(order => {
            if (!order.paymentRecords || order.paymentRecords.length === 0) return;

            order.paymentRecords.forEach(record => {
                const row = [
                    escapeCSV(order.id),
                    escapeCSV(order.clientName),
                    escapeCSV(MathUtils.formatTimeChinese(record.date, true)),
                    escapeCSV(record.amountUSD),
                    escapeCSV(record.amountCNY),
                    escapeCSV(record.exRate),
                    escapeCSV(this.getPaymentTypeName(record.type)),
                    escapeCSV(record.notes),
                    escapeCSV(record.status)
                ];

                csvContent += row.join(',') + '\n';
                recordCount++;
            });
        });

        if (recordCount === 0) {
            return ''; // 没有收款记录
        }

        return csvContent;
    }
};

// 导出收款管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PaymentManager };
} else {
    window.PaymentManager = PaymentManager;
}
/**
 * math-utils.js
 * 功能：数学计算和格式化工具
 * 业务：处理数字精度、货币格式化、安全计算等
 */

// 数学工具类
const MathUtils = {
    /**
     * 四舍五入到指定小数位
     * @param {number} value - 原始值
     * @param {number} decimals - 小数位数，默认2位
     * @returns {number} 四舍五入后的值
     */
    round(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) {
            return 0;
        }
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    },

    /**
     * 安全解析数字，防止NaN
     * @param {any} value - 要解析的值
     * @param {number} defaultValue - 默认值，默认为0
     * @returns {number} 解析后的数字
     */
    safeParse(value, defaultValue = 0) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }

        // 如果是字符串，清理非数字字符（保留负号和小数点）
        if (typeof value === 'string') {
            value = value.replace(/[^\d.-]/g, '');
        }

        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : this.round(num);
    },

    /**
     * 格式化货币
     * @param {number} value - 金额
     * @param {string} currency - 货币符号，默认'￥'
     * @param {number} decimals - 小数位数，默认0
     * @returns {string} 格式化后的货币字符串
     */
    formatCurrency(value, currency = '￥', decimals = 0) {
        const num = this.safeParse(value, 0);
        const rounded = this.round(num, decimals);
        return `${currency}${rounded.toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}`;
    },

    /**
     * 格式化数字（添加千位分隔符）
     * @param {number} value - 数字
     * @param {number} decimals - 小数位数，默认0
     * @returns {string} 格式化后的数字字符串
     */
    formatNumber(value, decimals = 0) {
        const num = this.safeParse(value, 0);
        const rounded = this.round(num, decimals);
        return rounded.toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    /**
     * 计算百分比
     * @param {number} part - 部分值
     * @param {number} total - 总值
     * @param {number} decimals - 小数位数，默认1
     * @returns {number} 百分比
     */
    calculatePercentage(part, total, decimals = 1) {
        if (total === 0) return 0;
        const percentage = (part / total) * 100;
        return this.round(percentage, decimals);
    },

    /**
     * 计算增长量
     * @param {number} current - 当前值
     * @param {number} previous - 前值
     * @returns {number} 增长量
     */
    calculateIncrease(current, previous) {
        if (previous === 0) return 0;
        return this.round(((current - previous) / previous) * 100, 1);
    },

    /**
     * 确保值在指定范围内
     * @param {number} value - 原始值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 范围内的值
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * 生成随机ID
     * @param {string} prefix - ID前缀
     * @returns {string} 随机ID
     */
    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    },

    /**
     * 计算加权平均值
     * @param {Array} values - 值数组
     * @param {Array} weights - 权重数组
     * @returns {number} 加权平均值
     */
    weightedAverage(values, weights) {
        if (values.length !== weights.length || values.length === 0) {
            return 0;
        }

        let sumValue = 0;
        let sumWeight = 0;

        for (let i = 0; i < values.length; i++) {
            const value = this.safeParse(values[i]);
            const weight = this.safeParse(weights[i]);
            sumValue += value * weight;
            sumWeight += weight;
        }

        return sumWeight === 0 ? 0 : this.round(sumValue / sumWeight, 2);
    },

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return this.round(bytes / Math.pow(k, i), 2) + ' ' + sizes[i];
    },

    /**
     * 判断是否为有效数字
     * @param {any} value - 要检查的值
     * @returns {boolean} 是否为有效数字
     */
    isValidNumber(value) {
        if (value === null || value === undefined) return false;

        const num = parseFloat(value);
        return !isNaN(num) && isFinite(num);
    },

    /**
     * 解析时间字符串为Date对象
     * @param {string} timeString - 时间字符串
     * @returns {Date} Date对象
     */
    parseTime(timeString) {
        try {
            // 尝试解析ISO格式
            const date = new Date(timeString);
            if (!isNaN(date.getTime())) {
                return date;
            }

            // 尝试解析中文格式
            const chineseFormat = timeString.replace(/年|月|日|时|分|秒/g, '-');
            const date2 = new Date(chineseFormat);
            if (!isNaN(date2.getTime())) {
                return date2;
            }

            // 返回当前时间作为默认值
            return new Date();
        } catch (error) {
            return new Date();
        }
    },

    /**
     * 格式化时间为中文格式
     * @param {Date|string} time - 时间
     * @param {boolean} includeTime - 是否包含时间部分
     * @returns {string} 格式化后的时间字符串
     */
    formatTimeChinese(time, includeTime = true) {
        const date = time instanceof Date ? time : this.parseTime(time);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        if (!includeTime) {
            return `${year}-${month}-${day}`;
        }

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
};

// 导出工具类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MathUtils };
} else {
    window.MathUtils = MathUtils;
}
/**
 * config.js
 * 功能：系统配置和常量管理
 * 业务：包含国家税率、尺寸预设、默认值等核心配置
 */

// 系统常量配置
const CONFIG = {
    // 国家税率配置（VAT和关税）
    COUNTRIES: {
        // --- 北美洲 ---
        USA: {vat: 0.00, duty: 0.00, name: "美国", flag: "🇺🇸", isEU: false, timeZone: "America/New_York"}, // 艺术品通常免税，美东时间
        CAN: {vat: 0.05, duty: 0.00, name: "加拿大", flag: "🇨🇦", isEU: false, timeZone: "America/Toronto"}, // GST 5%

        // --- 欧洲 (欧盟 & 非欧盟) ---
        GBR: {vat: 0.05, duty: 0.00, name: "英国", flag: "🇬🇧", isEU: false, timeZone: "Europe/London"}, // 进口艺术品优惠税率 5%
        DEU: {vat: 0.07, duty: 0.00, name: "德国", flag: "🇩🇪", isEU: true, timeZone: "Europe/Berlin"}, // 艺术品优惠税率 7%
        FRA: {vat: 0.055, duty: 0.00, name: "法国", flag: "🇫🇷", isEU: true, timeZone: "Europe/Paris"}, // 艺术品 5.5%
        ITA: {vat: 0.10, duty: 0.00, name: "意大利", flag: "🇮🇹", isEU: true, timeZone: "Europe/Rome"}, // 艺术品 10%
        ESP: {vat: 0.10, duty: 0.00, name: "西班牙", flag: "🇪🇸", isEU: true, timeZone: "Europe/Madrid"}, // 艺术品 10%
        NLD: {vat: 0.09, duty: 0.00, name: "荷兰", flag: "🇳🇱", isEU: true, timeZone: "Europe/Amsterdam"},
        BEL: {vat: 0.06, duty: 0.00, name: "比利时", flag: "🇧🇪", isEU: true, timeZone: "Europe/Brussels"}, // 艺术交易重镇
        CHE: {vat: 0.08, duty: 0.00, name: "瑞士", flag: "🇨🇭", isEU: false, timeZone: "Europe/Zurich"}, // 富豪多，非欧盟，税低
        SWE: {vat: 0.12, duty: 0.00, name: "瑞典", flag: "🇸🇪", isEU: true, timeZone: "Europe/Stockholm"},
        FIN: {vat: 0.10, duty: 0.00, name: "芬兰", flag: "🇫🇮", isEU: true, timeZone: "Europe/Helsinki"},
        NOR: {vat: 0.25, duty: 0.00, name: "挪威", flag: "🇳🇴", isEU: false, timeZone: "Europe/Oslo"}, // 高福利高税
        RUS: {vat: 0.20, duty: 0.00, name: "俄罗斯", flag: "🇷🇺", isEU: false, timeZone: "Europe/Moscow"}, // 艺术品进口需特别注意海关

        // --- 大洋洲 ---
        AUS: {vat: 0.10, duty: 0.05, name: "澳大利亚", flag: "🇦🇺", isEU: false, timeZone: "Australia/Sydney"}, // GST 10%
        NZL: {vat: 0.15, duty: 0.05, name: "新西兰", flag: "🇳🇿", isEU: false, timeZone: "Pacific/Auckland"},

        // --- 亚洲 (发达经济体) ---
        JPN: {vat: 0.10, duty: 0.00, name: "日本", flag: "🇯🇵", isEU: false, timeZone: "Asia/Tokyo"},
        KOR: {vat: 0.10, duty: 0.00, name: "韩国", flag: "🇰🇷", isEU: false, timeZone: "Asia/Seoul"},
        SGP: {vat: 0.09, duty: 0.00, name: "新加坡", flag: "🇸🇬", isEU: false, timeZone: "Asia/Singapore"}, // 亚洲艺术中心
        HKG: {vat: 0.00, duty: 0.00, name: "中国香港", flag: "🇭🇰", isEU: false, timeZone: "Asia/Hong_Kong"}, // 免税港，大客户多

        // --- 中东 (高溢价区) ---
        ARE: {vat: 0.05, duty: 0.05, name: "阿联酋", flag: "🇦🇪", isEU: false, timeZone: "Asia/Dubai"}, // 迪拜土豪
        SAU: {vat: 0.15, duty: 0.05, name: "沙特", flag: "🇸🇦", isEU: false, timeZone: "Asia/Riyadh"},
        QAT: {vat: 0.00, duty: 0.05, name: "卡塔尔", flag: "🇶🇦", isEU: false, timeZone: "Asia/Qatar"},

        // --- 南美洲 ---
        COL: {vat: 0.19, duty: 0.10, name: "哥伦比亚", flag: "🇨🇴", isEU: false, timeZone: "America/Bogota"},
        BRA: {vat: 0.17, duty: 0.60, name: "巴西", flag: "🇧🇷", isEU: false, timeZone: "America/Sao_Paulo"}, // 注意：巴西税极高，慎做DDP
        CHL: {vat: 0.19, duty: 0.06, name: "智利", flag: "🇨🇱", isEU: false, timeZone: "America/Santiago"},
    },

    // 尺寸预设配置（成本和重量）
    SIZE_PRESETS: {
        // === 画心系列 (Rolled Canvas) ===
        "20x24_rolled": {cost: 65, weight: 0.6, name: "📍 画心: 20x24\" (50x60cm)"},
        "24x36_rolled": {cost: 119, weight: 1.0, name: "📍 画心: 24x36\" (60x90cm)"},
        "30x40_rolled": {cost: 185, weight: 1.5, name: "📍 画心: 30x40\" (75x100cm)"},
        "36x48_rolled": {cost: 260, weight: 2.0, name: "📍 画心: 36x48\" (90x120cm)"},
        "48x72_rolled": {cost: 450, weight: 3.5, name: "📍 画心: 48x72\" (120x180cm)"},

        // === 带框系列 (Stretched/Framed) - 包含木架材积重 ===
        "20x24_framed": {cost: 85, weight: 6.0, name: "🖼️ 带框: 20x24\" (50x60cm)"},
        "24x36_framed": {cost: 149, weight: 12.0, name: "🖼️ 带框: 24x36\" (60x90cm)"},
        "30x40_framed": {cost: 225, weight: 18.0, name: "🖼️ 带框: 30x40\" (75x100cm)"},
        "36x48_framed": {cost: 320, weight: 28.0, name: "🖼️ 带框: 36x48\" (90x120cm)"},
        "48x72_framed": {cost: 550, weight: 55.0, name: "🖼️ 带框: 48x72\" (120x180cm)"},

        "custom": {cost: 0, weight: 0, name: "自定义尺寸"}
    },

    // 系统默认值
    DEFAULTS: {
        exRate: 7,                  // 汇率 USD/CNY
        baseCost: 119,              // 单幅进价 ￥
        weight: 4.0,                // 均重 KG
        shipRate: 52,               // 国际运费 ￥/KG
        packCost: 10,               // 包装杂费 ￥
        domesticShipping: 15,       // 国内快递 ￥
        feeRate: 5.0,               // 支付手续费 %
        lossRate: 0.9,              // 结汇损失 %
        commissionRate: 2.0,        // 业务提成 %
        declareRate: 70,            // 报关比例 %
        salary: 0,                  // 员工总工资 ￥
        rent: 0,                    // 房租水电杂费 ￥
        targetProfit: 1000000,      // 月利润目标 ￥
        quoteQty: 10,               // 报价数量
        expMargin: 65,              // 期望利润率 %
        depPercent: 30,             // 定金比例 %
        insuranceRate: 0.5,         // CIP保险费率 %
        insuranceMarkup: 110,       // 【新增】投保加成比例 % (默认 110%)
        fixedCostDivisor: 2000      // 固定开支分摊基准销量
    },

    // 订单状态配置
    ORDER_STATUS: {
        COMPLETED: 'completed',           // 已发货已收款
        SHIPPED_UNPAID: 'shipped_unpaid', // 已发货未收款
        UNSHIPPED_PAID: 'unshipped_paid', // 未发货已收款
        PREORDER: 'preorder',             // 未发货未收款
        CANCELLED: 'cancelled'            // 已取消
    },

    // 支付类型配置
    PAYMENT_TYPES: {
        DEPOSIT: 'deposit',  // 定金
        BALANCE: 'balance',  // 尾款
        REFUND: 'refund',    // 退款
        OTHER: 'other'       // 其他
    },

    // 发货状态配置
    SHIPPING_STATUS: {
        UNSHIPPED: 'unshipped',  // 未发货
        SHIPPED: 'shipped',      // 已发货
        DELIVERED: 'delivered'   // 已送达
    },

    // 付款状态配置
    PAYMENT_STATUS: {
        UNPAID: 'unpaid',          // 未付款
        PARTIAL_PAID: 'partial_paid', // 部分付款
        DEPOSIT_PAID: 'deposit_paid', // 定金已付
        FULL_PAID: 'full_paid'     // 已全款
    },

    // 业务模式配置
    BUSINESS_MODES: {
        STANDARD: 'standard',  // 标准模式
        FOB: 'fob',            // FOB离岸模式
        DDP: 'ddp'             // DDP包税模式
    }
};

// 本地存储键名
const STORAGE_KEYS = {
    THEME: 'dafen_theme',
    APP_DATA: 'dafen_boss_data',
    ORDERS: 'dafen_orders'
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {CONFIG, STORAGE_KEYS};
} else {
    window.CONFIG = CONFIG;
    window.STORAGE_KEYS = STORAGE_KEYS;
}
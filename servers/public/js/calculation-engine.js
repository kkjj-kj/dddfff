/**
 * calculation-engine.js
 * 功能：核心计算引擎
 * 业务：处理所有成本、利润、建议价格的计算逻辑
 */

// 计算引擎类
const CalculationEngine = {
    /**
     * 获取基础参数（从输入值提取）
     * @param {Object} values - 输入值
     * @param {Object} country - 国家配置
     * @returns {Object} 计算参数
     */
    getBaseParams(values, country = {vat: 0, duty: 0}) {
        return {
            // 汇率和成本
            exchangeRate: MathUtils.safeParse(values.exRate, CONFIG.DEFAULTS.exRate),
            canvasPrice: MathUtils.safeParse(values.baseCost, CONFIG.DEFAULTS.baseCost),
            forwarderRate: MathUtils.safeParse(values.shipRate, CONFIG.DEFAULTS.shipRate),
            canvasWeight: MathUtils.safeParse(values.weight, CONFIG.DEFAULTS.weight),
            domesticShipping: MathUtils.safeParse(values.domesticShipping, CONFIG.DEFAULTS.domesticShipping),

            // 费率（转换为小数）
            paymentFeeRate: MathUtils.safeParse(values.feeRate, CONFIG.DEFAULTS.feeRate) / 100,
            exchangeLossRate: MathUtils.safeParse(values.lossRate, CONFIG.DEFAULTS.lossRate) / 100,
            commissionRate: MathUtils.safeParse(values.commissionRate, CONFIG.DEFAULTS.commissionRate) / 100,
            declareRate: MathUtils.safeParse(values.declareRate, CONFIG.DEFAULTS.declareRate) / 100,

            // 固定开支
            salaryTotal: MathUtils.safeParse(values.salary, CONFIG.DEFAULTS.salary),
            fixedFees: MathUtils.safeParse(values.rent, CONFIG.DEFAULTS.rent),

            // 其他成本
            packCost: MathUtils.safeParse(values.packCost, CONFIG.DEFAULTS.packCost),

            // 税务
            vatRate: country.vat || 0,
            dutyRate: country.duty || 0,

            // 【新增】识别是否为欧盟国家
            isEU: country.isEU || false,

            // 业务模式
            isFOB: values.isFOB || false,
            isDDP: values.isTax || false,
            isCIP: values.isCIP || false,
            insuranceRate: (MathUtils.safeParse(values.insuranceRate, CONFIG.DEFAULTS.insuranceRate)) / 100,
            insuranceMarkup: (MathUtils.safeParse(values.insuranceMarkup, CONFIG.DEFAULTS.insuranceMarkup)) / 100
        };
    },

    /**
     * 计算单幅成本明细
     * @param {Object} params - 基础参数
     * @param {number} targetQty - 目标销量（用于分摊固定成本）
     * @returns {Object} 成本明细
     */
    getUnitCosts(params, targetQty = null) {
        // 国内快递成本
        const unitDomesticCost = params.domesticShipping;

        // 国际运费成本（FOB模式为0）
        const unitInternationalCost = params.isFOB ? 0 : (params.canvasWeight * params.forwarderRate);

        // 【新增】欧盟包裹处理费 (3欧元 ≈ 24人民币) - PDF Source 6
        const euParcelFee = params.isEU ? 24 : 0;

        // 物理成本（直接成本）+ 欧盟附加费
        const unitPhysicalCost = params.canvasPrice + unitDomesticCost + unitInternationalCost + params.packCost + euParcelFee;

        // 固定成本分摊（工资和杂费）
        const effectiveDivisor = targetQty > 0 ? targetQty : CONFIG.DEFAULTS.fixedCostDivisor;
        const fixedCostPerUnit = (params.salaryTotal + params.fixedFees) / Math.max(1, effectiveDivisor);

        // 总成本
        const totalUnitCost = unitPhysicalCost + fixedCostPerUnit;

        return {
            unitDomesticCost,      // 国内快递
            unitInternationalCost, // 国际运费
            unitPhysicalCost,      // 物理成本
            euParcelFee,           // 【新增】欧盟费（方便以后查看，虽然这里没单独返回显示）
            fixedCostPerUnit,      // 固定成本分摊
            totalUnitCost          // 总成本
        };
    },

    /**
     * 计算建议价格（基于期望利润率）
     * @param {Object} costs - 成本明细
     * @param {Object} params - 基础参数
     * @param {number} margin - 期望利润率（百分比）
     * @param {Object} country - 国家配置
     * @returns {number} 建议价格（USD）
     */
    calculateSuggestedPrice(costs, params, margin, country) {
        // 1. 计算税费 (仅DDP模式)
        const taxAmountCNY = params.isDDP ?
            (costs.unitPhysicalCost * (country.vat + country.duty) * params.declareRate) : 0;

        // 2. 计算保险费 (仅CIP和DDP模式)
        // 逻辑：CIP价格通常包含保险。简单估算：(物理成本+运费) * 1.1 * 费率
        // 注意：这里costs.unitPhysicalCost已经包含了运费(因为isCIP时isFOB为false)
        const insuranceCNY = (params.isCIP || params.isDDP) ?
            (costs.unitPhysicalCost * params.insuranceMarkup * params.insuranceRate) : 0;

        // 3. 总费率（支付手续费+结汇损失）
        const totalFeeRate = params.paymentFeeRate + params.exchangeLossRate;

        // 4. 计算分母（1 - 总费率 - 利润率）
        const denominator = 1 - totalFeeRate - (margin / 100);
        const safeDenominator = Math.max(0.01, denominator);

        // 5. 计算公式
        // DDP: (成本 + 税) / 分母
        // CIP: (成本 + 保险) / 分母
        // FOB: (成本[无运费]) / 分母
        const costBase = costs.unitPhysicalCost + taxAmountCNY + insuranceCNY;

        const priceCNY = costBase / safeDenominator;
        return priceCNY / params.exchangeRate;
    },

    /**
     * 计算手动报价的利润
     * @param {number} manualPriceUSD - 手动报价（USD）
     * @param {Object} params - 基础参数
     * @param {Object} costs - 成本明细
     * @param {Object} country - 国家配置
     * @returns {Object} 利润计算结果
     */
    calculateManualProfit(manualPriceUSD, params, costs, country) {
        // 转换为人民币
        const priceCNY = manualPriceUSD * params.exchangeRate;

        // 计算税费（DDP模式）
        const taxCostCNY = params.isDDP ?
            (costs.unitPhysicalCost * (country.vat + country.duty) * params.declareRate) : 0;

        // 计算保险费（DDP 或 CIP 模式）
        const insuranceCNY = (params.isCIP || params.isDDP) ?
            (priceCNY * params.insuranceMarkup * params.insuranceRate) : 0;

        // 计算手续费
        const totalFeeRate = params.paymentFeeRate + params.exchangeLossRate;
        const feeCostCNY = priceCNY * totalFeeRate;

        // === 核心修改在这里 ===
        // 计算净利润：必须减去 fixedCostPerUnit (房租工资分摊)
        // 之前的公式漏减了这一项，导致利润虚高
        const netProfitCNY = priceCNY
            - costs.unitPhysicalCost
            - costs.fixedCostPerUnit  // <--- 补上这一刀！
            - taxCostCNY
            - insuranceCNY
            - feeCostCNY;

        // 计算利润率
        const margin = priceCNY > 0 ? (netProfitCNY / priceCNY) * 100 : 0;

        return {
            priceUSD: manualPriceUSD,
            priceCNY: priceCNY,
            netProfitCNY: netProfitCNY,
            margin: margin,
            taxCostCNY: taxCostCNY,
            insuranceCNY: insuranceCNY,
            feeCostCNY: feeCostCNY,
            physicalCostCNY: costs.unitPhysicalCost,
            fixedCostCNY: costs.fixedCostPerUnit // 方便以后查看
        };
    },

    /**
     * 计算财务对账数据 (修复版：权责发生制 + 现金流分离)
     * @param {Object} params - 基础参数
     * @param {Object} values - 输入值
     * @param {Object} costs - 成本明细
     * @returns {Object} 财务对账数据
     */
    calculateFinancialData(params, values, costs) {
        // 1. 获取基础统计数据
        const stats = StateManager.getOrderStats();

        // 2. 获取手动输入的月度支出
        // 注意：广告费 actAd 是 CNY，代扣费 actDeductions 是 USD
        const actDeductionsUSD = MathUtils.safeParse(values.actDeductions || 0);
        const actAdCNY = MathUtils.safeParse(values.actAd || 0);

        // --- 核心修复：初始化累加器 ---
        let recognizedRevenueUSD = 0; // 已实现营收（已发货/已完成）
        let cashFlowInUSD = 0;        // 现金流入（实收金额）

        // 成本累加器（仅针对已实现营收的订单）
        let totalCanvasCost = 0;
        let totalDomesticCost = 0;
        let totalInternationalCost = 0;
        let totalPackCost = 0;
        let totalTaxCost = 0;
        let totalInsuranceCost = 0;
        let totalEuFee = 0;

        // 3. 遍历所有订单进行核算
        StateManager.orders.forEach(order => {
            const config = order.configSnapshot || {};
            const qty = order.qty || 1;

            // --- A. 现金流视角：只要收了钱就算现金流入 ---
            cashFlowInUSD += (order.totalReceived || 0);

            // --- B. 利润视角：只有【已发货】或【已完成】才算真正赚了钱 ---
            if (order.status === CONFIG.ORDER_STATUS.COMPLETED ||
                order.status === CONFIG.ORDER_STATUS.SHIPPED_UNPAID) {

                // 计入已实现营收
                recognizedRevenueUSD += order.total;

                // --- 计算该订单的对应成本 (与原逻辑一致，但只针对有效订单) ---

                // 1. 基础物理成本
                const orderCanvasPrice = MathUtils.safeParse(config.baseCost, params.canvasPrice);
                totalCanvasCost += orderCanvasPrice * qty;

                const orderDomesticShipping = MathUtils.safeParse(config.domesticShipping, params.domesticShipping);
                totalDomesticCost += orderDomesticShipping * qty;

                const orderPackCost = MathUtils.safeParse(config.packCost, params.packCost);
                totalPackCost += orderPackCost * qty;

                // 2. 国际运费 (非FOB模式才算)
                let orderShipCost = 0;
                if (!config.isFOB) {
                    const orderWeight = MathUtils.safeParse(config.weight, params.canvasWeight);
                    const orderShipRate = MathUtils.safeParse(config.shipRate, params.forwarderRate);
                    orderShipCost = (orderWeight * orderShipRate);
                    totalInternationalCost += orderShipCost * qty;
                }

                // 3. 欧盟操作费
                const code = config.quoteCountry || 'USA';
                const countryConfig = CONFIG.COUNTRIES[code];
                const isEuOrder = countryConfig ? countryConfig.isEU : false;
                const orderEuFee = isEuOrder ? 24 : 0;
                totalEuFee += orderEuFee * qty;

                // 4. 保险费 (CIP 或 DDP)
                let orderInsurance = 0;
                if (config.isCIP || config.isTax) {
                    const baseForIns = order.total * params.exchangeRate;
                    const insRate = (config.insuranceRate !== undefined ? config.insuranceRate : params.insuranceRate);
                    const insMarkup = (config.insuranceMarkup !== undefined ? config.insuranceMarkup : params.insuranceMarkup);
                    orderInsurance = baseForIns * insMarkup * insRate;
                    totalInsuranceCost += orderInsurance * qty;
                }

                // 5. 税费 (DDP)
                if (config.isTax) {
                    const orderDeclareRate = MathUtils.safeParse(config.declareRate, params.declareRate * 100) / 100;
                    const baseForTax = orderCanvasPrice + orderDomesticShipping + orderPackCost + orderShipCost + orderEuFee;
                    const declaredValue = baseForTax * orderDeclareRate;
                    const taxRate = (config.countryVat || 0) + (config.countryDuty || 0);
                    totalTaxCost += (declaredValue * taxRate) * qty;
                }
            }
        });

        // 4. 汇总计算
        // 扣除手动输入的代扣费（视为财务损耗，从营收中扣除）
        const finalRevenueUSD = Math.max(0, recognizedRevenueUSD - actDeductionsUSD);
        const totalRevenueCNY = finalRevenueUSD * params.exchangeRate;

        // 物理总成本 (含欧盟费)
        const totalPhysCost = totalCanvasCost + totalDomesticCost + totalInternationalCost + totalPackCost + totalEuFee;

        // 固定成本 (工资+房租) - 这是月度硬支出，必须全额扣除
        const totalFixedCost = params.salaryTotal + params.fixedFees;

        // 总成本 = 物理成本 + 广告费(CNY) + 固定成本 + 税费 + 保险费
        const totalCost = totalPhysCost + actAdCNY + totalFixedCost + totalTaxCost + totalInsuranceCost;

        // 5. 计算利润
        const profitBeforeCommission = totalRevenueCNY - totalCost;

        // --- 修复：提成按销售额(营收)计算，而非净利润 ---
        const commission = Math.max(0, totalRevenueCNY * params.commissionRate);

        // 最终净利润
        const finalProfit = profitBeforeCommission - commission;

        // 6. 计算占比辅助函数
        const getPercentage = (part) => {
            return totalRevenueCNY > 0 ? MathUtils.calculatePercentage(part, totalRevenueCNY) : 0;
        };

        return {
            // 营收数据
            totalRevenueUSD: finalRevenueUSD,
            totalRevenueCNY,
            cashFlowInUSD, // 新增：实际现金流入，用于健康度分析

            // 成本细项
            totalCanvasCost,
            totalDomesticCost,
            totalInternationalCost,
            totalPackCost,
            totalEuFee,
            totalInsuranceCost,
            totalTaxCost,
            totalAdCost: actAdCNY,
            totalFixedCost,

            totalPhysCost,
            totalCost,

            // 利润数据
            profitBeforeCommission,
            commission,
            finalProfit,

            // 占比分析
            adCostPct: getPercentage(actAdCNY),
            totalCostPct: getPercentage(totalCost),
            finalProfitPct: getPercentage(finalProfit),

            // 原始统计
            stats: stats
        };
    },

    /**
     * 计算现金流健康度
     * @param {Object} financialData - 财务数据
     * @param {Object} params - 基础参数
     * @returns {Object} 现金流健康度数据
     */
    calculateCashflowHealth(financialData, params) {
        // 月度固定支出
        const monthlyFixedCost = params.salaryTotal + params.fixedFees;
        const adSpend = financialData.totalAdCost;

        // 现金流覆盖率 = 实际利润 / (固定成本 + 广告支出)
        const cashCoverage = (monthlyFixedCost + adSpend) > 0 ?
            (financialData.finalProfit / (monthlyFixedCost + adSpend)) * 100 : 100;

        // 回款率 = 已收款订单总额 / 已发货订单总额
        const totalShippedAmount = financialData.stats.completedAmount + financialData.stats.shippedUnpaidAmount;
        const collectionRate = totalShippedAmount > 0 ?
            (financialData.stats.completedAmount / totalShippedAmount) * 100 : 100;

        // 综合健康度（现金流覆盖率权重60%，回款率权重40%）
        let healthScore = (Math.min(cashCoverage, 150) * 0.6) + (collectionRate * 0.4);
        healthScore = MathUtils.clamp(healthScore, 0, 100);

        // 健康等级评估
        let healthLevel, healthMessage;

        if (healthScore >= 80) {
            healthLevel = 'excellent';
            healthMessage = '现金流健康';
        } else if (healthScore >= 60) {
            healthLevel = 'good';
            healthMessage = '现金流正常';
        } else if (healthScore >= 40) {
            healthLevel = 'warning';
            healthMessage = '现金流紧张，注意回款';
        } else {
            healthLevel = 'danger';
            healthMessage = '现金流危险，急需催款';
        }

        return {
            score: MathUtils.round(healthScore, 1),
            level: healthLevel,
            message: healthMessage,
            cashCoverage: MathUtils.round(cashCoverage, 1),
            collectionRate: MathUtils.round(collectionRate, 1)
        };
    },

    /**
     * 计算战略KPI (修复版：扣除保费，防止CPA建议虚高)
     * @param {Object} params - 基础参数
     * @param {Object} costs - 成本明细
     * @param {Object} values - 输入值
     * @returns {Object} 战略KPI数据
     */
    calculateStrategyKPI(params, costs, values) {
        const targetProfit = MathUtils.safeParse(values.targetProfit, CONFIG.DEFAULTS.targetProfit);
        const manualPrice = MathUtils.safeParse(values.manualUSD, 0);
        const country = StateManager.getSelectedCountry();

        // 获取当前价格
        const suggestUSDEl = StateManager.getDisplay('suggestUSD');
        const suggestPrice = suggestUSDEl ?
            MathUtils.safeParse(suggestUSDEl.textContent.replace('$', '')) : 125;

        const unitPriceUSD = manualPrice > 0 ? manualPrice : suggestPrice;
        const unitPriceCNY = unitPriceUSD * params.exchangeRate;

        // 1. 计算各项损耗
        const totalFeeRate = params.paymentFeeRate + params.exchangeLossRate;
        const unitFee = unitPriceCNY * totalFeeRate;

        const unitTax = params.isDDP ?
            (costs.unitPhysicalCost * (country.vat + country.duty) * params.declareRate) : 0;

        // --- 修复点：计算保费 (按售价算) ---
        const unitInsurance = (params.isCIP || params.isDDP) ?
            (unitPriceCNY * params.insuranceMarkup * params.insuranceRate) : 0;

        // 2. 计算单幅毛利 (扣除物理成本、手续费、税费、保费)
        const unitGrossProfit = unitPriceCNY - costs.unitPhysicalCost - unitFee - unitTax - unitInsurance;

        // CPA天花板（最大可承受广告成本）
        const maxCeilingCPA = unitGrossProfit > 0 ?
            MathUtils.round(unitGrossProfit / params.exchangeRate, 1) : 0;

        // 订单统计
        const stats = StateManager.getOrderStats();

        // 实际广告支出
        const actAd = MathUtils.safeParse(values.actAd, 0);

        // 计算当前已实现利润
        const currentRealizedProfit = stats.completedProfit;

        // 计算剩余利润目标
        const remainingProfit = Math.max(0, targetProfit - currentRealizedProfit);

        // 计算所需销量（考虑已有成交）
        let neededQty;
        if (unitGrossProfit <= 0) {
            neededQty = 99999; // 利润为负，无法达成
        } else {
            neededQty = Math.ceil((remainingProfit + actAd) / unitGrossProfit);
        }

        // 剩余销量 = 所需销量 - 已完成销量
        const remainingQty = Math.max(0, neededQty - stats.completedQty);

        // 计算动态CPA建议
        let dynamicCPA;
        if (stats.completedQty === 0) {
            // 尚无成交，保守建议 (30%空间)
            dynamicCPA = MathUtils.round(maxCeilingCPA * 0.3, 1);
        } else {
            // 基于历史表现和剩余利润空间
            const avgProfitPerUnit = stats.completedQty > 0 ?
                stats.completedProfit / stats.completedQty : unitGrossProfit;

            const remainingProfitPool = (remainingQty * avgProfitPerUnit) - remainingProfit - actAd;
            const budgetBasedCPA = (remainingProfitPool / Math.max(1, remainingQty)) / params.exchangeRate;

            // 取保守值（最大可承受的40%或基于预算的计算值）
            dynamicCPA = MathUtils.round(
                Math.max(0, Math.min(maxCeilingCPA * 0.4, budgetBasedCPA)), 1
            );
        }

        // 防止CPA为0
        if (dynamicCPA === 0 && maxCeilingCPA > 0) {
            dynamicCPA = MathUtils.round(maxCeilingCPA * 0.1, 1);
        }

        // 计算剩余营收目标
        const remainingRevenue = remainingQty * unitPriceUSD * params.exchangeRate;

        return {
            // 销量相关
            neededTotalQty: neededQty,
            remainingQty: remainingQty,
            completedQty: stats.completedQty,

            // 价格和利润
            unitPriceUSD: unitPriceUSD,
            unitGrossProfit: unitGrossProfit,
            maxCeilingCPA: maxCeilingCPA,
            dynamicCPA: dynamicCPA,

            // 营收和利润
            remainingRevenue: remainingRevenue,
            currentRealizedProfit: currentRealizedProfit,
            remainingProfit: remainingProfit,
            targetProfit: targetProfit,

            // 进度
            profitCompletion: targetProfit > 0 ?
                MathUtils.calculatePercentage(currentRealizedProfit, targetProfit) : 0,
            qtyCompletion: (stats.completedQty + remainingQty) > 0 ?
                MathUtils.calculatePercentage(stats.completedQty, stats.completedQty + remainingQty) : 0
        };
    },

    /**
     * 计算定金安全分析
     * @param {Object} params - 基础参数
     * @param {Object} costs - 成本明细
     * @param {Object} values - 输入值
     * @returns {Object} 定金分析数据
     */
    calculateDepositAnalysis(params, costs, values) {
        const quoteQty = Math.max(1, MathUtils.safeParse(values.quoteQty, CONFIG.DEFAULTS.quoteQty));
        const manualPrice = MathUtils.safeParse(values.manualUSD, 0);
        const country = StateManager.getSelectedCountry();

        // 获取建议价格
        const suggestUSDEl = StateManager.getDisplay('suggestUSD');
        const suggestPrice = suggestUSDEl ?
            MathUtils.safeParse(suggestUSDEl.textContent.replace('$', '')) : 0;

        const effectivePriceUSD = manualPrice > 0 ? manualPrice : suggestPrice;

        // 检查价格是否有效
        if (effectivePriceUSD <= 0) {
            return {
                isValid: false,
                message: '价格无效'
            };
        }

        // 计算订单总金额
        const orderTotalUSD = effectivePriceUSD * quoteQty;
        const orderTotalCNY = orderTotalUSD * params.exchangeRate;

        // 定金比例
        const depositPercent = MathUtils.safeParse(
            StateManager.inputs.depPercentSlider?.value,
            CONFIG.DEFAULTS.depPercent
        ) / 100;

        // 定金金额
        const depositUSD = orderTotalUSD * depositPercent;
        const depositCNY = depositUSD * params.exchangeRate;

        // 单幅税费
        const unitTax = params.isDDP ?
            (costs.unitPhysicalCost * (country.vat + country.duty) * params.declareRate) : 0;

        // 实际支出成本（物理成本+税费）
        const totalOutOfPocket = (costs.unitPhysicalCost + unitTax) * quoteQty;

        // 定金覆盖率
        const coverage = totalOutOfPocket > 0 ? (depositCNY / totalOutOfPocket) * 100 : 0;

        // 安全评估
        let isSafe = coverage >= 100;
        let status, statusClass;

        if (coverage >= 100) {
            status = '✓ 定金已覆盖风险成本';
            statusClass = 'safe';
        } else if (coverage >= 70) {
            status = '⚠ 风险中等';
            statusClass = 'warning';
        } else {
            status = '✗ 定金严重不足';
            statusClass = 'danger';
        }

        return {
            isValid: true,

            // 金额
            orderTotalUSD: orderTotalUSD,
            orderTotalCNY: orderTotalCNY,
            depositUSD: depositUSD,
            depositCNY: depositCNY,
            outOfPocket: totalOutOfPocket,

            // 比例
            depositPercent: depositPercent * 100,
            coverage: coverage,

            // 状态
            isSafe: isSafe,
            status: status,
            statusClass: statusClass
        };
    },

    /**
     * 计算全球市场利润指数
     * @param {number} basePriceUSD - 基础价格（USD）
     * @param {Object} params - 基础参数
     * @param {Object} costs - 成本明细
     * @returns {Array} 各国利润数据
     */
    calculateGlobalProfitIndex(basePriceUSD, params, costs) {
        const countries = Object.values(CONFIG.COUNTRIES);
        const result = [];

        countries.forEach(country => {
            const profitData = this.calculateManualProfit(basePriceUSD, params, costs, country);

            result.push({
                country: country.name,
                flag: country.flag,
                vat: country.vat * 100,
                profitCNY: profitData.netProfitCNY,
                profitUSD: profitData.netProfitCNY / params.exchangeRate,
                margin: profitData.margin,
                taxCostCNY: profitData.taxCostCNY
            });
        });

        // 按利润降序排序
        result.sort((a, b) => b.profitCNY - a.profitCNY);

        return result;
    }
};

// 导出计算引擎
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {CalculationEngine};
} else {
    window.CalculationEngine = CalculationEngine;
}
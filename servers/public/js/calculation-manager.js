/**
 * ui-manager.js
 * 功能：用户界面管理和交互
 * 业务：DOM操作、事件处理、数据展示
 */

// UI管理器
const CalculationManager = {
        // 初始化标志
        initialized: false,

        /**
         * 初始化UI
         */
        init() {
            if (this.initialized) return;

            try {
                // 1. 注册所有元素
                StateManager.registerElements();

                // 2. 初始化组件
                this.initCountrySelect();
                this.initCharts();
                this.initTheme();
                this.initCRMSearch();

                // 3. 加载数据
                StateManager.loadAllData();

                // 4. 绑定事件
                this.bindEvents();

                // 5. 初始化订单
                StateManager.initOrderStatus();

                // 6. 计算初始值
                this.calculateAll();

                this.initialized = true;
                console.log('UI初始化完成');
            } catch (error) {
                console.error('UI初始化失败:', error);
            }
        },

        /**
         * 初始化国家选择下拉框
         */
        initCountrySelect() {
            const select = StateManager.inputs.quoteCountry;
            if (!select) return;

            // 清空现有选项
            select.innerHTML = '';

            // 添加国家选项
            Object.entries(CONFIG.COUNTRIES).forEach(([code, country]) => {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = `${country.flag} ${country.name} (VAT: ${(country.vat * 100).toFixed(1)}%)`;
                select.appendChild(option);
            });

            // 设置默认值
            select.value = 'USA';
        },

        /**
         * 初始化图表
         */
        initCharts() {
            // 全球利润图表
            this.initMarketChart();

            // 订单状态图表
            this.initStatusChart();
        },

        /**
         * 初始化全球利润图表
         */
        initMarketChart() {
            const canvas = document.getElementById('marketChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            StateManager.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.values(CONFIG.COUNTRIES).map(c => c.name),
                    datasets: [{
                        label: '单幅利润(￥)',
                        data: new Array(Object.keys(CONFIG.COUNTRIES).length).fill(0),
                        backgroundColor: 'rgba(79, 70, 229, 0.7)',
                        borderColor: 'rgba(79, 70, 229, 1)',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `利润: ￥${MathUtils.round(context.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.03)'
                            },
                            ticks: {
                                color: '#64748b',
                                font: {
                                    size: 9
                                },
                                callback: function (value) {
                                    return '￥' + value;
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: {
                                    size: 9
                                },
                                callback: function (value) {
                                    const label = this.getLabelForValue(value);
                                    return label.length > 8 ? label.substring(0, 8) + '...' : label;
                                }
                            }
                        }
                    }
                }
            });
        },

        /**
         * 初始化订单状态图表
         */
        initStatusChart() {
            const canvas = document.getElementById('statusChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            StateManager.statusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['已完成', '已发货待收款', '待发货已收款', '预订单', '已取消'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(100, 116, 139, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#94a3b8',
                                font: {
                                    size: 10
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? MathUtils.round((value / total) * 100, 1) : 0;
                                    return `${label}: ${value} 单 (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        },

        /**
         * 初始化主题
         */
        initTheme() {
            const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
            if (savedTheme === 'light') {
                document.body.classList.add('light-theme');
                this.updateThemeIcon('light');
            } else {
                this.updateThemeIcon('dark');
            }
        },

        /**
         * 更新主题图标
         * @param {string} theme - 主题
         */
        updateThemeIcon(theme) {
            const icon = StateManager.getDisplay('themeIcon');
            if (!icon) return;

            if (theme === 'light') {
                icon.className = 'fas fa-sun text-amber-500';
            } else {
                icon.className = 'fas fa-moon text-indigo-400';
            }
        },

        /**
         * 绑定所有事件
         */
        bindEvents() {
            // 基础输入事件
            this.bindInputEvents();

            // 特殊控件事件
            this.bindSpecialEvents();

            // 按钮事件
            this.bindButtonEvents();

            // 模态框事件
            this.bindModalEvents();
        },

        /**
         * 绑定输入事件
         */
        bindInputEvents() {
            const inputIds = [
                'exRate', 'sizePreset', 'baseCost', 'weight', 'shipRate', 'packCost', 'domesticShipping',
                'feeRate', 'lossRate', 'commissionRate', 'declareRate', 'insuranceRate', 'insuranceMarkup',
                'salary', 'rent', 'targetProfit', 'quoteQty', 'expMargin',
                'quoteCountry', 'manualUSD',
                'actDeductions', 'actAd'
            ];

            inputIds.forEach(id => {
                const element = StateManager.inputs[id];
                if (element) {
                    element.addEventListener('input', () => this.handleInputChange(id));
                    if (element.type === 'select-one') {
                        element.addEventListener('change', () => this.handleInputChange(id));
                    }
                }
            });
        },

        /**
         * 绑定特殊事件
         */
        bindSpecialEvents() {
            // === 核心修改：FOB/CIP/DDP 三选一互斥逻辑 ===
            const modes = ['isFOB', 'isCIP', 'isTax'];

            modes.forEach(mode => {
                const el = document.getElementById(mode);
                if (!el) return;

                el.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        // 选中当前开关时，自动关闭其他两个开关
                        modes.filter(m => m !== mode).forEach(other => {
                            const otherEl = document.getElementById(other);
                            if (otherEl) otherEl.checked = false;
                        });
                    }
                    // 更新顶部的文字提示（如"建议CIP成交单价"）
                    this.updateModeIndicator();
                    // 重新计算所有数字
                    this.calculateAll();
                });
            });
            // ===========================================

            // 尺寸预设
            StateManager.inputs.sizePreset?.addEventListener('change', (e) => {
                const preset = CONFIG.SIZE_PRESETS[e.target.value];
                if (preset && e.target.value !== 'custom') {
                    this.applySizePreset(preset);
                    this.calculateAll();
                }
            });

            // 定金滑块
            StateManager.inputs.depPercentSlider?.addEventListener('input', (e) => {
                const value = e.target.value;
                StateManager.updateDisplay('depPercentDisplay', `${value}%`);
                this.calculateAll();
            });

            // 手动报价
            StateManager.inputs.manualUSD?.addEventListener('input', () => {
                const val = MathUtils.safeParse(StateManager.inputs.manualUSD?.value, 0);
                const targetSourceEl = StateManager.getDisplay('targetSource');
                if (targetSourceEl) {
                    targetSourceEl.textContent = val > 0 ?
                        `基于手动报价 $${MathUtils.round(val, 2)}` : `基于建议价`;
                }
                this.calculateAll();
            });
        },

        /**
         * 绑定按钮事件
         */
        bindButtonEvents() {
            // 快速利润率按钮
            document.querySelectorAll('[onclick*="setMargin"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const match = btn.getAttribute('onclick').match(/setMargin\((\d+)\)/);
                    if (match) {
                        this.setMargin(parseInt(match[1]));
                    }
                });
            });

            // 使用建议价格按钮
            const useSuggestBtn = document.querySelector('[onclick*="useSuggestPrice"]');
            if (useSuggestBtn) {
                useSuggestBtn.addEventListener('click', () => this.useSuggestPrice());
            }
        },

        /**
         * 绑定模态框事件
         */
        bindModalEvents() {
            // 成交录入模态框
            const dealQtyInput = StateManager.inputs.dealQty;
            const dealPriceInput = StateManager.inputs.dealPrice;

            if (dealQtyInput) {
                dealQtyInput.addEventListener('input', () => this.updateDealModal());
            }

            if (dealPriceInput) {
                dealPriceInput.addEventListener('input', () => this.updateDealModal());
            }
        },

        /**
         * 处理输入变化
         * @param {string} inputId - 输入ID
         */
        handleInputChange(inputId) {
            // 处理尺寸预设修改
            if (inputId === 'baseCost' || inputId === 'weight') {
                const selectedPreset = StateManager.inputs.sizePreset?.value;
                if (selectedPreset && selectedPreset !== 'custom') {
                    StateManager.userModifiedSizes[selectedPreset] = true;
                }
            }

            // 重新计算
            this.calculateAll();

            // 自动保存
            StateManager.saveAllData();
        },

        /**
         * 应用尺寸预设
         * @param {Object} preset - 尺寸预设
         */
        applySizePreset(preset) {
            // 检查用户是否修改过这个预设
            const presetValue = StateManager.inputs.sizePreset.value;
            if (StateManager.userModifiedSizes[presetValue]) {
                // 用户修改过，不覆盖
                return;
            }

            StateManager.updateValue('baseCost', preset.cost.toString());
            StateManager.updateValue('weight', preset.weight.toString());
        },

        /**
         * 更新模式指示器
         */
        updateModeIndicator() {
            const indicator = StateManager.getDisplay('modeIndicator');
            const suggestTitle = StateManager.getDisplay('suggestTitle');

            if (!indicator) return;

            let modeText, modeClass, titleText;

            // 直接读取界面上的开关状态
            const isFOB = document.getElementById('isFOB')?.checked;
            const isCIP = document.getElementById('isCIP')?.checked;
            const isDDP = document.getElementById('isTax')?.checked; // 注意HTML里DDP的ID是isTax

            // === 核心修改：增加 CIP 的显示逻辑 ===
            if (isFOB) {
                modeText = 'FOB 离岸模式';
                modeClass = 'mode-fob'; // 蓝色
                titleText = '建议 FOB 成交单价';
            } else if (isCIP) {
                modeText = 'CIP 运保模式';
                // 这里我们直接用Tailwind写个绿色样式，区别于其他模式
                modeClass = 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20';
                titleText = '建议 CIP 成交单价';
            } else if (isDDP) {
                modeText = 'DDP 包税模式';
                modeClass = 'mode-ddp'; // 紫色
                titleText = '建议 DDP 成交单价';
            } else {
                modeText = '标准模式';
                modeClass = 'mode-none'; // 灰色
                titleText = '建议成交单价';
            }
            // ====================================

            indicator.textContent = modeText;
            indicator.className = `mode-indicator ${modeClass}`;

            if (suggestTitle) {
                suggestTitle.textContent = titleText;
            }
        },

        /**
         * 设置利润率
         * @param {number} margin - 利润率
         */
        setMargin(margin) {
            if (StateManager.inputs.expMargin) {
                StateManager.inputs.expMargin.value = margin;
                this.calculateAll();
            }
        },

        /**
         * 使用建议价格
         */
        useSuggestPrice() {
            const suggestUSDEl = StateManager.getDisplay('suggestUSD');
            if (!suggestUSDEl) return;

            const suggestPrice = MathUtils.safeParse(suggestUSDEl.textContent.replace('$', ''));
            if (suggestPrice > 0 && StateManager.inputs.manualUSD) {
                StateManager.inputs.manualUSD.value = MathUtils.round(suggestPrice, 2);
                this.calculateAll();
            }
        },

        /**
         * 计算所有数据
         */
        calculateAll() {
            try {
                // 1. 获取全局输入和国家配置
                const rawValues = StateManager.getAllValues();
                const country = StateManager.getSelectedCountry();

                // 统一处理广告费汇率 (USD -> CNY)
                const values = {...rawValues};
                const exRate = MathUtils.safeParse(rawValues.exRate, 7);
                const adUSD = MathUtils.safeParse(rawValues.actAd, 0);
                values.actAd = adUSD * exRate;

                // 2. 转换基础参数
                const params = CalculationEngine.getBaseParams(values, country);

                // 3. 获取真实销量
                const stats = StateManager.getOrderStats();
                const actualSales = stats.completed + stats.shippedUnpaid + stats.unshippedPaid;

                // === 核心修复：分裂计算逻辑 ===

                // A. 财务视角 (Financial View)：残酷的现实
                // 如果只卖了 1 幅，这 1 幅就要背所有房租。用于底部的“财务核算表”。
                const costsForFinance = CalculationEngine.getUnitCosts(params, actualSales);

                // B. 报价视角 (Quoting View)：合理的预估
                // 假设每月至少能卖 50 幅（盈亏平衡基准线），用这个量来分摊房租。
                // 这样算出来的报价才合理，不会吓死客户。
                // 逻辑：取 实际销量 和 50 中的较大值。卖多了按实际算，卖少了按 50 算。
                const standardQty = Math.max(actualSales, 50);
                const costsForQuoting = CalculationEngine.getUnitCosts(params, standardQty);

                // ==============================

                // 4. 分发数据 (注意看传参的区别)

                // 侧边栏成本穿透：用【报价视角】(让你知道正常的成本结构)
                this.updateSidebar(params, costsForQuoting);

                // 报价器：用【报价视角】(算出有竞争力的价格)
                this.updateQuoter(values, params, costsForQuoting, country);

                // 战略KPI：用【报价视角】(计算理想状态下的 CPA)
                this.updateStrategyKPIs(params, costsForQuoting, values);

                // 定金分析：用【报价视角】(通常定金覆盖物理成本即可)
                this.updateDepositAnalysis(values, params, costsForQuoting, country);

                // 全球图表：用【报价视角】
                this.updateCharts(values, params, costsForQuoting, country);

                // --- 唯独这个！财务月报：用【财务视角】(展示真实的盈亏) ---
                this.updateFinancialRecap(params, values, costsForFinance);

                // 5. 统一调用全量渲染
                this.renderOrders();
                this.updateStatsSummary();
                this.updateModeIndicator();

            } catch (error) {
                console.error('计算流程发生错误:', error);
            }
        },


        updateStrategyKPIs(params, costs, values) {
            // 调用引擎计算KPI数据
            const kpi = CalculationEngine.calculateStrategyKPI(params, costs, values);

            // 更新需总销量
            StateManager.updateDisplay('targetQty', MathUtils.formatNumber(kpi.neededTotalQty));

            // 更新销量进度条和缺口提示
            const qtyProgress = document.getElementById('qtyProgress');
            if (qtyProgress) {
                qtyProgress.style.width = `${Math.min(100, kpi.qtyCompletion)}%`;
            }
            StateManager.updateDisplay('qtyGapInfo', kpi.remainingQty > 0 ? `还差 ${kpi.remainingQty} 幅达成目标` : '恭喜！目标已达成');

            // 更新动态 CPA 建议
            StateManager.updateDisplay('targetCPA', `$ ${kpi.dynamicCPA}`);
            StateManager.updateDisplay('cpaLimitInfo', `$ ${kpi.maxCeilingCPA}`);

            // 更新总营收目标 (CNY)
            const totalRevCNY = kpi.neededTotalQty * kpi.unitPriceUSD * params.exchangeRate;
            StateManager.updateDisplay('targetRev', MathUtils.formatCurrency(totalRevCNY, '￥', 0));
        },
        /**
         * 更新侧边栏
         * @param {Object} params - 计算参数
         * @param {Object} costs - 成本
         */
        updateSidebar(params, costs) {
            // 更新成本摘要
            StateManager.updateDisplay('unitPhysCost', MathUtils.formatCurrency(costs.unitPhysicalCost, '￥', 0));
            StateManager.updateDisplay('unitTotalCost', MathUtils.formatCurrency(costs.totalUnitCost, '￥', 0));
        },

        /**
         * 计算目标销量 (优化版)
         * 作用：基于月利润目标和单幅净利，推算出达成目标所需的总销量
         * @param {Object} params - 基础计算参数
         * @param {Object} values - 全局输入值
         * @param {Object} country - 当前国家配置
         * @returns {number} 建议的目标销量
         */
        calculateTargetQty(params, values, country) {
            // 1. 获取目标利润和手动价格
            const targetProfit = MathUtils.safeParse(values.targetProfit, CONFIG.DEFAULTS.targetProfit);
            const manualPrice = MathUtils.safeParse(values.manualUSD, 0);

            // 2. 动态确定单价：拒绝硬编码
            // 逻辑：优先用手动报价，其次用页面显示的建议单价，最后根据期望利润率动态推算
            const suggestUSDEl = StateManager.getDisplay('suggestUSD');
            const suggestPrice = suggestUSDEl ?
                MathUtils.safeParse(suggestUSDEl.textContent.replace('$', '')) : 0;

            let effectivePrice = manualPrice > 0 ? manualPrice : suggestPrice;

            // 兜底逻辑：如果还没有单价数据（如系统初次加载），按当前的期望利润率算一个参考价
            if (effectivePrice <= 0) {
                const margin = MathUtils.safeParse(values.expMargin, CONFIG.DEFAULTS.expMargin);
                const tempCosts = CalculationEngine.getUnitCosts(params, CONFIG.DEFAULTS.fixedCostDivisor);
                effectivePrice = CalculationEngine.calculateSuggestedPrice(tempCosts, params, margin, country);
            }

            // 3. 预估计算：先按默认的分摊基数（如2000幅）算一次单幅成本
            // 目的是为了确定此时的“固定成本分摊”比例
            const baseCosts = CalculationEngine.getUnitCosts(params, CONFIG.DEFAULTS.fixedCostDivisor);

            // 4. 计算在该单价下的单幅纯利润
            const profitData = CalculationEngine.calculateManualProfit(effectivePrice, params, baseCosts, country);

            // 5. 风险检查：如果单幅利润为负（亏本买卖），返回默认基数防止除以0报错
            if (profitData.netProfitCNY <= 0) {
                return CONFIG.DEFAULTS.fixedCostDivisor;
            }

            // 6. 核心公式：需总销量 = (月利润目标 + 固定开支总额) / 单幅纯利润
            const fixedExpenses = params.salaryTotal + params.fixedFees;
            const neededQty = Math.ceil((targetProfit + fixedExpenses) / profitData.netProfitCNY);

            return neededQty;
        },

        /**
         * 更新报价器
         * @param {Object} values - 输入值
         * @param {Object} params - 计算参数
         * @param {Object} costs - 成本
         * @param {Object} country - 国家配置
         */
        updateQuoter(values, params, costs, country) {
            const margin = MathUtils.safeParse(values.expMargin, CONFIG.DEFAULTS.expMargin);
            const quoteQty = MathUtils.safeParse(values.quoteQty, CONFIG.DEFAULTS.quoteQty);

            // 计算成本和建议价格
            const suggestedPrice = CalculationEngine.calculateSuggestedPrice(costs, params, margin, country);

            // 更新建议价格显示
            StateManager.updateDisplay('suggestUSD', `$${MathUtils.round(suggestedPrice, 2)}`);
            StateManager.updateDisplay('suggestTotalOrderUSD', `$${MathUtils.round(suggestedPrice * quoteQty, 2)}`);

            // 更新手动报价分析
            const manualPrice = MathUtils.safeParse(values.manualUSD, 0);
            if (manualPrice > 0) {
                this.updateManualQuoteAnalysis(manualPrice, params, costs, country, margin);
            } else {
                this.resetManualQuoteAnalysis();
            }

            // 更新成本明细
            this.updateCostBreakdown(params, costs, manualPrice > 0 ? manualPrice : suggestedPrice, country);
        },

        /**
         * 更新手动报价分析
         * @param {number} manualPrice - 手动报价
         * @param {Object} params - 计算参数
         * @param {Object} costs - 成本明细
         * @param {Object} country - 国家配置
         * @param {number} expectedMargin - 期望利润率
         */
        updateManualQuoteAnalysis(manualPrice, params, costs, country, expectedMargin) {
            const profitData = CalculationEngine.calculateManualProfit(manualPrice, params, costs, country);

            // 更新利润显示
            StateManager.updateDisplay('mNet', MathUtils.formatCurrency(profitData.netProfitCNY, '￥', 0));

            const netClass = profitData.netProfitCNY >= 0 ?
                'text-xl font-black mono text-emerald-400' :
                'text-xl font-black mono text-rose-500';
            StateManager.getDisplay('mNet').className = netClass;

            // 更新利润率显示
            StateManager.updateDisplay('mMargin', `${MathUtils.round(profitData.margin, 1)}%`);

            const marginClass = profitData.margin >= 0 ?
                'text-xl font-black mono text-emerald-400' :
                'text-xl font-black mono text-rose-500';
            StateManager.getDisplay('mMargin').className = marginClass;

            // 更新状态指示器
            this.updateQuoteStatusIndicator(profitData.margin, expectedMargin, profitData.netProfitCNY);
        },

        /**
         * 更新报价状态指示器
         * @param {number} actualMargin - 实际利润率
         * @param {number} expectedMargin - 期望利润率
         * @param {number} netProfit - 净利润
         */
        updateQuoteStatusIndicator(actualMargin, expectedMargin, netProfit) {
            const statusEl = StateManager.getDisplay('mStatus');
            if (!statusEl) return;

            let statusText, statusClass;

            if (netProfit < 0) {
                statusText = "报价低于成本！";
                statusClass = "text-[10px] font-black uppercase text-center py-2 rounded-xl bg-rose-500 text-white animate-pulse";
            } else if (actualMargin < expectedMargin * 0.5) {
                statusText = "利润极薄 (危险)";
                statusClass = "text-[10px] font-black uppercase text-center py-2 rounded-xl bg-rose-500/80 text-white";
            } else if (actualMargin < expectedMargin * 0.8) {
                statusText = "利润较薄 (谨慎)";
                statusClass = "text-[10px] font-black uppercase text-center py-2 rounded-xl bg-amber-500 text-white";
            } else if (actualMargin < expectedMargin) {
                statusText = "利润接近目标";
                statusClass = "text-[10px] font-black uppercase text-center py-2 rounded-xl bg-indigo-500 text-white";
            } else {
                statusText = "利润达标 (优秀)";
                statusClass = "text-[10px] font-black uppercase text-center py-2 rounded-xl bg-emerald-500 text-white";
            }

            statusEl.textContent = statusText;
            statusEl.className = statusClass;
        },

        /**
         * 重置手动报价分析
         */
        resetManualQuoteAnalysis() {
            StateManager.updateDisplay('mNet', '￥0');
            StateManager.getDisplay('mNet').className = 'text-xl font-black mono text-sky-200';

            StateManager.updateDisplay('mMargin', '0%');
            StateManager.getDisplay('mMargin').className = 'text-xl font-black mono text-sky-200';

            const statusEl = StateManager.getDisplay('mStatus');
            if (statusEl) {
                statusEl.textContent = '---';
                statusEl.className = 'text-[10px] font-black uppercase text-center py-2 rounded-xl bg-slate-800 text-sky-200';
            }
        },

        /**
         * 更新成本明细 (优化版：显示隐形成本)
         * @param {Object} params - 计算参数
         * @param {Object} costs - 成本明细
         * @param {number} priceUSD - 价格（USD）
         * @param {Object} country - 国家配置
         */
        updateCostBreakdown(params, costs, priceUSD, country) {
            const priceCNY = priceUSD * params.exchangeRate;

            // 1. 计算各项财务损耗
            const feeCNY = priceCNY * params.paymentFeeRate;
            const lossCNY = priceCNY * params.exchangeLossRate;
            const totalFeeCNY = feeCNY + lossCNY;

            // 2. 计算税费 (DDP模式)
            let taxCNY = 0;
            if (params.isDDP && country) {
                const declaredValue = costs.unitPhysicalCost * params.declareRate;
                taxCNY = declaredValue * (country.vat + country.duty);
            }

            // 3. 【新增】计算保险费 (CIP 或 DDP)
            let insuranceCNY = 0;
            if (params.isCIP || params.isDDP) {
                insuranceCNY = priceCNY * params.insuranceMarkup * params.insuranceRate;
            }

            // 4. 准备显示数据
            const displays = {
                'd_canvas': MathUtils.formatCurrency(params.canvasPrice, '￥', 0),
                'd_pack': MathUtils.formatCurrency(params.packCost, '￥', 0),
                'd_domestic': MathUtils.formatCurrency(costs.unitDomesticCost, '￥', 0),
                'd_shipping': MathUtils.formatCurrency(costs.unitInternationalCost, '￥', 0),
                'd_eu_fee': MathUtils.formatCurrency(costs.euParcelFee || 0, '￥', 0),

                // 【新增】显示保险费
                'd_insurance': MathUtils.formatCurrency(insuranceCNY, '￥', 1),

                'd_fee_total': MathUtils.formatCurrency(totalFeeCNY, '￥', 1),
                'd_tax': MathUtils.formatCurrency(taxCNY, '￥', 1),
                'd_fixed': MathUtils.formatCurrency(costs.fixedCostPerUnit, '￥', 0),

                // 总成本 = 物理成本(含欧盟费) + 固摊 + 税 + 保险 + 手续费
                'd_totalCost': MathUtils.formatCurrency(costs.totalUnitCost + taxCNY + insuranceCNY + totalFeeCNY, '￥', 1),
                'd_net': MathUtils.formatCurrency(priceCNY - (costs.totalUnitCost + taxCNY + insuranceCNY + totalFeeCNY), '￥', 1)
            };

            // 5. 批量更新 DOM
            Object.entries(displays).forEach(([id, value]) => {
                StateManager.updateDisplay(id, value);
            });

            // 6. 动态显示/隐藏行
            const euRow = document.getElementById('row_eu_fee');
            if (euRow) euRow.style.display = costs.euParcelFee > 0 ? 'flex' : 'none';

            // 【新增】如果保费为0（FOB模式），隐藏保险行
            const insRow = document.getElementById('row_insurance');
            if (insRow) insRow.style.display = insuranceCNY > 0 ? 'flex' : 'none';
        },

        /**
         * 更新定金红线分析 (修复增强版)
         * 作用：实时检测定金是否能覆盖“物料+物流+税费”等物理刚性成本，防止坏账风险
         * 修复：解决了无效输入下的数据残留问题，并修正了进度条填充逻辑
         * @param {Object} values - 全局输入值
         * @param {Object} params - 基础计算参数
         * @param {Object} costs - 由 calculateAll 统一传下来的单幅成本数据
         * @param {Object} country - 当前国家配置
         */
        updateDepositAnalysis(values, params, costs, country) {
            // 1. 调用引擎进行定金分析
            const data = CalculationEngine.calculateDepositAnalysis(params, costs, values);

            // 2. 处理无效状态：如果单价或数量无效，清空看板数据，防止旧数据残留误导
            if (!data.isValid) {
                this.resetDepositDisplay();
                return;
            }

            // 3. 更新金额显示 (USD 部分)
            StateManager.updateDisplay('orderTotalUSD', `$${MathUtils.round(data.orderTotalUSD, 2)}`);
            StateManager.updateDisplay('depUSD', `$${MathUtils.round(data.depositUSD, 2)}`);

            // 4. 更新金额显示 (CNY 换算部分 - 保持整数感)
            StateManager.updateDisplay('orderTotalCNY', `≈ ${MathUtils.formatCurrency(data.orderTotalCNY, '￥', 0)}`);
            StateManager.updateDisplay('depCNY', `≈ ${MathUtils.formatCurrency(data.depositCNY, '￥', 0)}`);

            // 5. 更新物理总成本（亏损红线）
            StateManager.updateDisplay('physTotal', MathUtils.formatCurrency(data.outOfPocket, '￥', 0));

            // 6. 更新定金覆盖率及其动态颜色逻辑
            const coverageValue = MathUtils.round(data.coverage, 0);
            StateManager.updateDisplay('depCoverage', `${coverageValue}%`);

            const coverageEl = StateManager.getDisplay('depCoverage');
            if (coverageEl) {
                // 安全线为 100%，不足则红色呼吸灯警示
                coverageEl.className = coverageValue >= 100 ?
                    'text-xl font-black mono text-emerald-400' :
                    'text-xl font-black mono text-rose-500 animate-pulse';
            }

            // 7. 更新安全状态标签
            StateManager.updateDisplay('depStatus', data.status);
            const statusEl = StateManager.getDisplay('depStatus');
            if (statusEl) {
                statusEl.className = coverageValue >= 100 ?
                    "text-[9px] font-black px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    "text-[9px] font-black px-3 py-1.5 rounded-full bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30";
            }

            // 8. 更新可视化进度条 (修正：不再改容器宽度，而是模拟填充)
            const bar = StateManager.getDisplay('coverageBar');
            if (bar) {
                // 限制最大显示宽度为 100%
                const displayWidth = Math.max(0, Math.min(100, coverageValue));
                bar.style.backgroundImage = `linear-gradient(to right, ${coverageValue >= 100 ? '#10b981' : '#ef4444'} ${displayWidth}%, transparent ${displayWidth}%)`;
                bar.className = `coverage-bar ${coverageValue >= 100 ? 'safe shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'warning'}`;
            }
        },

        /**
         * 辅助方法：重置定金板块显示
         * 作用：在输入无效时清空数据，确保 UI 诚实
         */
        resetDepositDisplay() {
            const fields = ['orderTotalUSD', 'depUSD', 'orderTotalCNY', 'depCNY', 'physTotal', 'depCoverage'];
            fields.forEach(id => StateManager.updateDisplay(id, '---'));
            StateManager.updateDisplay('depStatus', '等待输入报价...');

            const bar = StateManager.getDisplay('coverageBar');
            if (bar) {
                bar.style.backgroundImage = 'none';
                bar.className = 'coverage-bar';
            }
        },

        /**
         * 更新财务对账复盘 (优化重构版)
         * 作用：汇总全量成交数据，核算实到利润、待收、提成，并评估现金流
         * @param {Object} params - 基础计算参数
         * @param {Object} values - 全局输入值
         * @param {Object} costs - 由 calculateAll 统一传下来的单幅成本数据
         */
        updateFinancialRecap(params, values, costs) {
            // --- 优化1：自动修改广告费 Label 为 USD ---
            const adInput = document.getElementById('actAd');
            if (adInput) {
                const label = adInput.previousElementSibling; // 找到输入框上面的文字标签
                if (label && !label.textContent.includes('USD')) {
                    label.textContent = '月度广告支出 (USD)';
                }
            }

            // --- 优化2：广告费美元自动转人民币 ---
            // 创建 values 的副本，偷梁换柱，把广告费(USD)乘汇率变成(CNY)传给计算引擎
            const processingValues = {...values};
            const adUSD = MathUtils.safeParse(values.actAd, 0);
            processingValues.actAd = adUSD * params.exchangeRate;

            // 1. 调用引擎进行全量财务快照计算
            const finData = CalculationEngine.calculateFinancialData(params, processingValues, costs);

            // 2. 实时评估现金流健康度
            const healthData = CalculationEngine.calculateCashflowHealth(finData, params);

            // 3. 执行分层渲染逻辑
            this.updateFinancialKPIs(finData, healthData, params); // 多传一个params用于算保本点
            this.updateFinancialTable(finData, params);       // 更新详细核算表
            this.updateFinalPerformance(finData, values);     // 更新右侧最终业绩看板
        },

        /**
         * 更新财务KPI卡片
         * @param {Object} financialData - 财务数据
         * @param {Object} healthData - 健康度数据
         * @param {Object} params - 用于计算保本点
         */
        updateFinancialKPIs(financialData, healthData, params) {
            const stats = financialData.stats;

            // --- 卡片1：实际利润 & 保本分析 ---
            StateManager.updateDisplay('actualProfitDisplay', MathUtils.formatCurrency(financialData.finalProfit, '￥', 0));
            const profitClass = financialData.finalProfit >= 0 ?
                'text-3xl font-black mono stat-glow' :
                'text-3xl font-black mono text-rose-500 animate-pulse';
            StateManager.getDisplay('actualProfitDisplay').className = profitClass;

            // 计算盈亏平衡点 (保本销量 = 固定成本 / 单幅毛利)
            // 单幅毛利 ≈ (总营收 - 变动成本) / 销量
            const totalVariableCost = financialData.totalPhysCost + financialData.totalTaxCost + financialData.totalInsuranceCost;
            const totalGrossProfit = financialData.totalRevenueCNY - totalVariableCost;
            const avgUnitGrossProfit = stats.completedQty > 0 ? (totalGrossProfit / stats.completedQty) : 0;

            let breakEvenInfo = '';
            if (avgUnitGrossProfit > 0) {
                const fixedCost = financialData.totalFixedCost + financialData.totalAdCost; // 房租+工资+广告
                const breakEvenQty = Math.ceil(fixedCost / avgUnitGrossProfit);
                const gap = breakEvenQty - stats.completedQty;

                if (gap > 0) {
                    breakEvenInfo = ` (保本还差 ${gap} 幅)`;
                } else {
                    breakEvenInfo = ` (已过保本线)`;
                }
            }

            StateManager.updateDisplay('completedOrdersInfo',
                `${stats.completedQty}幅已核算${breakEvenInfo}`);

            // --- 卡片2：待收款项 ---
            StateManager.updateDisplay('pendingReceivables', `$${MathUtils.formatNumber(stats.shippedUnpaidAmount)}`);
            const receivablesClass = stats.shippedUnpaidAmount > 0 ?
                'text-3xl font-black mono text-amber-500' :
                'text-3xl font-black mono text-slate-400';
            StateManager.getDisplay('pendingReceivables').className = receivablesClass;

            StateManager.updateDisplay('shippedUnpaidInfo', `${stats.shippedUnpaidQty}幅已发货未收款`);

            // --- 卡片3：现金流流入 (原预收账款卡片改用) ---
            // 这里我们显示本月实际收到的总现金（包含定金、尾款等所有）
            const cashIn = financialData.cashFlowInUSD || 0;
            StateManager.updateDisplay('advancePayments', `$${MathUtils.formatNumber(cashIn)}`);

            // 修改样式，如果现金流太少则预警
            const advanceClass = cashIn > 0 ?
                'text-3xl font-black mono text-emerald-400' :
                'text-3xl font-black mono text-slate-400';
            StateManager.getDisplay('advancePayments').className = advanceClass;

            // 修改下方小字标签
            const advanceLabel = document.getElementById('advancePayments')?.previousElementSibling?.firstElementChild;
            if (advanceLabel) advanceLabel.textContent = '本月实收现金流';

            StateManager.updateDisplay('unshippedPaidInfo', `含定金/尾款等总入账`);

            // --- 卡片4：现金流健康度 ---
            StateManager.updateDisplay('cashflowHealth', `${healthData.score}%`);

            let healthClass, healthIndicator, healthIndicatorClass;

            switch (healthData.level) {
                case 'excellent':
                    healthClass = 'text-3xl font-black mono text-emerald-500';
                    healthIndicator = '✅';
                    healthIndicatorClass = 'text-emerald-500';
                    break;
                case 'good':
                    healthClass = 'text-3xl font-black mono text-blue-500';
                    healthIndicator = '👍';
                    healthIndicatorClass = 'text-blue-500';
                    break;
                case 'warning':
                    healthClass = 'text-3xl font-black mono text-amber-500';
                    healthIndicator = '⚠️';
                    healthIndicatorClass = 'text-amber-500';
                    break;
                case 'danger':
                    healthClass = 'text-3xl font-black mono text-rose-500';
                    healthIndicator = '❌';
                    healthIndicatorClass = 'text-rose-500';
                    break;
            }

            StateManager.getDisplay('cashflowHealth').className = healthClass;
            StateManager.updateDisplay('healthIndicator', healthIndicator);
            StateManager.getDisplay('healthIndicator').className = healthIndicatorClass;
            StateManager.updateDisplay('healthMessage', healthData.message);
        },

        /**
         * 更新财务表格 (清爽版：去除了占比列)
         * @param {Object} financialData - 财务数据
         * @param {Object} params - 计算参数
         */
        updateFinancialTable(financialData, params) {
            // 1. 更新提成率显示
            const commissionRate = MathUtils.round(params.commissionRate * 100, 1);
            StateManager.updateDisplay('commRateDisplay', `${commissionRate}%`);
            StateManager.updateDisplay('tableCommissionRate', `${commissionRate}%`);

            // 2. 更新提成金额
            StateManager.updateDisplay('actComm', MathUtils.formatCurrency(financialData.commission, '￥', 0));

            // 3. 辅助函数：格式化金额 + (单幅均摊)
            const realSalesQty = financialData.stats.completedQty + financialData.stats.shippedUnpaidQty;

            const formatWithUnit = (totalVal) => {
                const totalStr = MathUtils.formatCurrency(totalVal, '￥', 0);

                // 1. 如果金额本身很小，不显示均摊
                if (Math.abs(totalVal) < 1) return totalStr;

                // 2. 核心修复：如果还没开张（销量为0），不显示惊悚的“单幅成本”，直接返回总额
                if (realSalesQty <= 0) {
                    return totalStr;
                }

                // 3. 正常计算均摊
                const unitVal = totalVal / realSalesQty;
                return `${totalStr} (￥${MathUtils.round(unitVal, 0)}/幅)`;
            };

            // 4. 更新表格数据 (已移除所有 Pct 占比字段)
            const tableData = {
                // === 营收数据 ===
                'tableTotalRevenueUSD': `$${MathUtils.formatNumber(financialData.totalRevenueUSD)}`,
                'tableTotalRevenueCNY': MathUtils.formatCurrency(financialData.totalRevenueCNY, '￥', 0),

                // === 物理成本明细 ===
                'tableCanvasCost': formatWithUnit(financialData.totalCanvasCost),
                'tableDomesticCost': formatWithUnit(financialData.totalDomesticCost),
                'tableShippingCost': formatWithUnit(financialData.totalInternationalCost),
                'tablePackCost': formatWithUnit(financialData.totalPackCost),

                // === 欧盟费 & 保险费 ===
                'tableEuFee': formatWithUnit(financialData.totalEuFee || 0),
                'tableInsurance': formatWithUnit(financialData.totalInsuranceCost || 0),

                // === 运营与税务 ===
                'tableAdCost': formatWithUnit(financialData.totalAdCost),
                'tableFixedCost': formatWithUnit(financialData.totalFixedCost),
                'tableTaxCost': formatWithUnit(financialData.totalTaxCost),

                // === 汇总与利润 ===
                'tableTotalCost': formatWithUnit(financialData.totalCost),
                'tableProfitBeforeTax': formatWithUnit(financialData.profitBeforeCommission),
                'tableCommission': formatWithUnit(financialData.commission),
                'tableFinalProfit': formatWithUnit(financialData.finalProfit)
            };

            // 5. 批量更新 DOM
            Object.entries(tableData).forEach(([id, value]) => {
                StateManager.updateDisplay(id, value);
            });
        },

        /**
         * 子渲染器：更新最终业绩完成度 (高级动态版)
         * @param {Object} finData - 财务核算结果
         * @param {Object} values - 全局输入值
         */
        updateFinalPerformance(finData, values) {
            const target = MathUtils.safeParse(values.targetProfit, CONFIG.DEFAULTS.targetProfit);
            const completion = target > 0 ? (finData.finalProfit / target) * 100 : 0;

            // 1. 更新中心大字利润 (带有动态 CSS 效果，参数名已修正)
            const profitEl = StateManager.getDisplay('finalProfit');
            if (profitEl) {
                profitEl.textContent = MathUtils.formatCurrency(finData.finalProfit, '￥', 0);

                // 盈利 vs 亏损的视觉切换
                profitEl.className = finData.finalProfit >= 0 ?
                    'text-4xl font-black mono mb-6 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                    'text-4xl font-black mono mb-6 text-rose-500 animate-pulse bg-rose-500/10 rounded-2xl px-4 py-2 border border-rose-500/20';
            }

            // 2. 更新完成度百分比
            StateManager.updateDisplay('completionLabel', `${MathUtils.round(completion, 1)}%`);

            // 3. 动态同步业绩进度条 (UI 联动)
            const fill = StateManager.getDisplay('progressFill');
            if (fill) {
                fill.style.width = `${Math.min(100, Math.max(0, completion))}%`;
            }
        }
        ,

        /**
         * 更新全局可视化图表 (优化重构版)
         * 作用：实时更新“全球市场利润指数”柱状图与“订单状态分布”饼图
         * @param {Object} values - 全局输入值
         * @param {Object} params - 基础计算参数
         * @param {Object} costs - 由 calculateAll 统一传下来的单幅成本数据
         * @param {Object} country - 当前国家配置
         */
        updateCharts(values, params, costs, country) {
            // 1. 全球市场利润指数柱状图更新
            if (StateManager.chart) {
                // 确定用于对比的基准单价
                const manualPrice = MathUtils.safeParse(values.manualUSD, 0);
                const suggestPrice = MathUtils.safeParse(StateManager.getDisplay('suggestUSD')?.textContent?.replace('$', ''), 0);
                const basePriceUSD = manualPrice > 0 ? manualPrice : suggestPrice;

                // 调用引擎计算各国利润分布
                const globalIndexData = CalculationEngine.calculateGlobalProfitIndex(basePriceUSD, params, costs);

                // 提取利润数值并推送到图表数据集
                StateManager.chart.data.datasets[0].data = globalIndexData.map(d => MathUtils.round(d.profitCNY));

                // 执行静默刷新（不带动画以保持性能）
                StateManager.chart.update('none');
            }

            // 2. 联动更新订单状态分布饼图
            this.updateStatusChart();
        },


        /**
         * 更新状态图表
         */
        updateStatusChart() {
            if (!StateManager.statusChart) return;

            const stats = StateManager.getOrderStats();

            // 更新图表数据
            StateManager.statusChart.data.datasets[0].data = [
                stats.completed,
                stats.shippedUnpaid,
                stats.unshippedPaid,
                stats.preorder,
                stats.cancelled
            ];

            StateManager.statusChart.update('none');
        },

        /**
         * 渲染订单列表
         */
        renderOrders() {
            const orderListEl = document.getElementById('orderList');
            const orderCountEl = document.getElementById('orderCount');

            if (!orderListEl || !orderCountEl) return;

            const orders = StateManager.orders;

            // 更新订单数量
            orderCountEl.textContent = `${orders.length} 笔订单`;

            if (orders.length === 0) {
                orderListEl.innerHTML = `
                <tr>
                    <td colspan="8" class="py-8 text-slate-500 text-center">
                        <i class="fas fa-inbox text-3xl mb-2 block"></i>
                        暂无成交订单
                    </td>
                </tr>`;
                return;
            }

            // 生成订单行HTML
            let ordersHTML = '';
            orders.forEach((order, index) => {
                ordersHTML += this.renderOrderRow(order, index);
            });

            orderListEl.innerHTML = ordersHTML;
        },

        /**
         * 渲染单个订单行
         * @param {Object} order - 订单对象
         * @param {number} index - 索引
         * @returns {string} HTML字符串
         */
        renderOrderRow(order, index) {
            const totalReceived = order.totalReceived || 0;
            const receivedPercent = order.total > 0 ? MathUtils.calculatePercentage(totalReceived, order.total) : 0;

            // 状态配置
            const statusConfig = this.getStatusConfig(order.status);

            // 收款状态配置
            const paymentConfig = this.getPaymentConfig(order.paymentStatus);

            return `
            <tr class="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td class="py-3 text-xs">${order.time}</td>
                <td class="py-3">
                    <div class="text-sm font-bold">${order.clientName || '未命名客户'}</div>
                    <div class="text-xs text-slate-400">${order.clientPhone || '无电话'}</div>
                </td>
                <td class="py-3 font-bold">${order.qty || 0}幅</td>
                <td class="py-3 font-mono">$${MathUtils.round(order.price || 0, 1)}</td>
                <td class="py-3 font-mono font-bold">$${MathUtils.round(order.total || 0, 1)}</td>
                <td class="py-3 ${statusConfig.color}">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="text-xs">${statusConfig.icon}</span>
                            <span class="text-xs font-bold">${statusConfig.text}</span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full ${paymentConfig.color} transition-all duration-300"
                                 style="width: ${receivedPercent}%"></div>
                        </div>
                        <div class="text-[10px] text-slate-400">
                            已收: $${MathUtils.round(totalReceived, 2)} / $${MathUtils.round(order.total, 2)}
                        </div>
                    </div>
                </td>
                <td class="py-3 font-mono ${order.profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}">
                    ￥${MathUtils.round(order.profit || 0)}
                </td>
                <td class="py-3">
                    <div class="flex flex-col gap-1">
                        <div class="flex gap-1">
                            <button onclick="APP.UIManager.showPaymentModal('${order.id}')"
                                    class="btn-status bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs px-2 py-1 rounded"
                                    title="收款">
                                <i class="fas fa-money-bill-wave text-xs"></i>
                            </button>
                            <button onclick="APP.UIManager.showOrderDetails('${order.id}')"
                                    class="btn-status bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs px-2 py-1 rounded"
                                    title="详情">
                                <i class="fas fa-eye text-xs"></i>
                            </button>
                            <button onclick="APP.UIManager.updateOrderStatus('${order.id}')"
                                    class="btn-status bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 text-xs px-2 py-1 rounded"
                                    title="更新状态">
                                <i class="fas fa-edit text-xs"></i>
                            </button>
                            <button onclick="APP.UIManager.deleteOrder('${order.id}')"
                                    class="btn-status bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs px-2 py-1 rounded"
                                    title="删除">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
        },

        /**
         * 获取状态配置
         * @param {string} status - 状态代码
         * @returns {Object} 状态配置
         */
        getStatusConfig(status) {
            const configs = {
                [CONFIG.ORDER_STATUS.COMPLETED]: {
                    text: '已完成',
                    icon: '✅',
                    color: 'text-emerald-400'
                },
                [CONFIG.ORDER_STATUS.SHIPPED_UNPAID]: {
                    text: '已发货',
                    icon: '🚚',
                    color: 'text-amber-400'
                },
                [CONFIG.ORDER_STATUS.UNSHIPPED_PAID]: {
                    text: '待发货',
                    icon: '📦',
                    color: 'text-blue-400'
                },
                [CONFIG.ORDER_STATUS.PREORDER]: {
                    text: '预订单',
                    icon: '⏳',
                    color: 'text-slate-400'
                }
            };

            return configs[status] || {text: '未知', icon: '❓', color: 'text-slate-400'};
        },

        /**
         * 获取付款状态配置
         * @param {string} paymentStatus - 付款状态
         * @returns {Object} 配置
         */
        getPaymentConfig(paymentStatus) {
            const configs = {
                [CONFIG.PAYMENT_STATUS.UNPAID]: {
                    color: 'bg-slate-500'
                },
                [CONFIG.PAYMENT_STATUS.PARTIAL_PAID]: {
                    color: 'bg-amber-500'
                },
                [CONFIG.PAYMENT_STATUS.DEPOSIT_PAID]: {
                    color: 'bg-blue-500'
                },
                [CONFIG.PAYMENT_STATUS.FULL_PAID]: {
                    color: 'bg-emerald-500'
                }
            };

            return configs[paymentStatus] || {color: 'bg-slate-500'};
        },

        /**
         * 更新统计摘要
         */
        updateStatsSummary() {
            const stats = StateManager.getOrderStats();
            const summary = OrderManager.getStatsSummary();
            const financialData = this.getCurrentFinancialData();

            // 1. 更新订单列表上方的统计
            StateManager.updateDisplay('orderCount', `${stats.total} 笔订单`);

            // 2. 更新统计模态框中的数字
            StateManager.updateDisplay('statCompletedCount', stats.completed);
            StateManager.updateDisplay('statCompletedAmount', `$${MathUtils.formatNumber(stats.completedAmount)}`);
            StateManager.updateDisplay('statShippedUnpaidCount', stats.shippedUnpaid);
            StateManager.updateDisplay('statShippedUnpaidAmount', `$${MathUtils.formatNumber(stats.shippedUnpaidAmount)}`);
            StateManager.updateDisplay('statUnshippedPaidCount', stats.unshippedPaid);
            StateManager.updateDisplay('statUnshippedPaidAmount', `$${MathUtils.formatNumber(stats.unshippedPaidAmount)}`);
            StateManager.updateDisplay('statPreorderCount', stats.preorder);
            StateManager.updateDisplay('statPreorderAmount', `$${MathUtils.formatNumber(stats.preorderAmount)}`);

            // 3. 更新财务利润摘要（已实现 vs 潜在利润）
            if (financialData) {
                // 当月实际利润（已完成订单）
                StateManager.updateDisplay('statActualProfit', MathUtils.formatCurrency(financialData.finalProfit, '￥', 0));
                // 待实现利润（已发货/已收款但未结清的部分）
                const potentialProfit = stats.shippedUnpaidProfit + stats.unshippedPaidProfit;
                StateManager.updateDisplay('statPotentialProfit', MathUtils.formatCurrency(potentialProfit, '￥', 0));
                // 总潜在利润
                StateManager.updateDisplay('statTotalPotential', MathUtils.formatCurrency(summary.totalProfitCNY, '￥', 0));
            }

            // 4. 联动更新状态饼图
            this.updateStatusChart();
        },

        /**
         * 显示成交录入模态框
         */
        showDealModal() {
            const modal = StateManager.inputs.dealModal;
            if (!modal) return;

            // 生成订单ID和时间
            const orderId = MathUtils.generateId('DA');
            const orderTime = new Date().toLocaleString('zh-CN');

            StateManager.updateDisplay('orderId', orderId);
            StateManager.updateDisplay('orderTime', orderTime);

            // 设置默认值
            const manualPrice = MathUtils.safeParse(StateManager.inputs.manualUSD?.value, 0);
            const suggestUSDEl = StateManager.getDisplay('suggestUSD');
            const suggestPrice = suggestUSDEl ?
                MathUtils.safeParse(suggestUSDEl.textContent.replace('$', '')) : 0;

            const effectivePrice = manualPrice || suggestPrice;
            const quoteQty = MathUtils.safeParse(StateManager.inputs.quoteQty?.value, CONFIG.DEFAULTS.quoteQty);

            StateManager.inputs.dealPrice.value = MathUtils.round(effectivePrice, 1);
            StateManager.inputs.dealQty.value = Math.max(1, quoteQty);

            // 清空其他字段
            StateManager.inputs.clientName.value = '';
            StateManager.inputs.clientPhone.value = '';
            StateManager.inputs.clientEmail.value = '';
            StateManager.inputs.actualDeposit.value = '';
            StateManager.inputs.dealNotes.value = '';

            // 更新模态框内容
            this.updateDealModal();

            const mainCountry = document.getElementById('quoteCountry');
            const modalCountry = document.getElementById('dealCountry');
            if (mainCountry && modalCountry) {
                modalCountry.innerHTML = mainCountry.innerHTML; // 复制所有选项
                modalCountry.value = mainCountry.value;         // 同步当前选中值
            }

            // 显示模态框
            modal.classList.add('active');
        },
        /**
         * [升级版] 初始化 CRM 搜索联想 (支持姓名和电话双向搜索)
         */
        initCRMSearch() {
            // 绑定姓名输入框
            this.bindSearchToInput('clientName', 'crmSuggestions');
            // 绑定电话输入框 (新增!)
            this.bindSearchToInput('clientPhone', 'crmSuggestionsPhone');
        },
        /**
         * [辅助] 通用搜索绑定器
         */
        bindSearchToInput(inputId, suggestionId) {
            const inputEl = document.getElementById(inputId);
            const boxEl = document.getElementById(suggestionId);

            if (!inputEl || !boxEl) return;

            // 监听输入事件
            inputEl.addEventListener('input', (e) => {
                const keyword = e.target.value.trim().toLowerCase();

                // 没字就隐藏
                if (keyword.length < 1) {
                    boxEl.classList.add('hidden');
                    return;
                }

                // 读取数据
                const crmData = localStorage.getItem('dafen_crm_clients');
                if (!crmData) return;

                const clients = JSON.parse(crmData);

                // 核心搜索逻辑：不管你在哪输入，我都同时查 名字 和 电话
                const matches = clients.filter(c =>
                    (c.name && c.name.toLowerCase().includes(keyword)) ||
                    (c.contact && c.contact.includes(keyword))
                );

                if (matches.length > 0) {
                    // 渲染列表
                    boxEl.innerHTML = matches.map(c => `
                        <div class="p-3 hover:bg-indigo-600/20 cursor-pointer border-b border-white/5 flex justify-between items-center group"
                             onclick="APP.UIManager.fillClientInfo('${c.id}'); document.getElementById('${suggestionId}').classList.add('hidden');">
                            <div>
                                <div class="text-sm font-bold text-white group-hover:text-indigo-400">${c.name}</div>
                                <div class="text-xs text-slate-400">${c.contact}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300">${c.country}</div>
                                <div class="text-[10px] text-emerald-500 font-mono mt-0.5">LTV: $${c.ltv}</div>
                            </div>
                        </div>
                    `).join('');

                    // 确保另一个框的菜单是关的，只显示当前的
                    document.querySelectorAll('[id^="crmSuggestions"]').forEach(el => el.classList.add('hidden'));
                    boxEl.classList.remove('hidden');
                } else {
                    boxEl.classList.add('hidden');
                }
            });

            // 监听点击外部关闭
            document.addEventListener('click', (e) => {
                if (!inputEl.contains(e.target) && !boxEl.contains(e.target)) {
                    boxEl.classList.add('hidden');
                }
            });
        },
        /**
         * [新功能] 填充客户信息并同步国家
         */
        fillClientInfo(clientId) {
            const crmData = localStorage.getItem('dafen_crm_clients');
            const clients = crmData ? JSON.parse(crmData) : [];
            const client = clients.find(c => c.id === clientId);

            if (client) {
                // 1. 填充表单
                StateManager.inputs.clientName.value = client.name;

                // 优先用单独存的 phone，没有就从 contact 提取
                StateManager.inputs.clientPhone.value = client.phone || client.contact.replace(/[^\d+]/g, '');

                // 核心修复：优先用单独存的 email
                if (client.email) {
                    StateManager.inputs.clientEmail.value = client.email;
                } else if (client.contact.includes('@')) {
                    // 兼容旧数据：如果 contact 里像邮箱，就提出来
                    StateManager.inputs.clientEmail.value = client.contact;
                }

                // 2. 核心：自动切换国家！
                // 这步很关键：要把主控台的 quoteCountry 改掉，这样税率才对
                const mainCountrySelect = document.getElementById('quoteCountry');
                const modalCountrySelect = document.getElementById('dealCountry');

                if (mainCountrySelect && client.country) {
                    mainCountrySelect.value = client.country;
                    // 触发 change 事件，让系统重新计算税费/运费
                    mainCountrySelect.dispatchEvent(new Event('change'));

                    // 同步显示到模态框里
                    if (modalCountrySelect) {
                        // 复制选项过去或者直接同步值
                        modalCountrySelect.innerHTML = mainCountrySelect.innerHTML;
                        modalCountrySelect.value = client.country;
                    }
                }

                // 3. 关闭菜单
                document.getElementById('crmSuggestions').classList.add('hidden');

                // 4. 提示
                this.showSuccessMessage('客户已载入', `已切换至 ${client.country} 市场配置`);
            }
        },
        /**
         * 更新成交模态框 (详细核算版：防报错 + 费用全透明)
         */
        updateDealModal() {
            // 1. 【防报错】使用 getElementById 获取原生元素
            const elQty = document.getElementById('dealQty');
            const elPrice = document.getElementById('dealPrice');
            const elSlider = document.getElementById('depPercentSlider');
            const elActDep = document.getElementById('actualDeposit');

            // 2. 【安全解析】转数值，空值给0
            const qty = elQty && elQty.value ? parseFloat(elQty.value) : 0;
            const price = elPrice && elPrice.value ? parseFloat(elPrice.value) : 0;
            const depositPercent = elSlider ? parseFloat(elSlider.value) : 30;

            // 3. 计算成交总额 & 应收定金
            const total = qty * price;
            const expectedDeposit = (total * depositPercent) / 100;

            // 4. 【精准显示】保留2位小数
            StateManager.updateDisplay('dealTotal', `$${total.toFixed(2)}`);
            StateManager.updateDisplay('dealExpectedDeposit', `$${expectedDeposit.toFixed(2)}`);

            // 5. 更新实收定金 Placeholder (提示建议金额)
            if (elActDep) {
                elActDep.placeholder = expectedDeposit.toFixed(2);
            }

            // 6. 准备数据计算利润
            const actualDepositVal = elActDep && elActDep.value ? parseFloat(elActDep.value) : 0;
            const orderData = {qty, price, actualDeposit: actualDepositVal};
            const config = OrderManager.getCurrentConfigSnapshot();
            const profit = OrderManager.calculateOrderProfit(orderData, config);

            // ==========================================================
            // 7. 【核心升级】构建“详细核算分析”明细
            // 我们要算出各项隐形费用，并显示在界面上
            // ==========================================================

            let detailsHtml = ''; // 用于存放动态生成的 HTML
            let totalDeductions = 0; // 总扣除费用

            // (A) 计算欧盟操作费
            if (config.isEU) {
                const euFee = 24 * qty; // 3欧元 ≈ 24人民币
                totalDeductions += euFee;
                detailsHtml += `
                <div class="flex justify-between items-center text-xs text-amber-500/70 mb-1">
                    <span>🇪🇺 欧盟操作费 (EU Fee)</span>
                    <span class="font-mono">- ￥${euFee.toFixed(2)}</span>
                </div>`;
            }

            // (B) 计算运输保险费 (CIP / DDP)
            if (config.isCIP || config.isTax) {
                const exRate = parseFloat(document.getElementById('exRate')?.value || 7);
                const totalCNY = total * exRate; // total是函数前面算好的USD总价
                const markup = config.insuranceMarkup || 1.1;
                const rate = config.insuranceRate || 0.005;
                const insurance = totalCNY * markup * rate;

                if (insurance > 0.1) {
                    totalDeductions += insurance;
                    detailsHtml += `
                    <div class="flex justify-between items-center text-xs text-emerald-500/70 mb-1">
                        <span>🛡️ 运输保险费 (Ins.)</span>
                        <span class="font-mono">- ￥${insurance.toFixed(2)}</span>
                    </div>`;
                }
            }

            // (C) 计算税费 (DDP)
            if (config.isTax) {
                const declareVal = (config.baseCost * qty) * (config.declareRate / 100);
                const taxRate = (config.countryVat || 0) + (config.countryDuty || 0);
                const tax = declareVal * taxRate;

                if (tax > 0.1) {
                    totalDeductions += tax;
                    detailsHtml += `
                    <div class="flex justify-between items-center text-xs text-rose-500/70 mb-1">
                        <span>🏛️ 预估税费 (Tax)</span>
                        <span class="font-mono">- ￥${tax.toFixed(2)}</span>
                    </div>`;
                }
            }

            // 8. 将明细插入到页面 (找到 dealExtraInfo 容器)
            const extraInfoEl = document.getElementById('dealExtraInfo');

            if (extraInfoEl) {
                if (totalDeductions > 0.1) {
                    // 如果有扣费，显示明细
                    extraInfoEl.style.display = 'block'; // 显示容器
                    extraInfoEl.classList.remove('hidden');
                    // 直接写入 HTML，这样每一项都能分行显示
                    extraInfoEl.innerHTML = `
                    <div class="pt-2 pb-2 mb-2 border-t border-b border-white/5 space-y-1">
                        <div class="text-[10px] uppercase font-bold text-slate-500 mb-1">Deductions 隐形成本</div>
                        ${detailsHtml}
                        <div class="flex justify-between items-center text-xs font-bold text-slate-400 border-t border-white/5 pt-1 mt-1">
                            <span>小计扣除</span>
                            <span>- ￥${totalDeductions.toFixed(2)}</span>
                        </div>
                    </div>
                `;
                } else {
                    // 如果是 FOB 没这些费用，就隐藏
                    extraInfoEl.style.display = 'none';
                }
            }

            // 9. 更新最终净利润
            const profitEl = StateManager.getDisplay('dealProfit');
            if (profitEl) {
                profitEl.textContent = `￥${profit.toFixed(2)}`;
                const profitClass = profit >= 0 ? 'text-emerald-400' : 'text-rose-500';
                profitEl.className = `font-bold text-2xl ${profitClass}`;
            }
        },

        /**
         * 关闭成交模态框
         */
        closeDealModal() {
            const modal = StateManager.inputs.dealModal;
            if (modal) {
                modal.classList.remove('active');
            }
        },

        /**
         * [新功能] 尝试自动建立 CRM 客户档案
         * @param {string} name - 客户姓名
         * @param {string} phone - 联系电话
         */
        tryAutoCreateCRMProfile(name, phone, email) {
            if (!name) return;

            try {
                const crmData = localStorage.getItem('dafen_crm_clients');
                let clients = crmData ? JSON.parse(crmData) : [];

                const existing = clients.find(c =>
                    c.name.trim().toLowerCase() === name.trim().toLowerCase() ||
                    (phone && c.contact && c.contact.includes(phone))
                );

                if (!existing) {
                    const countrySelect = document.getElementById('quoteCountry');
                    const countryCode = countrySelect ? countrySelect.value : 'USA';

                    const newClient = {
                        id: 'C' + Date.now(),
                        name: name,
                        level: 'new',
                        // 核心修改：把邮箱也存进去
                        // 为了兼容 CRM 显示，我们把电话和邮箱拼在 contact 里，同时也单独存
                        contact: phone || email || '-',
                        phone: phone || '', // 单独存电话
                        email: email || '', // 单独存邮箱
                        country: countryCode,
                        tags: ['自动建档'],
                        ltv: 0,
                        source: 'Order System',
                        lastDate: new Date().toISOString().split('T')[0]
                    };

                    clients.unshift(newClient);
                    localStorage.setItem('dafen_crm_clients', JSON.stringify(clients));
                    console.log(`[CRM] 新客户已归档: ${name}`);
                } else {
                    // 如果是老客户，但这次填了新邮箱，帮他补全！
                    if (!existing.email && email) {
                        existing.email = email;
                        console.log(`[CRM] 老客户邮箱已补全: ${email}`);
                    }
                    existing.lastDate = new Date().toISOString().split('T')[0];
                    localStorage.setItem('dafen_crm_clients', JSON.stringify(clients));
                }
            } catch (e) {
                console.error('CRM 同步失败:', e);
            }
        },

        /**
         * 保存成交订单
         */
        saveDeal() {
            // 验证必填字段
            const clientName = StateManager.inputs.clientName?.value?.trim();
            const clientPhone = StateManager.inputs.clientPhone?.value?.trim();
            const clientEmail = StateManager.inputs.clientEmail?.value?.trim();

            if (!clientName || !clientPhone) {
                alert('请填写客户姓名和联系电话');
                return;
            }

            // === 核心升级：一键同步 CRM ===
            this.tryAutoCreateCRMProfile(clientName, clientPhone, clientEmail);
            // --- 修复开始：自动计算默认定金 ---

            // 1. 获取数量和单价
            const qty = MathUtils.safeParse(StateManager.inputs.dealQty?.value, 1);
            const price = MathUtils.safeParse(StateManager.inputs.dealPrice?.value, 0);

            // 2. 获取手动输入的实收定金
            let inputDeposit = StateManager.inputs.actualDeposit?.value;
            let finalDeposit = 0;

            // 3. 判断逻辑：如果用户没填（空的），就自动按比例计算
            if (!inputDeposit || inputDeposit.toString().trim() === '') {
                // 获取当前的定金比例（比如30）
                const depositPercent = MathUtils.safeParse(StateManager.inputs.depPercentSlider?.value, 30);
                // 自动算出金额： 总价 * (30 / 100)
                finalDeposit = (qty * price * depositPercent) / 100;
            } else {
                // 如果用户填了，就用用户填的数字
                finalDeposit = MathUtils.safeParse(inputDeposit, 0);
            }
            // --- 修复结束 ---

            // 构建订单数据
            const orderData = {
                clientName: clientName,
                clientPhone: clientPhone,
                clientEmail: StateManager.inputs.clientEmail?.value?.trim() || '',
                qty: qty,
                price: price,
                actualDeposit: finalDeposit, // 关键点：这里现在会使用我们处理过的金额
                notes: StateManager.inputs.dealNotes?.value?.trim() || ''
            };

            // 验证价格
            if (orderData.price <= 0) {
                alert('请输入有效的成交单价');
                return;
            }

            // 创建并保存订单
            const order = OrderManager.createOrder(orderData);

            if (OrderManager.saveOrder(order)) {
                // 成功提示
                this.showSuccessMessage('订单保存成功', `订单 ${order.id} 已录入系统`);

                // 关闭模态框
                this.closeDealModal();

                // 计算和刷新界面
                this.calculateAll();
            } else {
                alert('订单保存失败，请重试');
            }
        },

        /**
         * 显示收款模态框
         * @param {string} orderId - 订单ID
         */
        showPaymentModal(orderId) {
            const order = OrderManager.getOrder(orderId);
            if (!order) {
                alert('订单不存在');
                return;
            }

            const remaining = order.total - (order.totalReceived || 0);

            // 使用SweetAlert2显示收款模态框
            Swal.fire({
                title: '添加收款记录',
                html: this.getPaymentModalHTML(order, remaining),
                width: 500,
                showCancelButton: true,
                confirmButtonText: '确认收款',
                cancelButtonText: '取消',
                background: '#1e293b',
                color: '#f1f5f9',
                preConfirm: () => {
                    const amountInput = document.getElementById('paymentAmount');
                    const typeSelect = document.getElementById('paymentType');
                    const notesInput = document.getElementById('paymentNotes');

                    const amountUSD = MathUtils.safeParse(amountInput.value);

                    if (!MathUtils.isValidNumber(amountUSD) || amountUSD === 0) {
                        Swal.showValidationMessage('请输入有效的金额');
                        return false;
                    }

                    if (amountUSD > remaining) {
                        Swal.showValidationMessage('收款金额不能超过待收金额');
                        return false;
                    }

                    return {
                        amountUSD: amountUSD,
                        paymentType: typeSelect.value,
                        notes: notesInput.value.trim()
                    };
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    const {amountUSD, paymentType, notes} = result.value;

                    if (PaymentManager.addPayment(orderId, amountUSD, paymentType, notes)) {
                        this.showSuccessMessage('收款成功', `已成功记录收款 $${MathUtils.round(amountUSD, 2)}`);

                        // 刷新界面
                        this.calculateAll();
                    }
                }
            });
        }
        ,

        /**
         * 获取收款模态框HTML
         * @param {Object} order - 订单
         * @param {number} remaining - 待收金额
         * @returns {string} HTML字符串
         */
        getPaymentModalHTML(order, remaining) {
            return `
            <div class="space-y-4">
                <div class="bg-slate-800/50 p-4 rounded-lg">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs text-slate-400">订单编号</p>
                            <p class="font-bold">${order.id}</p>
                        </div>
                        <div>
                            <p class="text-xs text-slate-400">客户</p>
                            <p class="font-bold">${order.clientName}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <p class="text-xs text-slate-400">订单总额</p>
                            <p class="font-bold text-emerald-400">$${MathUtils.round(order.total, 2)}</p>
                        </div>
                        <div>
                            <p class="text-xs text-slate-400">待收金额</p>
                            <p class="font-bold text-amber-400">$${MathUtils.round(remaining, 2)}</p>
                        </div>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">收款金额 (USD)</label>
                    <input type="number" id="paymentAmount" 
                           class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                           value="${remaining}"
                           min="0.01"
                           max="${remaining}"
                           step="0.01">
                    <div class="flex gap-2 mt-2">
                        <button onclick="document.getElementById('paymentAmount').value = ${remaining}" 
                                class="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/30">
                            全额收款
                        </button>
                        <button onclick="document.getElementById('paymentAmount').value = ${order.total * 0.3}" 
                                class="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded hover:bg-amber-500/30">
                            30%定金
                        </button>
                        <button onclick="document.getElementById('paymentAmount').value = ${order.total * 0.5}" 
                                class="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30">
                            50%定金
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">收款类型</label>
                    <select id="paymentType" 
                            class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option value="${CONFIG.PAYMENT_TYPES.DEPOSIT}">定金</option>
                        <option value="${CONFIG.PAYMENT_TYPES.BALANCE}" ${remaining === order.total ? 'selected' : ''}>尾款</option>
                        <option value="${CONFIG.PAYMENT_TYPES.OTHER}">其他</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">收款备注 (可选)</label>
                    <textarea id="paymentNotes" 
                              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              rows="2"
                              placeholder="例如：银行转账、PayPal等"></textarea>
                </div>
            </div>`;
        }
        ,

        /**
         * 显示订单详情
         * @param {string} orderId - 订单ID
         */
        showOrderDetails(orderId) {
            const order = OrderManager.getOrder(orderId);
            if (!order) return;

            // 使用SweetAlert2显示详情
            Swal.fire({
                title: '订单详情',
                html: this.getOrderDetailsHTML(order),
                width: 600,
                showCloseButton: true,
                showConfirmButton: false,
                background: '#1e293b',
                color: '#f1f5f9'
            });
        }
        ,

        /**
         * 获取订单详情HTML (增强版：含财务透视与隐形成本)
         * @param {Object} order - 订单
         * @returns {string} HTML字符串
         */
        getOrderDetailsHTML(order) {
            const statusConfig = this.getStatusConfig(order.status);
            const paymentConfig = this.getPaymentConfig(order.paymentStatus);
            const config = order.configSnapshot || {}; // 获取当时的配置快照

            // --- 1. 计算隐形成本显示 ---
            let hiddenCostsHTML = '';
            let hasHiddenCosts = false;

            // 欧盟费
            if (config.isEU) {
                const euFee = 24 * order.qty;
                hiddenCostsHTML += `<div class="flex justify-between text-xs"><span class="text-amber-500/70">🇪🇺 欧盟操作费</span><span class="font-mono text-amber-500">-￥${euFee.toFixed(0)}</span></div>`;
                hasHiddenCosts = true;
            }

            // 保险与税 (估算值，用于展示)
            if (config.isCIP || config.isTax) {
                // 简易反推基数用于展示
                const estBase = order.total * config.exRate;

                if (config.isCIP || config.isTax) {
                    const ins = estBase * (config.insuranceMarkup || 1.1) * (config.insuranceRate || 0.005);
                    if (ins > 1) {
                        hiddenCostsHTML += `<div class="flex justify-between text-xs"><span class="text-emerald-500/70">🛡️ 物流保险费</span><span class="font-mono text-emerald-500">-￥${ins.toFixed(1)}</span></div>`;
                        hasHiddenCosts = true;
                    }
                }

                if (config.isTax) {
                    const tax = estBase * (config.declareRate / 100) * ((config.countryVat || 0) + (config.countryDuty || 0));
                    if (tax > 1) {
                        hiddenCostsHTML += `<div class="flex justify-between text-xs"><span class="text-rose-500/70">🏛️ 预估税费</span><span class="font-mono text-rose-500">-￥${tax.toFixed(1)}</span></div>`;
                        hasHiddenCosts = true;
                    }
                }
            }

            // --- 2. 构建收款记录列表 ---
            let paymentRecordsHTML = '';
            if (order.paymentRecords && order.paymentRecords.length > 0) {
                paymentRecordsHTML = `
                <div class="border-t border-white/10 pt-4">
                    <p class="text-xs text-slate-400 mb-2 font-bold uppercase">收款流水记录</p>
                    <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
                        ${order.paymentRecords.map(record => `
                            <div class="bg-white/5 p-2 rounded border border-white/5 flex justify-between items-center">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold ${record.amountUSD > 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                            $${MathUtils.round(record.amountUSD, 2)}
                                        </span>
                                        <span class="text-[10px] bg-slate-700 px-1 rounded text-slate-300">
                                            ${PaymentManager.getPaymentTypeName(record.type)}
                                        </span>
                                    </div>
                                    <div class="text-[10px] text-slate-500 mt-0.5">
                                        ${MathUtils.formatTimeChinese(record.date, true)}
                                    </div>
                                </div>
                                <div class="text-right max-w-[120px]">
                                    <p class="text-[10px] text-slate-400 truncate">${record.notes || '-'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }

            // --- 3. 核心：组装完整HTML ---
            return `
            <div class="space-y-4">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-[10px] text-slate-500 uppercase font-bold">Order ID</p>
                        <p class="font-mono font-bold text-lg text-indigo-400">${order.id}</p>
                    </div>
                    <div class="text-right">
                        <span class="px-2 py-1 rounded text-[10px] font-bold ${statusConfig.color.replace('text-', 'bg-')}/20 ${statusConfig.color} border border-${statusConfig.color.split('-')[1]}-500/30">
                            ${statusConfig.icon} ${statusConfig.text}
                        </span>
                    </div>
                </div>
                
                <div class="bg-slate-900/50 p-3 rounded-xl border border-white/10">
                    <div class="grid grid-cols-2 gap-4 mb-2">
                        <div>
                            <p class="text-[10px] text-slate-400 uppercase">净利润 (Net Profit)</p>
                            <p class="text-xl font-black mono ${order.profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}">
                                ￥${MathUtils.round(order.profit || 0)}
                            </p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-slate-400 uppercase">订单总额 (Total)</p>
                            <p class="text-xl font-black mono text-indigo-300">$${MathUtils.round(order.total, 2)}</p>
                        </div>
                    </div>
                    
                    ${hasHiddenCosts ? `
                    <div class="border-t border-white/5 pt-2 mt-2 space-y-1">
                        <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">隐形成本扣除项</p>
                        ${hiddenCostsHTML}
                    </div>
                    ` : ''}
                </div>

                <div class="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-lg">
                    <div>
                        <p class="text-[10px] text-slate-400 mb-1">合同定金 (Target)</p>
                        <p class="font-mono font-bold text-amber-500/80">$${MathUtils.round(order.expectedDeposit || 0, 2)}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 mb-1">实收金额 (Actual)</p>
                        <p class="font-mono font-bold text-amber-500/80">$${MathUtils.round(order.expectedDeposit > 0 ? order.expectedDeposit : (order.total * 0.3), 2)}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p class="text-xs text-slate-500">客户信息</p>
                        <p class="font-bold">${order.clientName}</p>
                        <p class="text-xs text-slate-400 scale-90 origin-left">${order.clientPhone}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-500">商品详情</p>
                        <p class="font-bold">${order.qty} 幅</p>
                        <p class="text-xs text-slate-400 scale-90 origin-right">$${MathUtils.round(order.price, 2)} /幅</p>
                    </div>
                </div>

                ${order.notes ? `
                <div class="bg-amber-500/5 border border-amber-500/20 p-2 rounded text-xs text-amber-200/80">
                    <i class="fas fa-sticky-note mr-1 opacity-50"></i> ${order.notes}
                </div>
                ` : ''}
                
                ${paymentRecordsHTML}
                
                <div class="text-center pt-2 border-t border-white/5">
                    <p class="text-[10px] text-slate-600">创建时间: ${order.time}</p>
                </div>
            </div>`;
        },

        /**
         * 更新订单状态
         * @param {string} orderId - 订单ID
         */
        updateOrderStatus(orderId) {
            const order = OrderManager.getOrder(orderId);
            if (!order) return;

            const currentStatus = order.status;
            const availableStatuses = [
                {value: CONFIG.ORDER_STATUS.PREORDER, label: '预订单'},
                {value: CONFIG.ORDER_STATUS.UNSHIPPED_PAID, label: '待发货已收款'},
                {value: CONFIG.ORDER_STATUS.SHIPPED_UNPAID, label: '已发货未收款'},
                {value: CONFIG.ORDER_STATUS.COMPLETED, label: '已完成'}
            ];

            // 创建选项HTML
            const optionsHTML = availableStatuses.map(status => `
            <option value="${status.value}" ${currentStatus === status.value ? 'selected' : ''}>
                ${status.label}
            </option>
        `).join('');

            Swal.fire({
                title: '更新订单状态',
                html: `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-300 mb-2">选择新状态</label>
                        <select id="newStatusSelect" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                            ${optionsHTML}
                        </select>
                    </div>
                    <div class="text-xs text-slate-400">
                        当前状态: ${this.getStatusConfig(currentStatus).text}
                    </div>
                </div>`,
                width: 400,
                showCancelButton: true,
                confirmButtonText: '更新',
                cancelButtonText: '取消',
                background: '#1e293b',
                color: '#f1f5f9',
                preConfirm: () => {
                    const select = document.getElementById('newStatusSelect');
                    return select ? select.value : null;
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    const newStatus = result.value;

                    // 特殊处理：如果设置为已发货或已完成，需要确认
                    if ((newStatus === CONFIG.ORDER_STATUS.SHIPPED_UNPAID || newStatus === CONFIG.ORDER_STATUS.COMPLETED) &&
                        order.shippingStatus === CONFIG.SHIPPING_STATUS.UNSHIPPED) {
                        Swal.fire({
                            title: '确认发货',
                            text: '订单是否已发货？',
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: '已发货',
                            cancelButtonText: '未发货',
                            background: '#1e293b',
                            color: '#f1f5f9'
                        }).then((shipResult) => {
                            if (shipResult.isConfirmed) {
                                // 标记为已发货
                                OrderManager.markAsShipped(orderId, '状态更新时标记发货');
                            }

                            // 更新状态
                            OrderManager.updateOrderStatus(orderId, newStatus);
                            this.showSuccessMessage('状态已更新', '订单状态已成功更新');

                            // 刷新界面
                            this.calculateAll();
                        });
                    } else {
                        // 直接更新状态
                        OrderManager.updateOrderStatus(orderId, newStatus);
                        this.showSuccessMessage('状态已更新', '订单状态已成功更新');

                        // 刷新界面
                        this.calculateAll();
                    }
                }
            });
        }
        ,

        /**
         * 删除订单
         * @param {string} orderId - 订单ID
         */
        deleteOrder(orderId) {
            Swal.fire({
                title: '确认删除',
                text: '确定删除此订单？此操作不可撤销。',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '删除',
                cancelButtonText: '取消',
                confirmButtonColor: '#ef4444',
                background: '#1e293b',
                color: '#f1f5f9'
            }).then((result) => {
                if (result.isConfirmed) {
                    if (OrderManager.deleteOrder(orderId)) {
                        this.showSuccessMessage('删除成功', '订单已删除');

                        // 刷新界面
                        this.calculateAll();
                    } else {
                        alert('删除失败');
                    }
                }
            });
        }
        ,

        /**
         * 显示状态统计
         */
        showStatsSummary() {
            const stats = StateManager.getOrderStats();
            const summary = OrderManager.getStatsSummary();

            // 更新统计数字
            StateManager.updateDisplay('statCompletedCount', stats.completed);
            StateManager.updateDisplay('statCompletedAmount', `$${MathUtils.formatNumber(stats.completedAmount)}`);
            StateManager.updateDisplay('statShippedUnpaidCount', stats.shippedUnpaid);
            StateManager.updateDisplay('statShippedUnpaidAmount', `$${MathUtils.formatNumber(stats.shippedUnpaidAmount)}`);
            StateManager.updateDisplay('statUnshippedPaidCount', stats.unshippedPaid);
            StateManager.updateDisplay('statUnshippedPaidAmount', `$${MathUtils.formatNumber(stats.unshippedPaidAmount)}`);
            StateManager.updateDisplay('statPreorderCount', stats.preorder);
            StateManager.updateDisplay('statPreorderAmount', `$${MathUtils.formatNumber(stats.preorderAmount)}`);

            // 更新财务摘要
            const financialData = this.getCurrentFinancialData();
            if (financialData) {
                StateManager.updateDisplay('statActualProfit', MathUtils.formatCurrency(financialData.finalProfit, '￥', 0));
                StateManager.updateDisplay('statPotentialProfit', MathUtils.formatCurrency(stats.shippedUnpaidProfit + stats.unshippedPaidProfit, '￥', 0));
                StateManager.updateDisplay('statTotalPotential', MathUtils.formatCurrency(summary.totalProfitCNY, '￥', 0));
            }

            // 更新图表
            this.updateStatusChart();

            // 显示模态框
            const modal = StateManager.inputs.statsModal;
            if (modal) {
                modal.classList.add('active');
            }
        }
        ,

        /**
         * 获取当前财务数据
         * @returns {Object|null} 财务数据
         */
        getCurrentFinancialData() {
            try {
                const values = StateManager.getAllValues();
                const country = StateManager.getSelectedCountry();
                const params = CalculationEngine.getBaseParams(values, country);
                const targetQty = this.calculateTargetQty(params, values, country)
                const costs = CalculationEngine.getUnitCosts(params, targetQty);

                return CalculationEngine.calculateFinancialData(params, values, costs);
            } catch (error) {
                console.error('获取财务数据失败:', error);
                return null;
            }
        }
        ,

        /**
         * 关闭状态统计模态框
         */
        closeStatsModal() {
            const modal = StateManager.inputs.statsModal;
            if (modal) {
                modal.classList.remove('active');
            }
        }
        ,

        /**
         * 导出订单报表
         */
        exportCSV() {
            const csvContent = OrderManager.exportOrdersToCSV();

            if (!csvContent) {
                alert('当前暂无订单数据可导出');
                return;
            }

            this.downloadCSV(csvContent, `大芬油画订单数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`);

            Swal.fire({
                title: '导出成功',
                text: `已成功导出 ${StateManager.orders.length} 条订单数据`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1e293b',
                color: '#f1f5f9'
            });
        }
        ,

        /**
         * 导出财务数据
         */
        exportFinancialCSV() {
            const financialData = this.getCurrentFinancialData();
            if (!financialData) {
                alert('无法生成财务数据');
                return;
            }

            const healthData = CalculationEngine.calculateCashflowHealth(financialData, {});
            const summary = OrderManager.getStatsSummary();

            const report = {
                '月份': new Date().toLocaleDateString('zh-CN'),
                '订单总数': summary.totalOrders,
                '已完成订单': `${summary.byStatus.completed}单 ($${MathUtils.formatNumber(summary.byAmount.completed)})`,
                '已发货待收款': `${summary.byStatus.shippedUnpaid}单 ($${MathUtils.formatNumber(summary.byAmount.shippedUnpaid)})`,
                '待发货已收款': `${summary.byStatus.unshippedPaid}单 ($${MathUtils.formatNumber(summary.byAmount.unshippedPaid)})`,
                '预订单': `${summary.byStatus.preorder}单 ($${MathUtils.formatNumber(summary.byAmount.preorder)})`,
                '总营收(USD)': `$${MathUtils.formatNumber(financialData.totalRevenueUSD)}`,
                '总营收(CNY)': MathUtils.formatCurrency(financialData.totalRevenueCNY, '￥', 0),
                '采购成本': MathUtils.formatCurrency(financialData.totalCanvasCost, '￥', 0),
                '广告费用': MathUtils.formatCurrency(financialData.totalAdCost, '￥', 0),
                '最终净利润': MathUtils.formatCurrency(financialData.finalProfit, '￥', 0),
                '利润率': `${MathUtils.round(financialData.finalProfitPct, 1)}%`,
                '现金流健康度': `${healthData.score}%`,
                '回款率': `${healthData.collectionRate}%`,
                '生成时间': new Date().toLocaleString('zh-CN')
            };

            const csvContent = Object.entries(report)
                .map(([key, value]) => `${key},${value}`)
                .join('\n');

            this.downloadCSV(csvContent, `大芬油画财务数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`);
        }
        ,

        /**
         * 导出状态报告
         */
        exportStatusReport() {
            const stats = StateManager.getOrderStats();
            const financialData = this.getCurrentFinancialData();
            const healthData = financialData ? CalculationEngine.calculateCashflowHealth(financialData, {}) : {
                score: 0,
                message: '无数据'
            };

            const report = {
                '报表日期': new Date().toLocaleDateString('zh-CN'),
                '订单总数': stats.total,
                '已完成订单': `${stats.completed}单 ($${MathUtils.formatNumber(stats.completedAmount)})`,
                '已发货待收款': `${stats.shippedUnpaid}单 ($${MathUtils.formatNumber(stats.shippedUnpaidAmount)})`,
                '待发货已收款': `${stats.unshippedPaid}单 ($${MathUtils.formatNumber(stats.unshippedPaidAmount)})`,
                '预订单': `${stats.preorder}单 ($${MathUtils.formatNumber(stats.preorderAmount)})`,
                '已取消订单': `${stats.cancelled}单`,
                '实际已实现利润': financialData ? MathUtils.formatCurrency(financialData.finalProfit, '￥', 0) : '￥0',
                '现金流健康度': `${healthData.score}% (${healthData.message})`,
                '回款率': `${healthData.collectionRate || 0}%`,
                '现金覆盖率': `${healthData.cashCoverage || 0}%`,
                '生成时间': new Date().toLocaleString('zh-CN')
            };

            const csvContent = Object.entries(report)
                .map(([key, value]) => `${key},${value}`)
                .join('\n');

            this.downloadCSV(csvContent, `订单状态报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`);
        }
        ,

        /**
         * 下载CSV文件
         * @param {string} csvContent - CSV内容
         * @param {string} filename - 文件名
         */
        downloadCSV(csvContent, filename) {
            const blob = new Blob(['\ufeff' + csvContent], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = filename;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        ,

        /**
         * 清空本月数据
         */
        clearMonthly() {
            Swal.fire({
                title: '清空本月数据',
                text: '确定要清空所有订单和财务数据吗？此操作不可撤销。',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '清空',
                cancelButtonText: '取消',
                confirmButtonColor: '#ef4444',
                background: '#1e293b',
                color: '#f1f5f9'
            }).then((result) => {
                if (result.isConfirmed) {
                    if (StateManager.clearAllData()) {
                        this.showSuccessMessage('数据已清空', '所有数据已重置');

                        // 刷新界面
                        this.calculateAll();
                    }
                }
            });
        }
        ,

        /**
         * 切换主题
         */
        toggleTheme() {
            const body = document.body;
            const isLight = body.classList.toggle('light-theme');

            this.updateThemeIcon(isLight ? 'light' : 'dark');
            localStorage.setItem(STORAGE_KEYS.THEME, isLight ? 'light' : 'dark');
        }
        ,

        /**
         * 显示成功消息
         * @param {string} title - 标题
         * @param {string} text - 内容
         */
        showSuccessMessage(title, text) {
            Swal.fire({
                title: title,
                text: text,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1e293b',
                color: '#f1f5f9'
            });
        }
    }
;

// 导出UI管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {UIManager: CalculationManager};
} else {
    window.UIManager = CalculationManager;
}
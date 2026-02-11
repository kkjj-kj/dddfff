系统架构设计 (System Architecture)
系统采用 “三位一体” 的分布式架构，通过本地服务器实现数据互通。

模块组成
前端触手 (Browser Extension)：

载体：Chrome 插件（Sidebar 模式）。

宿主：WhatsApp Web。

职责：数据抓取 (Scraping)、意图识别 (Intent)、UI 交互 (Overlay)。

中枢神经 (Local Server)：

技术栈：Node.js (Fastify)。

职责：API 路由、AI 接口中转 (Gemini)、数据库读写 (JSON)。

核心大脑 (Desktop CRM)：

载体：封装后的桌面应用 (Web 原生)。

核心文件：client_crm.html + crm-manager.js + calculation-engine.js + main.js。

职责：数据可视化、深度编辑、财务核算、配置管理。

代码：代码洁癖、注释、模块化、写法简洁es6、无BUG、无屎山

最终桌面端打包成exe开启端口（插件端需要提示是否连接上终端，可配置端口）

数据流向图 (Data Flow)
[WhatsApp Web] -> (抓取) -> [Chrome 插件] -> (JSON) -> [本地服务器 API]
                                                          |
      [Gemini AI] <--(Prompt)-- (分析/润色) <-------------+
                                                          |
                                                          v
                                                  [本地 JSON文件 数据库]
                                                          ^
                                                          |
[精算引擎] <--(调用)-- [CRM 桌面端] <--(渲染)-- (读取/写入)


功能需求详情

A.client_crm.html:
1.布局：现状原列表 放 左边 2/4宽，右边新增 智能工作区 2/4宽
2.客户列表：快速搜索：支持拼音首字母、电话后四位、标签搜索，显示头像、姓名、国家（旗帜+中文）、WhatsApp 直达按钮、在线状态（呼吸灯），智能排序：按“最后互动时间”或“意向分”降序排列
2.智能工作区：
    1）该客户历史订单记录（数据源：localstorage）
    2）历史聊天记录（数据源：插件->json）
    3）历史聊天意向诊断雷达（AI）
    4）客户跟踪建议（AI）
    5）扩展

B.whatsapp插件：
. 智能沟通舱 (The Smart Communicator)
多模态感知：

语音转文字：接收到客户语音时，一键转为文字并翻译。

图片识别 (OCR/Vision)：客户发来一张油画网图，AI 自动分析风格、流派，并提示你：“这是波普风格，建议回复我们有类似画师。”

意图翻译 (Intent-based Translation)：

你写中文，AI 不只是翻译成英文，而是根据你设置的 “人设插件”（如：大芬资深老板、温柔客服、强势批发商）进行润色。

防 AI 味检测：强制 AI 使用口语化词汇（如用 "Got it" 代替 "I have received your message"），让客户感觉对面是个活生生的人。

2. 精准询盘雷达 (Lead Radar)
成交概率打分 (Lead Scoring)：

分析对话频率、关键词（如问交期、问底价、问材质）。

红绿灯系统：

🟢 绿灯：精准买家（问细节、确认规格）。

🟡 黄灯：观望买家（对比价格）。

🔴 红灯：同行套词或骗子（话术重复、逻辑混乱）。

压力测试：当客户砍价时，AI 提示该国家的行业底价，帮你守住利润。

3. 脱水记录仪 (Dehydrated CRM Sync)
关键要素抓取：不存流水账。只抓取：尺寸、数量、目的地、特殊要求、报价记录。

一键同步：点击“归档”，数据自动飞向你的 client_crm.html，并生成一段 50 字的“战斗简报”。

4. 商业定制化引擎 (B2B Commercial Layer) —— 为了以后拿去卖
Prompt 模板库：支持导入/导出。油画行业用一套，电子产品用一套。

多模型切换：支持接入 DeepSeek、Gemini、GPT-4 等。用户自备 Key，你卖的是“系统框架”和“业务逻辑”。

安全隔离墙 (Anti-Ban Infrastructure)
无感注入：采用 Shadow DOM 技术，不修改 WhatsApp 原始代码，只在网页侧边“悬浮”。

操作模拟：永远是“你点击，才填入”。WhatsApp 的后台检测不到任何自动化脚本的痕迹。

这个插件将实现你的 5 大目标：

1. 解决沟通：中文输入 → 地道外语
功能：在 WhatsApp 输入框旁边加一个“中文助手”小窗。

体验：你输入：“老板，这 15 幅画如果你今天下单，我可以送你高档画筒，最快明天发货。”

结果：AI 自动根据客户国家（如哥伦比亚）转成地道的西班牙语或商务英语，你点一下“填入”，它就进到 WhatsApp 发送框了。

2. 提高转化：AI 润色（批发商口吻）
功能：AI 会自动给你的话加点“料”。

策略：它不会直译，而是按资深批发商的逻辑改写。

普通翻译：We only sell physical paintings.

AI 润色：As a professional wholesale studio, we prioritize the tangible texture and value of physical canvas, which digital NFT files simply cannot replicate.

3. 精准判别：询盘红绿灯
功能：点击“意向分析”按钮。

结果：AI 扫描屏幕对话，直接给出标签：[精准询盘]、[同行套价]、[疑似杀猪盘]。

4. CRM 归档：脱水精华存入
功能：面板上有一个“存入 CRM”按钮。

结果：它不会存一堆废话，而是提取：客户想买 24x36寸，15幅，希望单价降 $5，交期 10 天。一键发给你的 client_crm.html。

5. 安全不封号
原理：插件不替你点击“发送”按钮，而是把文字准备好让你确认后再发。这在 WhatsApp 系统看来，就是你自己在打字，完全 0 风险。



Role (角色设定):
你是“大芬战友”AI，一位在大芬油画村摸爬滚打 20 年的资深外贸批发专家。你不仅精通油画工艺（手绘、肌理、油彩厚度、装裱、DDP 物流），更洞察海外画廊老板和软装公司的心理。

Task (任务说明):
接收来自客户的文本、语音转义文字或图片，完成以下任务：

意图深度诊断：判断客户是“真买家”还是“套价者”，识别潜在的杀猪盘（如 NFT 诈骗）。

意图翻译与润色：将老板的中文翻译成地道、利落的商务外语。禁止使用“I hope this finds you well”等废话。要表现得像个务实的生意人。

多模态分析：如果客户发图，分析其艺术风格（如 Impressionism, Abstract）并给出销售建议。

信息脱水：提取订单核心参数（尺寸、数量、工期、单价、目的地）。

Linguistic Constraints (语言红线):

去 AI 味：严禁使用“As an AI model...”、“Certainly!”、“I would be honored to...”等标准回复。

口语化处理：多用短句，多用 "Got it", "Sounds good", "Noted", "Will do"。

专业性：准确使用行业词汇（Stretched canvas, Gallery wrapped, Heavy texture, Palette knife, Lead time）。

Output Format (输出格式):
[🚩 意向雷达]: (🟢 精准买家 / 🟡 徘徊中 / 🔴 警惕：疑似骗子或同行) - 简述理由。
[💡 战术建议]: 告诉老板下一句话该抓哪个痛点。
[✨ 润色回话]: 提供一段直接可复制的回复内容。
[📋 订单快报]: 如果有成交信息，请列出：[客户/规格/数量/预估金额/物流要求]。
/**
 * routes.js
 * 功能：API 路由定义
 */
const db = require('./db-manager');

async function routes(fastify, options) {

    // === 1. 健康检查 ===
    fastify.get('/', async () => {
        return {status: 'ok', system: 'DafenArts Core v1.0'};
    });

    // === 2. 插件端接口 (Plugin Endpoints) ===

    // 接收插件抓取的客户数据 (POST)
    fastify.post('/api/plugin/sync-profile', async (request, reply) => {
        const {name, phone, email, country, avatar, source} = request.body;

        if (!name) return reply.code(400).send({error: '姓名必填'});

        const result = await db.addClient({
            name,
            phone,
            email,
            country: country || 'Unknown',
            avatar,
            source: source || 'WhatsApp Plugin',
            level: 'new',
            tags: ['插件导入']
        });

        return {code: 200, msg: '同步成功', data: result};
    });

    // 接收聊天记录/意图 (POST) - 为下一步做准备
    fastify.post('/api/plugin/sync-chat', async (request, reply) => {
        // TODO: 存储聊天记录逻辑
        return {code: 200, msg: '聊天记录已接收 (暂存)'};
    });

    // === 3. CRM 端接口 (Client Endpoints) ===

    // 获取客户列表 (GET)
    fastify.get('/api/crm/clients', async (request, reply) => {
        const {q} = request.query; // 支持 ?q=关键词 搜索
        const clients = await db.getClients(q);
        return {code: 200, data: clients};
    });

    // 手动录入客户 (POST)
    fastify.post('/api/crm/client', async (request, reply) => {
        const result = await db.addClient(request.body);
        return {code: 200, data: result};
    });

}

module.exports = routes;
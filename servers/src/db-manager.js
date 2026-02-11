/**
 * db-manager.js (修复版)
 * 核心修正：强制定位到 exe 所在真实目录，防止写入 snapshot 报错
 */
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// === 核心修复逻辑 START ===
// 1. 判断是否在 exe 环境
const isPkg = typeof process.pkg !== 'undefined';

// 2. 锁定根目录
// 如果在 exe 里，process.execPath 是 exe 文件的完整路径，我们要取它的文件夹
// 如果在开发环境，__dirname 是 src 目录，我们要取上一级
const BASE_DIR = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');

// 3. 锁定数据目录
const DATA_DIR = path.join(BASE_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// 4. 调试打印 (打包后您在黑框里能看到这个路径，确认对不对)
console.log(`[DB] 数据库路径锁定: ${DB_PATH}`);

// 5. 确保 data 目录存在 (必须用同步方法，否则后面读写会报错)
if (!fsSync.existsSync(DATA_DIR)) {
    try {
        fsSync.mkdirSync(DATA_DIR, { recursive: true });
        console.log('[DB] data 目录创建成功');
    } catch (e) {
        console.error('[DB] data 目录创建失败:', e);
    }
}
// === 核心修复逻辑 END ===

const DEFAULT_DATA = {
    clients: [],
    orders: [],
    logs: []
};

class DbManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // 检查文件是否存在
            await fs.access(DB_PATH);
        } catch {
            await this.write(DEFAULT_DATA);
            console.log('📦 [DB] 数据库文件已初始化');
        }
    }

    async read() {
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ 读取数据库失败:', error);
            return DEFAULT_DATA;
        }
    }

    async write(data) {
        try {
            await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('❌ 写入数据库失败:', error); // 这里会打印具体的错误路径
            return false;
        }
    }

    // ... 下面的业务逻辑保持不变 ...

    async addClient(newClient) {
        const db = await this.read();
        const index = db.clients.findIndex(c =>
            (c.phone && newClient.phone && c.phone === newClient.phone) ||
            (c.email && newClient.email && c.email === newClient.email)
        );

        if (index > -1) {
            db.clients[index] = { ...db.clients[index], ...newClient, updatedAt: new Date() };
            console.log(`🔄 更新客户: ${newClient.name}`);
        } else {
            newClient.id = 'C' + Date.now();
            newClient.createdAt = new Date();
            db.clients.unshift(newClient);
            console.log(`✅ 新增客户: ${newClient.name}`);
        }

        await this.write(db);
        return { success: true, total: db.clients.length };
    }

    async getClients(query = '') {
        const db = await this.read();
        if (!query) return db.clients;
        const term = query.toLowerCase();
        return db.clients.filter(c =>
            c.name.toLowerCase().includes(term) ||
            (c.phone && c.phone.includes(term))
        );
    }

    async addOrder(newOrder) {
        const db = await this.read();
        if (!db.orders) db.orders = [];
        const index = db.orders.findIndex(o => o.id === newOrder.id);

        if (index > -1) {
            db.orders[index] = { ...db.orders[index], ...newOrder, updatedAt: new Date() };
            console.log(`💰 更新订单: ${newOrder.id}`);
        } else {
            db.orders.unshift(newOrder);
            console.log(`💵 新增订单: ${newOrder.id}`);
        }
        await this.write(db);
        return { success: true, total: db.orders.length };
    }

    async getOrders() {
        const db = await this.read();
        return db.orders || [];
    }
}

module.exports = new DbManager();
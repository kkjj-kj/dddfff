/**
 * server.js (稳定版)
 * 修复：移除 open 库，改用 child_process 避免 pkg 报错
 */
const fastify = require('fastify')({ logger: false });
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process'); // <--- 引入原生命令执行器

// === 1. 智能路径处理 ===
const isPkg = typeof process.pkg !== 'undefined';
const BASE_DIR = isPkg ? path.dirname(process.execPath) : __dirname;

// 确保数据目录存在 (双重保险)
const DATA_DIR = path.join(BASE_DIR, 'data');
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.error('Data目录创建失败:', e);
    }
}

// === 2. 读取配置文件 ===
let PORT = 8888; // 改个默认端口，避免冲突
const configPath = path.join(BASE_DIR, 'config.json');

if (fs.existsSync(configPath)) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.port && Number.isInteger(config.port)) PORT = config.port;
    } catch (e) {}
}

// === 3. 获取本机局域网 IP ===
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}
const LAN_IP = getLocalIP();

// === 4. 注册插件 ===
const PUBLIC_DIR = path.join(__dirname, 'public');

fastify.register(require('@fastify/cors'), { origin: '*' });
fastify.register(require('@fastify/static'), {
    root: PUBLIC_DIR,
    prefix: '/',
});
fastify.register(require('./src/routes'));

// === 5. 辅助：打开浏览器函数 ===
function openBrowser(url) {
    const startCmd = process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open';
    try {
        exec(`${startCmd} ${url}`);
    } catch (e) {
        console.log(`⚠️ 自动打开浏览器失败，请手动访问: ${url}`);
    }
}

// === 6. 启动服务 ===
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });

        const url = `http://${LAN_IP}:${PORT}`;

        console.log(`
        ╔═══════════════════════════════════════════╗
        ║      🌍 大芬战友 - 局域网共享版 v1.1        ║
        ╠═══════════════════════════════════════════╣
        ║  🟢 服务已启动                            ║
        ║  📡 访问地址: ${url}          ║
        ║  📂 数据路径: ${DATA_DIR}                 ║
        ╚═══════════════════════════════════════════╝
        `);

        // 使用原生命令打开
        openBrowser(`${url}/client_crm.html`);

    } catch (err) {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n❌ 端口 ${PORT} 被占用！请修改 config.json。\n`);
        } else {
            console.error('启动失败:', err);
        }
        setTimeout(() => process.exit(1), 10000); // 10秒后关闭，让你看清报错
    }
};

start();
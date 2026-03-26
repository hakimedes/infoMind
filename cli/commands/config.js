// cli/commands/config.js - Config management + shared API helper
const { Command } = require('commander');
const chalk = require('chalk');

const API_BASE = `http://localhost:${process.env.INFOMIND_PORT || 3456}`;

async function callApi(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
    return json.data;
}

const cmd = new Command('config')
    .description('查看或设置系统配置');

cmd.command('list')
    .description('显示所有配置')
    .action(async () => {
        try {
            const data = await callApi('GET', '/api/config');
            console.log(chalk.bold('\n⚙️  当前配置:'));
            for (const [k, v] of Object.entries(data)) {
                console.log(`  ${chalk.cyan(k.padEnd(20))} ${chalk.white(v)}`);
            }
            console.log();
        } catch (err) {
            console.error(chalk.red('❌ ' + err.message));
        }
    });

cmd.command('set <key> <value>')
    .description('设置配置项 (例: llm.api_key sk-xxx)')
    .action(async (key, value) => {
        try {
            await callApi('PUT', '/api/config', { [key]: value });
            console.log(chalk.green(`✅ 已设置 ${key}`));
        } catch (err) {
            console.error(chalk.red('❌ ' + err.message));
        }
    });

cmd.command('get <key>')
    .description('获取配置项')
    .action(async (key) => {
        try {
            const data = await callApi('GET', '/api/config');
            console.log(chalk.white(data[key] || '(未设置)'));
        } catch (err) {
            console.error(chalk.red('❌ ' + err.message));
        }
    });

module.exports = cmd;
module.exports.callApi = callApi;

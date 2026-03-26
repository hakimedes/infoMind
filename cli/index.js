#!/usr/bin/env node
// cli/index.js - InfoMind CLI entry point
'use strict';

const { program } = require('commander');
const pkg = require('../package.json');

program
    .name('infomind')
    .description('InfoMind - 个人知识管理系统 CLI')
    .version(pkg.version);

program.addCommand(require('./commands/add'));
program.addCommand(require('./commands/list'));
program.addCommand(require('./commands/search'));
program.addCommand(require('./commands/config'));
program.addCommand(require('./commands/serve'));

// Stats command
program
    .command('stats')
    .description('查看知识库统计')
    .action(async () => {
        const { callApi } = require('./commands/config');
        try {
            const data = await callApi('GET', '/api/stats');
            const chalk = require('chalk');
            console.log('\n' + chalk.bold.cyan('📊 InfoMind 知识库统计'));
            console.log(chalk.gray('─'.repeat(40)));
            console.log(`📚 总条目数:    ${chalk.bold.white(data.total_entries)}`);
            console.log(`📖 书架数量:    ${chalk.bold.white(data.total_books)}`);
            console.log(`🏷️  使用分类:    ${chalk.bold.white(data.total_categories_used)}`);
            if (data.by_platform?.length) {
                console.log('\n' + chalk.gray('平台分布:'));
                data.by_platform.forEach(p => {
                    console.log(`  ${chalk.cyan(p.platform.padEnd(12))} ${chalk.white(p.count)} 条`);
                });
            }
            if (data.recent?.length) {
                console.log('\n' + chalk.gray('最近收录:'));
                data.recent.forEach(e => {
                    const date = new Date(e.created_at).toLocaleDateString('zh-CN');
                    console.log(`  ${chalk.gray(date)} ${chalk.white((e.title || e.id).slice(0, 50))}`);
                });
            }
            console.log();
        } catch (err) {
            console.error(require('chalk').red('❌ ' + err.message));
            process.exit(1);
        }
    });

program
    .command('doctor')
    .description('检查系统状态')
    .action(async () => {
        const chalk = require('chalk');
        const { callApi } = require('./commands/config');
        console.log(chalk.bold('\n🩺 InfoMind 系统诊断'));
        try {
            await callApi('GET', '/api/health');
            console.log(chalk.green('✅ 服务器运行正常'));
        } catch {
            console.log(chalk.red('❌ 服务器未运行，请先执行: infomind serve'));
        }
        try {
            await callApi('POST', '/api/config/test-llm');
            console.log(chalk.green('✅ LLM 连接正常'));
        } catch (err) {
            console.log(chalk.yellow('⚠️  LLM 连接失败: ' + err.message));
            console.log(chalk.gray('   请通过 infomind config set llm.api_key <key> 配置 API Key'));
        }
        console.log();
    });

program.parse(process.argv);

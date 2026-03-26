// cli/commands/list.js
const { Command } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');
const { callApi } = require('./config');

module.exports = new Command('list')
    .description('查看已收录的内容列表')
    .option('-c, --category <category>', '按分类筛选')
    .option('-p, --platform <platform>', '按平台筛选')
    .option('-s, --sort <field>', '排序字段 (created_at|title)', 'created_at')
    .option('-l, --limit <n>', '显示条数', '20')
    .action(async (opts) => {
        try {
            const params = new URLSearchParams({
                limit: opts.limit, sort: opts.sort,
                ...(opts.category && { category: opts.category }),
                ...(opts.platform && { platform: opts.platform }),
            });
            const data = await callApi('GET', `/api/entries?${params}`);
            const entries = data.entries || [];

            if (!entries.length) {
                console.log(chalk.yellow('\n📚 暂无内容\n'));
                return;
            }

            const table = new Table({
                head: [
                    chalk.gray('#'), chalk.gray('标题'), chalk.gray('分类'),
                    chalk.gray('平台'), chalk.gray('收录时间')
                ],
                colWidths: [4, 40, 12, 12, 12],
                style: { head: [], border: ['gray'] },
            });

            entries.forEach((e, i) => {
                const title = (e.title || '无标题').slice(0, 38);
                const date = new Date(e.created_at).toLocaleDateString('zh-CN');
                table.push([
                    chalk.gray(i + 1),
                    chalk.white(title),
                    chalk.cyan(e.category),
                    chalk.blue(e.platform),
                    chalk.gray(date),
                ]);
            });

            console.log(`\n📚 ${chalk.bold('收录内容')} (共 ${chalk.cyan(data.total)} 条，显示 ${entries.length} 条)\n`);
            console.log(table.toString());
            console.log();
        } catch (err) {
            console.error(chalk.red('❌ ' + err.message));
            process.exit(1);
        }
    });

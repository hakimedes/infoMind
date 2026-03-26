// cli/commands/search.js
const { Command } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');
const { callApi } = require('./config');

module.exports = new Command('search')
    .description('搜索知识库内容')
    .argument('<keyword>', '搜索关键词')
    .option('-l, --limit <n>', '最多显示条数', '20')
    .action(async (keyword, opts) => {
        try {
            const entries = await callApi('GET', `/api/entries/search?q=${encodeURIComponent(keyword)}&limit=${opts.limit}`);
            const list = entries.data || entries;

            if (!list.length) {
                console.log(chalk.yellow(`\n🔍 未找到包含「${keyword}」的内容\n`));
                return;
            }

            const table = new Table({
                head: [chalk.gray('#'), chalk.gray('标题'), chalk.gray('分类'), chalk.gray('平台'), chalk.gray('收录时间')],
                colWidths: [4, 40, 12, 12, 12],
                style: { head: [], border: ['gray'] },
            });

            list.forEach((e, i) => {
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

            console.log(`\n🔍 搜索「${chalk.bold.cyan(keyword)}」共 ${chalk.cyan(list.length)} 条结果\n`);
            console.log(table.toString());
            console.log();
        } catch (err) {
            console.error(chalk.red('❌ ' + err.message));
            process.exit(1);
        }
    });

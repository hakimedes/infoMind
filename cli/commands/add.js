// cli/commands/add.js
const { Command } = require('commander');
const chalk = require('chalk');
const { callApi } = require('./config');

module.exports = new Command('add')
    .description('添加一个链接到知识库')
    .argument('<url>', '要添加的链接 URL')
    .option('-n, --note <note>', '添加备注')
    .option('-c, --category <category>', '手动指定分类')
    .action(async (url, opts) => {
        console.log(chalk.blue('🔍 正在解析链接...'));
        try {
            const entry = await callApi('POST', '/api/entries', {
                url, note: opts.note, category: opts.category,
            });
            console.log(chalk.green('\n✅ 收录成功！'));
            console.log(`${chalk.gray('平台:')}     ${chalk.white(entry.platform)}`);
            console.log(`${chalk.gray('标题:')}     ${chalk.white(entry.title || '(无标题)')}`);
            console.log(`${chalk.gray('作者:')}     ${chalk.white(entry.author || '-')}`);
            console.log(`${chalk.gray('分类:')}     ${chalk.cyan(entry.category)}`);
            console.log(`${chalk.gray('ID:')}       ${chalk.gray(entry.id)}`);
            if (entry.summary) {
                console.log(`\n${chalk.gray('摘要:')} ${chalk.white(entry.summary.slice(0, 120))}...`);
            }
            console.log();
        } catch (err) {
            console.error(chalk.red('\n❌ 添加失败: ' + err.message));
            process.exit(1);
        }
    });

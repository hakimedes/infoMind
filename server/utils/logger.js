// server/utils/logger.js
const chalk = require('chalk');

const logger = {
    info: (msg) => console.log(chalk.blue('ℹ'), chalk.gray(new Date().toISOString()), msg),
    success: (msg) => console.log(chalk.green('✅'), chalk.gray(new Date().toISOString()), msg),
    warn: (msg) => console.log(chalk.yellow('⚠️'), chalk.gray(new Date().toISOString()), msg),
    error: (msg, err) => {
        console.error(chalk.red('❌'), chalk.gray(new Date().toISOString()), msg);
        if (err) console.error(chalk.red(err.stack || err.message || err));
    },
    debug: (msg) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(chalk.magenta('🔍'), chalk.gray(new Date().toISOString()), msg);
        }
    }
};

module.exports = logger;

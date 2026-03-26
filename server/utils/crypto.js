// server/utils/crypto.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;

function getKey() {
    // Derive a stable key from a machine-local secret
    const secret = process.env.INFOMIND_SECRET || 'infomind-local-secret-key-2026';
    return crypto.scryptSync(secret, 'infomind-salt', KEY_LENGTH);
}

function encrypt(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const key = getKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (e) {
        return text; // fallback: store as-is
    }
}

function decrypt(encrypted) {
    if (!encrypted) return encrypted;
    try {
        const parts = encrypted.split(':');
        if (parts.length < 2) return encrypted; // not encrypted
        const iv = Buffer.from(parts[0], 'hex');
        const key = getKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(parts[1], 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return encrypted; // fallback
    }
}

function maskKey(key) {
    if (!key || key.length < 8) return '***';
    return key.slice(0, 4) + '***' + key.slice(-4);
}

module.exports = { encrypt, decrypt, maskKey };

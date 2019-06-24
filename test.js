let c = require('./lib/FDS-Crypto.js');
const crypto = require('crypto');
let iv = c.generateRandomIV();

let key = Buffer.from('7fa2e21eab91dade7fa2e21eab91dade', 'hex');
// let iv = Buffer.from('7fa2e21eab91dade', 'hex');


console.log(iv);

// crypto.createCipheriv('aes-256-cbc', '0x7fa2e21eab91dade7fa2e21eab91dade', '7fa2e21eab91dade');
crypto.createCipheriv('aes-256-cbc', key.toString('hex'), iv);

// c.encryptString('test', '7fa2e21eab91dade7fa2e21eab91dade', '7fa2e21eab91dade').then(console.log);

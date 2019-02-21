// handles crypto
// TODO - use IV's!!

let NodeCrypto = require('crypto');
let Web3 = require('web3');
let Utils = require('./FDS-Utils.js');

class Crypto {
    /**
     * @returns {number} random values
     */
    generateRandomIV() {
        return window.crypto.getRandomValues(new Uint8Array(256 / 8 / 2));
    }

    /**
     * Calculates shared secret
     * @calculateSharedSecret
     * @param {any} privateKey private key
     * @param {any} recipientPublicKey recipient public key
     * @returns {string} secret
     */
    calculateSharedSecret(privateKey, recipientPublicKey) {
        let sender = NodeCrypto.createECDH('secp256k1');
        sender.setPrivateKey(privateKey.substring(2, 66), 'hex');
        return sender.computeSecret("04" + recipientPublicKey.substring(2, 132), 'hex').toString('hex');
    }

    /**
     * 
     * @param {any} string to encrypt
     * @param {any} password to use
     * @param {any} iv initialization vector
     * @returns {any} encrypted string
     */
    encryptString(string, password, iv) {
        return this.encryptBuffer(new TextEncoder("utf-8").encode(string), password, iv)
            .then((encryptedBuffer) => {
                return Web3.utils.bytesToHex(encryptedBuffer);
            }
            );
    }

    /**
     * Decrypt string
     * @param {any} string encrypted string
     * @param {any} password to use
     * @param {any} iv initialization vector
     * @returns {string} decrypted string 
     */
    decryptString(string, password, iv) {
        let encryptedBuffer = Utils.hexStringToByte(string);
        let ivBytes = Utils.hexStringToByte(iv.substring(2));
        let decryptedBuffer = this.decryptBuffer(encryptedBuffer, password, ivBytes);
        return new TextDecoder().decode(decryptedBuffer);
    }

    /**
     * Encrypt buffer
     * @param {any} buffer to encrypt 
     * @param {any} password to use
     * @param {any} iv init vector
     * @returns {Buffer} encrypted buffer
     */
    encryptBuffer(buffer, password, iv) {
        // in a promise because later we'll put this in a web worker
        return new Promise((resolve, reject) => {
            if (!password) throw new Error('You must supply a password.');
            let key = Utils.hexStringToByte(password.substring(2));
            let cipher = NodeCrypto.createCipheriv('aes-256-ctr', key, iv);
            let crypted = cipher.update(new Uint8Array(buffer));
            let cryptedFinal = cipher.final();
            let c = new Uint8Array(crypted.length + cryptedFinal.length);
            c.set(crypted);
            c.set(cryptedFinal, crypted.length);
            resolve(c);
        });
    }

    /**
     * Decrypt buffer
     * @param {any} buffer to decrypt
     * @param {any} password to use
     * @param {any} iv init vector
     * @returns {Buffer} decrypted buffer
     */
    decryptBuffer(buffer, password, iv) {
        let key = Utils.hexStringToByte(password.substring(2));
        var decipher = NodeCrypto.createDecipheriv('aes-256-ctr', key, iv);
        var dec = decipher.update(buffer);
        let decFinal = decipher.final();
        let d = new Uint8Array(dec.length + decFinal.length);
        d.set(dec);
        d.set(decFinal, dec.length);
        return d;
    }

    /**
     * Decrypt file
     * @param {any} encryptedBuffer buffer
     * @param {any} password to use
     * @param {any} decryptedFileName file to decrypt to
     * @param {any} mimeType mime type of file
     * @param {any} iv initialization vector
     * @returns {Buffer} decrypted buffer
     */
    decryptedFile(encryptedBuffer, password, decryptedFileName, mimeType, iv) {
        let decryptedBuffer = this.decryptBuffer(encryptedBuffer, "0x" + password, Utils.hexStringToByte(iv.substring(2)));
        let blob = new Blob([decryptedBuffer], { name: decryptedFileName, type: mimeType });
        blob.name = decryptedFileName;
        return decryptedBuffer;
    }
}

module.exports = new Crypto;
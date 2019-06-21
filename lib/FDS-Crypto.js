// Copyright 2019 The FairDataSociety Authors
// This file is part of the FairDataSociety library.
//
// The FairDataSociety library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The FairDataSociety library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the FairDataSociety library. If not, see <http://www.gnu.org/licenses/>.

// handles crypto

let NodeCrypto = require('crypto');
let Web3Utils = require('web3-utils');
let Utils = require('./FDS-Utils.js');
let randomNumber = require("random-number-csprng");

// if (typeof TextEncoder === "undefined") {
  let TextEncoder = require('util').TextEncoder;
// }

// if (typeof TextDecoder === "undefined") {
  let TextDecoder = require('util').TextEncoder;
// }


class Crypto {
    /**
     * @returns {number} random values
     */
    generateRandomIV() {
        return NodeCrypto.randomBytes(8).toString('hex');
        // return new (require('util').TextEncoder)("utf-8").encode((randomNumber(0, 1*Math.pow(10, 15)));
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
        //console.log('ees', string, password, iv)
        return this.encryptBuffer(new (require('util').TextEncoder)("utf-8").encode(string), password, iv)
            .then((encryptedBuffer) => {
                return Web3Utils.bytesToHex(encryptedBuffer);
            });
    }

    /**
     * Decrypt string
     * @param {any} string encrypted string
     * @param {any} password to use
     * @param {any} iv initialization vector
     * @returns {string} decrypted string 
     */
    decryptString(string, password, iv) {
        //console.log('dds', password, iv)
        let encryptedBuffer = Utils.hexStringToByte(string);
        // let ivBytes = Utils.hexStringToByte(iv);
        let decryptedBuffer = this.decryptBuffer(encryptedBuffer, password, iv);
        return (new (require('util').TextDecoder)).decode(decryptedBuffer);
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
            //console.log('aes-256-ctr', key, iv)
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
        //console.log(iv.length)
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
        let decryptedBuffer = this.decryptBuffer(encryptedBuffer, "0x" + password, iv);
        console.log(new (require('util').TextDecoder)("utf-8").decode(decryptedBuffer))
        //console.log(encryptedBuffer, decryptedBuffer)
        debugger
        // let blob = new Blob([decryptedBuffer], { name: decryptedFileName, type: mimeType });
        // blob.name = decryptedFileName;
        // return blob;
    }
}

module.exports = new Crypto;
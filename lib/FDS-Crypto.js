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

if (typeof window === "undefined") {
  var TextEncoder = require('util').TextEncoder;
  var TextDecoder = require('util').TextDecoder;  
}else{
  var TextEncoder = window.TextEncoder;
  var TextDecoder = window.TextDecoder;}


class Crypto {
    /**
     * @returns {number} random values
     */
    generateRandomIV() {
        return NodeCrypto.randomBytes(16);
    }



    privateToPublicKey(privateKey){
        const elliptic = require("elliptic");        
        const secp256k1 = new elliptic.ec("secp256k1"); // eslint-disable-line
        const buffer = new Buffer(privateKey.slice(2), "hex");
        const ecKey = secp256k1.keyFromPrivate(buffer);
        const publicKey = "0x" + ecKey.getPublic(false, 'hex').slice(2);
        return publicKey;
    }

    /**
     * Calculates shared secret
     * @calculateSharedSecret
     * @param {any} privateKey private key
     * @param {any} recipientPublicKey recipient public key
     * @returns {string} secret
     */
    calculateSharedSecret(privateKey, recipientPublicKey) {
        let pk = privateKey.substring(2, 66)
        let pub = recipientPublicKey.substring(2, 130);
        if(pk.length !== 64){
            throw new Error('private key must be a 32 byte hex string '+privateKey)
        }        
        if(pub.length !== 128){
            throw new Error('public key must be a 64 byte hex string '+recipientPublicKey)
        }
        let sender = NodeCrypto.createECDH('secp256k1');
        sender.setPrivateKey(pk, 'hex');
        return sender.computeSecret("04" + pub, 'hex').toString('hex');
    }

    /**
     * 
     * @param {any} string to encrypt
     * @param {any} password to use
     * @param {any} iv initialization vector
     * @returns {any} encrypted string
     */
    encryptString(string, password, iv) {
        return this.encryptBuffer(Buffer.from(string, 'utf8'), password, iv)
            .then((encryptedBuffer) => {
                return encryptedBuffer.toString('hex');
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
        let decryptedBuffer = this.decryptBuffer(Buffer.from(string, 'hex'), password, iv);
        return (new TextDecoder).decode(decryptedBuffer);
    }

    encryptBuffer(buffer, password, iv){
      return new Promise((resolve, reject) => {     
          let cipher = NodeCrypto.createCipheriv('aes-256-ctr', Buffer.from(password.substring(2), 'hex'), iv);
          let crypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
          resolve(crypted);
        });
    }

    decryptBuffer(buffer, password, iv) {
        var decipher = NodeCrypto.createDecipheriv('aes-256-ctr', Buffer.from(password.substring(2), 'hex'), iv);
        var dec = Buffer.concat([decipher.update(buffer) , decipher.final()]);
        return dec;
    }
}

module.exports = new Crypto;
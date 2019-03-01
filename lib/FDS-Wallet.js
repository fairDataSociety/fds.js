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

// thin wrapper around ethereumjs-wallet

let EthereumJSWallet = require('ethereumjs-wallet');
let EthUtil = require('ethereumjs-util');
//to do - make these web workers and deal with the complexity/security aspect

let complexity = 1; //9 is used in geth but it takes ages!

class Wallet {

    /**
     * Generate new wallet 
     * @param {string} password to use when generating wallet
     * @returns {Wallet} new wallet
     */
    generate(password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.wallet = EthereumJSWallet.generate();
                this.walletV3 = this.wallet.toV3(password, {
                    kdf: 'scrypt',
                    dklen: 32,
                    n: Math.pow(complexity, 2),
                    r: 8,
                    p: 1,
                    cipher: 'aes-128-ctr'
                });
                resolve(this);
            });
        });
    }

    /**
     * Create wallet from json string 
     * @param {string} walletJSON string
     * @param {string} password to use
     * @returns {Wallet} wallet
     */
    fromJSON(walletJSON, password) {
        return new Promise((resolve, reject) => {
            console.time("decryptWallet");
            try {
                var wallet = EthereumJSWallet.fromV3(walletJSON, password, true);
                console.timeEnd("decryptWallet");
                resolve(wallet);
            }
            catch (err) {
                console.timeEnd("decryptWallet");
                if (err.message === "Key derivation failed - possibly wrong passphrase") {
                    reject(false);
                } else {
                    throw new Error(err);
                }
            }
        });
    }

    /**
     * Create wallet from json string 
     * @param {string} walletJSON string
     * @param {string} password to use
     * @returns {Wallet} wallet
     */
    encrypt(privateKey, password) {
        return new Promise((resolve, reject) => {
            console.time("decryptWallet");
            const wallet = EthereumJSWallet.fromPrivateKey(EthUtil.toBuffer("0x"+privateKey));            
            try {
                let walletV3 = wallet.toV3(password, {
                    kdf: 'scrypt',
                    dklen: 32,
                    n: Math.pow(complexity, 2),
                    r: 8,
                    p: 1,
                    cipher: 'aes-128-ctr'
                });
                var walletJSON = JSON.stringify(walletV3);
                resolve(walletJSON);
            }
            catch (err) {
                console.timeEnd("decryptWallet");
                throw new Error(err);
            }
        });
    }    

}

module.exports = Wallet;
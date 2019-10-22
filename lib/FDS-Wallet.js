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


import Crypto from './FDS-Crypto.js';

import {accounts} from 'web3-eth';

class WalletClass {
    constructor(attrs){
        this.address = attrs.address || null;
        this.publicKey = attrs.publicKey || null;
        this.privateKey = attrs.privateKey || null;
    }
}

class Wallet {

    /**
     * Generate new wallet 
     * @param {string} password to use when generating wallet
     * @returns {Wallet} new wallet
     */
    generate(password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                let account = web3.eth.accounts.create();
                let wallet = new WalletClass({
                    address: account.address.toLowerCase(),
                    publicKey: Crypto.privateToPublicKey(account.privateKey),
                    privateKey: account.privateKey
                });
                this.wallet = wallet;
                this.walletV3 = web3.eth.accounts.encrypt(account.privateKey, password);
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
            try {
                var account = web3.eth.accounts.decrypt(walletJSON, password);
                let wallet = new WalletClass({
                    address: account.address.toLowerCase(),
                    publicKey: Crypto.privateToPublicKey(account.privateKey),
                    privateKey: account.privateKey
                });
                resolve(wallet);
            }
            catch (err) {
                if (err.message === "Key derivation failed - possibly wrong passphrase") {
                    reject(false);
                } else {
                    throw new Error(err);
                }
            }
        });
    }

    /**
     * Restores wallet from private key
     * @param {string} privateKey private key string, no 0x
     * @param {string} password to use
     * @returns {Wallet} wallet
     */
    encrypt(privateKey, password) {
        return new Promise((resolve, reject) => {
            try {
                let walletV3 = web3.eth.accounts.encrypt(privateKey, password);
                var walletJSON = JSON.stringify(walletV3);
                resolve(walletJSON);
            }
            catch (err) {
                throw new Error(err);
            }
        });
    }

}

export default Wallet;
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

let Web3 = require('web3');
let Web3Utils = require('web3-utils');
let Contract = require('./FDS-Contract');

class Tx {

    constructor(config, account) {
        this.account = account;
        this.config = config;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout));
    }

    getContract(account, abi, bytecode, address){
        let c = new Contract(this.config, account, abi, bytecode);
        return c.at(address);
    }

    deployContract(account, abi, bytecode, args = [], gas = 15000000){
        let c = new Contract(this.config, account, abi, bytecode);
        //predict
        return c.deploy(args, gas);        
    }

    syncNonce(account){
        return this.web3.eth.getTransactionCount(account.wallet.address);
    }

    /**
     * 
     * @param {any} account to send from
     * @param {any} toAddress 0xfff
     * @param {any} amount in eth
     * @param {any} transactionCallback callback
     * @param {any} transactionSignedCallback callback
     * @returns {any} transaction
     */
    send(account, toAddress, data, amount = 0, transactionCallback = console.log, transactionSignedCallback = console.log) {

        let tx = {
            from: account.address,
            to: toAddress,
            gas: 15000000,
            gasPrice: this.gasPrice,
            value: Web3Utils.toWei(amount, 'ether')
        };
        transactionCallback(tx);
        return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    transactionSignedCallback(hash);
                    return hash;
                });
        });
    }    

    /**
     * 
     * @param {any} account to send from
     * @param {any} toAddress 0xfff
     * @param {any} amount in eth
     * @param {any} transactionCallback callback
     * @param {any} transactionSignedCallback callback
     * @returns {any} transaction
     */
    sendTokens(account, toAddress, amount, transactionCallback = console.log, transactionSignedCallback = console.log) {
        /*if (this.gasPrice === undefined)
        { 
            transactionCallback("something is wrong");
            console.log(this);
            return;
        }*/

        let tx = {
            from: account.address,
            to: toAddress,
            gas: 510000,
            gasPrice: this.gasPrice,
            value: Web3Utils.toWei(amount, 'ether')
        };
        transactionCallback(tx);
        return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    transactionSignedCallback(hash);
                    return hash;
                });
        });
    }    

    /**
     * Ensure address has enough balance
     * @getBalance
     * @param {string} address to check
     * @returns {void} balance of address 
     */
    getBalance(address) {
        try {
            return this.web3.eth.getBalance(address);
        } catch (error) {
            console.error("can't access gateway ", config.ethGateway);
        }
        
    }        
}

module.exports = Tx;
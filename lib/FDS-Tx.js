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
    /**
     * 
     * @param {any} account account
     * @param {any} abi abi 
     * @param {any} bytecode bytecode
     * @param {any} address address
     * @returns {contract} contract 
     */
    getContract(account, abi, bytecode, address) {
        let c = new Contract(this.config, account, abi, bytecode);
        return c.at(address);
    }
    /**
     * Deploy contract 
     * @param {any} account account 
     * @param {any} abi abi
     * @param {any} bytecode bytecode
     * @param {any} args arguments
     * @param {any} nonce nonce 
     * @param {any} gas gass
     * @returns {address} address
     */
    deployContract(account, abi, bytecode, args = [], nonce, gas = 1500000) {
        let c = new Contract(this.config, account, abi, bytecode);
        let d = c.deploy(args, nonce, gas);
        return d;
    }

    /**
     * Ensure address has enough balance
     * @ensureHasBalance
     * @param {string} account to check
     * @param {string} toAddress to check
     * @param {string} amount to check
     * @returns {void} transaction hash
     */
    sendTokens(account, toAddress, amount) {
        let tx = {
            from: account.address,
            to: toAddress,
            gas: 510000,
            gasPrice: this.gasPrice,
            value: Web3.utils.toWei(amount, 'ether')
        };
        console.log(tx)
        return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    return hash;
                });
        });
    }    

    /**
     * Ensure address has enough balance
     * @ensureHasBalance
     * @param {string} address to check
     * @returns {void} 
     */
    getBalance(address) {
        return this.web3.eth.getBalance(address);
    }        
}

module.exports = Tx;
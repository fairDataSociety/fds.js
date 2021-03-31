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

import { toWei } from 'web3-utils';
import { toHex } from 'web3-utils';
import Contract from './FDS-Contract';

class Tx {

    constructor(config, account) {
        this.account = account;
        this.config = config;
        this.web3 = this.config.web3;
    }

    getContract(account, abi, address){
        let c = new Contract(this.config, account, abi);
        return c.at(address);
    }

    deployContract(account, abi, bytecode, args = [], nonce, gas = 15000000){
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
     * @param {any} gas in wei
     * @param {any} transactionCallback callback for info
     * @param {any} transactionSignedCallback callback for info
     * @returns {any} transaction
     */
   async pay(account, toAddress, amount, gas = 15000000, transactionCallback = console.log, transactionSignedCallback = console.log) {
       let nonce = await this.web3.eth.getTransactionCount(account.address); //need to fix nonce problems that happen if one sends payment and then sends any other message
       let tx = {
           from: account.address,
           to: toAddress,
           gas: gas,
           gasPrice: this.gasPrice,
           value: toWei(amount, 'ether')
           //nonce: toHex(nonce)
       };
       transactionCallback(tx);
       try {

           var signed = await this.web3.eth.accounts.signTransaction(tx, account.privateKey);
           var sent = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
           transactionSignedCallback(sent);
           return sent.transactionHash;
       } catch (e) {
           console.error(e);
       }

      /*return new Promise((resolve, reject)=>{
            let tx = {
                from: account.address,
                to: toAddress,
                gas: gas,
                gasPrice: this.gasPrice,
                value: toWei(amount, 'ether'),
                nonce: toHex(nonce)
            };

            //debugger;
            transactionCallback(tx);

            return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
                return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                    .once('confirmation', function (i, hash) {
                        resolve(hash);
                    });
            });
      });*/
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

    getBlockNumber(){
        return this.web3.eth.getBlockNumber();
    }

    sign(account, message){
        return this.web3.eth.accounts.sign(message, account.privateKey);
    }

    recover(message, sig){
        return this.web3.eth.accounts.recover(message, sig);
    }
}

export default Tx;
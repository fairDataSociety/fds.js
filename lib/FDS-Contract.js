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

class FDSContract {

    // later we dynamically create methods
    constructor(config, account, abi, bytecode) {
        this.account = account;
        this.config = config;
        this.abi = abi;
        this.bytecode = bytecode;

        this.Web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout));
        this.gasPrice = this.Web3.utils.toWei(config.gasPrice.toString(), 'gwei');

        this.contractAddress = null;
    }

    at(contractAddress) {
        // will need to deal with nonce & gas issue too - coming soon
        // debugger
        // for (var i = 0; i < this.abi.length; i++) {
        //   debugger
        //   if(
        //     this.abi[i]['type'] === 'function' && 
        //     this.abi[i]['stateMutability'] === 'view'
        //     ){
        //       let contractInstance = this;
        //       this[this.abi[i]['name']] = function(){
        //         contractInstance.call(this.abi[i]['name'], ...arguments, nonce, gas);
        //       };
        //   }else
        //   if(
        //     this.abi[i]['type'] === 'function' && 
        //     this.abi[i]['stateMutability'] === 'payable'          
        //     )
        //   // this[this.abi[i]['name']] = this.web3Instance.methods[i]
        // }      
        this.contractAddress = contractAddress;
        this.web3Instance = new this.Web3.eth.Contract(this.abi, this.contractAddress);
        return this;
    }

    deploy(args = [], nonce, gas = 1500000) {
        return new Promise((resolve, reject) => {
            let contract = new this.Web3.eth.Contract(this.abi);

            let dataTx = contract.deploy({ data: this.bytecode, arguments: args }).encodeABI();

            let privateKey = this.account.privateKey;
            let tx = {
                from: this.account.address,
                data: dataTx,
                gas: gas,
                gasPrice: this.gasPrice,
                nonce: nonce
            };
            return this.Web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
                return this.Web3.eth.sendSignedTransaction(signed.rawTransaction)
                    .once('receipt', (hash) => {
                        resolve(this.at(hash.contractAddress));
                    });
            });   
        });
    }

    send(method, args = [], nonce, gas = 15000000) {
        if (this.contractAddress === null || this.contractAddress === '0x0') {
            throw new Error('you must use ".at" or ".deploy" first');
        }

        let web3Instance = new this.Web3.eth.Contract(this.abi, this.contractAddress);

        let dataTx = web3Instance.methods[method](...args).encodeABI();
        let privateKey = this.account.privateKey;


        let tx = {
            from: this.account.address,
            to: this.contractAddress,
            data: dataTx,
            gas: gas,
            gasPrice: this.gasPrice,
            nonce: nonce
        };

        return this.Web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.Web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('receipt', function (hash) {
                    return hash;
                });
        });

    }

    call(method, args = [], nonce, gas = 15000000) {
        if (this.contractAddress === null || this.contractAddress === '0x0') {
            throw new Error('you must use ".at" or ".deploy" first');
        }

        let web3Instance = new this.Web3.eth.Contract(this.abi, this.contractAddress);

        return web3Instance.methods[method](...args).call({ from: this.account.address });
    }

    getPastEvents(event = "allEvents", options) {
        return new this.Web3.eth.Contract(this.abi, this.contractAddress).getPastEvents(event, options);
    }

}

module.exports = FDSContract;
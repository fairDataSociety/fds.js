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
let Trace = require('./FDS-Trace');

class FDSContract {

    // later we dynamically create methods
    constructor(config, account = false, abi, bytecode = "0x") {
        this.account = account;
        this.config = config;
        this.abi = abi;
        this.bytecode = bytecode;

        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout), null, {transactionConfirmationBlocks: 1});
        this.gasPrice = Web3Utils.toWei(config.gasPrice.toString(), 'gwei');

        this.contractAddress = null;
    }

    at(contractAddress){    
      this.contractAddress = contractAddress;
      this.web3Instance = new this.web3.eth.Contract(this.abi, this.contractAddress);

      for (var i = 0; i < this.abi.length; i++) {
        if(
          this.abi[i]['type'] === 'function' && 
          this.abi[i]['stateMutability'] === 'view'
          ){
            let name = this.abi[i]['name'];
            this[name] = function(){
              return this.call(name, [...arguments]);
            };
        }else
        if(
          this.abi[i]['type'] === 'function' && 
          (this.abi[i]['stateMutability'] === 'payable' || this.abi[i]['stateMutability'] === 'nonpayable')
          ){
            let name = this.abi[i]['name'];          
            this[name] = function(){
              return this.send(name, [...arguments], true, 15000000);
            };
          }
      }  

      return this;
    }

    deploy(args = [], gas = 15000000) {
      Trace.time('deployTransaction//Contract');  
      return new Promise((resolve, reject)=>{
        let contract = new this.web3.eth.Contract(this.abi);

        let deployData = { data: this.bytecode };

        if(args !== []){
          deployData.arguments = args;
        }

        let dataTx = contract.deploy(deployData).encodeABI();

        let privateKey = this.account.privateKey;
        let tx = {
            from: this.account.address,
            data: dataTx,
            gas: gas,
            gasPrice: this.gasPrice,
            nonce: this.account.nonce
        };

        this.account.nonce += 1;

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('confirmation', (i, receipt) => {
                  Trace.timeEnd('deployTransaction//Contract');                      
                  this.transactionReceipt = receipt;
                  resolve(this.at(receipt.contractAddress));
                });
        });
      });
    }    

    send(method, args = [], confirm = true, gas = 15000000) {
      Trace.time('sendTransaction//Contract');
      return new Promise((resolve, reject)=>{
        if(this.contractAddress === null || this.contractAddress === '0x0'){
          throw new Error('you must use ".at" or ".deploy" first');
        }

        let web3Instance = new this.web3.eth.Contract(this.abi, this.contractAddress);
        let dataTx = web3Instance.methods[method](...args).encodeABI();
        let privateKey = this.account.privateKey;


        let tx = {
            from: this.account.address,
            to: this.contractAddress,
            data: dataTx,
            gas: gas,
            gasPrice: this.gasPrice,
            nonce: this.account.nonce
        };

        this.account.nonce += 1

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    if(confirm === false){
                      Trace.log('sendTransaction//Contract', method, confirm);
                      Trace.timeEnd('sendTransaction//Contract');                                          
                      resolve(hash);
                    }
                })
                .once('confirmation', function (i, hash) {
                    if(confirm === true){
                      Trace.log('sendTransaction//Contract', method, confirm);
                      Trace.timeEnd('sendTransaction//Contract');
                      resolve(hash);
                    }
                });
        });
      });
    } 

    call(method, args = [], gas = 15000000) {
      Trace.time('call//Contract');      
      if(this.contractAddress === null || this.contractAddress === '0x0'){
        throw new Error('you must use ".at" or ".deploy" first');
      }

      let web3Instance = new this.web3.eth.Contract(this.abi, this.contractAddress);

      let address = this.account === undefined ? '0x' : this.account.address;
      
      let response =  web3Instance.methods[method](...args).call({from: address});

      Trace.log('call//Contract', method);
      Trace.timeEnd('call//Contract');   

      return response;
    }

    getPastEvents(event = "allEvents", options){
      return new this.web3.eth.Contract(this.abi, this.contractAddress).getPastEvents(event, options);
    }
    
}

module.exports = FDSContract;
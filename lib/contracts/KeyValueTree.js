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


let Web3Utils = require('web3-utils');

let KeyValueTreeContract = require('../../abi/KeyValueTree.json');

class KeyValueTree {

    constructor(FDSAccount, contractAddress) {
        this.account = FDSAccount;
        this.contractAddress = contractAddress;
        this.con = FDSAccount.getContract(KeyValueTreeContract.abi, KeyValueTreeContract.bytecode, contractAddress);
    }

    async getSharedId(address = false){
        return this.con.call('getSharedId', []);
    }

    async getRootId(address = false){
        return this.con.call('getRootId', []);
    }

    async setKeyValue(nodeId, key, value){
        return this.con.send('setKeyValue', [nodeId, key, value], true);
    } 

    async getKeyValue(nodeId, key){
        return this.con.call('getValue', [nodeId, key]);
    }  

    async getKeyValues(nodeId,){
        return this.con.call('getKeysValues', [nodeId]);
    }  

    async addChildNode(parentNodeId, newNodeId){
        return this.con.send('addChildNode', [parentNodeId, newNodeId]);
    } 

    async getChildren(parentNodeId){
        return this.con.call('getChildren', [parentNodeId]);
    }     

}

module.exports = KeyValueTree;
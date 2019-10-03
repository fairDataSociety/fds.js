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
        this.con = FDSAccount.getContract(KeyValueTreeContract.abi, contractAddress);
    }

    async owner() {
        return this.con.call('owner', []);
    }

    /**
     * get root node id in kvt
     * @returns {any} address kvt contract address
    */
    async getRootId() {
        return this.con.call('getRootId', []);
    }
    /**
     * get shared node id in kvt
     * @returns {any} address kvt contract address
    */
    async getSharedId() {
        return this.con.call('getSharedId', []);
    }

    /**
     * get kvt Receiver
     * can be null
     * @returns {any} bytes32 usually a swarmLocation of received information
    */
    async getReceiver() {
        return this.con.call('getReceiver', []);
    }
    /**
     * set kvt Receiver
     * can be null
     * @param {any} hash bytes32 to write
     * @returns {any} bytes32 usually a swarmLocation of receiver information
    */
    async setReceiver(hash) {
        return this.con.send('setReceiver', [hash]);
    }
    /**
     * get kvt Description
     * can be null
     * @returns {any} bytes32 usually a swarmLocation of received information
    */
    async getDescription() {
        return this.con.call('getDescription', []);
    }
    /**
     * set kvt description
     * can be null
     * @param {any} hash bytes32 to write
     * @returns {any} bytes32 usually a swarmLocation of received information
    */
    async setDescription(hash) {
        return this.con.send('setDescription', [hash]);
    }

    /**
     * add a node to kvt
     * @param {any} parentNodeId id of parent node
     * @param {any} newNodeId id of new node that will be child of parentNodeId
     * @returns {any} new node id
    */
    async addChildNode(parentNodeId, newNodeId) {
        return this.con.send('addChildNode', [parentNodeId, newNodeId]);
    }
    /**
     * get root node id in kvt
     * @param {any} nodeId to write to
     * @param {any} key to write
     * @param {any} value for a key 
     * @returns {any} address kvt contract address
    */
    async setKeyValue(nodeId, key, value) {
        return this.con.send('setKeyValue', [nodeId, key, value], true);
    }
    /**
     * get root node id in kvt
     * @param {any} nodeId node to get key from
     * @param {any} key key to retrieve
     * @returns {any} address kvt contract address
    */
    async getKeyValue(nodeId, key) {
        return this.con.call('getValue', [nodeId, key]);
    }
    /**
     * get all key values in a node id
     * @param {any} nodeId to query
     * @returns {any} array of key values
    */
    async getKeyValues(nodeId) {
        return this.con.call('getKeysValues', [nodeId]);
    }

    /**
     * get children
     * @param {any} parentNodeId to be removed
     * @returns {any} array of nodes
    */
    async getChildren(parentNodeId) {
        return this.con.call('getChildren', [parentNodeId]);
    }

    /**
     * get child at position
     * @param {any} nodeId to get child count from
     * @returns {any} count of children
    */
    async getChildCount(nodeId) {
        return this.con.call('getChildCount', [nodeId]);
    }
    /**
     * get child at position
     * @param {any} nodeId to get child from 
     * @param {any} index of child
     * @returns {any} node
    */
    async getChildAt(nodeId, index) {
        return this.con.call('getChildAt', [nodeId, index]);
    }

    /**
     * remove child at position
     * needs write access
     * @param {any} nodeId to remove child from 
     * @param {any} index position of child node to be removed
     * @returns {any} count of children
    */
    async removeChildAt(nodeId, index) {
        return this.con.send('removeChildAt', [nodeId, index]);
    }

    /**
     * check to see if nodeid is really a node 
     * @param {any} nodeId to remove child from 
     * @returns {any} true or false
    */
    async isNode(nodeId) {
        return this.con.call('isNode', [nodeId]);
    }


    /**
     * set access rights to a nodeid
     * needs write access
     * AccessRights
     * contains 0x0 = 1, everyone can read/write
     * contains 0x0 = 1, everyone can read/write
     * contains 0x0 = 0, none onlyOwner
     * contains address = -1, address is forbiden to
     * contains address =  0, address is forbiden to
     * contains address =  1, address can read
     * contains address =  2, address can read/write
     * contains address =  3, address can write but can not read
     * contains address =  4, address can overwrite existing address feed      
     * @param {any} nodeId to set access rights
     * @param {any} address to which access rights belong to 
     * @param {any} rights see access rights 
     * @returns {any} count of children
    */
    async setNodeAccess(nodeId, address, rights) {
        return this.con.send('setNodeAccess', [nodeId, address, rights]);
    }
}

module.exports = KeyValueTree;
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

let MultiboxContract = require('../../abi/Multibox.json');

class Multibox {

    constructor(FDSAccount, contractAddress = false) {
        this.account = FDSAccount;
        this.contractAddress = contractAddress;
        this.con = false;

        if(contractAddress !== false){
            this.con = FDSAccount.getContract(MultiboxContract.abi, contractAddress);            
        }else{
            return this.deploy();
        }

        return this;
    }

    async deploy(){
        this.con = await this.account.deployContract(MultiboxContract.abi, MultiboxContract.bytecode);
        this.contractAddress = this.con.contractAddress;  
        let init = await this.con.send('init', [], true);
        return this;
    }

    /**
    * Get All kvts in multibox 
    * @param {any} address to be deleted
    * @returns {any} all kvt contracts
    */
    async owner() {
        return this.con.call('owner', []);
    }

    /**
    * Get All kvts in multibox 
    * @param {any} address to be deleted
    * @returns {any} all kvt contracts
    */
    async getRoots() {
        return this.con.call('getRoots', []);
    }
    /**
     * Get root at index 
     * @param {any} index of
     * @returns {any} kvt contract at index 
     */
    async getRootAt(index) {
        return this.con.call('getRootAt', [index]);
    }

    /**
     * Get count of kvts in multibox
     * @returns {any} number of kvt trees in multibox
     */
    async getRootsCount() {
        return this.con.call('getRootsCount', []);
    }

    /**
     * create new kvt in multibox
     * @param {any} address address of who has read write rights
     * @returns {any} address kvt contract address
     */
    async createNewRootTree(address) {
        return this.con.send('createRoot', [address]);
    }

    /**
     * remove kvt at at index
     * only multibox owner can call
     * @param {any} index in array
     * @returns {any} address kvt contract address
     */
    async removeRoot(index) {
        return this.con.send('removeRoot', [index]);
    }

    /**
     * remove kvt from multibox at index
     * used to revoke kvt from other multibox
     * must bo owner of kvt
     * @param {any} index of kvt in multibox contract
     * @returns {any} address kvt contract address
     */
    async revokeRoot(index) {
        return this.con.send('revokeRoot', [index]);
    }

}

module.exports = Multibox;
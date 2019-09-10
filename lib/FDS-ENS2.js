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

// mailbox smart contracts

let Web3Utils = require('web3-utils');
let namehash = require('eth-ens-namehash');

let ENSRegistryContract = require('./contracts/ENSRegistry.js');
let SubdomainRegistrarContract = require('./contracts/SubdomainRegistrar.js');
let PublicResolverContract = require('./contracts/PublicResolver.js');

class FDSENS2 {

    constructor(account, config) {
      this.account = account;
      this.config = config;
      this.ENSRegistry = new ENSRegistryContract(this.account, config.registryAddress);
      this.SubdomainRegistrar = new SubdomainRegistrarContract(this.account, config.subdomainRegistrarAddress);
      this.PublicResolver = new PublicResolverContract(this.account, config.resolverContractAddress);
    }

    registerSubdomain(subdomain, confirm = false){
      return this.SubdomainRegistrar.register(Web3Utils.sha3(subdomain), confirm);
    }

    setResolver(subdomain, confirm = false){
      let node = namehash.hash(subdomain + '.' + this.config.domain);
      let addr = this.config.resolverContractAddress;      
      return this.ENSRegistry.setResolver(node, addr, confirm);      
    }

    setAll(subdomain, content, multihash, name, confirm = false) {
        let node = namehash.hash(subdomain + '.' + this.config.domain);
        let publicKey = this.account.publicKey;
        let publicKeyX = publicKey.substring(0, 66);
        let publicKeyY = "0x" + publicKey.substring(66, 130);
        return this.PublicResolver.setAll(node, this.account.wallet.address, content, multihash, publicKeyX, publicKeyY, name, confirm);
    }

    getAll(subdomain, confirm = false) {
        let node = namehash.hash(subdomain + '.' + this.config.domain);
        return this.PublicResolver.getAll(node, confirm);
    }

    setAddr(subdomain, confirm = false){
      let node = namehash.hash(subdomain + '.' + this.config.domain);
      // not needed 
      // let addr = this.config.resolverContractAddress;    
      return this.PublicResolver.setAddr(node, this.account.wallet.address, confirm);
    }

    setPubkey(subdomain, confirm = false){
      let node = namehash.hash(subdomain + '.' + this.config.domain);
      let publicKey = this.account.publicKey;
      let publicKeyX = publicKey.substring(0, 66);
      let publicKeyY = "0x" + publicKey.substring(66, 130);
      return this.PublicResolver.setPubkey(node, publicKeyX, publicKeyY, confirm);
    }  

    setMultihash(subdomain, multihash, confirm = false){
      let node = namehash.hash(subdomain + '.' + this.config.domain);
      return this.PublicResolver.setMultihash(node, multihash, confirm);
    }

    /**
     * Get public key of subdoman
     * @param {string} subdomain name
     * @returns {string | boolean} returns false if invalid
     */
    async getPubKey(subdomain) {
      let node = namehash.hash(subdomain + '.' + this.config.domain);
      return this.getPubKeyRaw(node);
    }

    /**
     * Get owner's address of subdoman
     * @param {string} subdomain name
     * @returns {string | boolean} returns false if invalid
     */
    async getOwner(subdomain) {
      let node = namehash.hash(subdomain + '.' + this.config.domain);
      return this.ENSRegistry.owner(node);
    }

    /**
     * Get public key of subdoman
     * @param {string} subdomain name
     * @returns {string | boolean} returns false if invalid
     */
    async getPubKeyRaw(node) {
      let keyCoords = await this.PublicResolver.getPubkey(node);
      let keyStr = "04" + keyCoords[0].substring(2, 66) + keyCoords[1].substring(2, 66);
      if (keyStr !== "0400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") {
          return keyStr;
      } else {
          return false;
      }      
      return keyStr;
    }

    /**
     * Get multihash of subdomain
     * @param {string} subdomain name
     * @returns {TransactionObject} transaction object
     */
    getMultihash(subdomain) {
      let node = namehash.hash(subdomain + '.' + this.config.domain);
      return this.PublicResolver.getMultihash(node);
    }


}

module.exports = FDSENS2;
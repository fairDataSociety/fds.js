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

let PublicResolverContract = require('../../build/contracts/PublicResolver.json');

class PublicResolver {

    constructor(FDSAccount, contractAddress = false) {
        this.account = FDSAccount;
        this.contractAddress = contractAddress;
        this.con = false;

        if(contractAddress !== false){
            this.con = FDSAccount.getContract(PublicResolverContract.abi, PublicResolverContract.bytecode, contractAddress);            
        }

        return this;
    }

    async setResolver(node, address){
        return this.con.send('setResolver', [node, address]);
    }    

    async setAddr(node, address){
        return this.con.send('setAddr', [node, address]);
    }     

    async setPubkey(node, pubkeyX, pubkeyY){
        return this.con.send('setPubkey', [node, pubkeyX, pubkeyY]);
    }    

    async setMultihash(node, multihash){
        return this.con.send('setMultihash', [node, multihash]);
    }

    async getPubkey(namehash){
        return this.con.call('pubkey', [namehash]);
    }

    async getMultihash(namehash){
        return this.con.call('multihash', [namehash]);
    }

}

module.exports = PublicResolver;
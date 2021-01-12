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


import {abi} from '../abi/PublicResolver.json';


class PublicResolver {

    constructor(FDSAccount, contractAddress = false) {
        this.account = FDSAccount;
        this.contractAddress = contractAddress;
        this.con = false;

        if(contractAddress !== false){
            this.con = FDSAccount.getContract(abi, contractAddress);            
        }

        return this;
    }
    // set all params in one transactions
    async setAll(node, address, content, multihash, pubKeyX, pubKeyY, name, confirm = false) {
        return this.con.send('setAll', [node, address, content, multihash, pubKeyX, pubKeyY, name], confirm);
    }

    // returns { addres, content, multihash, x,y, name }
    async getAll(node) {
        return this.con.call('getAll', [node]);
    }

    async getPubkey(namehash){
        return this.con.call('pubkey', [namehash]);
    }

    async getMultihash(namehash){
        return this.con.call('multihash', [namehash]);
    }

}

export default PublicResolver;
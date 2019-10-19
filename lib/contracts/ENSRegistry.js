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

import {abi} from '../abi/ENSRegistry.json';

class ENSRegistry {

    constructor(FDSAccount, contractAddress = false) {
        this.account = FDSAccount;
        this.contractAddress = contractAddress;
        this.con = false;

        if(contractAddress !== false){
            this.con = FDSAccount.getContract(abi, contractAddress);            
        }

        return this;
    }

    async owner(node){
        return this.con.call('owner', [node]);
    }  
    
    async setResolver(node, address, confirm = false){
        return this.con.send('setResolver', [node, address], confirm);
    }    

    async setAddr(node, address, confirm = false){
        return this.con.send('setResolver', [node, address], confirm);
    }        

}

module.exports = ENSRegistry;
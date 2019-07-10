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
            this.con = FDSAccount.getContract(MultiboxContract.abi, MultiboxContract.bytecode, contractAddress);            
        }else{
            return this.deploy();
        }

        return this;
    }

    async deploy(){
        this.con = await this.account.deployContract(MultiboxContract.abi, MultiboxContract.bytecode);
        let init = await this.con.send('init', []);
        return this;
    }

    async getRoots(address = false){
        return this.con.call('getRoots', []);
    }

}

module.exports = Multibox;
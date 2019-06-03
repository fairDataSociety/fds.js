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


let FileSaver = require('file-saver');

class Hash {
  constructor(attrs, account){
    if(attrs.address === undefined) throw new Error('address must be defined');
    if(attrs.file === undefined) throw new Error('file must be defined');
    if(attrs.time === undefined) throw new Error('time must be defined');
    if(attrs.iv === undefined) throw new Error('iv must be defined');

    this.address = attrs.address;
    this.file = attrs.file;
    this.time = attrs.time;
    this.iv = attrs.iv;
    
    this.account = account;
    this.SwarmStore = this.account.SwarmStore;

    return this;
  }

  toJSON(){
    return {
      address: this.address,
      file: {
        name: this.file.name,
        type: this.file.type,
        size: this.file.size,
      },
      time: this.time,
      iv: this.iv
    }
  }

  getFile(decryptProgressCallback = console.log, downloadProgressCallback = console.log){
    return this.SwarmStore.retrieveFile(this.account, this, decryptProgressCallback, downloadProgressCallback);
  }

  saveAs(){
    return this.getFile().then(file => FileSaver.saveAs(file));
  }

}

module.exports = Hash;
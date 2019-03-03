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

class Contact {

  constructor(attrs){
    if(attrs.subdomain === undefined) throw new Error('subdomain must be defined');
    if(attrs.publicKey === undefined) throw new Error('publicKey must be defined');
    if(attrs.mailboxAddress === undefined) throw new Error('mailboxAddress must be defined');
    if(attrs.feedLocationHash === undefined) throw new Error('feedLocationHash must be defined');

    this.subdomain = attrs.subdomain;
    this.publicKey = attrs.publicKey;
    this.mailboxAddress = attrs.mailboxAddress;
    this.feedLocationHash = attrs.feedLocationHash;
    return this;
  }

  toJSON(){
    return {
      subdomain: this.subdomain,
      publicKey: this.publicKey,
      mailboxAddress: this.mailboxAddress,
      feedLocationHash: this.feedLocationHash
    }
  }

}

module.exports = Contact;
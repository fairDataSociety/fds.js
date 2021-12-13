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

import { toWei } from 'web3-utils'

import Multibox from './FDS-Multibox.js'

class Mailbox {
  constructor(config) {
    this.config = config

    this.web3 = this.config.web3

    this.gasPrice = toWei(config.gasPrice.toString(), 'gwei')
  }
  /**
   * encode feed locatio hash
   * @param {any} senderAddress address
   * @param {any} recipientNamehash recepient hash
   * @returns {any} encoded sender and recipient hash
   */
  encodeFeedLocationHash(senderAddress, recipientNamehash) {
    return senderAddress + recipientNamehash.substr(42, 66)
  }
  /**
   * subdomain name hash to feed location hash
   * @param {any} recipientNamehash hash of recipient name
   * @returns {any} substring of recepient name hash that is feed location hash
   */
  subdomainNameHashToFeedLocationHash(recipientNamehash) {
    return recipientNamehash.substr(42, 66)
  }
  /**
   * Decode feed location
   * @param {any} feedLocationHash hash of feed location
   * @returns {any} object with address and topic
   */
  decodeFeedLocationHash(feedLocationHash) {
    return {
      address: feedLocationHash.substring(0, 42),
      topic: feedLocationHash.substr(42, 66),
    }
  }

  // async newInboxFeed(account, recipientSubdomain, multiboxAddress, feedLocationHash, applicationDomain = 'shared') {
  //     let multibox = await new Multibox(account, this.config).at(multiboxAddress);
  //     return multibox.set(`/shared/mail/$(applicationDomain)/$(senderAccount.subdomain)`, feedLocationHash);
  // }

  // async getInboxFeed(account, subdomain, multiboxAddress, applicationDomain = 'shared'){
  //     let multibox = await new Multibox(account, this.config).at(multiboxAddress);
  //     return multibox.get(`/shared/mail/$(applicationDomain)/$(subdomain)`);
  // }

  async newInboxFeed(
    senderAccount,
    subdomain,
    senderSubdomainNamehash,
    multiboxAddress,
    feedLocationHash,
    multiboxPath,
  ) {
    let multibox = await new Multibox(senderAccount, this.config).at(multiboxAddress)
    return multibox.set(multiboxPath, senderSubdomainNamehash, feedLocationHash)
  }

  async getInboxFeed(senderAccount, subdomain, multiboxAddress, path) {
    let multibox = await new Multibox(senderAccount, this.config).at(multiboxAddress)
    return multibox.get(path)
  }

  async getInboxFeeds(account, multiboxAddress, path) {
    let multibox = await new Multibox(account, this.config).at(multiboxAddress)
    return multibox.get(path)
  }
}

export default Mailbox

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

import saveAs from 'file-saver'
import Mail from '../FDS-Mail.js'

class Message {
  constructor(attrs, config, account) {
    if (attrs.to === undefined) throw new Error('to must be defined')
    if (attrs.from === undefined) throw new Error('from must be defined')
    if (attrs.hash === undefined) throw new Error('hash must be defined')

    this.config = config
    this.to = attrs.to
    this.from = attrs.from
    this.hash = attrs.hash
    this.account = account

    this.Mail = this.account.Mail

    return this
  }

  toJSON() {
    return {
      to: this.to,
      from: this.from,
      hash: this.hash.toJSON(),
    }
  }

  /**
   * get file for this message
   * @param {any} decryptProgressCallback callback
   * @param {any} downloadProgressCallback callback
   * @returns {File} file
   */
  getFile(decryptProgressCallback = console.log, downloadProgressCallback = console.log) {
    if (this.to.toLowerCase() === this.account.subdomain.toLowerCase()) {
      return this.Mail.receive(this.account, this, decryptProgressCallback, downloadProgressCallback)
    } else if (this.from.toLowerCase() === this.account.subdomain.toLowerCase()) {
      return this.Mail.retrieveSent(this.account, this, decryptProgressCallback, downloadProgressCallback)
    } else {
      throw Error('there was a problem...')
    }
  }

  /**
   * get file url for this message
   * @returns {string} url
   */
  getFileUrl() {
    return `${this.config.beeGateway}/bzz/${this.hash?.address}`
  }

  saveAs(decryptProgressCallback = console.log, downloadProgressCallback = console.log) {
    return this.getFile((decryptProgressCallback = console.log), (downloadProgressCallback = console.log)).then(
      (file) => saveAs(file),
    )
  }
}

module.exports = Message

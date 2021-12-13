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

// interaction with swarm feeds
import { bytesToHex, toHex, padRight, padLeft, hexToBytes, sha3 } from 'web3-utils'
import secp256k1 from 'secp256k1'
import Store from './FDS-Swarm'

import Trace from './FDS-Trace'

import { request } from 'axios'

import { Bee } from '@ethersphere/bee-js'

const POSTAGE_STAMP = '0000000000000000000000000000000000000000000000000000000000000000'

class SwarmFeeds {
  /**
   * Creates a new instance of SwarmFeeds
   * @constructor
   * @param {string} swarmNode - The url of the Swarm gateway endpoint.
   */
  constructor(config) {
    if (typeof config.beeGateway !== 'string') {
      throw new Error('You must provide a Swarm gateway endpoint.')
    }
    this.swarmNode = config.beeGateway
    this.bee = new Bee(config.beeGateway)
  }

  /**
   * Retrieves the Swarm hash associated with pointer of a topic
   * @get
   * @param {string} address - 0x prefixed Ethereum address of the owner of the feed.
   * @param {string} topicName - utf8 string of the topic.
   * @param {any} responseType response type
   * @returns {promise} promise which resolves rejects with error based on ajax request outcome.
   */
  async get(address, topicName, privateKey, responseType = 'text', withAddress = false) {
    // let pk = Buffer.from(privateKey.slice(-64), 'hex');
    // let wallet = new UnsafeWallet(pk);
    // let topic = padLeft(toHex(topicName), 64, '0');
    let topic = this.bee.makeFeedTopic(topicName)

    let feedReader = this.bee.makeFeedReader('sequence', topic, address)
    let download = await feedReader.download()
    let data = await this.bee.downloadData(download.reference).then(async (data) => {
      if (responseType === 'text') {
        return await data.text()
      }
      return data
    })
    if (responseType === 'text') {
      let decodedData = new TextDecoder().decode(p)
      if (withAddress) {
        return {
          value: decodedData,
          address: download.reference,
        }
      } else {
        return decodedData
      }
    }

    if (responseType === 'arraybuffer') {
      if (withAddress) {
        return {
          value: data,
          address: download.reference,
        }
      } else {
        return data
      }
    }
  }

  /**
   * Retrieves the Swarm hash associated with pointer of a topic
   * @set
   * @param {string} address - 0x prefixed Ethereum address of the owner of the feed.
   * @param {string} topicName - utf8 string of the topic.
   * @param {string} privateKey - private key of the owner of the feed.
   * @param {string} data - a text string of data which will be uploaded and the resultant hash set as the pointer location.
   * @returns {promise} promise which resolves rejects with error based on ajax request outcome.
   */
  async set(address, topicName, privateKey, data, pin = false) {
    // let t = padLeft(toHex(topicName), 64, '0');
    let topic = this.bee.makeFeedTopic(topicName)
    let writer = this.bee.makeFeedWriter('sequence', topic, privateKey)
    let manifest = await this.bee.createFeedManifest(POSTAGE_STAMP, 'sequence', topic, address)
    let encodedData = new TextEncoder().encode(data)
    let dataReference = await this.bee.uploadData(POSTAGE_STAMP, encodedData)
    let upload = await writer.upload(POSTAGE_STAMP, dataReference.reference)
    return dataReference

    // return this.sendRequest('/bytes', 'POST', 'text', toHex(data), pin).then((hash) => {
    //     let h = JSON.parse(hash).reference;
    //     return this.beeClientLib.set(address, privateKey, topicName, h).then(()=>{
    //         return h;
    //     });
    // });
  }

  /**
   * Performs XMLHTTPRequests
   * @sendRequest
   * @param {string} url - url of the request.
   * @param {string} requestType - request type, must be POST or GET.
   * @param {string} responseType - expected response type, must be text or arraybuffer
   * @param {arraybuffer} data - binary data contained in ArrayBuffer.
   * @returns {promise} promise which resolves with data or rejects with error based on ajax request outcome.
   */
  sendRequest(url, requestType, responseType, data = false, pinHeader = false) {
    Trace.time('sendRequest//SwarmFeeds')
    if (data) {
      data = Buffer.from(hexToBytes(data))
    }

    let headers = {
      Accept: 'application/octet-stream',
    }

    if (pinHeader) {
      // headers['x-swarm-pin'] = true;
    }
    return request({
      responseType: responseType,
      url: `${this.swarmNode}${url}`,
      method: requestType,
      headers: headers,
      data: data,
      transformResponse: [
        function (data) {
          // Do whatever you want to transform the data
          if (responseType === 'arraybuffer') {
            return Buffer.from(data)
          } else {
            return data
          }
        },
      ],
    }).then((response) => {
      Trace.timeEnd('sendRequest//SwarmFeeds')
      Trace.log(url, requestType)
      return response.data
    })
  }

  /**
   * Signs data using secp256k1 curve
   * @signData
   * @param {string} data - hex encoded data.
   * @param {string} privateKey key to sign
   * @returns {string} hex encoded signature.
   */
  signData(data, privateKey) {
    const sigObj = secp256k1.sign(Buffer.from(hexToBytes(data)), Buffer.from(hexToBytes(privateKey)))
    return `0x${sigObj.signature.toString('hex')}0${sigObj.recovery.toString()}`
  }
}

export default SwarmFeeds

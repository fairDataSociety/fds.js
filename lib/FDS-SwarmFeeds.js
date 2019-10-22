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
import {bytesToHex, toHex, padRight, padLeft, hexToBytes, sha3} from 'web3-utils';
import secp256k1 from 'secp256k1';
import Store from './FDS-Swarm';

import Trace from './FDS-Trace';

import {request} from 'axios';

class SwarmFeeds {

    /**
     * Creates a new instance of SwarmFeeds
     * @constructor
     * @param {string} swarmNode - The url of the Swarm gateway endpoint.
     */
    constructor(swarmNode) {
        if (typeof swarmNode !== 'string') {
            throw new Error('You must provide a Swarm gateway endpoint.');
        }
        this.swarmNode = swarmNode;
    }

    /**
     * Retrieves the Swarm hash associated with pointer of a topic
     * @get
     * @param {string} address - 0x prefixed Ethereum address of the owner of the feed.
     * @param {string} topicName - utf8 string of the topic.
     * @returns {promise} promise which resolves rejects with error based on ajax request outcome.      
     */
    getHex(address, topicName) {
        return this.get(address, topicName, 'arraybuffer').then((response) => {
            return bytesToHex(response);
        });
    }

    /**
     * Retrieves the Swarm hash associated with pointer of a topic
     * @get
     * @param {string} address - 0x prefixed Ethereum address of the owner of the feed.
     * @param {string} topicName - utf8 string of the topic.
     * @param {any} responseType response type
     * @returns {promise} promise which resolves rejects with error based on ajax request outcome.
     */
    get(address, topicName, responseType = 'text') {
        return this.getResource(topicName, address).then((hash) => {
            return this.sendRequest(`/bzz-raw:/${hash}/`, 'GET', responseType);
        });
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
    set(address, topicName, privateKey, data) {
        return this.sendRequest('/bzz-raw:/', 'POST', 'text', toHex(data)).then((hash) => {
            return this.updateResource(topicName, address, privateKey, toHex(hash));
        });
    }

    pin(hash){
        return this.sendRequest('/bzz-pin:/' + hash + '/?raw=true', 'POST', 'text', "", ()=>{}, 0, true);
    }

    /**
     * Retrieves the pointer of a topic
     * @getResource
     * @param {string} topicName - utf8 string of the topic.
     * @param {string} address - 0x prefixed Ethereum address of the owner of the feed.
     * @returns {promise} promise which resolves rejects with error based on ajax request outcome.      
     */
    getResource(topicName, address) {
        let topic = padRight(toHex(topicName), 64, '0');
        return this.sendRequest(`/bzz-feed:/?topic=${topic}&user=${address}`, 'GET');
    }

    /**
     * Retrieves the meta information of a topic
     * @getMeta
     * @param {string} topicName - utf8 string of the topic.
     * @param {string} address - 0x prefixed Ethereum address of the owner of the feed.
     * @returns {promise} promise which resolves rejects with error based on ajax request outcome.      
     */
    getMeta(topicName, address) {
        let topic = padRight(toHex(topicName), 64, '0');
        return this.sendRequest(`/bzz-feed:/?topic=${topic}&user=${address}&meta=1`, 'GET', 'text');
    }

    /**
     * Updates the content of the feed
     * @updateResource
     * @param {string} topicName - utf8 string of the topic.
     * @param {string} address - 0x prefixed Ethereum address of the owner of the feed.
     * @param {string} privateKey - private key of the owner of the feed.
     * @param {string} state - hex encoded state data.
     * @returns {promise} promise which resolves with ? and rejects with error based on ajax request outcome.   
     */
    updateResource(topicName, address, privateKey, state, pin = true) {
        let data = padLeft(state, 2, '0');
        let topic = padRight(toHex(topicName), 64, '0');
        return this.getMeta(topicName, address).then((response) => {
            let metaResponse = JSON.parse(response);
            let digest = this.feedUpdateDigest(metaResponse, data);
            let signature = this.signData(digest, privateKey);

            return this.sendRequest(
                `/bzz-feed:/?topic=${metaResponse.feed.topic}&user=${metaResponse.feed.user}&level=${metaResponse.epoch.level}&time=${metaResponse.epoch.time}&signature=${signature}`,
                'POST',
                'text',
                data
            ).then((response)=>{
                let hash = response.substr(1).substr(0,64);
                let nr = this.pin(hash);
                return response;
            });
        });
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
        Trace.time('sendRequest//SwarmFeeds');
        if(data){
            data = Buffer.from(hexToBytes(data));
        }

        let headers = {
            'Accept': 'application/octet-stream',
        }

        if(pinHeader){
            headers['x-swarm-pin'] = true;
        }

        return request({
            responseType: responseType, 
            url: `${this.swarmNode}${url}`, 
            method: requestType,
            headers: headers,
            data: data,
            transformResponse: [function (data) {
                // Do whatever you want to transform the data
                if(responseType === 'arraybuffer'){
                    return Buffer.from(data)
                }else{
                    return data;
                }
              }],
        }).then((response)=>{
            Trace.timeEnd('sendRequest//SwarmFeeds');
            Trace.log(url, requestType);
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
        const sigObj = secp256k1.sign(Buffer.from(hexToBytes(data)), Buffer.from(hexToBytes(privateKey)));
        return `0x${sigObj.signature.toString('hex')}0${sigObj.recovery.toString()}`;
    }

    /**
     * Creates the data to sign for the feed update digest
     * @feedUpdateDigest
     * @param {object} metaResponse - the server response from getMeta.
     * @param {string} data - hex encoded data.
     * @returns {string} sha3 hashed digest.   
     */
    feedUpdateDigest(metaResponse, data) {

        let dataBytes = hexToBytes(data);

        let topicBytes;
        let userBytes;
        let protocolVersion = 0;

        let topicLength = 32;
        let userLength = 20;
        let timeLength = 7;
        let levelLength = 1;
        let headerLength = 8;

        let updateMinLength = topicLength + userLength + timeLength + levelLength + headerLength;

        protocolVersion = metaResponse.protocolVersion;

        try {
            topicBytes = hexToBytes(metaResponse.feed.topic);
        } catch (err) {
            return undefined;
        }

        try {
            userBytes = hexToBytes(metaResponse.feed.user);
        } catch (err) {
            return undefined;
        }

        const buf = new ArrayBuffer(updateMinLength + dataBytes.length);
        const view = new DataView(buf);
        let cursor = 0;

        view.setUint8(cursor, protocolVersion); // first byte is protocol version.
        cursor += headerLength; // leave the next 7 bytes (padding) set to zero

        topicBytes.forEach((v) => {
            view.setUint8(cursor, v);
            cursor++;
        });

        userBytes.forEach((v) => {
            view.setUint8(cursor, v);
            cursor++;
        });

        // time is little-endian
        view.setUint32(cursor, metaResponse.epoch.time, true);
        cursor += 7;

        view.setUint8(cursor, metaResponse.epoch.level);
        cursor++;

        dataBytes.forEach((v) => {
            view.setUint8(cursor, v);
            cursor++;
        });
        return sha3(padLeft(bytesToHex(new Uint8Array(buf)),264));
    }

    /**
     * Converts data from hex string to ArrayBuffer
     * @signData
     * @param {string} data - hex encoded data.
     * @returns {arraybuffer} data - array buffer.
     */
    dataToBuffer(data) {
        return Buffer.from(data, "hex");
        const dataBytes = hexToBytes(data);
        var buf = new ArrayBuffer(dataBytes.length);
        var dataView = new DataView(buf);
        for (var i = 0; i < dataBytes.length; i++) {
            dataView.setUint8(i, dataBytes[i]);
        }
        return buf;
    }



}

export default SwarmFeeds;
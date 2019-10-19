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


// store files using swarm

let Utils = require('./FDS-Utils');
let Crypto = require('./FDS-Crypto');
let Web3Utils = require('web3-utils');

let Hash = require('./models/Hash.js');

let Trace = require('./FDS-Trace');

let axios = require('axios');

//create stub file class only for node.js applications
if (typeof File === "undefined") {
    var File = class {
      constructor(content, name, options){
        this.content = content;
        this.name = name;
        this.type = options.type;
      }
    }
}

class Swarm {

    constructor(config, account) {
        this.config = config;
        this.account = account;
        this.gateway = config.swarmGateway;
        this.rawGateway = config.swarmGateway + '/bzz-raw:/';
    }

    //later we'll try to do this offline
    async getSwarmDigest(string){
        if(string === "/shared/mail"){
            return '0x723beeeb4a880dc9432fdf3b1b53df942c4ec162ffda83037f2ad2ef94b22c23'
        }else{
            let digest = await this.sendRequest(this.rawGateway , 'POST', 'text', string);        
            return '0x' + digest;
        }
        // let digest = await this.sendRequest(this.rawGateway , 'POST', 'text', string);
    }

    /**
     * Store unencrypted file to swarm
     * @param {any} file to store
     * @param {any} encryptedProgressCallback callback
     * @param {any} uploadedProgressCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {Hash} with address, file, time and iv
     */
    storeFileUnencrypted(file, uploadedProgressCallback = console.log, progressMessageCallback = console.log, pin = true) {
            let url = this.gateway + '/bzz:/';
            var formData = new FormData();
            formData.append('file', file);
            return this.sendRequest(url, 'POST', 'text', formData, uploadedProgressCallback, file.size, pin).then((hash) => {
                return new Hash({
                    address: hash,
                    file: file,
                    time: Date.now()
                }, this.account);
            }).catch((error) => {
                throw new Error(error);
            });
    }

    /**
     * Store encrypted file to swarm
     * @param {any} file to store
     * @param {any} secret to use
     * @param {any} encryptedProgressCallback callback
     * @param {any} uploadedProgressCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {Hash} with address, file, time and iv
     */
    storeEncryptedFile(file, secret, encryptedProgressCallback = console.log, uploadedProgressCallback = console.log, progressMessageCallback = console.log, pin = true) {
        progressMessageCallback(`encrypting`);
        return Utils.fileToBuffer(file).then((buffer) => {
            let iv = Crypto.generateRandomIV();
            return Crypto.encryptBuffer(buffer, secret, iv).then((encryptedBuffer) => {
                encryptedProgressCallback(true);
                progressMessageCallback(`uploading`);
                return this.postData(encryptedBuffer, uploadedProgressCallback, 'bzz:/', pin).then((hash) => {
                    return new Hash({
                        address: hash,
                        file: file,
                        time: Date.now(),
                        iv: '0x' + iv.toString('hex')
                    }, this.account);
                }).catch((error) => {
                    throw new Error(error);
                });
            });
        });
    }

    /**
     * Get decrypted file
     * @param {any} hash location
     * @param {any} secret to decrypt
     * @param {any} selectedMailbox mailbox to use
     * @param {any} selectedWallet wallet to use
     * @returns {any} decrypted file
     */
    getDecryptedFile(hash, secret, selectedMailbox, selectedWallet) {
        return this.getDataFromManifest(hash.address, hash.file.name).then((retrievedFile) => {
        
            let decryptedBuffer = Crypto.decryptBuffer(retrievedFile, secret, Buffer.from(hash.iv.substring(2,34), 'hex'));

            let file;
            if(typeof window === 'object'){
                const blob = new Blob([decryptedBuffer], { type: hash.file.type } );
                blob.name = hash.file.name;
                return blob;
                // file = new File([blob], hash.file.name, { type: hash.file.type });
            }else{
                // console.log( new File([decryptedBuffer], hash.file.name, { type: hash.file.type }),  new File([decryptedBuffer], hash.file.name, { type: hash.file.type }).content);
                return new File([decryptedBuffer], hash.file.name, { type: hash.file.type });
            }
        });
    }

    /**
     * Get file from url
     * @param {any} url url
     * @returns {any} result of request
     */
    getFile(url) {
        return this.sendRequest(url, 'GET', 'text');
    }

    /**
    * Get data from url
    * @param {any} url url
    * @returns {any} result of request
    */
    getData(url) {
       return this.sendRequest(url, 'GET', 'arraybuffer');
    }

    /**
     * Get manifest from url
     * @param {any} swarmHash hash 
     * @param {any} filename file at hash
     * @returns {any} result of request (manifest)
     */
    getDataFromManifest(swarmHash, filename) {
        let url = this.rawGateway + swarmHash + "/";
        return this.getFile(url).then((manifestJSON) => {
            let manifest = JSON.parse(manifestJSON);
            if (manifest.entries.length === 1) {
                return this.getData(this.rawGateway + manifest.entries[0].hash + "/").then((data)=>{
                    return data;
                });
            } else {
                throw new Error("couldn't find that file in the manifest.");
            }
        });
    }

    /**
     * Post data 
     * @param {any} data data
     * @param {any} progressCallback callback 
     * @param {any} protocol protocol to use
     * @returns {any} swarm request data 
     */
    postData(data, progressCallback = console.log, protocol = 'bzz:/', pinHeader) {
        return this.sendRequest(this.gateway + '/' + protocol, 'POST', 'text', data, progressCallback, data.length, pinHeader);
    }

    pin(hash){
        return this.sendRequest(this.gateway + '/bzz-pin/', 'POST', 'text', "", progressCallback, 0, true);
    }

    /**
     * Request data
     * @param {any} url to use
     * @param {any} requestType type of request
     * @param {any} data data to send
     * @param {any} progressCallback callback
     * @returns {any} result of request
     */
    sendRequest(url, requestType, responseType, data, progressCallback, dataLength, pinHeader = false) {

        let headers = {
            'Accept': 'application/octet-stream',
        }

        if(pinHeader){
            headers['x-swarm-pin'] = true;
        }

        Trace.time('sendRequest//Swarm');
        return axios.request({
            responseType: responseType, 
            url: `${url}`, 
            method: requestType,
            headers: headers,
            data: data,
            transformResponse: [function (data) {
                if(responseType === 'arraybuffer'){
                    return Buffer.from(data)
                }else{
                    return data;
                }
              }],
            onUploadProgress: (event) => {
                if (progressCallback) {
                    progressCallback(Math.floor((event.loaded / dataLength) * 100, 2));
                }
            }
        }).then((response)=>{
            Trace.timeEnd('sendRequest//Swarm');
            Trace.log(url, requestType);
            return response.data
        })
    }    

}

module.exports = Swarm;

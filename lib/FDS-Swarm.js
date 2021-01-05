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

import Utils from './FDS-Utils';
import Crypto from './FDS-Crypto';

import Hash from './models/Hash.js';

import Trace from './FDS-Trace';

import {request} from 'axios';

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
        this.gateway = config.beeGateway;
        this.rawGateway = config.beeGateway + '/bytes';
    }

    //later we'll try to do this offline
    async getSwarmDigest(string){
        switch (string) {
            case '/shared/mail':
                return '0x723beeeb4a880dc9432fdf3b1b53df942c4ec162ffda83037f2ad2ef94b22c23';
            case '/shared':
                return '0x23e642b7242469a5e3184a6566020c815689149967703a98c0affc14b9ca9b28';
            case '/':
                return '0xc7f5bbf5fe95923f0691c94f666ac3dfed12456cd33bd018e7620c3d93edd5a6';
            default:
                let digest;
                try{
                    digest = await this.sendRequest(this.rawGateway , 'POST', 'text', string, null, null, true);  
                }catch(e){
                    throw new Error(e)
                }
                return '0x' + JSON.parse(digest).reference;  
        }
    }

    async getSwarmDigestValue(swarmhash){
        swarmhash = swarmhash.replace(/0x/,'');
        switch (swarmhash) {
            case '723beeeb4a880dc9432fdf3b1b53df942c4ec162ffda83037f2ad2ef94b22c23':
                return '/shared/mail';
            case '23e642b7242469a5e3184a6566020c815689149967703a98c0affc14b9ca9b28':
                return '/shared';
            case 'c7f5bbf5fe95923f0691c94f666ac3dfed12456cd33bd018e7620c3d93edd5a6':
                return '/';
            default:
                let value;
                try{
                    value = await this.sendRequest(this.rawGateway + '/' + swarmhash , 'GET', 'text');        
                }catch(e){
                    throw new Error(e)
                }
                
                return value;  
        }
    }

    /**
     * Store unencrypted file to swarm
     * @param {any} file to store
     * @param {any} encryptedProgressCallback callback
     * @param {any} uploadedProgressCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {Hash} with address, file, time and iv
     */
    storeFilesUnencrypted(files, uploadedProgressCallback = console.log, progressMessageCallback = console.log, pin = true) {
            let url = this.gateway + '/files';
            var formData = new FormData();
            let size = 0;
            for (var i = files.length - 1; i >= 0; i--) {
                size += files[i].size;
                let fileName = files[i].fullPath ? files[i].fullPath.split('/').splice(1).join('/') : files[i].name;
                formData.append('file', files[i], fileName);
            }
            return this.sendRequest(url, 'POST', 'text', formData, uploadedProgressCallback, size, pin).then((hash) => {
                return new Hash({
                    address: JSON.parse(hash).reference,
                    file: files[0],
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
    storeEncryptedFile(file, secret, encryptedProgressCallback = console.log, uploadedProgressCallback = console.log, progressMessageCallback = console.log, pin = true, metadata = {}) {
        progressMessageCallback(`encrypting`);
        return Utils.fileToBuffer(file).then((buffer) => {
            let iv = Crypto.generateRandomIV();
            return Crypto.encryptBuffer(buffer, secret, iv).then((encryptedBuffer) => {
                encryptedProgressCallback(true);
                progressMessageCallback(`uploading`);
                return this.postData(encryptedBuffer, uploadedProgressCallback, 'files', pin).then((hash) => {
                    return new Hash({
                        address: JSON.parse(hash).reference,
                        file: file,
                        time: Date.now(),
                        iv: '0x' + iv.toString('hex'),
                        meta: metadata
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
        let url = this.gateway + '/' + 'files/' + swarmHash;
        return this.getData(url).then((data)=>{
            return data;
        });
    }

    /**
     * Post data 
     * @param {any} data data
     * @param {any} progressCallback callback 
     * @param {any} protocol protocol to use
     * @returns {any} swarm request data 
     */
    postData(data, progressCallback = console.log, protocol = 'files', pinHeader) {
        return this.sendRequest(this.gateway + '/' + protocol, 'POST', 'text', data, progressCallback, data.length, pinHeader);
    }

    pin(hash){
        throw new Error('not implemented');
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
        return request({
            responseType: responseType, 
            url: `${url}`, 
            method: requestType,
            headers: headers,
            data: data,
            timeout: this.config.swarmTimeout,
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

export default Swarm;

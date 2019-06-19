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

let Hash = require('../models/Hash.js');

class Swarm {

    constructor(config, account) {
        this.config = config;
        this.account = account;
        this.gateway = config.swarmGateway;
        this.rawGateway = config.swarmGateway + '/bzz-raw:/';
    }

    /**
     * Store unencrypted file to swarm
     * @param {any} file to store
     * @param {any} encryptedProgressCallback callback
     * @param {any} uploadedProgressCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {Hash} with address, file, time and iv
     */
    storeFileUnencrypted(file, uploadedProgressCallback = console.log, progressMessageCallback = console.log) {
            return this.sendFileRequest(file, uploadedProgressCallback).then((hash) => {
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
    storeEncryptedFile(file, secret, encryptedProgressCallback = console.log, uploadedProgressCallback = console.log, progressMessageCallback = console.log) {
        progressMessageCallback(`encrypting`);
        return Utils.fileToBuffer(file).then((arrayBuffer) => {
            let iv = Crypto.generateRandomIV();
            return Crypto.encryptBuffer(arrayBuffer, secret, iv).then((encryptedBuffer) => {
                encryptedProgressCallback(true);
                progressMessageCallback(`uploading`);
                return this.postData(encryptedBuffer, uploadedProgressCallback).then((hash) => {
                    return new Hash({
                        address: hash,
                        file: file,
                        time: Date.now(),
                        iv: Web3Utils.bytesToHex(iv)
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
            let decryptedFile = Crypto.decryptedFile(retrievedFile, secret, hash.file.name, hash.file.type, hash.iv);
            return new File([decryptedFile], hash.file.name, { type: hash.file.type });
        });
    }

    /**
     * Post data 
     * @param {any} data data
     * @param {any} progressCallback callback 
     * @param {any} protocol protocol to use
     * @returns {any} swarm request data 
     */
    postData(data, progressCallback = console.log, protocol = 'bzz:/') {
        return this.sendRequest(this.gateway + '/' + protocol, 'POST', data, progressCallback);
    }

    /**
     * Request data
     * @param {any} url to use
     * @param {any} requestType type of request
     * @param {any} data data to send
     * @param {any} progressCallback callback
     * @returns {any} result of request
     */
    sendFileRequest(file, progressCallback) {
        let url = this.gateway + '/bzz:/';

        return new Promise((resolve, reject)=>{
          var formData = new FormData();
          formData.append('file', file);

          var xhr = new XMLHttpRequest();

          xhr.open("POST", url, true);


          if (xhr.upload) {
              xhr.upload.onprogress = function (event) {
                  if (progressCallback) {
                      progressCallback(Math.floor((event.loaded / event.total) * 100, 2));
                  }
              };
          }

          xhr.onload = ()=>{
            if (xhr.status === 200) {
              resolve(xhr.responseText);
            } else {
              reject('error');
            }
          };

          xhr.onerror = (error)=>{
            reject('couldn\'t access gateway.');
          };

          xhr.send(formData);
        });
    }

    /**
     * Request data
     * @param {any} url to use
     * @param {any} requestType type of request
     * @param {any} data data to send
     * @param {any} progressCallback callback
     * @returns {any} result of request
     */
    sendRequest(url, requestType, data, progressCallback) {
        return new Promise((resolve, reject) => {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        resolve(xhttp.responseText);
                    } else {
                        reject(this.status);
                    }
                }
            };

            if (xhttp.upload) {
                xhttp.upload.onprogress = function (event) {
                    if (progressCallback) {
                        progressCallback(Math.floor((event.loaded / data.length) * 100, 2));
                    }
                };
            }

            // xhttp.responseType = 'text';
            xhttp.open(requestType, url, true);
            xhttp.setRequestHeader('Content-Type', 'application/octet-stream');
            xhttp.send(data);
        });
    }

    /**
     * Get file from url
     * @param {any} url url
     * @returns {any} result of request
     */
    getFile(url) {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();

            xhr.open("GET", url, true);

            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else if (xhr.status === 404) {
                    reject('couldn\'t find hash.');
                } else {
                    reject('unhandled error.');
                }
            };

            xhr.onerror = () => {
                reject('couldn\'t access gateway.');
            };

            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.send();
        });
    }

    /**
    * Get data from url
    * @param {any} url url
    * @returns {any} result of request
    */
    getData(url) {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();

            xhr.open("GET", url, true);

            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(new Uint8Array(xhr.response));
                } else if (xhr.status === 404) {
                    reject('couldn\'t find hash.');
                } else {
                    reject('unhandled error.');
                }
            };

            xhr.onerror = () => {
                reject('couldn\'t access gateway.');
            };

            xhr.responseType = 'arraybuffer';
            xhr.send();
        });
    }

    /**
     * Get manifest from url
     * @param {any} swarmHash hash 
     * @param {any} filename file at hash
     * @returns {any} result of request (manifest)
     */
    getDataFromManifest(swarmHash, filename) {
        let url = this.rawGateway + swarmHash + "/";
        return this.getFile(url).then((manifest) => { // TODO remove double JSON parse
            if (JSON.parse(manifest).entries.length === 1) {
                return this.getData(this.rawGateway + JSON.parse(manifest).entries[0].hash + "/");
            } else {
                throw new Error("couldn't find that file in the manifest.");
            }
        });
    }

}

module.exports = Swarm;

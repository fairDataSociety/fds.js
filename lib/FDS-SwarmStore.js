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


// stores files, values, contacts and encrypted values

let FileSaver = require('file-saver');
let Hash = require('./models/Hash.js');
let SwarmFeeds = require('./FDS-SwarmFeeds.js');
let Crypto = require('./FDS-Crypto.js');
let Web3Utils = require('web3-utils');

let Contact = require('./models/Contact.js');

class SwarmStore {
    /**
     * 
     * @param {any} config configuration settings
     * @param {any} Account to use
     */
    constructor(config, Account) {
        this.config = config;
        this.Account = Account;
        this.Store = Account.Store;
        this.SF = new SwarmFeeds(config.swarmGateway);
    }

    /**
     * 
     * @param {any} storerAccount account
     * @param {any} hash location 
     * @param {any} decryptProgressCallback callback
     * @param {any} downloadProgressCallback callback
     * @returns {any} decrypted file
     */
    retrieveFile(storerAccount, hash, decryptProgressCallback = console.log, downloadProgressCallback = console.log) {
        return this.Store.getDecryptedFile(hash, storerAccount.privateKey, decryptProgressCallback, downloadProgressCallback);
    }

    /**
     * init stored files
     * @param {any} storerAccount account
     */
    initStored(storerAccount) {
        this.storeEncryptedValue('stored-1.0', '{"storedFiles":[]}', storerAccount, storerAccount.privateKey);
    }

    /**
     * get stored values
     * @param {any} query to retreive values, will be used later
     * @param {any} storerAccount account 
     * @returns {any} array of hashes 
     */
    getStored(query, storerAccount) {
        return this.retrieveDecryptedValue('stored-1.0', storerAccount.address, storerAccount.privateKey).then((response) => {
            let storedFiles = JSON.parse(response).storedFiles;
            let storedHashes = storedFiles.map((f) => { 
                let h = new Hash(f, storerAccount); 
                return h;
            });
            return storedHashes;
        }).catch((error) => {
            if (error.response.status === 404) {
                return [];
            } else {
                throw new Error(error);
            }
        });
    }

    /**
     * Store file
     * @param {any} storerAccount account 
     * @param {any} file file
     * @param {any} encryptProgressCallback callback
     * @param {any} uploadProgressCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {any} hash encrypted value
     */
    storeFile(storerAccount, file, encryptProgressCallback, uploadProgressCallback, progressMessageCallback) {
        return this.Store.storeEncryptedFile(file, storerAccount.privateKey, encryptProgressCallback, uploadProgressCallback, progressMessageCallback).then((hash) => {
            return this.getStored('all', storerAccount).then((storedFiles) => {
                storedFiles.push(hash.toJSON());
                return this.storeEncryptedValue('stored-1.0', JSON.stringify({ storedFiles: storedFiles }), storerAccount, storerAccount.privateKey);
            });
        });
    }

    // contacts
    /**
     * Init contacts
     * @param {any} storerAccount account
     * @returns {any} result 
     */
    initContacts(storerAccount) {
        return this.storeEncryptedValue('contacts-1.0', '[]', storerAccount, storerAccount.privateKey);
    }

    /**
     * Get contacts
     * @param {any} storerAccount account
     * @returns {any} contacts 
     */
    getContacts(storerAccount) {
        // debugger
        return this.retrieveDecryptedValue('contacts-1.0', storerAccount.address, storerAccount.privateKey)
            .then((contactsJSON) => {
                let contacts = JSON.parse(contactsJSON);
                return contacts.map((c) => new Contact(c));
            })
            .catch((error) => {
                if (error.response.status === 404) {
                    return [];
                } else {
                    throw new Error(`couldn't retrieve contacts: ${error}`);
                }
            });
    }

    /**
     * Store contact
     * @param {any} storerAccount account 
     * @param {any} contact to store
     * @returns {any} result
     */
    storeContact(storerAccount, contact) {
        return this.getContacts(storerAccount).then((contacts) => {
            let flatContacts = contacts.map((c) => c.toJSON());
            flatContacts.push(contact.toJSON());
            let contactsJSON = JSON.stringify(flatContacts);
            return this.storeEncryptedValue('contacts-1.0', contactsJSON, storerAccount, storerAccount.privateKey);
        });
    }

    // values

    /**
     * Store value
     * @param {string} key name
     * @param {string} value to store
     * @param {any} storerAccount account 
     * @returns {any} result
     */
    storeValue(key, value, storerAccount) {
        return this.SF.set(storerAccount.address, key, storerAccount.privateKey, value);
    }

    /**
     * Retrieve (get) value
     * @param {any} key name 
     * @param {any} storerAccount account
     * @returns {string} value
     */
    retrieveValue(key, storerAccount) {
        return this.SF.get(storerAccount.address, key);
    }

    // encrypted values

    /**
     * store encrypted value
     * @param {string} key name
     * @param {string} value to store
     * @param {string} storerAccount account 
     * @param {string} password to use
     * @returns {any} result 
     */
    storeEncryptedValue(key, value, storerAccount, password) {
        let iv = Crypto.generateRandomIV();
        return Crypto.encryptString(value, password, iv).then((encryptedString) => {
            let ivAndEncryptedString = '0x'+iv.toString('hex') + encryptedString;
            return this.SF.set(storerAccount.address, key, storerAccount.privateKey, ivAndEncryptedString);
        });
    }

    /**
     * retrieve decrypted value
     * @param {string} key name 
     * @param {string} address to use
     * @param {string} password to use
     * @returns {string} decrypted value
     */
    retrieveDecryptedValue(key, address, password) {
        return this.SF.get(address, key, 'arraybuffer').then((encryptedBuffer) => {

            let ivAndEncryptedString = encryptedBuffer.toString('hex');
            let encryptedString = ivAndEncryptedString.substring(32);
            let iv = Buffer.from(ivAndEncryptedString.substring(0, 32), 'hex');

            return Crypto.decryptString(encryptedString, password, iv);
        });
    }

    /**
     * retrieve decrypted value
     * @param {string} key name 
     * @param {string} address to use
     * @param {string} password to use
     * @returns {string} decrypted value
     */
    retrieveUnencryptedValue(key, address) {
        return this.SF.get(address, key, 'arraybuffer').then((t) => {
            let ivAndEncryptedString = Web3Utils.bytesToHex(encryptedBuffer);
            let iv = ivAndEncryptedString.substring(0, 34);
            let encryptedString = ivAndEncryptedString.substring(34);
            return Crypto.decryptString(encryptedString, password, iv);
        });
    }    


}

module.exports = SwarmStore;
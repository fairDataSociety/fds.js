// stores files, values, contacts and encrypted values

let FileSaver = require('file-saver');
let Hash = require('../models/Hash.js');
let SwarmFeeds = require('./FDS-SwarmFeeds.js');
let Crypto = require('./FDS-Crypto.js');
let Web3 = require('web3');

let Contact = require('../models/Contact.js');

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
        return this.Store.getDecryptedFile(hash, storerAccount.privateKey.substring(2), decryptProgressCallback, downloadProgressCallback);
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
     * @param {any} query to retreive values
     * @param {any} storerAccount account 
     * @returns {any} array of hashes 
     */
    getStored(query, storerAccount) {
        return this.retrieveDecryptedValue('stored-1.0', storerAccount.address, storerAccount.privateKey).then((response) => {
            let storedFiles = JSON.parse(response).storedFiles;
            let storedHashes = storedFiles.map((f) => { return new Hash(f, storerAccount); });
            return storedHashes;
        }).catch((error) => {
            if (error === 404) {
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
        return this.Store.storeEncryptedFile(storerAccount, file, storerAccount.privateKey, encryptProgressCallback, uploadProgressCallback, progressMessageCallback).then((hash) => {
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
        return this.retrieveDecryptedValue('contacts-1.0', storerAccount.address, storerAccount.privateKey)
            .then((contactsJSON) => {
                let contacts = JSON.parse(contactsJSON);
                return contacts.map((c) => new Contact(c));
            })
            .catch((error) => {
                if (error === 404) {
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
            let ivAndEncryptedString = Web3.utils.bytesToHex(iv) + encryptedString.substring(2);
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
            let ivAndEncryptedString = Web3.utils.bytesToHex(encryptedBuffer);
            let iv = ivAndEncryptedString.substring(0, 34);
            let encryptedString = ivAndEncryptedString.substring(34);
            return Crypto.decryptString(encryptedString, password, iv);
        });
    }


}

module.exports = SwarmStore;
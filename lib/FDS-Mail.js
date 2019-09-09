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


let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let ENS2 = require('./FDS-ENS2.js');
let Mailbox = require('./FDS-Mailbox.js');

let Swarm = require('./FDS-Swarm.js');
let SwarmFeeds = require('./FDS-SwarmFeeds.js');
let Crypto = require('./FDS-Crypto.js');

let Message = require('../models/Message.js');
let Hash = require('../models/Hash.js');

let Contact = require('../models/Contact.js');

class Mail {

    constructor(config, account) {
        this.account = account;
        this.config = config;

        this.Mailbox = new Mailbox(config);

        this.Store = new Swarm(config, account);
        this.SF = new SwarmFeeds(config.swarmGateway);
        this.SwarmStore = this.account.SwarmStore;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout), null, {transactionConfirmationBlocks: 1});
        this.gasPrice = this.web3.utils.toWei(config.gasPrice.toString(), 'gwei');
    }
    /**
     * get contact from its subdomain name
     * @param {User} senderAccount account
     * @param {string} recipientSubdomain recepient name
     * @param {any} encryptProgressCallback callback
     * @param {any} uploadProgressCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {Contact} contact
     */
    lookupContact(senderAccount, recipientSubdomain, encryptProgressCallback = console.log, uploadProgressCallback = console.log, progressMessageCallback = console.log)
    {
        let sharedSecret, mailboxAddress, recipientPublicKey = null;
        let recipientSubdomainNameHash = namehash.hash(recipientSubdomain + '.' + this.config.ensConfig.domain);
        let feedLocationHash = this.Mailbox.encodeFeedLocationHash(senderAccount.address, recipientSubdomainNameHash);

        progressMessageCallback(`retrieving contact public key`);
        return this.ENS.getPubKey(recipientSubdomain).then((publicKey) => {
            //calculate shared secret
            recipientPublicKey = publicKey;
            let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, publicKey);
            return sharedSecret;
        }).then((secret) => {
            sharedSecret = secret;
            progressMessageCallback(`retrieving contact mailbox address`);
            return this.ENS.getMultihash(recipientSubdomain);
        }).then((hash) => {
            mailboxAddress = hash;
            progressMessageCallback(`retrieving contact connection`);
            if (hash) {
                return this.Mailbox.getRequest(recipientSubdomainNameHash, mailboxAddress);
            } else {
                throw Error('could not find multihash entry');
            }
        }).then((request) => {
            return new Contact(
                {
                    subdomain: recipientSubdomain,
                    publicKey: recipientPublicKey,
                    mailboxAddress: mailboxAddress,
                    feedLocationHash: feedLocationHash
                }
            );
        });
    }

    // 
    // 
    /**
     * @sendFileTo
     * TODO: later will replace callbacks with emitted events...
     * @param {any} senderAccount account
     * @param {any} recipientSubdomain name
     * @param {any} file to send
     * @param {any} encryptProgressCallback callback
     * @param {any} uploadProgressCallback callback 
     * @param {any} progressMessageCallback callback
     * @returns {any} success
     */
    send(senderAccount, recipientSubdomain, file, multiboxPath, encryptProgressCallback = console.log, uploadProgressCallback = console.log, progressMessageCallback = console.log) {
        // TODO: this should be revisited and changed to use lookupContact since code is mostly the same
        let ENS = new ENS2(senderAccount, this.config.ensConfig);

        //get public key from repo
        let sharedSecret, multiboxAddress, recipientPublicKey = null;

        let senderSubdomainNameHash = namehash.hash(senderAccount.subdomain + '.' + this.config.ensConfig.domain);
        let recipientSubdomainNameHash = namehash.hash(recipientSubdomain + '.' + this.config.ensConfig.domain);
        let feedLocationHash = this.Mailbox.encodeFeedLocationHash(senderAccount.address, recipientSubdomainNameHash);

        progressMessageCallback(`retrieving public key`);
        return ENS.getPubKey(recipientSubdomain).then((publicKey) => {
            //calculate shared secret
            recipientPublicKey = publicKey;
            let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, publicKey);
            return sharedSecret;
        }).then((secret) => {
            sharedSecret = secret;
            progressMessageCallback(`retrieving mailbox address`);
            return ENS.getMultihash(recipientSubdomain);
        }).then((hash) => {
            multiboxAddress = hash
            progressMessageCallback(`retrieving connection`);
            if (multiboxAddress !== '0x') {
                return this.Mailbox.getInboxFeed(senderAccount, senderAccount.subdomain, multiboxAddress);
            } else {
                throw Error('could not find multihash entry');
            }
        }).then((request) => {
            //create a new request
            if ( JSON.stringify(request.values) === JSON.stringify({}) ) {
                progressMessageCallback(`creating new request`);
                return this.Mailbox.newInboxFeed(senderAccount, senderAccount.subdomain, senderSubdomainNameHash, multiboxAddress, feedLocationHash, multiboxPath)
                    .then((request) => {
                        return senderAccount.storeContact(
                            new Contact(
                                {
                                    subdomain: recipientSubdomain,
                                    publicKey: recipientPublicKey,
                                    multiboxAddress: multiboxAddress,
                                    feedLocationHash: feedLocationHash
                                }
                            ));
                    }).then(() => {
                        let flh = this.Mailbox.decodeFeedLocationHash(feedLocationHash);
                        return this.initMessages(recipientPublicKey, senderAccount, flh.topic);
                    });
            } else {
                //if there's a request, do nothing
                progressMessageCallback(`request found`);
                return true;
            }
        }).then(() => {
            //store encrypted file
            progressMessageCallback(`storing encrypted file`);
            return this.Store.storeEncryptedFile(file, "0x" + sharedSecret, encryptProgressCallback, uploadProgressCallback, progressMessageCallback);
        }).then((storedFilehash) => {
            //send the resulting hash to the recipient
            progressMessageCallback(`sending encrypted message`);
            let feedLocation = this.Mailbox.decodeFeedLocationHash(feedLocationHash);
            let message = new Message({
                to: recipientSubdomain,
                from: senderAccount.subdomain,
                hash: storedFilehash
            }, this.config, senderAccount);
            return this.saveMessage(recipientPublicKey, senderAccount, feedLocation.topic, message, progressMessageCallback);
        });
    }

    /**
     * Receive 
     * @param {any} recipientAccount account
     * @param {any} message message
     * @param {any} decryptProgressCallback callback 
     * @param {any} downloadProgressCallback callback
     * @returns {any} stored file
     */
    receive(recipientAccount, message, decryptProgressCallback = console.log, downloadProgressCallback = console.log) {
        //get public key from repo
        let ENS = new ENS2(recipientAccount, this.config.ensConfig);        
        return ENS.getPubKey(message.from).then((senderPublicKey) => {
            //calculate shared secret
            let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, senderPublicKey);
            return "0x" + sharedSecret;
        }).then((sharedSecret) => {
            //encrypt and upload to store
            let storedFile = this.Store.getDecryptedFile(message.hash, sharedSecret, decryptProgressCallback, downloadProgressCallback);
            return storedFile;
        });
    }

    /**
     * Retrieves sent file
     * @param {any} recipientAccount account
     * @param {any} message message
     * @param {any} decryptProgressCallback callback
     * @param {any} downloadProgressCallback callback
     * @returns {any} stored file
     */
    retrieveSent(recipientAccount, message, decryptProgressCallback = console.log, downloadProgressCallback = console.log) {
        //get public key from repo
        let ENS = new ENS2(recipientAccount, this.config.ensConfig);                
        return ENS.getPubKey(message.to).then((recipientPublicKey) => {
            //calculate shared secret
            let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, recipientPublicKey);
            return "0x" + sharedSecret;
        }).then((sharedSecret) => {
            //encrypt and upload to store
            let storedFile = this.Store.getDecryptedFile(message.hash, sharedSecret, decryptProgressCallback, downloadProgressCallback);
            return storedFile;
        });
    }

    // ...

    /**
     * Initialize messages
     * @param {any} recipientPublicKey public key
     * @param {any} senderAccount account 
     * @param {any} topic name
     * @returns {any} hash 
     */
    initMessages(recipientPublicKey, senderAccount, topic) {
        let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey);
        return this.SwarmStore.storeEncryptedValue(topic, JSON.stringify({ messages: [] }), senderAccount, "0x" + sharedSecret);
    }

    /**
     * Save message
     * @param {any} recipientPublicKey public key
     * @param {any} senderAccount account 
     * @param {any} topic name
     * @param {any} message to save
     * @param {any} progressMessageCallback callback
     * @returns {any} hash
     */
    saveMessage(recipientPublicKey, senderAccount, topic, message, progressMessageCallback = console.log) {
        progressMessageCallback(`retrieving connection message feed`);
        return this.getAccountMessages(recipientPublicKey, senderAccount, topic).then((messages) => {
            progressMessageCallback(`saving message feed`);
            messages.push(message.toJSON());
            progressMessageCallback(`appending message`);
            let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey);
            return this.SwarmStore.storeEncryptedValue(topic, JSON.stringify({ messages: messages }), senderAccount, "0x" + sharedSecret);
        });
    }

    /**
     * Get account messages
     * @param {any} recipientPublicKey public key
     * @param {any} senderAccount account 
     * @param {any} topic name
     * @returns {any} array of messages 
     */
    getAccountMessages(recipientPublicKey, senderAccount, topic) {
        return this.getMessageFeed(recipientPublicKey, senderAccount.address, senderAccount, topic);
    }

    /**
     * Get messages
     * @param {any} type of messages, received or sent, received default
     * @param {any} account account
     * @returns {any} array of messages
     */
    getMessages(type = 'received', account, path) {
        switch (type) {
            case 'received':
                return this.getReceivedMessages(account, path);
            case 'sent':
                return this.getSentMessages(account);            
        }
    }

    /**
     * Get received messages
     * @param {any} recipientAccount account
     * @returns {any} array of messages
     */
    getReceivedMessages(recipientAccount, multiboxPath) {
        let ENS = new ENS2(recipientAccount, this.config.ensConfig);
        return this.getSenders(recipientAccount, multiboxPath).then((senders) => {
            var feedPromises = [];
            for (var i = senders.length - 1; i >= 0; i--) {
                feedPromises.push(new Promise((resolve, reject) => {
                    var feedLocation = this.Mailbox.decodeFeedLocationHash(senders[i].feedLocationHash);
                    return ENS.getPubKeyRaw(senders[i].senderNamehash).then((publicKey) => {
                        return this.getMessageFeed(publicKey, feedLocation.address, recipientAccount, feedLocation.topic, multiboxPath).then(resolve);
                    });
                }));
            }
            return Promise.all(feedPromises).then((messageFeeds) => {
                return [].concat.apply([], messageFeeds);
            });
        });
    }

    /**
     * Get send messages 
     * @param {any} recipientAccount account
     * @returns {any} array of messages
     */
    getSentMessages(recipientAccount) {
        return recipientAccount.getContacts().then((contacts) => {
            var feedPromises = [];
            for (var i = contacts.length - 1; i >= 0; i--) {
                feedPromises.push(new Promise((resolve, reject) => {
                    let feedLocation = this.Mailbox.decodeFeedLocationHash(contacts[i].feedLocationHash);
                    return this.getMessageFeed(contacts[i].publicKey, feedLocation.address, recipientAccount, feedLocation.topic).then(resolve);
                }));
            }
            return Promise.all(feedPromises).then((messageFeeds) => {
                //just concatenating the messages for now, later we'll be more clever with retrieval...
                return [].concat.apply([], messageFeeds);
            });
        });
    }

    /**
     * Get message feed
     * @param {any} publicKey public key
     * @param {any} address address 
     * @param {any} account account
     * @param {any} topic name
     * @returns {any} messages with hash objects
     */
    getMessageFeed(publicKey, address, account, topic) {
        let sharedSecret = Crypto.calculateSharedSecret(account.privateKey, publicKey);
        return this.SwarmStore.retrieveDecryptedValue(topic, address, "0x" + sharedSecret).then((decryptedManifest) => {
            let messageParsed = JSON.parse(decryptedManifest).messages;
            let messageObjects = messageParsed.map((m) => new Message(m, this.config, account));
            let messageObjectsWithHashObjects = messageObjects.map((m) => {
                m.hash = new Hash(m.hash, this.config);
                return m;
            });
            return messageObjectsWithHashObjects;
        })
        // .catch((error) => {
        //     if (error !== 404) {
        //         throw new Error(error);
        //     } else {
        //         return [];
        //     }
        // });
    }

    /**
     * Get senders
     * @param {any} recipientAccount account
     * @returns {any} sender and location hashes
     */
    async getSenders(recipientAccount, multiboxPath) {
        let ENS = new ENS2(recipientAccount, this.config.ensConfig);
        let multiboxAddress = await ENS.getMultihash(recipientAccount.subdomain);
        if (multiboxAddress === null) {
            throw new Error(`couldn't find mailbox for ${recipientAccount.subdomain}`);
        }
        let senders = await this.Mailbox.getInboxFeeds(recipientAccount, multiboxAddress, multiboxPath);
        let feeds = [];

        for (const senderNamehash of Object.keys(senders.values)) {
            feeds.push({
                senderNamehash: senderNamehash,
                feedLocationHash: senders.values[senderNamehash]
            })           
        }
        return feeds;
    }

}

module.exports = Mail;

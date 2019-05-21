let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let ENS = require('./FDS-ENS.js');
let Mailbox = require('./FDS-Mailbox.js');
let Multibox = require('./FDS-Multibox.js');

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
        this.ENS = new ENS(config);
        this.Mailbox = new Mailbox(config);
        this.Multibox = new Multibox(config);

        this.Store = new Swarm(config, account);
        this.SF = new SwarmFeeds(config.swarmGateway);
        this.SwarmStore = this.account.SwarmStore;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout));
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
        let sharedSecret, mailboxAddress, multiboxAddress, recipientPublicKey = null;
        let recipientSubdomainNameHash = namehash.hash(recipientSubdomain + '.' + this.config.ensConfig.domain);
        let feedLocationHash = this.Mailbox.encodeFeedLocationHash(senderAccount.address, recipientSubdomainNameHash);

        progressMessageCallback(`retrieving contact public key ` + feedLocationHash);
        return this.ENS.getPubKey(recipientSubdomain).then((publicKey) => {
            //calculate shared secret
            recipientPublicKey = publicKey;
            let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, publicKey);
            return sharedSecret;
        }).then((secret) => {
            sharedSecret = secret;
            progressMessageCallback(`retrieving contact box address ` + secret);
            return this.ENS.getMultihash(recipientSubdomain);
        }).then((hash) => {
            //mailboxAddress = hash;
            multiboxAddress = hash;
            //progressMessageCallback(`retrieving contact connection ` + hash);
            progressMessageCallback(`retrieving multibox roots ` + hash);
            if (hash) {
                return this.Multibox.getMultiboxContract(/*senderAccount.subdomain,*/ multiboxAddress);
                //return this.Mailbox.getRequest(senderAccount.subdomain, mailboxAddress);
            } else {
                throw Error('could not find multihash entry');
            }
        }).then((response) => {
            return new Contact(
                {
                    subdomain: recipientSubdomain,
                    publicKey: recipientPublicKey,
                    mailboxAddress: multiboxAddress,
                    //mailboxAddress: mailboxAddress,
                    feedLocationHash: feedLocationHash,
                    roots: response
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
    send(senderAccount, recipientSubdomain, file, encryptProgressCallback = console.log, uploadProgressCallback = console.log, progressMessageCallback = console.log) {
        // TODO: this should be revisited and changed to use lookupContact since code is mostly the same

        //get public key from repo
        let sharedSecret, mailboxAddress, recipientPublicKey = null;
        let recipientSubdomainNameHash = namehash.hash(recipientSubdomain + '.' + this.config.ensConfig.domain);
        let feedLocationHash = this.Mailbox.encodeFeedLocationHash(senderAccount.address, recipientSubdomainNameHash);

        progressMessageCallback(`retrieving public key`);
        return this.ENS.getPubKey(recipientSubdomain).then((publicKey) => {
            //calculate shared secret
            recipientPublicKey = publicKey;
            let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, publicKey);
            return sharedSecret;
        }).then((secret) => {
            sharedSecret = secret;
            progressMessageCallback(`retrieving mailbox address`);
            return this.ENS.getMultihash(recipientSubdomain);
        }).then((hash) => {
            mailboxAddress = hash;
            progressMessageCallback(`retrieving connection`);
            if (hash) {
                return this.Mailbox.getRequest(senderAccount.subdomain, mailboxAddress);
            } else {
                throw Error('could not find multihash entry');
            }
        }).then((request) => {
            //create a new request
            if (request === "0x0000000000000000000000000000000000000000000000000000000000000000") {
                progressMessageCallback(`creating new request`);
                return this.Mailbox.newRequest(senderAccount, recipientSubdomain, mailboxAddress, feedLocationHash)
                    .then((request) => {
                        return senderAccount.storeContact(
                            new Contact(
                                {
                                    subdomain: recipientSubdomain,
                                    publicKey: recipientPublicKey,
                                    mailboxAddress: mailboxAddress,
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
        return this.ENS.getPubKey(message.from).then((senderPublicKey) => {
            //calculate shared secret
            let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, senderPublicKey);
            return sharedSecret;
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
        return this.ENS.getPubKey(message.to).then((recipientPublicKey) => {
            //calculate shared secret
            let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, recipientPublicKey);
            return sharedSecret;
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
    getMessages(type = 'received', account) {
        switch (type) {
            case 'received':
                return this.getReceivedMessages(account);
            case 'sent':
                return this.getSentMessages(account);
        }
    }

    /**
     * Get received messages
     * @param {any} recipientAccount account
     * @returns {any} array of messages
     */
    getReceivedMessages(recipientAccount) {
        return this.getSenders(recipientAccount).then((senders) => {
            //console.log("senders", senders);
            var feedPromises = [];
            for (var i = senders.length - 1; i >= 0; i--) {
                feedPromises.push(new Promise((resolve, reject) => {
                    var feedLocation = this.Mailbox.decodeFeedLocationHash(senders[i].feedLocationHash);
                    var namehash = senders[i].senderNamehash;
                    return this.ENS.getPubKeyRaw(senders[i].senderNamehash).then((publicKey) => {
                        return this.getMessageFeed(publicKey, feedLocation.address, recipientAccount, feedLocation.topic).then(resolve);
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
        }).catch((error) => {
            if (error !== 404) {
                throw new Error(error);
            } else {
                return [];
            }
        });
    }

    /**
     * Get senders
     * @param {any} recipientAccount account
     * @returns {any} sender and location hashes
     */
    getSenders(recipientAccount) {
        return this.ENS.getMultihash(recipientAccount.subdomain).then((mailboxAddress) => {
            if (mailboxAddress === null) {
                throw new Error(`couldn't find mailbox for ${recipientAccount.subdomain}`);
            }
            return this.Mailbox.getRequests(mailboxAddress).then((senders) => {
                var senderPromises = [];
                for (var idx = 0; idx < senders.length; idx++) {
                    senderPromises.push(new Promise((resolve, reject) => {
                        var idy = idx;
                        //debugger
                        this.Mailbox.getRequestRaw(senders[idy], mailboxAddress)
                            .then((feedLocationHash) => {
                                resolve({
                                    senderNamehash: senders[idy],
                                    feedLocationHash: feedLocationHash
                                });
                            });
                    }));
                }
                return Promise.all(senderPromises);
            });
        });
    }

}

module.exports = Mail;

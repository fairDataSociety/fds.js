let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let ENS = require('./FDS-ENS.js');
let Mailbox = require('./FDS-Mailbox.js');

let Swarm = require('./FDS-Swarm.js');
let SwarmFeeds = require('./FDS-SwarmFeeds.js');
let Crypto = require('./FDS-Crypto.js');

let Message = require('../models/Message.js');
let Hash = require('../models/Hash.js');

let Contact = require('../models/Contact.js');

class Mail {

  constructor(config, account){
    this.account = account;
    this.config = config;
    this.ENS = new ENS(config);
    this.Mailbox = new Mailbox(config);

    this.Store = new Swarm(config, account);
    this.SF = new SwarmFeeds(config.swarmGateway);
    this.SwarmStore = this.account.SwarmStore;
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout));
    this.gasPrice = this.web3.utils.toWei(config.gasPrice.toString(), 'gwei');
  }

  // sendFileTo
  // later will replace callbacks with emitted events...  
  send(senderAccount, recipientSubdomain, file, encryptProgressCallback = console.log, uploadProgressCallback = console.log, progressMessageCallback = console.log){
    //get public key from repo
    let sharedSecret, mailboxAddress, recipientPublicKey = null;
    let recipientSubdomainNameHash = namehash.hash(recipientSubdomain + '.'+ this.config.ensConfig.domain);
    let feedLocationHash = this.Mailbox.encodeFeedLocationHash(senderAccount.address, recipientSubdomainNameHash);

    progressMessageCallback(`retrieving public key`);
    return this.ENS.getPubKey(recipientSubdomain).then((publicKey)=>{
    //calculate shared secret
      recipientPublicKey = publicKey
      let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, publicKey);
      return sharedSecret;
    }).then((secret)=>{
      sharedSecret = secret;
      progressMessageCallback(`retrieving mailbox address`);
      return this.ENS.getMultihash(recipientSubdomain)
    }).then((hash)=>{
      mailboxAddress = hash;
      progressMessageCallback(`retrieving connection`);
      if(hash){
        return this.Mailbox.getRequest(senderAccount.subdomain, mailboxAddress);
      }else{
        throw Error('could not find multihash entry');
      }
    }).then((request)=>{
      //create a new request
      if(request === "0x0000000000000000000000000000000000000000000000000000000000000000"){
        progressMessageCallback(`creating new request`);
        return this.Mailbox.newRequest(senderAccount, recipientSubdomain, mailboxAddress, feedLocationHash)
                .then((request)=>{
                  return senderAccount.storeContact(
                    new Contact(
                      {
                        subdomain: recipientSubdomain, 
                        publicKey: recipientPublicKey, 
                        mailboxAddress: mailboxAddress,
                        feedLocationHash: feedLocationHash
                      }
                    ));
                }).then(()=>{
                  let flh = this.Mailbox.decodeFeedLocationHash(feedLocationHash);
                  return this.initMessages(recipientPublicKey, senderAccount, flh.topic);
                });
      }else{
        //if there's a request, do nothing
        progressMessageCallback(`request found`);
        return true;
      }
    }).then(()=>{
      //store encrypted file
      progressMessageCallback(`storing encrypted file`);
      return this.Store.storeEncryptedFile(senderAccount, file, "0x"+sharedSecret, encryptProgressCallback, uploadProgressCallback, progressMessageCallback);
    }).then((storedFilehash)=>{
      //send the resulting hash to the recipient
      progressMessageCallback(`sending encrypted message`);
      let feedLocation = this.Mailbox.decodeFeedLocationHash(feedLocationHash);
      let message = new Message({
        to: recipientSubdomain,
        from: senderAccount.subdomain,
        hash: storedFilehash,
      }, this.config, senderAccount);
      return this.saveMessage(recipientPublicKey, senderAccount, feedLocation.topic, message, progressMessageCallback);
    });
  }

  receive(recipientAccount, message, decryptProgressCallback = console.log, downloadProgressCallback = console.log){
    //get public key from repo
    return this.ENS.getPubKey(message.from).then((senderPublicKey)=>{
    //calculate shared secret
      let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, senderPublicKey);
      return sharedSecret;
    }).then((sharedSecret)=>{
    //encrypt and upload to store
      let storedFile = this.Store.getDecryptedFile(message.hash, sharedSecret, decryptProgressCallback, downloadProgressCallback);
      return storedFile;
    });
  }

  retrieveSent(recipientAccount, message, decryptProgressCallback = console.log, downloadProgressCallback = console.log){
    //get public key from repo
    return this.ENS.getPubKey(message.to).then((recipientPublicKey)=>{
    //calculate shared secret
      let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, recipientPublicKey);
      return sharedSecret;
    }).then((sharedSecret)=>{
    //encrypt and upload to store
      let storedFile = this.Store.getDecryptedFile(message.hash, sharedSecret, decryptProgressCallback, downloadProgressCallback);
      return storedFile;
    });
  }

// ...

  initMessages(recipientPublicKey, senderAccount, topic){
    let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey);
    return this.SwarmStore.storeEncryptedValue(topic, JSON.stringify({messages: []}), senderAccount, "0x" + sharedSecret);
  }

  saveMessage(recipientPublicKey, senderAccount, topic, message, progressMessageCallback = console.log){
    progressMessageCallback(`retrieving connection message feed`);
    return this.getAccountMessages(recipientPublicKey, senderAccount, topic).then((messages)=>{
      progressMessageCallback(`saving message feed`);
      messages.push(message.toJSON());
      progressMessageCallback(`appending message`);
      let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey);
      return this.SwarmStore.storeEncryptedValue(topic, JSON.stringify({messages: messages}), senderAccount, "0x" + sharedSecret);
    });
  }

  getAccountMessages(recipientPublicKey, senderAccount, topic){
    return this.getMessageFeed(recipientPublicKey, senderAccount.address, senderAccount, topic);
  }

  getMessages(type = 'received', account) {
    switch(type) {
      case 'received':
        return this.getReceivedMessages(account);
      case 'sent':
        return this.getSentMessages(account);
    }
  }

  getReceivedMessages(recipientAccount){
    return this.getSenders(recipientAccount).then((senders)=>{
      var feedPromises = [];
      for (var i = senders.length - 1; i >= 0; i--) {
        feedPromises.push(new Promise((resolve,reject)=>{
          let feedLocation = this.Mailbox.decodeFeedLocationHash(senders[i].feedLocationHash);
          let namehash = senders[i].senderNamehash;
          return this.ENS.getPubKeyRaw(senders[i].senderNamehash).then((publicKey)=>{
            return this.getMessageFeed(publicKey, feedLocation.address, recipientAccount, feedLocation.topic).then(resolve);
          });
        }));
      }
      return Promise.all(feedPromises).then((messageFeeds)=>{
        //just concatenating the messages for now, later we'll be more clever with retrieval...
        return [].concat.apply([], messageFeeds);
      });
    });
  }

  getSentMessages(recipientAccount){
    return recipientAccount.getContacts().then((contacts)=>{
      var feedPromises = [];
      for (var i = contacts.length - 1; i >= 0; i--) {
        feedPromises.push(new Promise((resolve,reject)=>{
          let feedLocation = this.Mailbox.decodeFeedLocationHash(contacts[i].feedLocationHash);
          return this.getMessageFeed(contacts[i].publicKey, feedLocation.address, recipientAccount, feedLocation.topic).then(resolve);
        }));
      }
      return Promise.all(feedPromises).then((messageFeeds)=>{
        //just concatenating the messages for now, later we'll be more clever with retrieval...
        return [].concat.apply([], messageFeeds);
      });      
    });
  }

  getMessageFeed(publicKey, address, account, topic){
    let sharedSecret = Crypto.calculateSharedSecret(account.privateKey, publicKey);
    return this.SwarmStore.retrieveDecryptedValue(topic, address, "0x"+sharedSecret).then((decryptedManifest)=>{
      let messageParsed = JSON.parse(decryptedManifest).messages;
      let messageObjects = messageParsed.map((m)=>new Message(m, this.config, account));
      let messageObjectsWithHashObjects = messageObjects.map((m)=>{
        m.hash = new Hash(m.hash, this.config);
        return m;
      });
      return messageObjectsWithHashObjects;
    }).catch((error)=>{
      if(error !== 404){
        throw new Error(error);
      }else{
        return [];
      }
    });
  }

  getSenders(recipientAccount){
    return this.ENS.getMultihash(recipientAccount.subdomain).then((mailboxAddress)=>{
      if(mailboxAddress === null){
        throw new Error(`couldn't find mailbox for ${recipientAccount.subdomain}`)
      }
      return this.Mailbox.getRequests(mailboxAddress).then((senders)=>{
        var senderPromises = [];
        for (var i = senders.length - 1; i >= 0; i--) {
          senderPromises.push(new Promise((resolve,reject)=>{
            this.Mailbox.getRequestRaw(senders[0], mailboxAddress )
              .then((feedLocationHash)=>{resolve({
                senderNamehash: senders[0], 
                feedLocationHash: feedLocationHash
              })});
          }));
        }
        return Promise.all(senderPromises);
      });
    });
  }

}

module.exports = Mail;

let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let ENS = require('./FDS-ENS.js');
let Mailbox = require('./FDS-Mailbox.js');

let Swarm = require('./FDS-Swarm.js');
let SwarmFeeds = require('swarm-feeds');
let Crypto = require('./FDS-Crypto.js');

let Message = require('../models/Message.js');
let Hash = require('../models/Hash.js');

let Contact = require('../models/Contact.js');

let httpTimeout = 2000;

class Mail {

  constructor(config, account){
    this.account = account;
    this.config = config;
    this.ENS = new ENS(config.ethGateway, config.ensConfig);
    this.Mailbox = new Mailbox(config.ethGateway, config);

    this.Store = new Swarm(config, account);
    this.SF = new SwarmFeeds(config.swarmGateway);

    this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, httpTimeout));
    this.gasPrice = this.web3.utils.toWei('50', 'gwei');
  }

  // sendFileTo
  // later will replace callbacks with emitted events...  
  send(senderAccount, recipientSubdomain, file, encryptProgressCallback, uploadProgressCallback, progressMessageCallback){
    //get public key from repo
    let sharedSecret, mailboxAddress, recipientPublicKey = null;
    let recipientSubdomainNameHash = namehash.hash(recipientSubdomain + '.'+ this.config.ensConfig.domain);
    let feedLocationHash = this.Mailbox.encodeFeedLocationHash(senderAccount.address, recipientSubdomainNameHash);

    progressMessageCallback(`retreiving public key`);
    return this.ENS.getPubKey(recipientSubdomain).then((publicKey)=>{
    //calculate shared secret
      recipientPublicKey = publicKey
      let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, publicKey);
      return sharedSecret;
    }).then((secret)=>{
      sharedSecret = secret;
      progressMessageCallback(`retreiving mailbox address`);
      return this.ENS.getMultihash(recipientSubdomain)
    }).then((hash)=>{
      mailboxAddress = hash;
      progressMessageCallback(`retreiving connection`);
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
                  let feedLocationHash = this.Mailbox.encodeFeedLocationHash(senderAccount.address, recipientSubdomainNameHash);
                  return senderAccount.storeContact(
                    new Contact(
                      {
                        subdomain: recipientSubdomain, 
                        publicKey: recipientPublicKey, 
                        mailboxAddress: mailboxAddress,
                        feedLocationHash: feedLocationHash
                      }
                    ));
                });
      }else{
        progressMessageCallback(`request found`);
        return true;
      }
    }).then(()=>{
      //encrypt and upload to store
      return this.Store.storeEncryptedFile(senderAccount, file, sharedSecret, encryptProgressCallback, uploadProgressCallback, progressMessageCallback);
    }).then((storedFilehash)=>{
      //send it
      progressMessageCallback(`sending...`);
      let feedLocation = this.Mailbox.decodeFeedLocationHash(feedLocationHash);
      let message = new Message({
        to: recipientSubdomain,
        from: senderAccount.subdomain,
        hash: storedFilehash,
      }, this.config, senderAccount);
      return this.saveMessage(senderAccount, feedLocation.topic, message, progressMessageCallback);
    });
  }

  storeNewContact(){
    // contactStore?
  }

  receive(recipientAccount, message, decryptProgressCallback, downloadProgressCallback){
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

  retrieveSent(recipientAccount, message, decryptProgressCallback, downloadProgressCallback){
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

  saveMessage(senderAccount, topic, message, progressMessageCallback){
    // return this.ENS.getPubKey(message.to).then((recipientPublicKey)=>{
      progressMessageCallback(`retreiving connection message feed`);
      return this.getAccountMessages(senderAccount, topic).then((messages)=>{
        messages.push(message.toJSON());
        progressMessageCallback(`appending message`);
        // let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey);
        // let encryptedManifest = Crypto.encryptString(JSON.stringify({messages: messages}), senderAccount.privateKey);
        return this.SF.set(senderAccount.address, topic, senderAccount.privateKey, JSON.stringify({messages: messages}));
      });
    // });
  }

  getAccountMessages(senderAccount, topic){
    return this.getMessageFeed(senderAccount.address, senderAccount, topic);
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
          let feedLocation = this.Mailbox.decodeFeedLocationHash(senders[i].feedLocationHash)
          return this.getMessageFeed(feedLocation.address, recipientAccount, feedLocation.topic).then(resolve);
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
          //just concatenating the messages for now, later we'll be more clever with retrieval...
          return this.getMessageFeed(feedLocation.address, recipientAccount, feedLocation.topic).then(resolve);
        }));
      }
      return Promise.all(feedPromises).then((messageFeeds)=>{
        //just concatenating the messages for now, later we'll be more clever with retrieval...
        return [].concat.apply([], messageFeeds);
      });      
    });
  }

  getMessageFeed(address, account, topic){
    return this.SF.get(address, topic).then((response)=>{
      // let decryptedManifest = Crypto.decryptString(response, account.privateKey);
      let messageParsed = JSON.parse(response).messages;
      let messageObjects = messageParsed.map((m)=>new Message(m, this.config, account));
      let messageObjectsWithHashObjects = messageObjects.map((m)=>{
        m.hash = new Hash(m.hash, this.config);
        return m;
      });
      return messageObjectsWithHashObjects;
    }).catch(()=>{
      return [];
    });;
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
              })})
          }));
        }
        return Promise.all(senderPromises);
      });
    });
  }

}

module.exports = Mail;

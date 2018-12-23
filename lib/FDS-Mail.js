let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let ENS = require('./FDS-ENS.js');
let Swarm = require('./FDS-Swarm.js');
let SwarmFeeds = require('swarm-feeds');
let Crypto = require('./FDS-Crypto.js');

let Message = require('../models/Message.js');
let Hash = require('../models/Hash.js');

let MailboxContract = require('../abi/MailboxContract.json');
let httpTimeout = 2000;

class Mail {

  constructor(config, account){
    this.account = account;
    this.config = config;
    this.ENS = new ENS(config.ethGateway, config.ensConfig);
    this.Store = new Swarm(config, account);
    this.SF = new SwarmFeeds(config.swarmGateway);

    this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, httpTimeout));
    this.mailboxContract = new this.web3.eth.Contract(MailboxContract.abi);
    this.gasPrice = this.web3.utils.toWei('50', 'gwei');
  }

  // sendFileTo
  // later will replace callbacks with emitted events...  
  send(senderAccount, recipientSubdomain, file, encryptProgressCallback, uploadProgressCallback){
    //get public key from repo
    let storedFilehash, mailboxAddress, recipientPublicKey = null;

    return this.ENS.getPubKey(recipientSubdomain).then((recipientPublicKey)=>{
    //calculate shared secret
      let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey);
      return sharedSecret;
    }).then((sharedSecret)=>{
    //encrypt and upload to store
      return this.Store.storeEncryptedFile(senderAccount, file, sharedSecret, encryptProgressCallback, uploadProgressCallback);
    }).then((hash)=>{
      if(hash === null){
        throw Error('handle me')
      }
      storedFilehash = hash;
      return this.ENS.getMultihash(recipientSubdomain)
    }).then((hash)=>{
      mailboxAddress = hash;
      if(hash){
        return this.ENS.getRequest(senderAccount.subdomain, mailboxAddress);
      }else{
        throw Error('could not find multihash entry');
      }
    }).then((request)=>{
      //create a new message and then send it
      if(request === "0x0000000000000000000000000000000000000000000000000000000000000000"){
        return this.ENS.newRequest(senderAccount, recipientSubdomain, mailboxAddress);
      }else{
        return true;
      }
    }).then((request)=>{
      let message = new Message({
        to: recipientSubdomain,
        from: senderAccount.subdomain,
        hash: storedFilehash,
      }, this.config, senderAccount);
      return this.saveMessage(senderAccount, this.ENS.subdomainToFeedLocationHash(recipientSubdomain), message);
    })
    // .catch((error)=>{
    //   debugger
    // });
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

  saveMessage(senderAccount, topic, message){
    return this.getAccountMessages(senderAccount, topic).then((messages)=>{
      messages.push(message.toJSON());
      // let encryptedManifest = Crypto.encryptString(JSON.stringify({messages: messages}), senderAccount.privateKey);
      return this.SF.set(senderAccount.address, topic, senderAccount.privateKey, JSON.stringify({messages: messages}));
    });
  }


  getAccountMessages(senderAccount, feedLocation){
    return this.getMessageFeed(senderAccount.address, senderAccount, feedLocation);
  }  

  getMessageFeed(address, account, feedLocation){
    // let messagesJSON = localStorage.getItem('messages') !== null ? localStorage.getItem('messages') : '[]';
    return this.SF.get(address, feedLocation).then((response)=>{
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
      return this.ENS.getRequests(mailboxAddress).then((senders)=>{
        var senderPromises = [];
        for (var i = senders.length - 1; i >= 0; i--) {
          senderPromises.push(new Promise((resolve,reject)=>{
            this.ENS.getRequestRaw(senders[0], mailboxAddress )
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

  getReceivedMessages(recipientAccount){
    return this.getSenders(recipientAccount).then((senders)=>{
      console.log(`got ${senders.length} senders`, senders);
      for (var i = senders.length - 1; i >= 0; i--) {
        let feedLocation = this.ENS.decodeFeedLocationHash(senders[i].feedLocationHash)
        // throw new Error('use Promise.all here to get multiple feeds')
        return this.getMessageFeed(feedLocation.address, recipientAccount, feedLocation.topic);
      }
    });
  }

  // // getFilesReceived
  getMessages(type, account) {
    return this.getReceivedMessages(account).then((messages)=>{
      switch(type) {
        case 'received':
          return messages.filter(message => message.to === account.subdomain)
        case 'sent':
          return messages.filter(message => message.from === account.subdomain)      
        case 'saved':
          return messages.filter((message) => {
            return message.from === account.subdomain &&
            message.to === account.subdomain;
          })     
        default:
          throw new Error('type should be received, sent or saved')
      }
    });
  }

}

module.exports = Mail;

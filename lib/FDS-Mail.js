let ENS = require('./FDS-ENS.js');
let Swarm = require('./FDS-Swarm.js');
let SwarmFeeds = require('swarm-feeds');
let Crypto = require('./FDS-Crypto.js');

let Message = require('../models/Message.js');
let Hash = require('../models/Hash.js');

let topicName = 'fairdrop-test-3-1';

class Mail {

  constructor(config, account){
    // this.DT = new DTransfer(swarmGateway);
    this.account = account;
    this.config = config;
    this.ENS = new ENS(config.ethGateway, config.ensConfig);
    this.Store = new Swarm(config, account);
    this.SF = new SwarmFeeds(config.swarmGateway);
  }

  // sendFileTo
  // later will replace callbacks with emitted events...  
  send(senderAccount, recipientSubdomain, file, encryptProgressCallback, uploadProgressCallback){
    //get public key from repo
    return this.ENS.getPubKey(recipientSubdomain).then((recipientPublicKey)=>{
    //calculate shared secret
      let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey);
      return sharedSecret;
    }).then((sharedSecret)=>{
    //encrypt and upload to store
      let storedFile = this.Store.storeEncrypted(senderAccount, file, sharedSecret, encryptProgressCallback, uploadProgressCallback);
      return storedFile;
    }).then((hash)=>{
    //create a new message and then send it    
      let message = new Message({
        to: recipientSubdomain,              
        from: senderAccount.subdomain,
        hash: hash
      }, this.config, senderAccount);
      return this.saveMessage(message);
    });
  }

  receive(recipientAccount, message, decryptProgressCallback, downloadProgressCallback){
    //get public key from repo
    return this.ENS.getPubKey(message.from).then((senderPublicKey)=>{
    //calculate shared secret
      let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, senderPublicKey);
      return sharedSecret;
    }).then((sharedSecret)=>{
    //encrypt and upload to store
      let storedFile = this.Store.getDecrypted(message.hash, sharedSecret, decryptProgressCallback, downloadProgressCallback);
      return storedFile;
    });
  }  

// ...

  saveMessage(message){
    return this.getAllMessages().then((messages)=>{
      messages.push(message.toJSON());
      return this.SF.set('0x1de9349041b78881e70c02f21e16c4a2a83292d1', topicName, '0x211783EA426F0FBD5AB98EE2A0B1307D45F666A8F45524D39EF735DB94788CF4', JSON.stringify({messages: messages}));
      // localStorage.setItem('messages', JSON.stringify(messages));
    });
  }

  getAllMessages(account){
    // let messagesJSON = localStorage.getItem('messages') !== null ? localStorage.getItem('messages') : '[]';
    return this.SF.get('0x1de9349041b78881e70c02f21e16c4a2a83292d1', topicName).then((response)=>{
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
    // return new Promise((resolve, reject) => { resolve(JSON.parse(messagesJSON))} );
  }

  // // getFilesReceived
  getMessages(type, account) {
    return this.getAllMessages(account).then((messages)=>{
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

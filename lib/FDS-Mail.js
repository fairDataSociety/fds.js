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
    // this.DT = new DTransfer(swarmGateway);
    this.account = account;
    this.config = config;
    this.ENS = new ENS(config.ethGateway, config.ensConfig);
    this.Store = new Swarm(config, account);
    this.SF = new SwarmFeeds(config.swarmGateway);

    this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, httpTimeout));
    this.mailboxContract = new this.web3.eth.Contract(MailboxContract.abi);
    this.gasPrice = this.web3.utils.toWei('50', 'gwei');
  }

  newRequest(senderAccount, feedHash){
    let node = namehash.hash(senderAccount.subdomain + '.'+ this.config.ensConfig.domain);

    let dataTx = this.mailboxContract.methods.newRequest(node, feedHash).encodeABI();
    let privateKey = senderAccount.privateKey;
    let tx = {
      from: senderAccount.address,
      to: this.options.registryAddress,
      data: dataTx,
      gas: 510000,
      gasPrice: this.gasPrice,
      nonce: nonce
    };

    return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
      return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
        .once('receipt', function(hash){
          return hash;
        });
    });
  }

  getRequests(mailboxAddress){
    let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);  
    return recipientMailboxContract.methods
      .getRequests()
      .call()
      .then((address)=>{
        debugger
        return address.substr(0,42);
      });
  }

  deployMailbox(senderAccount, feedHash, nonce){
    let contract = new this.web3.eth.Contract(MailboxContract.abi);
    let dataTx = contract.deploy({data: MailboxContract.bytecode}).encodeABI();
    let privateKey = senderAccount.privateKey;
    let tx = {
      from: senderAccount.address,
      data: dataTx,
      gas: 1500000,
      gasPrice: this.gasPrice,
      // nonce: nonce
    };

    return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
      return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
        .once('transactionHash', function(hash){
          return hash;
        });
    });
  }

  // sendFileTo
  // later will replace callbacks with emitted events...  
  send(senderAccount, recipientSubdomain, file, encryptProgressCallback, uploadProgressCallback){
    //get public key from repo
    let storedFilehash, mailboxAddress = null;
    let topic = this.web3.utils.padRight(senderAccount.address,64); //for now - so the message manifest can be found at bzz-feed://?user=0x[sendingUserAddress]&topic=0x[recipientUserAddress]

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
      if(request !== "0x0000000000000000000000000000000000000000"){
        return this.ENS.newRequest(senderAccount, topic, mailboxAddress);
      }else{
        return true;
      }
    }).then((request)=>{
      let message = new Message({
        to: recipientSubdomain,            
        from: senderAccount.subdomain,
        hash: storedFilehash,
      }, this.config, senderAccount);
      return this.saveMessage(senderAccount, topic, message);
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
      debugger
      messages.push(message.toJSON());
      let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey);
      let encryptedManifest = Crypto.encryptString(JSON.stringify({messages: messages}), );
      return this.SF.set(senderAccount.address, topic, senderAccount.privateKey, encryptedManifest);
      // localStorage.setItem('messages', JSON.stringify(messages));
    });
  }

  getAccountMessages(senderAccount, feedLocation){
    // let messagesJSON = localStorage.getItem('messages') !== null ? localStorage.getItem('messages') : '[]';
    return this.SF.get(senderAccount.address, feedLocation).then((response)=>{
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

  getReceivedMessages(){
    this.getRequests();
  }

  // // getFilesReceived
  getMessages(type, account) {
    throw new Error('refactor me')
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

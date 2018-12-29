let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let MailboxContract = require('../abi/MailboxContract.json');

let httpTimeout = 2000;

class Mailbox {

  constructor(provider, options = {}){

    this.options = options;

    this.web3 = new Web3(new Web3.providers.HttpProvider(provider, httpTimeout));

    this.gasPrice = this.web3.utils.toWei('50', 'gwei');

  }

  encodeFeedLocationHash(senderAddress, recipientNamehash){
    return senderAddress + recipientNamehash.substr(42,66);
  }

  subdomainNameHashToFeedLocationHash(recipientNamehash){
    return recipientNamehash.substr(42,66);
  }

  decodeFeedLocationHash(feedLocationHash){
    return {
      address: feedLocationHash.substring(0,42),
      topic: feedLocationHash.substr(42,66)
    }
  }

  deployMailbox(wallet, nonce){
    let contract = new this.web3.eth.Contract(MailboxContract.abi);
    let dataTx = contract.deploy({data: MailboxContract.bytecode}).encodeABI();
    let privateKey = wallet.wallet.getPrivateKeyString();
    let tx = {
      from: wallet.wallet.getAddressString(),
      data: dataTx,
      gas: 1500000,
      gasPrice: this.gasPrice,
      nonce: nonce
    };

    return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
      return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
        .once('transactionHash', function(hash){
          return hash;
        });
    });
  }

  newRequest(senderAccount, recipientSubdomain, mailboxAddress, feedLocationHash){
    let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);
    let recipientNamehash = namehash.hash(senderAccount.subdomain + '.'+ this.options.ensConfig.domain)
    let dataTx = recipientMailboxContract.methods.newRequest(
      recipientNamehash,
      feedLocationHash
    ).encodeABI();
    let privateKey = senderAccount.privateKey;
    let tx = {
      from: senderAccount.address,
      to: mailboxAddress,
      data: dataTx,
      gas: 510000,
      gasPrice: this.gasPrice,
    };

    return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
      return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
        .once('transactionHash', function(hash){ 
          return hash;
        });
    });
  }

  getRequestRaw(namehash, mailboxAddress){
    let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);
    return recipientMailboxContract.methods
      .getRequest(namehash)
      .call();
  }

  getRequest(subdomain, mailboxAddress){
    let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);  
    return this.getRequestRaw(namehash.hash(subdomain + '.'+ this.options.ensConfig.domain), mailboxAddress);
  }

  getRequests(mailboxAddress){
    let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);
    return recipientMailboxContract.methods
      .getRequests()
      .call();
  }


}

module.exports = Mailbox;
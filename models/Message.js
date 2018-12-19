let FileSaver = require('file-saver');
let Mail = require('../lib/FDS-Mail.js');

class Message {
  constructor(attrs, config, account){
    if(attrs.to === undefined) throw new Error('to must be defined');
    if(attrs.from === undefined) throw new Error('from must be defined');
    if(attrs.hash === undefined) throw new Error('hash must be defined');

    this.to = attrs.to
    this.from = attrs.from
    this.hash = attrs.hash
    this.account = account

    this.Mail = this.account.Mail;

    return this;
  }

  toJSON(){
    return {
      to: this.to,
      from: this.from,
      hash: this.hash.toJSON()
    }
  }

  getFile(decryptProgressCallback, downloadProgressCallback){
    if(this.to === this.account.subdomain){
      return this.Mail.receive(this.account, this, decryptProgressCallback, downloadProgressCallback);      
    }else if(this.from === this.account.subdomain){
      return this.Mail.retrieveSent(this.account, this, decryptProgressCallback, downloadProgressCallback);      
    }else{
      throw Error('there was a problem...')
    }
  }

  saveAs(){
    return this.getFile().then(file => FileSaver.saveAs(file));  
  }
}

module.exports = Message;
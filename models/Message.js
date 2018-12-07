let FileSaver = require('file-saver');
let Mail = require('../lib/FDS-Mail.js');

class Message {
  constructor(attrs, config, account){
    // if(attrs.order === undefined) throw new Error('order must be defined');
    if(attrs.to === undefined) throw new Error('to must be defined');
    if(attrs.from === undefined) throw new Error('from must be defined');
    if(attrs.hash === undefined) throw new Error('from must be defined');

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

  // getters

  getFile(decryptProgressCallback, downloadProgressCallback){
    return this.Mail.receive(this.account, this, decryptProgressCallback, downloadProgressCallback);
    //returns File object
    //there was a problem
      //network
      //something else
  }

  saveAs(){
    return this.getFile().then(file => FileSaver.saveAs(file));
    //the file should download automatically
    //there was a problem
      //network
      //something else     
  }
}

module.exports = Message;
let FileSaver = require('file-saver');

class Hash {
  constructor(attrs, account){
    if(attrs.address === undefined) throw new Error('address must be defined');
    if(attrs.file === undefined) throw new Error('file must be defined');
    if(attrs.time === undefined) throw new Error('time must be defined');

    this.address = attrs.address;
    this.file = attrs.file;
    this.time = attrs.time;
    
    this.account = account;
    this.SwarmStore = this.account.SwarmStore;

    return this;
  }

  toJSON(){
    return {
      address: this.address,
      file: {
        name: this.file.name,
        type: this.file.type,
        size: this.file.size
      },
      time: this.time
    }
  }

  getFile(decryptProgressCallback, downloadProgressCallback){
    return this.SwarmStore.retrieveFile(this.account, this, decryptProgressCallback, downloadProgressCallback);
  }

  saveAs(){
    return this.getFile().then(file => FileSaver.saveAs(file));
  }

}

module.exports = Hash;
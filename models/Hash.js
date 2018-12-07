let FileSaver = require('file-saver');

class Hash {
  constructor(attrs, account){
    // if(attrs.order === undefined) throw new Error('order must be defined');
    if(attrs.address === undefined) throw new Error('address must be defined');
    if(attrs.file === undefined) throw new Error('file must be defined');

    this.address = attrs.address
    this.file = attrs.file
    this.account = account;
    this.SwarmStore = this.account.SwarmStore;
    // this.SwarmStore = new SwarmStore(config, account);

    return this;
  }

  toJSON(){
    return {
      address: this.address,
      file: {
        name: this.file.name,
        type: this.file.type,
        size: this.file.size
      }
    }
  }

  file(){
    //returns File object
    //there was a problem
      //network
      //something else
  }

  getFile(decryptProgressCallback, downloadProgressCallback){
    return this.SwarmStore.retrieve(this.account, this, decryptProgressCallback, downloadProgressCallback);
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

module.exports = Hash;
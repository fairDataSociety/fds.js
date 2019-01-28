let FileSaver = require('file-saver');

class Account {

  constructor(attrs, Account){
    if(attrs.subdomain === undefined) throw new Error('subdomain must be defined');
    if(attrs.wallet === undefined) throw new Error('wallet must be defined');

    this.Account = Account;
    this.Mail = this.Account.Mail;
    this.SwarmStore = this.Account.SwarmStore;

    this.subdomain = attrs.subdomain;
    this.wallet = attrs.wallet;
    return this;
  }

  toJSON(){
    return {
      subdomain: this.subdomain,
      wallet: this.wallet
    }
  }

  send(recipientSubdomain, file, encryptionCallback, uploadCallback, progressMessageCallback){
    return this.Mail.send(this, recipientSubdomain, file, encryptionCallback, uploadCallback, progressMessageCallback); 
  }

  messages(query = 'received'){
    if(['received','sent', 'saved'].indexOf(query) === -1){
      throw new Error('must be of type received, sent or saved');
    }
    return this.Mail.getMessages(query, this);
  }

  storeValue(key, value){
    return this.SwarmStore.storeValue(key, value, this);
  }

  retrieveValue(key){
    return this.SwarmStore.retrieveValue(key, this);
  }  

  storeEncryptedValue(key, value){
    return this.SwarmStore.storeEncryptedValue(key, value, this);
  }

  retrieveDecryptedValue(key){
    return this.SwarmStore.retrieveDecryptedValue(key, this);
  }    

  store(file, encryptionCallback, uploadCallback, progressMessageCallback){
    return this.SwarmStore.storeFile(this, file, encryptionCallback, uploadCallback, progressMessageCallback);
  }

  getContacts(){
    return this.SwarmStore.getContacts(this);
  }

  storeContact(contact){
    return this.SwarmStore.storeContact(this, contact);
  }

  stored(query){
    return this.SwarmStore.getStored(query, this);
  }

  getBackupFile(){
    return new File([JSON.stringify(this.wallet)], `fairdrop-wallet-${this.subdomain}-backup.json`, {type: 'application/json'});
  }

  saveBackupAs(){
    return FileSaver.saveAs(this.getBackupFile());
  }

}

module.exports = Account;
let FileSaver = require('file-saver');

class User {

  constructor(attrs, Account){
    if(attrs.subdomain === undefined) throw new Error('subdomain must be defined');
    if(attrs.wallet === undefined) throw new Error('wallet must be defined');

    this.Account = Account;
    this.Mail = this.Account.Mail;
    this.Tx = this.Account.Tx;
    this.SwarmStore = this.Account.SwarmStore;

    this.subdomain = attrs.subdomain;
    this.wallet = attrs.wallet;
    return this;
  }

  toJSON(){
      return {
          subdomain: this.subdomain,
          wallet: this.wallet
      };
  }

    /**
     * Send file 
     * @param {any} recipientSubdomain name 
     * @param {any} file to send 
     * @param {any} encryptionCallback callback
     * @param {any} uploadCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {any} result
     */
  send(recipientSubdomain, file, encryptionCallback = console.log, uploadCallback = console.log, progressMessageCallback = console.log){
    return this.Mail.send(this, recipientSubdomain, file, encryptionCallback, uploadCallback, progressMessageCallback); 
  }

/**
 * send tokens
 * @param {any} recipientAddress 0xfff
 * @param {any} amount in eth
 * @returns {any} transaction
 */
sendTokens(recipientAddress, amount){
   return this.Tx.sendTokens(this, recipientAddress, amount); 
} 

/**
* Send amount of tokens to subdomain
* @param {any} subdomain to whom to send subdomain
* @param {any} amount in ethers
* @returns {any} result
*/
async sendTokensTo(subdomain, amount) {
    let recipientAddress = await this.getAddressOf(subdomain);
    return this.Tx.sendTokens(this, recipientAddress, amount);
    }

async getAddressOf(subdomain) {
    let contact = await this.lookupContact(subdomain, console.log, console.log, console.log);
    let hex = "0x" + contact.publicKey.substring(2, 132);
    let hash = this.Tx.web3.utils.keccak256(hex);
    let recipientAddress = "0x" + hash.slice(24 + 2);
    return recipientAddress;
}

    /**
     * Send file 
     * @param {any} recipientSubdomain name 
     * @param {any} file to send 
     * @param {any} encryptionCallback callback
     * @param {any} uploadCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {any} result
     */
  getBalance(){
    return this.Tx.getBalance(this.address); 
  }    

  /**
    * Receive file
    * @param {any} message that points to file
    * @param {any} decryptionCallback callback 
    * @param {any} downloadCallback callback
    * @returns {any} returns file if success
    */
  async receive(message, decryptionCallback = console.log, downloadCallback = console.log) {
        if (message.to === this.subdomain) {
            return await this.Mail.receive(this, message, decryptionCallback, downloadCallback);
        } else if (message.from === this.subdomain) {
            return await this.Mail.retrieveSent(this, message, decryptionCallback, downloadCallback);
        } else {
            throw Error('there was a problem...');
        }
  }

    /**
     * Get messages
     * @param {any} query to lookup to
     * @returns {any} available messages
     */
  messages(query = 'received'){
    if(['received','sent', 'saved'].indexOf(query) === -1){
      throw new Error('must be of type received, sent or saved');
    }
    return this.Mail.getMessages(query, this);
  }
    /**
     * store value
     * @param {any} key to store under
     * @param {any} value to store
     * @returns {any} stored result
     */
  storeValue(key, value){
    return this.SwarmStore.storeValue(key, value, this);
  }
    /**
     * retrieve value
     * @param {any} key to lookup
     * @returns {any} retrieved value
     */
  retrieveValue(key){
    return this.SwarmStore.retrieveValue(key, this);
  }  
    /**
     * store encrypted value
     * @param {any} key to store under
     * @param {any} value to store
     * @returns {any} decrypted value if exists
     */
  storeEncryptedValue(key, value){
    return this.SwarmStore.storeEncryptedValue(key, value, this, this.privateKey);
  }
    /**
     * retrieve decrypted value
     * @param {any} key to lookup
     * @returns {any} decrypted value if exists 
     */
  retrieveDecryptedValue(key){
    return this.SwarmStore.retrieveDecryptedValue(key, this.address, this.privateKey);
  }    
    /**
     * Store file
     * @param {any} file to store
     * @param {any} encryptionCallback callback 
     * @param {any} uploadCallback callback 
     * @param {any} progressMessageCallback callback 
     * @returns {string} hash where stored
     */
  store(file, encryptionCallback = console.log, uploadCallback = console.log, progressMessageCallback = console.log){
    return this.SwarmStore.storeFile(this, file, encryptionCallback, uploadCallback, progressMessageCallback);
  }
    /** @returns {Contact} array of contacts */
  getContacts(){
    return this.SwarmStore.getContacts(this);
  }
    /**
     * 
     * @param {Contact} contact to store
     * @returns {any} stored
     */
  storeContact(contact){
    return this.SwarmStore.storeContact(this, contact);
  }
    /**
     * Get contact if it exists
     * @param {any} recipientSubdomain name
     * @param {any} encryptProgressCallback callback
     * @param {any} uploadProgressCallback callback
     * @param {any} progressMessageCallback callback
     * @returns {Contact} contact
     */
  lookupContact(recipientSubdomain, encryptProgressCallback = console.log, uploadProgressCallback = console.log, progressMessageCallback = console.log)
  {
      return this.Mail.lookupContact(this, recipientSubdomain, encryptProgressCallback = console.log, uploadProgressCallback = console.log, progressMessageCallback = console.log);
  }
    /**
     * check stored files
     * @param {any} query to lookup
     * @returns {any} stored 
     */
  stored(query){
    return this.SwarmStore.getStored(query, this);
  }
    /** Get backup of wallet 
     * @returns {any} file
     */
  getBackup(){
    return {
      data: JSON.stringify(this.wallet), 
      name: `fairdrop-wallet-${this.subdomain}-backup.json` 
    }
  }
    /** get wallet file 
     *  @returns {any} wallet file */
  getBackupFile(){
    return new File([JSON.stringify(this.wallet)], `fairdrop-wallet-${this.subdomain}-backup.json`, {type: 'application/json'});
  }
    /** Save wallet backup
     *  @returns {any} result of save operation */
  saveBackupAs(){
    return FileSaver.saveAs(this.getBackupFile());
  }

}

module.exports = User;
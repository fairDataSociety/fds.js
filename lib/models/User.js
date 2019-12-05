
// Copyright 2019 The FairDataSociety Authors
// This file is part of the FairDataSociety library.
//
// The FairDataSociety library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The FairDataSociety library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the FairDataSociety library. If not, see <http://www.gnu.org/licenses/>.

import saveAs from 'file-saver';
import ENS2 from '../FDS-ENS2.js';

class User {

  constructor(attrs, Account){
    if(attrs.subdomain === undefined) throw new Error('subdomain must be defined');
    if(attrs.wallet === undefined) throw new Error('wallet must be defined');

    this.Account = Account;
    this.Mail = this.Account.Mail;
    this.Tx = this.Account.Tx;
    this.SwarmStore = this.Account.SwarmStore;

    this.version = attrs.version || undefined;
    this.subdomain = attrs.subdomain;
    this.wallet = attrs.wallet;

    this.nonce = false;

    return this;
  }

  syncNonce(){
    return this.Tx.syncNonce(this).then((nonce)=>{
      this.nonce = nonce;
    })
  }

  toJSON(){
      return {
          subdomain: this.subdomain,
          wallet: this.wallet,
          version: this.version
      };
  }

  deployContract(abi, bytecode, args = [], nonce, gas = 15000000){
    return this.Tx.deployContract(this, abi, bytecode, args, nonce, gas);
  }

  getContract(abi, address){
    return this.Tx.getContract(this, abi, address);
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
  send(recipientSubdomain, file, multiboxPath, encryptionCallback = console.log, uploadCallback = console.log, progressMessageCallback = console.log){
    return this.Mail.send(this, recipientSubdomain, file, multiboxPath, encryptionCallback, uploadCallback, progressMessageCallback); 
  }

  /**
  * send tokens
  * @param {any} recipientAddress 0xfff
  * @param {any} amount in eth
  * @param {any} transactionCallback callback
  * @param {any} transactionSignedCallback callback
  * @returns {any} transaction
  */
  payAddress(recipientAddress, amount, gas = 15000000, transactionCallback = console.log, transactionSignedCallback = console.log) {
       return this.Tx.pay(this, recipientAddress, amount, gas, transactionCallback, transactionSignedCallback); 
  } 

  /**
  * Send amount of tokens to subdomain
  * @param {any} subdomain to whom to send subdomain
  * @param {any} amount in ethers
  * @returns {any} result
  */
  async pay(recipientSubdomain, amount, gas = 15000000, transactionCallback = console.log, transactionSignedCallback = console.log) {
    let ENS = new ENS2(this, this.Account.config.ensConfig);
    let recipientAddress = await ENS.getOwner(recipientSubdomain);
    return this.payAddress(recipientAddress, amount, gas, transactionCallback, transactionSignedCallback);
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
  messages(query = 'received', multiboxPath){
    if(['received','sent'].indexOf(query) === -1){
      throw new Error('must be of type received or sent');
    }
    return this.Mail.getMessages(query, this, multiboxPath);
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
   * Store file
   * @param {any} file to store
   * @param {any} encryptionCallback callback 
   * @param {any} uploadCallback callback 
   * @param {any} progressMessageCallback callback 
   * @returns {string} hash where stored
   */
  store(file, encryptionCallback = console.log, uploadCallback = console.log, progressMessageCallback = console.log, metadata = {}){
    return this.SwarmStore.storeFile(this, file, encryptionCallback, uploadCallback, progressMessageCallback, metadata);
  }

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
      name: `fds-wallet-${this.subdomain}-backup.json` 
    }
  }

  /** Get backup of wallet 
   * @returns {any} file
   */
  getBackupAsJSON(){
    return JSON.stringify(this.wallet);
  }


  /** get wallet file 
   *  @returns {any} wallet file */
  getBackupFile(){
    return new File([JSON.stringify(this.wallet)], `fds-wallet-${this.subdomain}-backup.json`, {type: 'application/json'});
  }

  /** Save wallet backup
   *  @returns {any} result of save operation */
  saveBackupAs(){
    return saveAs(this.getBackupFile());
  }

  getMultibox(subdomain){
    return this.Account.getMultibox(this, subdomain);
  }

  lookupContact(subdomain){
    return this.Mail.lookupContact(this, subdomain);
  }

}

module.exports = User;
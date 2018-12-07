//really high level - the intention here is for jquery level 1 developers to be able to make a basic app.

let Account = require('./lib/FDS-Account.js');
let AccountStore = require('./lib/FDS-AccountStore.js');
let Wallet = require('./lib/FDS-Wallet.js');
let Crypto = require('./lib/FDS-Crypto.js');


class FDS {

  constructor(config){
    this.ethGateway = config.ethGateway
    this.swarmGateway = config.swarmGateway

    this.currentAccount = null;

    //exposes level 2 in FDS variable for more fine grained control.
    this.Account = new Account(config);
    this.Crypto = Crypto;
  }

  GetAccounts(){
    return this.Account.getAll();
  }

  /**
   * Creates an FDS account with associated ENS name and stores the account info in localstorage.
   * @createAccount
   * @param {string} subdomain - the subdomain of the ENS record.
   * @param {string} password - password for wallet encryption.
   * @returns {promise} outcome of attempt to create account, Account object or error.      
   */  
  CreateAccount(subdomain, password, feedbackMessageCallback){
    return this.Account.create(subdomain, password, feedbackMessageCallback).then((account)=>{
      return account;
    }).then(()=>{
      let currentAccount = this.UnlockAccount(subdomain, password);
      return currentAccount;
    });
  }

  /**
   * Retrieves an FDS account from localstorage unlocks, and sets as context.
   * @get
   * @param {string} subdomain
   * @param {string} password
   * @returns {boolean} true if successful
   */
  UnlockAccount(subdomain, password){
    return this.currentAccount = this.Account.unlock(subdomain, password).then((account)=>{
      this.currentAccount = account;
      return this.currentAccount;
    });
  }

  /**
   * Removes an FDS account from localstorage.
   * @deleteAccount
   * @param {string} subdomain - the subdomain of the configured ENS domain.
   * @returns {boolean} true if successful
   */ 
  DeleteAccount(subdomain){
    // if the account exists locally
    // delete it
    return this.Account.delete(subdomain);
  }



  /**
   * Retrieves an FDS account from localstorage ready to unlock.
   * @get
   * @param {string} subdomain
   * @param {string} password
   * @returns {boolean} true if successful
   */
  LockCurrentAccount(subdomain, password){
    // retrieve account
    // unlock it
    this.currentAccount = null;
  }

  /**
   * Restores an FDS account from a string.
   * @get
   * @param {string} subdomain
   * @param {string} walletJSON
   * @returns {boolean} true if successful
   */
  RestoreAccount(file){
    return this.Account.restoreFromFile(file);
  }

  /**
   * Intigates download of a FDS wallet backup file.
   * @get
   * @param {string} subdomain
   * @returns {boolean} true if successful
   */
  BackupAccount(subdomain){
    return this.Account.get(subdomain).saveBackupAs();
  }

}

module.exports = FDS;
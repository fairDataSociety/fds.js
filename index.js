let Account = require('./lib/FDS-Account.js');
let UserStore = require('./lib/FDS-UserStore.js');
let Wallet = require('./lib/FDS-Wallet.js');
let Crypto = require('./lib/FDS-Crypto.js');
let Tx = require('./lib/FDS-Tx.js');
let Utils = require('./lib/FDS-Utils.js');

class FDS {

  defaultConfig(){
    return {
      tokenName: 'gas',
      swarmGateway: 'https://swarm.fairdatasociety.org',
      ethGateway: 'https://geth-noordung.fairdatasociety.org',
      faucetAddress: 'https://dfaucet-testnet-prod.herokuapp.com/gimmie',
      chainID: '235813',
      httpTimeout: 1000,
      gasPrice: 0.1,
      ensConfig: {
        domain: 'datafund.eth',
        registryAddress: '0xB4d09f8bfC2A1f34477f3464d44a78533aB2ED13',
        subdomainRegistrarAddress: '0x824D75Ea5BA0e855cFb57a95916528344a50fc18',
        resolverContractAddress: '0xEc51674d28aF8CE3A7Fc8fc69613CC848bf251EA'
      }
    }
  }

  constructor(config = false){
    if(config === false){
      config = this.defaultConfig();
    }

    this.ethGateway = config.ethGateway
    this.swarmGateway = config.swarmGateway

    this.currentAccount = null;

    this.Account = new Account(config);
    this.Tx = new Tx(config);

    this.Utils = Utils;

    this.Crypto = Crypto;
  }

  /**
   * Retrieves accounts stored in localstorage.
   * @GetAccounts
   * @returns {any} all accounts
   */ 
  GetAccounts(){
    return this.Account.getAll();
  }

  /**
   * Creates an FDS account with associated ENS name and stores the account info in localstorage.
   * @CreateAccount
   * @param {string} subdomain - the subdomain of the ENS record.
   * @param {string} password - password for wallet encryption.
   * @param {any} feedbackMessageCallback callback
   * @returns {promise} outcome of attempt to create account, Account object or error.      
   */  
  CreateAccount(subdomain, password, feedbackMessageCallback = console.log){
    return this.Account.create(subdomain, password, feedbackMessageCallback).then((account)=>{
      return account;
    });
  }

  /**
   * Retrieves an FDS account from localstorage unlocks, and sets as context.
   * @get
   * @param {string} subdomain name
   * @param {string} password to use
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
   * Removes unlocked keys from memory.
   * @get
   * @param {string} subdomain name
   */
  LockAccount(subdomain){
    // retrieve account
    // unlock it
    this.currentAccount = null;
  }

  /**
   * Restores an FDS account from a string.
   * @get
   * @param {string} file wallet in JSON
   * @returns {boolean} true if successful
   */
  RestoreAccount(file){
    return this.Account.restoreFromFile(file);
  }

  /**
   * Restores an FDS account from a string.
   * @get
   * @param {string} file wallet in JSON
   * @returns {boolean} true if successful
   */
  RestoreAccountFromJSON(subdomain, json){
    return this.Account.restore(subdomain, json);
  }

  /**
   * Intigates download of a FDS wallet backup file.
   * @get
   * @param {string} subdomain name
   * @returns {boolean} true if successful
   */
  BackupAccount(subdomain){
    return this.Account.get(subdomain).saveBackupAs();
  }

  /**
   * Intigates download of FDS wallet backup JSON.
   * @get
   * @param {string} subdomain name
   * @returns {boolean} true if successful
   */
  BackupAccountAsJson(subdomain){
    return this.Account.get(subdomain).getBackup();
  }  

}

module.exports = FDS;
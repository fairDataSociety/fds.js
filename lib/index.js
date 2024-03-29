import Web3 from 'web3'
import defaultConfig from './config'
import Account from './FDS-Account'
import Tx from './FDS-Tx'

class FDS {
  defaultConfig() {
    return defaultConfig
  }

  constructor(config = false) {
    if (config === false) {
      config = this.defaultConfig()
    }

    config.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout), null, {
      transactionConfirmationBlocks: 1,
    })

    this.ethGateway = config.ethGateway
    this.beeGateway = config.beeGateway

    this.currentAccount = null

    this.Account = new Account(config)
    this.Tx = new Tx(config)

    // this.Utils = Utils;

    // this.Crypto = Crypto;
  }

  /**
   * Retrieves accounts stored in localstorage.
   * @GetAccounts
   * @returns {any} all accounts
   */
  GetAccounts(walletVersion) {
    return this.Account.getAll(walletVersion)
  }

  /**
   * Creates an FDS account with associated ENS name and stores the account info in localstorage.
   * @CreateAccount
   * @param {string} subdomain - the subdomain of the ENS record.
   * @param {string} password - password for wallet encryption.
   * @param {any} feedbackMessageCallback callback
   * @returns {promise} outcome of attempt to create account, Account object or error.
   */
  CreateAccount(subdomain, password, feedbackMessageCallback = console.log) {
    return this.Account.create(subdomain, password, feedbackMessageCallback).then((account) => {
      return account
    })
  }

  /**
   * Retrieves an FDS account from localstorage unlocks, and sets as context.
   * @get
   * @param {string} subdomain name
   * @param {string} password to use
   * @returns {boolean} true if successful
   */
  UnlockAccount(subdomain, password) {
    return (this.currentAccount = this.Account.unlock(subdomain, password).then((account) => {
      this.currentAccount = account
      return this.currentAccount
    }))
  }

  /**
   * Removes an FDS account from localstorage.
   * @deleteAccount
   * @param {string} subdomain - the subdomain of the configured ENS domain.
   * @returns {boolean} true if successful
   */
  DeleteAccount(subdomain) {
    // if the account exists locally
    // delete it
    return this.Account.delete(subdomain)
  }

  /**
   * Removes unlocked keys from memory.
   * @get
   * @param {string} subdomain name
   */
  LockAccount(subdomain) {
    // retrieve account
    // unlock it
    this.currentAccount = null
  }

  /**
   * Restores an FDS account from a string.
   * @get
   * @param {string} file wallet in JSON
   * @returns {boolean} true if successful
   */
  RestoreAccount(file) {
    return this.Account.restoreFromFile(file)
  }

  /**
   * Restores an FDS account from a string.
   * @get
   * @param {string} file wallet in JSON
   * @returns {boolean} true if successful
   */
  RestoreAccountFromJSON(subdomain, json) {
    return this.Account.restore(subdomain, json)
  }

  /**
   * Restores an FDS account from a private key.
   * @get
   * @param {string} private key as a hex string
   * @returns {boolean} true if successful
   */
  RestoreAccountFromPrivateKey(subdomain, password, privateKey) {
    return this.Account.restoreFromPrivateKey(subdomain, password, privateKey)
  }

  /**
   * Intigates download of a FDS wallet backup file.
   * @get
   * @param {string} subdomain name
   * @returns {boolean} true if successful
   */
  BackupAccount(subdomain) {
    return this.Account.get(subdomain).saveBackupAs()
  }

  /**
   * Intigates download of FDS wallet backup JSON.
   * @get
   * @param {string} subdomain name
   * @returns {boolean} true if successful
   */
  BackupAccountAsJSON(subdomain) {
    return this.Account.get(subdomain).getBackupAsJSON()
  }
}

export default FDS

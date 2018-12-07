let Utils = require('./FDS-Utils.js');
let Fairb0x = require('../models/Fairb0x.js');

class AccountStore {
  constructor(config, account){
    this.config = config;
    this.account = account;
    this.accounts = this.getAll();
  }

  get(subdomain){
    let results = this.getAll().filter(account => account.subdomain === subdomain);
    if(results.length === 1){
      return new Fairb0x(results[0], this.account);
    }else if(results.length === 0){
      return false;
    }else{
      throw new Error('there should only be one result per subdomain')
    }
  }

  getAll(){
    if(localStorage.getItem('accounts') === null){
      return [];
    }else{
      let accounts = [];
      let accountsIndex = JSON.parse(localStorage.getItem('accounts'));
      for (var i = accountsIndex.length - 1; i >= 0; i--) {
        accounts.push(new Fairb0x(accountsIndex[i], this.account));
      }
      return accounts;
    }
  }

  addAccount(subdomain, wallet){
    if(this.get(subdomain) === false){
      let account = new Fairb0x({
        // order: this.getAll().length + 1,
        subdomain: subdomain,
        wallet: wallet
      }, this.account);
      this.accounts.push(account);
      this.saveAll()
      return account;
    }else{
      throw new Error('account already present in local storage')
    }
  }

  delete(subdomain){
    this.accounts = this.getAll().filter(account => account.subdomain !== subdomain);
    this.saveAll();
  }

  saveAll(){
      let accounts = []
      for (var i = this.accounts.length - 1; i >= 0; i--) {
        accounts.push(this.accounts[i].toJSON());
      }
    return localStorage.setItem('accounts', JSON.stringify(accounts));  
  }

  restore(subdomain, walletJSONString){
    let wallet = JSON.parse(walletJSONString);
    return this.addAccount(subdomain, wallet);
  }
}

module.exports = AccountStore;
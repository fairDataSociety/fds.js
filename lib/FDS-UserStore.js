// stores user accounts

let Utils = require('./FDS-Utils.js');
let User = require('../models/User.js');

class UserStore {
  constructor(config, Account){
    this.config = config;
    this.Account = Account;
    this.users = this.getAll();
  }

  get(subdomain){
    let results = this.getAll().filter(user => user.subdomain === subdomain);
    if(results.length === 1){
      return new User(results[0], this.Account);
    }else if(results.length === 0){
      return false;
    }else{
      throw new Error('there should only be one result per subdomain')
    }
  }

  getAll(){
    if(localStorage.getItem('users') === null){
      return [];
    }else{
      let users = [];
      let usersIndex = JSON.parse(localStorage.getItem('users'));
      for (var i = usersIndex.length - 1; i >= 0; i--) {
        users.push(new User(usersIndex[i], this.Account));
      }
      return users;
    }
  }

  addUser(subdomain, wallet){
    if(this.get(subdomain) === false){
      let user = new User({
        // order: this.getAll().length + 1,
        subdomain: subdomain,
        wallet: wallet
      }, this.Account);
      this.users.push(user);
      this.saveAll()
      return user;
    }else{
      throw new Error('user already present in local storage')
    }
  }

  delete(subdomain){
    this.users = this.getAll().filter(user => user.subdomain !== subdomain);
    this.saveAll();
  }

  saveAll(){
      let users = []
      for (var i = this.users.length - 1; i >= 0; i--) {
        users.push(this.users[i].toJSON());
      }
    return localStorage.setItem('users', JSON.stringify(users));  
  }

  restore(subdomain, walletJSONString){
    let wallet = JSON.parse(walletJSONString);
    return this.addUser(subdomain, wallet);
  }
}

module.exports = UserStore;
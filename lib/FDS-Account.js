// manages user objects

let UserStore = require('./FDS-UserStore.js');
let Wallet = require('./FDS-Wallet.js');
let ENS = require('./FDS-ENS.js');
let Mailbox = require('./FDS-Mailbox.js');
let Utils = require('./FDS-Utils.js');
let Crypto = require('./FDS-Crypto.js');
let Mail = require('./FDS-Mail.js');
let Swarm = require('./FDS-Swarm.js');
let SwarmStore = require('./FDS-SwarmStore.js');
let Web3 = require('web3');
let Faucet = require('./FDS-Faucet');

class Accounts {

  constructor(config){
    this.ENS = new ENS(config);
    this.Mailbox = new Mailbox(config);

    this.UserStore = new UserStore(config, this);
    this.Store = new Swarm(config, this);

    this.SwarmStore = new SwarmStore(config, this);
    this.Mail = new Mail(config, this);

    this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout));
    this.faucet = new Faucet(config.faucetAddress);
  }

  getAll(){
    return this.UserStore.getAll();
  }

  /**
   * Creates an FDS account with associated ENS name and stores the account info in localstorage.
   * @createAccount
   * @param {string} subdomain - the subdomain of the ENS record.
   * @param {string} password - password for wallet encryption.
   * @returns {promise} outcome of attempt to create account, Account object or error.      
   */  
  create(subdomain, password, feedbackMessageCallback){
    let unlockedAccount;
    if(this.isMailboxNameValid(subdomain) === false){
      return Promise.reject('account name is not valid.');
    }else{
      return this.isMailboxNameAvailable(subdomain).then((response)=>{
        if(response === true){
          return this.createSubdomain(subdomain, password, feedbackMessageCallback).then((wallet)=>{
            return this.UserStore.addUser(subdomain, wallet.walletV3);
          }).then(()=>{
            return this.unlock(subdomain, password);
          }).then((account)=>{
            unlockedAccount = account;
            return this.SwarmStore.initStored(unlockedAccount);
          }).then(()=>{
            return this.SwarmStore.initContacts(unlockedAccount)
          }).then(()=>{
            return unlockedAccount;
          });
        }else{
          throw new Error('account name is not available.');
        }
      });      
    }
  }

  /**
   * Creates an FDS account with associated ENS name and stores the account info in localstorage.
   * @createSubdomain
   */ 
  createSubdomain(subdomain, password, feedbackMessageCallback){
    console.time('create wallet')
    return new Promise((resolve, reject)=>{
      let dw = new Wallet(); 
      console.timeEnd('create wallet')
      resolve(dw.generate(password));
    }).then((wallet)=>{
      let address = "0x" + wallet.walletV3.address;
      return this.registerSubdomainToAddress(
        subdomain, 
        address,
        wallet,
        feedbackMessageCallback
      ).then(()=>{
        return wallet;
      });
    });
  }

  registerSubdomainToAddress(subdomain, address, wallet, feedbackMessageCallback = false){
    if(feedbackMessageCallback) feedbackMessageCallback('verifying subdomain, waiting for node...');    
    this.registerSubdomainToAddressState = 0;
    console.time('registered subdomain');
    return this.ENS.getSubdomainAvailiability(subdomain).then((availability)=>{
      if(availability){
        feedbackMessageCallback('gifting you eth to cover your gas costs! ❤');
        this.faucet.gimmie(address).then((hash)=>{
          console.log('gimmie complete tx: '+hash);
        }).catch((error)=>{
          console.log('gimmie errored: '+error);
        });

        return this.ensureHasBalance(address).then((balance)=>{
          feedbackMessageCallback('registering subdomain...');
          return this.web3.eth.getTransactionCount(wallet.wallet.getAddressString()).then((nonce) => {
            this.ENS.registerSubdomain(subdomain, wallet, nonce).then((hash)=>{
              feedbackMessageCallback('setting resolver...');
            });
            nonce = nonce + 1;
            this.ENS.setResolver(subdomain, wallet, nonce).then((hash)=>{
              feedbackMessageCallback('setting address...');
            });
            nonce = nonce + 1;
            this.ENS.setAddr(subdomain, address, wallet, nonce).then((hash)=>{ 
              feedbackMessageCallback('setting public key...');
            });
            nonce = nonce + 1;
            this.ENS.setPubKey(subdomain, wallet, nonce).then((response)=>{
              feedbackMessageCallback('deploying mailbox contract')
              return response;
            });
            nonce = nonce + 1;
            return this.Mailbox.deployMailbox(wallet, nonce).then((response)=>{
              feedbackMessageCallback('deploying mailbox contract')
              nonce = nonce + 1;
              return this.ENS.setMultihash(subdomain, response.contractAddress, wallet, nonce);
            }).then((response)=>{
              console.timeEnd('registered subdomain')
              return response;
            });
          });
        });
      }else{
        return false;
      }
    });

  }  

  ensureHasBalance(address){
    let intervalTime = 2000;
    let tries = 200;

    return new Promise((resolve, reject) => {
      let i = 0;
      let interval = setInterval(()=>{
        i++;
        this.web3.eth.getBalance(address).then((balance)=>{
          console.log(i+ "/ checking: "+address+" balance: "+balance);
          if(i > tries){
            clearInterval(interval);            
            reject(false);
            return;
          }
          if(parseInt(balance) > 0){
            clearInterval(interval);
            resolve(true);
          }
        });
      }, intervalTime);
    });
  }

  get(subdomain){
    let user = this.UserStore.get(subdomain);
    if(user === false){
      throw new Error(`${subdomain} account does not exist locally, please import it.`)
    }
    return user;
  }

  // unlock
  unlock(subdomain, password){
    let user = this.get(subdomain);
    let wallet = new Wallet();
    return wallet.fromJSON(user.wallet, password).then((wallet)=>{
      user.address = wallet.getAddressString();
      user.publicKey = wallet.getPublicKeyString();
      user.privateKey =  wallet.getPrivateKeyString();
      return user;
    });  
  }
  
  //restore
  restore(subdomain, walletJSONString){
    return this.UserStore.restore(subdomain, walletJSONString);
  }

  delete(subdomain){
    return this.UserStore.delete(subdomain);
  }

  restoreFromFile(file){
    var match = file.name.match(/fairdrop-wallet-(.*)-backup/);
    if(match.length === 2){
      var subdomain = match[1];
    }else{
      throw new Error('file name should be in the format fairdrop-wallet-subdomain-backup')
    }
    return Utils.fileToString(file).then((walletJSON) => {
      this.restore(subdomain, walletJSON);
    });
  }

  // check to see if name conforms to subdomain restrictions
  isMailboxNameValid(mailboxName){
    if(mailboxName === undefined || mailboxName === false) return false;
    let pattern = /^[a-zA-Z0-9_-]*$/
    let matches = mailboxName.match(pattern)
    if(
      mailboxName.length < 23 && 
      mailboxName.length > 3 && 
      matches !== null && 
      matches.length > 0
    ){
      return true;      
    }else{
      return false;
    }
  }

  isMailboxNameAvailable(mailboxName){
    return this.ENS.getSubdomainAvailiability(mailboxName);
  }

}

module.exports = Accounts;
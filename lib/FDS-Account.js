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

/* manages user objects
 * 
 */ 

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
let Tx = require('./FDS-Tx');

let Multibox = require('./FDS-Multibox.js');
let ENS2 = require('./FDS-ENS2.js');

let namehash = require('eth-ens-namehash');

class Accounts {

    /**
     * Constructs account
     * @param {any} config settings 
     */
    constructor(config) {

        this.config = config;

        this.ENS = new ENS(config);

        this.Mailbox = new Mailbox(config);

        this.UserStore = new UserStore(config, this);
        this.Store = new Swarm(config, this);


        this.SwarmStore = new SwarmStore(config, this);
        this.Mail = new Mail(config, this);

        this.Tx = new Tx(config, this);

        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout));
        this.faucet = new Faucet(config.faucetAddress);
    }

    /** 
     * @returns {any} all Users 
     */
    getAll() {
        return this.UserStore.getAll();
    }

    /**
     * Check if mailbox is valid
     * @isMailboxNameValid
     * check to see if name conforms to subdomain restrictions
     * @param {any} mailboxName name
     * @returns {boolean} is mailbox valid
     */
    isMailboxNameValid(mailboxName) {
        if (mailboxName === undefined || mailboxName === false) return false;
        let pattern = /^[a-zA-Z0-9_-]*$/;
        let matches = mailboxName.match(pattern);
        if (
            mailboxName.length < 83 &&
            mailboxName.length > 3 &&
            matches !== null &&
            matches.length > 0
        ) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Check if mailbox name is available
     * @isMailboxNameAvailable
     * @param {any} mailboxName name
     * @returns {boolean} is subdomain available
     */
    isMailboxNameAvailable(mailboxName) {
        return this.ENS.getSubdomainAvailiability(mailboxName);
    }    

    /**
     * Creates an FDS account with associated ENS name and stores the account info in localstorage.
     * @createSubdomain
     * @param {string} subdomain name
     * @param {string} password password
     * @param {any} feedbackMessageCallback callback
     * @returns {Promise} promise
     */
    createWallet(password) {
        let dw = new Wallet();
        return dw.generate(password);
    }

    async createAndStoreAccount(password){
        let wallet = await this.createWallet(password);
        let user = await this.UserStore.addUser(wallet.walletV3);
        return this.unlockByAddress(user.wallet.address, password);
    }

    async deployMultibox(user){
        return new Multibox(user, this.config).deploy();
    }

    async addENS(user, subdomain){
        let ENS = new ENS2(user, this.config.ensConfig);
        let registerSubdomain = await ENS.registerSubdomain(subdomain);
        let setResolver = await ENS.setResolver(subdomain);
        let setAddr = await ENS.setAddr(subdomain);
        let setPubKey = await ENS.setPubkey(subdomain);
        return true;
    }    

    // creates account with ENS and multibox
    async create(subdomain, password, feedbackMessageCallback){
        let isValid = this.isMailboxNameValid(subdomain);
        if (isValid === false) {
            throw new Error('account name is not valid.');
        } else {
            let isAvailable = await this.isMailboxNameAvailable(subdomain);
            if(isAvailable === true){
                let user = await this.createAndStoreAccount(password);
                try {
                    let fund = await this.faucet.gimmie('0x'+user.wallet.address);
                }
                catch {
                    throw new Error('could not fund account');
                }
                let mb = await this.deployMultibox(user);

                await mb.createPath('/shared/mail');
                await mb.set('/shared/mail/newsender', "0xd4ca3ec1a422fd14db8975b6255d0e8d53830e562feda4b79936c689b3bc63a8", "0xd4ca3ec1a422fd14db8975b6255d0e8d53830e562feda4b79936c689b3bc63a9");
                let value = await mb.get('/shared/mail/newsender', "0xd4ca3ec1a422fd14db8975b6255d0e8d53830e562feda4b79936c689b3bc63a8");
                console.log('v', value);
                let v = await mb.retrievePathValues('/shared');
                console.log('vs', v);
                let v2 = await mb.retrievePathValues('/shared/mail/newsender');
                console.log('vs', v2);


                debugger
                let ens = await this.addENS(user, subdomain);
                let initContacts = await this.SwarmStore.initContacts(user);       
                let initStored = await this.SwarmStore.initStored(user);

                return user;
            }else{
                throw new Error('account name is not available.');
            }
        }
    }







    /**
     * Creates an FDS account with associated ENS name and stores the account info in localstorage.
     * @createAccount
     * @param {string} subdomain name
     * @param {string} password to unlock
     * @param {any} feedbackMessageCallback callback
     * @returns {promise} outcome of attempt to create account, Account object or error.
     */
    // create(subdomain, password, feedbackMessageCallback) {
    //     let unlockedAccount;
    //     if (this.isMailboxNameValid(subdomain) === false) {
    //         return Promise.reject('account name is not valid.');
    //     } else {
    //         return this.isMailboxNameAvailable(subdomain).then((response) => {
    //             if (response === true) {
    //                 return this.createSubdomain(subdomain, password, feedbackMessageCallback).then((wallet) => {
    //                     return this.UserStore.addUser(wallet.walletV3, subdomain);
    //                 }).then(() => {
    //                     return this.unlock(subdomain, password);
    //                 }).then((account) => {
    //                     unlockedAccount = account;
    //                     return this.SwarmStore.initStored(unlockedAccount);
    //                 }).then(() => {
    //                     return this.SwarmStore.initContacts(unlockedAccount);
    //                 }).then(() => {
    //                     return unlockedAccount;
    //                 });
    //             } else {
    //                 throw new Error('account name is not available.');
    //             }
    //         });
    //     }
    // }

    /**
     * Creates an FDS account with associated ENS name and stores the account info in localstorage.
     * @createSubdomain
     * @param {string} subdomain name
     * @param {string} password password
     * @param {any} feedbackMessageCallback callback
     * @returns {Promise} promise
     */
    // createSubdomain(subdomain, password, feedbackMessageCallback) {
    //     return new Promise((resolve, reject) => {
    //         let dw = new Wallet();
    //         resolve(dw.generate(password));
    //     }).then((wallet) => {
    //         let address = "0x" + wallet.walletV3.address;
    //         return this.registerSubdomainToAddress(
    //             subdomain,
    //             address,
    //             wallet,
    //             feedbackMessageCallback
    //         ).then(() => {
    //             return wallet;
    //         });
    //     });
    // }

    /**
     * Register subdomain to address
     * @registerSubdomainToAddress
     * @param {string} subdomain name
     * @param {string} address account
     * @param {string} wallet wallet
     * @param {any} feedbackMessageCallback callback
     * @returns {bool} success
     */
    // async registerSubdomainToAddress(subdomain, address, wallet, feedbackMessageCallback = false)  {
    //     if (feedbackMessageCallback) feedbackMessageCallback('verifying subdomain, waiting for node...');
    //     this.registerSubdomainToAddressState = 0;

    //     console.time('registered subdomain');
    //     return this.ENS.getSubdomainAvailiability(subdomain).then((availability) => {
    //         if (availability) {
    //             feedbackMessageCallback('gifting you eth to cover your gas costs! ❤');
    //             this.faucet.gimmie(address).then((hash) => {
    //                 console.log('gimmie complete tx: ' + hash);
    //             }).catch((error) => {
    //                 console.log('gimmie errored: ' + error);
    //                 });


    //             return this.ensureHasBalance(address).then((balance) => {
    //                 feedbackMessageCallback('registering subdomain...');
    //                 return this.web3.eth.getTransactionCount(wallet.wallet.getAddressString()).then((nonce) => {
    //                     this.ENS.registerSubdomain(subdomain, wallet, nonce).then((hash) => {
    //                         feedbackMessageCallback('setting resolver...');
    //                     });
    //                     nonce = nonce + 1;
    //                     this.ENS.setResolver(subdomain, wallet, nonce).then((hash) => {
    //                         feedbackMessageCallback('setting address...');
    //                     });
    //                     nonce = nonce + 1;
    //                     this.ENS.setAddr(subdomain, address, wallet, nonce).then((hash) => {
    //                         feedbackMessageCallback('setting public key...');
    //                     });
    //                     nonce = nonce + 1;
    //                     this.ENS.setPubKey(subdomain, wallet, nonce).then((response) => {
    //                         feedbackMessageCallback('deploying mailbox contract...');
    //                         return response;
    //                     });
    //                     nonce = nonce + 1;
    //                     return this.Mailbox.deployMailbox(wallet, nonce).then((response) => {
    //                         feedbackMessageCallback('setting multihash...');
    //                         nonce = nonce + 1;
    //                         return this.ENS.setMultihash(subdomain, response.contractAddress, wallet, nonce);
    //                     }).then((response) => {
    //                         feedbackMessageCallback('subdomain registered...');
    //                         console.timeEnd('registered subdomain');
    //                         return response;
    //                     });
    //                 });
    //             });
    //         } else {
    //             return false;
    //         }
    //     });
        
    // }

    /**
     * Ensure address has enough balance
     * @ensureHasBalance
     * @param {string} address to check
     * @returns {void} 
     */
    // async ensureHasBalance(address) {
    //     let intervalTime = 2000;
    //     let tries = 200;

    //     return new Promise((resolve, reject) => {
    //         let i = 0;
    //         let interval = setInterval(() => {
    //             i++;
    //             this.web3.eth.getBalance(address).then((balance) => {
    //                 console.log(i + "/ checking: " + address + " balance: " + balance);
    //                 if (i > tries) {
    //                     clearInterval(interval);
    //                     reject(false);
    //                     return;
    //                 }
    //                 if (parseInt(balance) > 0) {
    //                     clearInterval(interval);
    //                     resolve(true);
    //                 }
    //             });
    //         }, intervalTime);
    //     });
    // }

    /**
     * Gets subdomina 
     * @get
     * @param {any} subdomain name
     * @returns {User} User 
     */
    get(subdomain) {
        let user = this.UserStore.get(subdomain);
        if (user === false) {
            throw new Error(`${subdomain} account does not exist locally, please import it.`);
        }
        return user;
    }


    /**
     * Unlock subdomain
     * @unlock
     * @param {any} subdomain name
     * @param {any} password to use
     * @returns {User} user
     */
    async unlockByAddress(address, password) {
        let user = this.UserStore.getByAddress(address);

        await user.syncNonce();

        if (user === false) {
            throw new Error(`${address} account does not exist locally, please import it.`);
        }
        let wallet = new Wallet();
        return wallet.fromJSON(user.wallet, password).then((wallet) => {
            user.address = wallet.getAddressString();
            user.publicKey = wallet.getPublicKeyString();
            user.privateKey = wallet.getPrivateKeyString();
            return user;
        });
    }

    /**
     * Unlock subdomain
     * @unlock
     * @param {any} subdomain name
     * @param {any} password to use
     * @returns {User} user
     */
    async unlock(subdomain, password) {
        let user = this.get(subdomain);

        await user.syncNonce();

        let wallet = new Wallet();
        return wallet.fromJSON(user.wallet, password).then((wallet) => {
            user.address = wallet.getAddressString();
            user.publicKey = wallet.getPublicKeyString();
            user.privateKey = wallet.getPrivateKeyString();
            return user;
        });
    }

    /**
     * Restore wallet from JSON
     * @restore    
     * @param {string} subdomain name
     * @param {string} walletJSONString json
     * @returns {User} user
     */
    restore(subdomain, walletJSONString) {
        return this.UserStore.restore(subdomain, walletJSONString);
    }

    /**
     * Restore from private key 
     * @param {any} subdomain domain to use 
     * @param {any} password password to use 
     * @param {any} privateKey  private key without 0x
     * returns {any} stored wallet 
     */
    restoreFromPrivateKey(subdomain, password, privateKey) {
        return new Wallet().encrypt(privateKey, password).then((walletJSONString) => {
            return this.UserStore.restore(subdomain, walletJSONString);
        });
    }
    
    /**
     * delete subdomain
     * @delete
     * @param {any} subdomain name
     * @returns {void}
     */
    delete(subdomain) {
        return this.UserStore.delete(subdomain);
    }

    /**
     * Restore wallet from file
     * @restoreFromFile
     * @param {string} file to restore
     * @returns {any} restored wallet
     */
    restoreFromFile(file) {
        var match = file.name.match(/fairdrop-wallet-(.*)-backup/);
        if (match.length === 2) {
            var subdomain = match[1];
        } else {
            throw new Error('file name should be in the format fairdrop-wallet-subdomain-backup');
        }
        return Utils.fileToString(file).then((walletJSON) => {
            this.restore(subdomain, walletJSON);
        });
    }

}

module.exports = Accounts;
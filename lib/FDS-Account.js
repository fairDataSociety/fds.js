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

let Trace = require('./FDS-Trace');

let namehash = require('eth-ens-namehash');

class Accounts {

    /**
     * Constructs account
     * @param {any} config settings 
     */
    constructor(config) {

        this.config = config;

        this.ENS = new ENS(config);

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

    async createAndStoreAccount(subdomain, password, feedbackMessageCallback){
        feedbackMessageCallback('creating wallet')
        let wallet = await this.createWallet(password);
        feedbackMessageCallback('storing user')
        let user = await this.UserStore.addUser(wallet.walletV3, subdomain);
        return this.unlockByAddress(user.wallet.address, password);
    }

    async deployMultibox(user){
        return new Multibox(user, this.config).deploy();
    }

    async addENS(user, subdomain, multihash = false){
        let confirmPk = false;
        if(multihash === false){
            confirmPk = true;
        }
        let ENS = new ENS2(user, this.config.ensConfig);
        await ENS.registerSubdomain(subdomain);
        await ENS.setResolver(subdomain);
        await ENS.setAddr(subdomain);
        await ENS.setPubkey(subdomain, confirmPk);
        if(multihash !== false){
            await ENS.setMultihash(subdomain, multihash, true);
        }
        return true;
    }    

    // creates account with ENS and multibox
    async create(subdomain, password, feedbackMessageCallback){
        let isValid = this.isMailboxNameValid(subdomain);
        if (isValid === false) {
            throw new Error('account name is not valid.');
        } else {
            Trace.time(`creating account ${subdomain}`);
            feedbackMessageCallback('checking mailbox name is available');
            let isAvailable = await this.isMailboxNameAvailable(subdomain);

            feedbackMessageCallback('mailbox name is available, creating account');
            if(isAvailable === true){
                let user = await this.createAndStoreAccount(subdomain, password, feedbackMessageCallback);

                let tokenName = this.config.tokenName;
                feedbackMessageCallback(`account created, gifting you ${tokenName}! ❤`);
                try {
                    let fund = await this.faucet.gimmie('0x'+user.wallet.address);
                }
                catch(error){
                    throw new Error('could not fund account');
                }
                feedbackMessageCallback('deploying multibox');
                let mb = await this.deployMultibox(user);

                feedbackMessageCallback('creating inbox');
                await mb.createPath('/shared/mail');

                feedbackMessageCallback('creating ENS subdomain');
                await this.addENS(user, subdomain, mb.contractAddress);

                feedbackMessageCallback('initialising storage');
                await this.SwarmStore.initContacts(user);
                await this.SwarmStore.initStored(user);

                // console.timeEnd(`creating account ${subdomain}`);

                feedbackMessageCallback(`created account ${subdomain} with ENS and multibox!`);
                return user;
            }else{
                throw new Error('account name is not available.');
            }
        }
    }

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
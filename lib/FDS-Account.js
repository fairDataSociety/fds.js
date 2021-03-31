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

import UserStore from './FDS-UserStore.js';
import Wallet from './FDS-Wallet';
import Utils from './FDS-Utils.js';
import Crypto from './FDS-Crypto.js';
import Mail from './FDS-Mail.js';
import Swarm from './FDS-Swarm.js';
import SwarmStore from './FDS-SwarmStore.js';
import Faucet from './FDS-Faucet';
import Tx from './FDS-Tx';

import ENSRegistryContract from './abi/ENSRegistry.json';

import Multibox from './FDS-Multibox.js';
import ENS2 from './FDS-ENS2.js';

import Trace from './FDS-Trace';

import namehash from 'eth-ens-namehash';

class FDSAccount {

    /**
     * Constructs account
     * @param {any} config settings 
     */
    constructor(config) {

        this.config = config;

        this.UserStore = new UserStore(config, this);
        this.Store = new Swarm(config, this);


        this.SwarmStore = new SwarmStore(config, this);
        this.Mail = new Mail(config, this);

        this.Tx = new Tx(config, this);

        this.web3 = this.config.web3;
        this.faucet = new Faucet(config.faucetAddress);
    }

    /** 
     * @returns {any} all Users 
     */
    getAll(walletVersion) {
        return this.UserStore.getAll(walletVersion);
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
        let pattern = /^[a-z0-9_-]*$/;
        let matches = mailboxName.match(pattern);
        let pattern2 = /^[A-Z]*$/;
        let matches2 = mailboxName.match(pattern2);        
        if (
            mailboxName.length < 83 &&
            mailboxName.length > 3 &&
            matches !== null &&
            matches.length > 0 &&
            matches2 === null
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
    async isMailboxNameAvailable(subdomain) {
        let node = namehash.hash(subdomain + '.' + this.config.ensConfig.domain);

        //no account exists at this point, so can't use the FDSContract instance
        let ENS = this.Tx.getContract(false, ENSRegistryContract.abi, this.config.ensConfig.registryAddress);

        let owner = await ENS.call('owner', [node]);

        return owner === '0x0000000000000000000000000000000000000000';
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

    async getMultibox(user, subdomain){
        let ENS = new ENS2(user, this.config.ensConfig);        
        let multiboxAddress = await ENS.getMultihash(subdomain);
        return new Multibox(user, this.config).at(multiboxAddress);
    }


    async addENS(user, subdomain, multihash) { //, multihash = false){
        let confirmPk = false;
        if(multihash === false){
            confirmPk = true;
        }
        let ENS = new ENS2(user, this.config.ensConfig);
        await ENS.registerSubdomain(subdomain);
        await ENS.setResolver(subdomain); //

        let content = '0x0000000000000000000000000000000000000000000000000000000000000000';
        let name = 'subdomain-hidden';

        await ENS.setAll(subdomain, content, multihash, name, true);
        return true;
    }    

    // creates account with ENS and multibox
    async create(subdomain, password, feedbackMessageCallback){
        Trace.time(`created account ${subdomain}`);
        let isValid = this.isMailboxNameValid(subdomain);
        if (isValid === false) {
            throw new Error('account name is not valid.');
        } else {
            Trace.time(`creating account ${subdomain}`);
            feedbackMessageCallback('checking mailbox name is available');
            let isAvailable = await this.isMailboxNameAvailable(subdomain);

            feedbackMessageCallback('mailbox name is available, creating account');
            if(isAvailable === true){
                let mb;
                
                let user = await this.createAndStoreAccount(subdomain, password, feedbackMessageCallback);

                let tokenName = this.config.tokenName;

                try {
                    feedbackMessageCallback(`account created, gifting you ${tokenName}! ❤`);                    
                    let fund = await this.faucet.gimmie('0x'+user.wallet.address);
                }
                catch(error){
                    await this.UserStore.delete(subdomain);
                    throw new Error('could not fund account');
                }

                try {                
                    feedbackMessageCallback('deploying multibox');
                    mb = await this.deployMultibox(user);
                }
                catch(error){
                    await this.UserStore.delete(subdomain);
                    throw new Error('could not deploy multibox');
                }

                // try {                
                //     feedbackMessageCallback('creating inbox');
                //     await mb.createPath('/shared/mail');
                // }
                // catch(error){
                //     throw new Error('could not create inbox');
                // }

                // try {                
                    feedbackMessageCallback('creating ENS subdomain');
                    await this.addENS(user, subdomain, mb.contractAddress);
                // }
                // catch(error){
                //     await this.UserStore.delete(subdomain);
                //     throw new Error('could not create ENS subdomain');
                // }

                // try {                
                    feedbackMessageCallback('initialising storage');
                    await this.SwarmStore.initContacts(user);
                    await this.SwarmStore.initStored(user);
                // }
                // catch(error){
                //     throw new Error('could not initialising storage');
                // }

                Trace.timeEnd(`created account ${subdomain}`);

                feedbackMessageCallback(`created account ${subdomain}`);
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
    async ensureHasBalance(address) {
        let intervalTime = 2000;
        let tries = 200;

        return new Promise((resolve, reject) => {
            let i = 0;
            let interval = setInterval(() => {
                i++;
                this.web3.eth.getBalance(address).then((balance) => {
                    console.log(i + "/ checking: " + address + " balance: " + balance);
                    if (i > tries) {
                        clearInterval(interval);
                        reject(false);
                        return;
                    }
                    if (parseInt(balance) > 0) {
                        clearInterval(interval);
                        resolve(true);
                    }
                });
            }, intervalTime);
        });
    }

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
            user.address = wallet.address;
            user.publicKey = wallet.publicKey;
            user.privateKey = wallet.privateKey;
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
            user.address = wallet.address;
            user.publicKey = wallet.publicKey;
            user.privateKey = wallet.privateKey;
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
            this.UserStore.restore(subdomain, walletJSONString);
            return this.unlock(subdomain, password);
        });
    }

    /**
     * Restore wallet from file
     * @restoreFromFile
     * @param {string} file to restore
     * @returns {any} restored wallet
     */
    restoreFromFile(file) {
        var match = file.name.match(/fds-wallet-(.*)-backup/);
        if (match.length === 2) {
            var subdomain = match[1];
        } else {
            throw new Error('file name should be in the format fds-wallet-subdomain-backup');
        }
        return Utils.fileToString(file).then((walletJSON) => {
            this.restore(subdomain, walletJSON);
        });
    }

    delete(subdomain){
        return this.UserStore.delete(subdomain);
    }

}

export default FDSAccount;
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

class Accounts {

    /**
     * Constructs account
     * @param {any} config settings 
     */
    constructor(config) {
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
     * Creates an FDS account with associated ENS name and stores the account info in localstorage.
     * @createAccount
     * @param {string} subdomain name
     * @param {string} password to unlock
     * @param {any} feedbackMessageCallback callback
     * @returns {promise} outcome of attempt to create account, Account object or error.
     */
    create(subdomain, password, feedbackMessageCallback) {
        let unlockedAccount;
        if (this.isMailboxNameValid(subdomain) === false) {
            return Promise.reject('account name is not valid.');
        } else {
            return this.isMailboxNameAvailable(subdomain).then((response) => {
                if (response === true) {
                    return this.createSubdomain(subdomain, password, feedbackMessageCallback).then((wallet) => {
                        return this.UserStore.addUser(subdomain, wallet.walletV3);
                    }).then(() => {
                        return this.unlock(subdomain, password);
                    }).then((account) => {
                        unlockedAccount = account;
                        return this.SwarmStore.initStored(unlockedAccount);
                    }).then(() => {
                        return this.SwarmStore.initContacts(unlockedAccount);
                    }).then(() => {
                        return unlockedAccount;
                    });
                } else {
                    throw new Error('account name is not available.');
                }
            });
        }
    }

    /**
     * Creates an FDS account with associated ENS name and stores the account info in localstorage.
     * @createSubdomain
     * @param {string} subdomain name
     * @param {string} password password
     * @param {any} feedbackMessageCallback callback
     * @returns {Promise} promise
     */
    createSubdomain(subdomain, password, feedbackMessageCallback) {
        console.time('create wallet');
        return new Promise((resolve, reject) => {
            let dw = new Wallet();
            console.timeEnd('create wallet');
            resolve(dw.generate(password));
        }).then((wallet) => {
            let address = "0x" + wallet.walletV3.address;
            return this.registerSubdomainToAddress(
                subdomain,
                address,
                wallet,
                feedbackMessageCallback
            ).then(() => {
                return wallet;
            });
        });
    }

    /**
     * Register subdomain to address
     * @registerSubdomainToAddress
     * @param {string} subdomain name
     * @param {string} address account
     * @param {string} wallet wallet
     * @param {any} feedbackMessageCallback callback
     * @returns {bool} success
     */
    async registerSubdomainToAddress(subdomain, address, wallet, feedbackMessageCallback = false)  {
        if (feedbackMessageCallback) feedbackMessageCallback('verifying subdomain, waiting for node...');
        this.registerSubdomainToAddressState = 0;

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // rewrote this to use await 
        // let availability = await this.ENS.getSubdomainAvailiability(subdomain); 
        // if (!availability) {
        //     feedbackMessageCallback('subdomain not available');
        //     return false; 
        // }
            
        // feedbackMessageCallback('gifting you eth to cover your gas costs! ❤');
        // try {

        //     let gimmeEth = await this.faucet.gimmie(address);

        //     // TODO add error handling
        //     let hasBalance = await this.ensureHasBalance(address);
        //     console.log('registering subdomain...');
        //     let nonce = await this.web3.eth.getTransactionCount(wallet.wallet.getAddressString());
        //     console.log('setting subdomain...' + nonce);

        //     let regSubDomain = await this.ENS.registerSubdomain(subdomain, wallet, nonce++);
        //     feedbackMessageCallback('setting resolver...');
        //     let setResolver = await this.ENS.setResolver(subdomain, wallet, nonce++);
        //     feedbackMessageCallback('setting address...');
        //     let setAddress = await this.ENS.setAddr(subdomain, address, wallet, nonce++);
        //     feedbackMessageCallback('setting pubkey...');
        //     let setPubKey = await this.ENS.setPubKey(subdomain, wallet, nonce++);
        //     feedbackMessageCallback('setting mailbox...');
        //     let mailbox = await this.Mailbox.deployMailbox(wallet, nonce++);
        //     feedbackMessageCallback('setting multihash...');
        //     let multiHash = await this.ENS.setMultihash(subdomain, mailbox.contractAddress, wallet, nonce++);

        //     feedbackMessageCallback('completed...');
        //     return multiHash;
        // }
        // catch (err) {
        //     feedbackMessageCallback(err);
        //     console.error(err);
        // }
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        
        console.time('registered subdomain');
        return this.ENS.getSubdomainAvailiability(subdomain).then((availability) => {
            if (availability) {
                feedbackMessageCallback('gifting you eth to cover your gas costs! ❤');
                this.faucet.gimmie(address).then((hash) => {
                    console.log('gimmie complete tx: ' + hash);
                }).catch((error) => {
                    console.log('gimmie errored: ' + error);
                    });


                return this.ensureHasBalance(address).then((balance) => {
                    feedbackMessageCallback('registering subdomain...');
                    return this.web3.eth.getTransactionCount(wallet.wallet.getAddressString()).then((nonce) => {
                        this.ENS.registerSubdomain(subdomain, wallet, nonce).then((hash) => {
                            feedbackMessageCallback('setting resolver...');
                        });
                        nonce = nonce + 1;
                        this.ENS.setResolver(subdomain, wallet, nonce).then((hash) => {
                            feedbackMessageCallback('setting address...');
                        });
                        nonce = nonce + 1;
                        this.ENS.setAddr(subdomain, address, wallet, nonce).then((hash) => {
                            feedbackMessageCallback('setting public key...');
                        });
                        nonce = nonce + 1;
                        this.ENS.setPubKey(subdomain, wallet, nonce).then((response) => {
                            feedbackMessageCallback('deploying mailbox contract...');
                            return response;
                        });
                        nonce = nonce + 1;
                        return this.Mailbox.deployMailbox(wallet, nonce).then((response) => {
                            feedbackMessageCallback('setting multihash...');
                            nonce = nonce + 1;
                            return this.ENS.setMultihash(subdomain, response.contractAddress, wallet, nonce);
                        }).then((response) => {
                            feedbackMessageCallback('subdomain registered...');
                            console.timeEnd('registered subdomain');
                            return response;
                        });
                    });
                });
            } else {
                return false;
            }
        });
        
    }

    /**
     * Ensure address has enough balance
     * @ensureHasBalance
     * @param {string} address to check
     * @returns {void} 
     */
    ensureHasBalance(address) {
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
    unlock(subdomain, password) {
        let user = this.get(subdomain);
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
            mailboxName.length < 23 &&
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

}

module.exports = Accounts;
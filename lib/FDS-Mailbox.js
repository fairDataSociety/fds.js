// mailbox smart contracts

let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let MailboxContract = require('../abi/MailboxContract.json');

let httpTimeout = 2000;

class Mailbox {

    constructor(config) {

        this.config = config;

        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, httpTimeout));

        this.gasPrice = this.web3.utils.toWei(config.gasPrice.toString(), 'gwei');

    }
    /**
     * encode feed locatio hash
     * @param {any} senderAddress address
     * @param {any} recipientNamehash recepient hash 
     * @returns {any} encoded sender and recipient hash
     */
    encodeFeedLocationHash(senderAddress, recipientNamehash) {
        return senderAddress + recipientNamehash.substr(42, 66);
    }
    /**
     * subdomain name hash to feed location hash
     * @param {any} recipientNamehash hash of recipient name
     * @returns {any} substring of recepient name hash that is feed location hash
     */
    subdomainNameHashToFeedLocationHash(recipientNamehash) {
        return recipientNamehash.substr(42, 66);
    }
    /**
     * Decode feed location
     * @param {any} feedLocationHash hash of feed location
     * @returns {any} object with address and topic
     */
    decodeFeedLocationHash(feedLocationHash) {
        return {
            address: feedLocationHash.substring(0, 42),
            topic: feedLocationHash.substr(42, 66)
        };
    }

    /**
     * deploy mailbox
     * @param {any} wallet wallet 
     * @param {number} nonce number
     * @returns {TransactionReceipt} transactio receipt
     */
    deployMailbox(wallet, nonce) {
        let contract = new this.web3.eth.Contract(MailboxContract.abi);
        let dataTx = contract.deploy({ data: MailboxContract.bytecode }).encodeABI();
        let privateKey = wallet.wallet.getPrivateKeyString();
        let tx = {
            from: wallet.wallet.getAddressString(),
            data: dataTx,
            gas: 1500000,
            gasPrice: this.gasPrice,
            nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    return hash;
                });
        });
    }

    /**
     * create new request
     * @param {any} senderAccount account 
     * @param {any} recipientSubdomain name
     * @param {any} mailboxAddress address
     * @param {any} feedLocationHash hash
     * @returns {TransactionReceipt} transactio receipt
     */
    newRequest(senderAccount, recipientSubdomain, mailboxAddress, feedLocationHash) {
        let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);
        let recipientNamehash = namehash.hash(senderAccount.subdomain + '.' + this.config.ensConfig.domain);
        let dataTx = recipientMailboxContract.methods.newRequest(
            recipientNamehash,
            feedLocationHash
        ).encodeABI();
        let privateKey = senderAccount.privateKey;
        let tx = {
            from: senderAccount.address,
            to: mailboxAddress,
            data: dataTx,
            gas: 510000,
            gasPrice: this.gasPrice
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    return hash;
                });
        });
    }

    /**
     * Get raw requests 
     * @param {any} namehash hash 
     * @param {any} mailboxAddress address
     * @returns {TransactionObject} transaction 
     */
    getRequestRaw(namehash, mailboxAddress) {
        let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);
        return recipientMailboxContract.methods
            .getRequest(namehash)
            .call();
    }

    /**
     * get requests from subdomain and address 
     * @param {any} subdomain name
     * @param {any} mailboxAddress address
     * @returns {any} raw requestss
     */
    getRequest(subdomain, mailboxAddress) {
        let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);
        return this.getRequestRaw(namehash.hash(subdomain + '.' + this.config.ensConfig.domain), mailboxAddress);
    }

    /**
     * Get requests to mailbox
     * @param {any} mailboxAddress address
     * @returns {any} requests
     */
    getRequests(mailboxAddress) {
        let recipientMailboxContract = new this.web3.eth.Contract(MailboxContract.abi, mailboxAddress);
        return recipientMailboxContract.methods
            .getRequests()
            .call();
    }

}

module.exports = Mailbox;
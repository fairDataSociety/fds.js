let Web3 = require('web3');

class Tx {

    constructor(config, account) {
        this.account = account;
        this.config = config;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout));
    }

    /**
     * 
     * @param {any} account to send from
     * @param {any} toAddress 0xfff
     * @param {any} amount in eth
     * @param {any} transactionCallback callback
     * @param {any} transactionSignedCallback callback
     * @returns {any} transaction
     */
    sendTokens(account, toAddress, amount, transactionCallback = console.log, transactionSignedCallback = console.log) {
        /*if (this.gasPrice === undefined)
        { 
            transactionCallback("something is wrong");
            console.log(this);
            return;
        }*/

        let tx = {
            from: account.address,
            to: toAddress,
            gas: 510000,
            gasPrice: this.gasPrice,
            value: Web3.utils.toWei(amount, 'ether')
        };
        transactionCallback(tx);
        return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    transactionSignedCallback(hash);
                    return hash;
                });
        });
    }    

    /**
     * Ensure address has enough balance
     * @ensureHasBalance
     * @param {string} address to check
     * @returns {void} 
     */
    getBalance(address) {
        try {
            return this.web3.eth.getBalance(address);
        } catch (error) {
            console.error("can't access gateway ", config.ethGateway);
        }
        
    }        
}

module.exports = Tx;
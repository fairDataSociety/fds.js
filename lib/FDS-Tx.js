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
     * @returns {any} transaction
     */
    sendTokens(account, toAddress, amount) {
        let tx = {
            from: account.address,
            to: toAddress,
            gas: 510000,
            gasPrice: this.gasPrice,
            value: Web3.utils.toWei(amount, 'ether')
        };
        console.log(tx)
        return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
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
        return this.web3.eth.getBalance(address);
    }        
}

module.exports = Tx;
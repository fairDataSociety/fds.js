// ens smart contract interface

let Web3 = require('web3');
let ENS = require('ethereum-ens');
let namehash = require('eth-ens-namehash');

let PublicResolverContract = require('../abi/PublicResolverContract.json');
let EnsRegistryInterface = require('../abi/EnsRegistryInterface.json');
let FIFSRegistrarInterface = require('../abi/FIFSRegistrarInterface.json');

//let MailboxContract = require('../abi/MailboxContract.json');
//let MultiboxContract = require('../abi/Multibox.json');

class FDSENS {

    constructor(config = {}) {

        this.config = config;


        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, config.httpTimeout));
        this.ens = new ENS(this.web3, config.ensConfig.registryAddress);

        this.ensRegistryContract = new this.web3.eth.Contract(EnsRegistryInterface);
        this.ensRegistryContract.options.address = config.ensConfig.registryAddress;

        this.gasPrice = this.web3.utils.toWei(config.gasPrice.toString(), 'gwei');

        if (config.ensConfig.fifsRegistrarContractAddress === undefined) throw new Error('fifsRegistrarContractAddress must be provided');

        this.fifsRegistrarContract = new this.web3.eth.Contract(FIFSRegistrarInterface, config.ensConfig.fifsRegistrarContractAddress);
        this.fifsRegistrarContractAddress = config.ensConfig.fifsRegistrarContractAddress;

        if (config.ensConfig.resolverContractAddress === undefined) throw new Error('resolverContractAddress must be provided');

        this.resolverContractAddress = config.ensConfig.resolverContractAddress;
        this.resolverContract = new this.web3.eth.Contract(PublicResolverContract.abi, config.ensConfig.resolverContractAddress);

        this.registerSubdomainToAddressState = 0;

    }

    /**
     * Check subdomain availablitily
     * @param {any} subdomain name
     * @returns {string} 0x0000000000000000000000000000000000000000 when fail
     */
    getSubdomainAvailiability(subdomain) {
        return this.ens.owner(subdomain + '.' + this.config.ensConfig.domain).then((response) => {
            return response === "0x0000000000000000000000000000000000000000";
        });
    }

    /**
     * Register subdomain
     * @param {string} subdomain name
     * @param {any} wallet to use
     * @param {number} nonce incremental
     * @returns {TransactionReceipt} transaction
     */
    registerSubdomain(subdomain, wallet, nonce) {
        let dataTx = this.fifsRegistrarContract.methods.register(this.web3.utils.sha3(subdomain), wallet.wallet.getAddressString()).encodeABI();
        let privateKey = wallet.wallet.getPrivateKeyString();
        let tx = {
            from: wallet.wallet.getAddressString(),
            to: this.fifsRegistrarContractAddress,
            data: dataTx,
            gas: 800000,
            gasPrice: this.gasPrice,
            nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('receipt', function (hash) {
                    return hash;
                });
        });
    }

    /**
     * Set resolver
     * @param {string} subdomain name
     * @param {any} wallet to use
     * @param {number} nonce to use
     * @returns {TransactionReceipt} transaction receipet
     */
    setResolver(subdomain, wallet, nonce) {
        let node = namehash.hash(subdomain + '.' + this.config.ensConfig.domain);
        let addr = this.resolverContractAddress;

        let dataTx = this.ensRegistryContract.methods.setResolver(node, addr).encodeABI();
        let privateKey = wallet.wallet.getPrivateKeyString();
        let tx = {
            from: wallet.wallet.getAddressString(),
            to: this.config.ensConfig.registryAddress,
            data: dataTx,
            gas: 510000,
            gasPrice: this.gasPrice,
            nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('receipt', function (hash) {
                    return hash;
                });
        });

    }

    /**
     * Set address 
     * @param {string} subdomain name
     * @param {any} address to use
     * @param {any} wallet to use
     * @param {number} nonce to use
     * @returns {TransactionReceipt} transaction receipt
     */
    setAddr(subdomain, address, wallet, nonce) {
        //let domain = this.config.ensConfig.domain;
        let dataTx = this.resolverContract.methods.setAddr(
            namehash.hash(subdomain + '.' + this.config.ensConfig.domain),
            address
        ).encodeABI();
        let privateKey = wallet.wallet.getPrivateKeyString();
        let tx = {
            from: wallet.wallet.getAddressString(),
            to: this.resolverContractAddress,
            data: dataTx,
            gas: 510000,
            gasPrice: this.gasPrice,
            nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('receipt', function (hash) {
                    return hash;
                });
        });

    }

    /**
     * Set publick key
     * @param {any} subdomain name
     * @param {any} wallet to use
     * @param {number} nonce to use
     * @returns {TransactionReceipt} transaction receipt
     */
    setPubKey(subdomain, wallet, nonce) {
        let publicKey = wallet.wallet.getPublicKeyString();
        let publicKeyX = publicKey.substring(0, 66);
        let publicKeyY = "0x" + publicKey.substring(66, 130);

        let dataTx = this.resolverContract.methods.setPubkey(
            namehash.hash(subdomain + '.' + this.config.ensConfig.domain),
            publicKeyX,
            publicKeyY
        ).encodeABI();
        let privateKey = wallet.wallet.getPrivateKeyString();
        let tx = {
            from: wallet.wallet.getAddressString(),
            to: this.resolverContractAddress,
            data: dataTx,
            gas: 510000,
            gasPrice: this.gasPrice,
            nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('receipt', function (hash) {
                    return hash;
                });
        });
    }

    /**
     * Set multi hash
     * @param {string} subdomain name
     * @param {any} hash to use
     * @param {any} wallet to use
     * @param {number} nonce to use
     * @returns {TransactionReceipt} transaction receipt
     */
    setMultihash(subdomain, hash, wallet, nonce) {
        let dataTx = this.resolverContract.methods.setMultihash(
            namehash.hash(subdomain + '.' + this.config.ensConfig.domain),
            hash, //using just 0x for 'id' now, later should add FDS mailbox id to this... https://github.com/multiformats/multicodec/blob/master/table.csv
        ).encodeABI();
        let privateKey = wallet.wallet.getPrivateKeyString();
        let tx = {
            from: wallet.wallet.getAddressString(),
            to: this.resolverContractAddress,
            data: dataTx,
            gas: 510000,
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


    // setSubnodeOwner(subdomain, address){
    //   return this.ens.setSubnodeOwner(
    //     subdomain + '.'+ this.options.domain,
    //     address, 
    //     {
    //       from: this.web3.eth.accounts[0],
    //     }
    //   ).then((tx) => {
    //     console.log('setting subnode owner to ' + address + ', watching...');
    //     return this.watchTx(tx);
    //   });
    // }

    /**
     * Get public key from namehash
     * @param {string} namehash name hash
     * @returns {string | boolean} returns false if invalid
     */
    getPubKeyRaw(namehash) {
        return this.resolverContract.methods
            .pubkey(namehash)
            .call()
            .then((keyCoords) => {
                let keyStr = "04" + keyCoords[0].substring(2, 66) + keyCoords[1].substring(2, 66);
                if (keyStr !== "0400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") {
                    return keyStr;
                } else {
                    return false;
                }
            });
    }

    /**
     * Get public key of subdoman
     * @param {string} subdomain name
     * @returns {string | boolean} returns false if invalid
     */
    getPubKey(subdomain) {
        return this.resolverContract.methods
            .pubkey(namehash.hash(subdomain + '.' + this.config.ensConfig.domain))
            .call()
            .then((keyCoords) => {
                let keyStr = "04" + keyCoords[0].substring(2, 66) + keyCoords[1].substring(2, 66);
                if (keyStr !== "0400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000") {
                    return keyStr;
                } else {
                    return false;
                }
            });
    }

    /**
     * Get multihash of subdomain
     * @param {string} subdomain name
     * @returns {TransactionObject} transaction object
     */
    getMultihash(subdomain) {
        return this.resolverContract.methods
            .multihash(namehash.hash(subdomain + '.' + this.config.ensConfig.domain))
            .call();
    }


}

module.exports = FDSENS;
let Web3 = require('web3');
let ENS = require('ethereum-ens');
let namehash = require('eth-ens-namehash');

let PublicResolverContract = require('../abi/PublicResolverContract.json');
let EnsRegistryInterface = require('../abi/EnsRegistryInterface.json');
let FIFSRegistrarInterface = require('../abi/FIFSRegistrarInterface.json');
let MailboxContract = require('../abi/MailboxContract.json');

let httpTimeout = 2000;

class FDSENS {

  constructor(provider, options = {}){

    this.options = options;


    this.web3 = new Web3(new Web3.providers.HttpProvider(provider, httpTimeout));
    this.ens = new ENS(this.web3, options.registryAddress);

    this.ensRegistryContract = new this.web3.eth.Contract(EnsRegistryInterface);
    this.ensRegistryContract.options.address = options.registryAddress;

    this.gasPrice = this.web3.utils.toWei('50', 'gwei');

    if(options.fifsRegistrarContractAddress === undefined) throw new Error('fifsRegistrarContractAddress must be provided');

    this.fifsRegistrarContract = new this.web3.eth.Contract(FIFSRegistrarInterface, options.fifsRegistrarContractAddress);
    this.fifsRegistrarContractAddress = options.fifsRegistrarContractAddress;

    if(options.resolverContractAddress === undefined) throw new Error('resolverContractAddress must be provided');

    this.resolverContractAddress = options.resolverContractAddress;
    this.resolverContract = new this.web3.eth.Contract(PublicResolverContract.abi, options.resolverContractAddress);

    this.registerSubdomainToAddressState = 0;

  }

  getSubdomainAvailiability(subdomain){
    return this.ens.owner(subdomain + '.'+ this.options.domain).then((response)=>{
      return response === "0x0000000000000000000000000000000000000000";
    })
  }

  registerSubdomain(subdomain, wallet, nonce){
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
        .once('receipt', function(hash){ 
          return hash;
        })
    });
  }

  setResolver(subdomain, wallet, nonce){
    let node = namehash.hash(subdomain + '.'+ this.options.domain);
    let addr = this.resolverContractAddress;

    let dataTx = this.ensRegistryContract.methods.setResolver(node, addr).encodeABI();
    let privateKey = wallet.wallet.getPrivateKeyString();
    let tx = {
      from: wallet.wallet.getAddressString(),
      to: this.options.registryAddress,
      data: dataTx,
      gas: 510000,
      gasPrice: this.gasPrice,
      nonce: nonce
    };

    return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
      return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
        .once('receipt', function(hash){ 
          return hash;
        });
    });

  }

  setAddr(subdomain, address, wallet, nonce){
    let domain = this.options.domain;
    let dataTx = this.resolverContract.methods.setAddr(
      namehash.hash(subdomain + '.'+ this.options.domain), 
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
        .once('receipt', function(hash){ 
          return hash;
        });
    });

  }

  setPubKey(subdomain, wallet, nonce){
    let publicKey = wallet.wallet.getPublicKeyString();
    let publicKeyX = publicKey.substring(0,66);
    let publicKeyY = "0x"+publicKey.substring(66,130);

    let dataTx = this.resolverContract.methods.setPubkey(
      namehash.hash(subdomain + '.'+ this.options.domain), 
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
        .once('receipt', function(hash){ 
          return hash;
        });
    });
  }

  setMultihash(subdomain, hash, wallet, nonce){
    let dataTx = this.resolverContract.methods.setMultihash(
      namehash.hash(subdomain + '.'+ this.options.domain), 
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
        .once('transactionHash', function(hash){ 
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

  getPubKey(subdomain){
    return  this.resolverContract.methods
      .pubkey(namehash.hash(subdomain + '.'+ this.options.domain))
      .call()
      .then((keyCoords)=>{
          let keyStr = "04"+keyCoords[0].substring(2,66)+keyCoords[1].substring(2,66);
          if(keyStr !== "0400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"){
            return keyStr;
          }else{
            return false;
          }
      });
  }

  getMultihash(subdomain){
    return  this.resolverContract.methods
      .multihash(namehash.hash(subdomain + '.'+ this.options.domain))
      .call();
  }  


}

module.exports = FDSENS;
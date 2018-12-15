let Web3 = require('web3');
let ENS = require('ethereum-ens');
let namehash = require('eth-ens-namehash');
let Faucet = require('./FDS-Faucet');

let PublicResolverContract = require('../abi/PublicResolver.json');
let EnsRegistryInterface = require('../abi/EnsRegistryInterface.json');

let httpTimeout = 2000;

class FDSENS {

  constructor(provider, options = {}){

    window.ens = this;

    this.options = options;

    this.faucet = new Faucet(options.faucetAddress);

    this.web3 = new Web3(new Web3.providers.HttpProvider(provider, httpTimeout));
    this.ens = new ENS(this.web3, options.registryAddress);

    this.ensRegistryContract = new this.web3.eth.Contract(EnsRegistryInterface);
    this.ensRegistryContract.options.address = options.registryAddress;

    this.gasPrice = this.web3.utils.toWei('50', 'gwei');

    if(options.fifsRegistrarContractAddress === undefined) throw new Error('fifsRegistrarContractAddress must be provided');

    let fifsRegistrarContractAbi = [{"constant":false,"inputs":[{"name":"subnode","type":"bytes32"},{"name":"owner","type":"address"}],"name":"register","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"ensAddr","type":"address"},{"name":"node","type":"bytes32"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"}];
    this.fifsRegistrarContract = new this.web3.eth.Contract(fifsRegistrarContractAbi, options.fifsRegistrarContractAddress);
    this.fifsRegistrarContractAddress = options.fifsRegistrarContractAddress;

    if(options.resolverContractAddress === undefined) throw new Error('resolverContractAddress must be provided');

    this.resolverContractAddress = options.resolverContractAddress;
    this.resolverContract = new this.web3.eth.Contract(PublicResolverContract.abi, options.resolverContractAddress);

    // window.ensRegistryContract = this.ensRegistryContract;
    // window.registrarContract = this.registrarContract;
    // window.fifsRegistrarContract =  this.fifsRegistrarContract;
    // window.resolverContract = this.resolverContract;
    // window.namehash = namehash;
    // window.web3 = this.web3;
    // window.ens = this.ens;

    this.registerSubdomainToAddressState = 0;

  }

  watchTx(hash){
    return new Promise((resolve, reject) => {
      var interval = setInterval(()=>{
        console.log('checking... ' + hash)
        try {
          let response = this.web3.eth.getTransactionReceipt(hash);
          if(response !== null){
            clearInterval(interval);
            if(response.status === '0x0'){
              console.log(response)
              throw new Error('transaction ' + response.transactionHash + ' failed!');
            }
            resolve(response);
          }
        }catch(error) {
          reject(error);
        }
      },2000);
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

  registerSubdomainToAddress(subdomain, address, wallet, feedbackMessageCallback = false){
    if(feedbackMessageCallback) feedbackMessageCallback('verifying subdomain, waiting for node...');    
    this.registerSubdomainToAddressState = 0;
    console.log('registering subdomiain, gas price: '+ this.gasPrice);
    console.time('registered subdomain');
    return this.getSubdomainAvailiability(subdomain).then((availability)=>{
      if(availability){
        feedbackMessageCallback('gifting you eth to cover your gas costs! <3 ');
        this.faucet.gimmie(address).then((hash)=>{
          console.log('gimmie complete tx: '+hash);
        }).catch((error)=>{
          console.log('gimmie errored: '+error);
        });

        return this.ensureHasBalance(address).then((balance)=>{
          feedbackMessageCallback('registering subdomain...');
          return this.web3.eth.getTransactionCount(wallet.wallet.getAddressString()).then((nonce) => {
            this.registerSubdomain(subdomain, wallet, nonce).then((hash)=>{
              feedbackMessageCallback('setting resolver...');
            });
            nonce = nonce + 1;
            this.setResolver(subdomain, wallet, nonce).then((hash)=>{
              feedbackMessageCallback('setting address...');
            });
            nonce = nonce + 1;
            this.setAddr(subdomain, address, wallet, nonce).then((hash)=>{ 
              feedbackMessageCallback('setting public key...');
            });
            nonce = nonce + 1;
            return this.setPubKey(subdomain, wallet, nonce).then((response)=>{
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
      to: this.fifsRegistrarContractAddress, //fifs registrar contract address
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
        .once('transactionHash', function(hash){ 
          console.log('t',hash)
        });
    });
  }

  setResolver(subdomain, wallet, nonce){
    let node = namehash.hash(subdomain + '.'+ this.options.domain);
    let addr = this.resolverContractAddress;

    let dataTx = this.ensRegistryContract.methods.setResolver(node, addr).encodeABI();
    let privateKey = wallet.wallet.getPrivateKeyString();
    let tx = {
      from: wallet.wallet.getAddressString(),
      to: this.options.registryAddress, //fifs registrar contract address
      data: dataTx,
      gas: 510000,
      gasPrice: this.gasPrice,
      nonce: nonce
      // nonce: 11 //tbc......
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
      to: this.resolverContractAddress, //fifs registrar contract address
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

  getPubKey(subdomain, nonce){
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

}

module.exports = FDSENS;
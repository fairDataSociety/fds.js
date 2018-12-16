let FileSaver = require('file-saver');
let Hash = require('../models/Hash.js');
let SwarmFeeds = require('swarm-feeds');

let topicName = 'fairdrop-test-3-0';

class SwarmStore {
  constructor(config, Account){
    this.config = config;
    this.Account = Account;
    this.Store = Account.Store;
    this.SF = new SwarmFeeds(config.swarmGateway);
  }

  storeFile(storerAccount, file, encryptProgressCallback, uploadProgressCallback){
    return this.Store.storeEncryptedFile(storerAccount, file, storerAccount.privateKey, encryptProgressCallback, uploadProgressCallback).then((hash)=>{
      return this.saveHash(storerAccount, hash);
    });
  }

  retrieve(storerAccount, hash, decryptProgressCallback, downloadProgressCallback){
    return this.Store.getDecryptedFile(hash, storerAccount.privateKey, decryptProgressCallback, downloadProgressCallback);
  }

  storeValue(key, value, storerAccount){
    return this.SF.set(storerAccount.address, key, storerAccount.privateKey, value);
  }

  retrieveValue(key, storerAccount){
    return this.SF.get(storerAccount.address, key);
  }

  saveHash(storerAccount, hash){
    return this.getStored('all', storerAccount).then((storedFiles)=>{
      storedFiles.push(hash.toJSON());
      return this.SF.set(storerAccount.address, topicName, storerAccount.privateKey, JSON.stringify({storedFiles: storedFiles}));
    });
  }

  getStored(query, storerAccount){
    return this.SF.get(storerAccount.address, topicName).then((response)=>{
      let storedFiles = JSON.parse(response).storedFiles;
      let storedHashes = storedFiles.map((f)=>{ return new Hash(f, storerAccount); });
      return storedHashes;
    }).catch((error)=>{
      if(error === 404){
        return [];
      }else{
        throw new Error(error);
      }
    });
  }

}

module.exports = SwarmStore;
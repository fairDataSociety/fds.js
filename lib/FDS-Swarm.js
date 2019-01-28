// store files using swarm

let Utils = require('./FDS-Utils');
let Crypto = require('./FDS-Crypto');

let Hash = require('../models/Hash.js');

class Swarm {

  constructor(config, account){
    this.config = config;
    this.account = account;
    this.gateway = config.swarmGateway;
    this.rawGateway = config.swarmGateway + '/bzz-raw:/';
  }

  storeEncryptedFile(account, file, secret, encryptedProgressCallback, uploadedProgressCallback, progressMessageCallback){
    progressMessageCallback(`encrypting`);
    return Utils.fileToBuffer(file).then((arrayBuffer) => {
      return Crypto.encryptBuffer(arrayBuffer, secret).then((encryptedBuffer)=>{
        encryptedProgressCallback(true);
        progressMessageCallback(`uploading`);
        return this.postData(encryptedBuffer, uploadedProgressCallback).then((hash)=>{
          return new Hash({
            address: hash,
            file: file,
            time: Date.now()
          }, this.account);
        }).catch((error)=>{
          throw new Error(error);
        });
      });
    });
  }

  getDecryptedFile(hash, secret, selectedMailbox, selectedWallet){
    return this.getDataFromManifest(hash.address, hash.file.name).then((retrievedFile)=>{
      let decryptedFile = Crypto.decryptedFile(retrievedFile, secret, hash.file.name, hash.file.type);
      return new File([decryptedFile], hash.file.name, {type: hash.file.type});
    });
  }

  //....

  postData(data, progressCallback, protocol = 'bzz:/'){
    return this.sendRequest(this.gateway + '/' + protocol, 'POST', data, progressCallback);
  }

  sendRequest(url, requestType, data, progressCallback) {
    return new Promise((resolve, reject) => {
      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState === 4) {
          if (this.status === 200) {
            resolve(xhttp.responseText);
          } else {
            reject(this.status);
          }
        }
      };

      if(xhttp.upload){
        xhttp.upload.onprogress = function(event){
          if(progressCallback){
            progressCallback(Math.floor((event.loaded/data.length)*100,2));
          }
        }
      }

      // xhttp.responseType = 'text';
      xhttp.open(requestType, url, true);
      xhttp.setRequestHeader('Content-Type', 'application/octet-stream');
      xhttp.send(data);
    });
  }

  getFile(url){
    return new Promise((resolve,reject)=>{
      var xhr = new XMLHttpRequest();

      xhr.open("GET", url, true);

      xhr.onload = ()=>{
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else if(xhr.status === 404){
          reject('couldn\'t find hash.');
        } else {
          reject('unhandled error.');
        }
      };

      xhr.onerror = ()=>{
        reject('couldn\'t access gateway.');
      };

      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.send();
    });
  }

  getData(url){
    return new Promise((resolve,reject)=>{
      var xhr = new XMLHttpRequest();

      xhr.open("GET", url, true);

      xhr.onload = ()=>{
        if (xhr.status === 200) {
          resolve(new Uint8Array(xhr.response));
        } else if(xhr.status === 404){
          reject('couldn\'t find hash.');
        } else {
          reject('unhandled error.');
        }
      };

      xhr.onerror = ()=>{
        reject('couldn\'t access gateway.');
      };

      xhr.responseType = 'arraybuffer';
      xhr.send();
    });
  }

  getDataFromManifest(swarmHash, filename){
    let url = this.rawGateway + swarmHash + "/";
    return this.getFile(url).then((manifest)=>{
      if(JSON.parse(manifest).entries.length === 1){
        return this.getData(this.rawGateway + JSON.parse(manifest).entries[0].hash + "/");
      }else{
        throw new Error("couldn't find that file in the manifest.")
      }
    })
  }

}

module.exports = Swarm;

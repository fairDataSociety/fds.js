// handles crypto
// TODO - use IV's!!

let NodeCrypto = require('crypto');
let Web3 = require('web3');
let Utils = require('./FDS-Utils.js');

class Crypto {
  generateRandomIV(){
    return window.crypto.getRandomValues(new Uint8Array(256 / 8 / 2))
  }

  calculateSharedSecret(privateKey, recipientPublicKey){
    let sender = NodeCrypto.createECDH('secp256k1');
    sender.setPrivateKey(privateKey.substring(2,66), 'hex');
    return sender.computeSecret("04"+recipientPublicKey.substring(2,132), 'hex').toString('hex');
  }

  encryptString(string, password, iv){
    return this.encryptBuffer(new TextEncoder("utf-8").encode(string), password, iv)
      .then((encryptedBuffer)=>{
        console.log('e', encryptedBuffer, string)
        return Web3.utils.bytesToHex(encryptedBuffer);
      }
    );
  }

  decryptString(string, password, iv){
    let encryptedBuffer = Utils.hexStringToByte(string);
    let ivBytes = Utils.hexStringToByte(iv.substring(2));
    let decryptedBuffer = this.decryptBuffer(encryptedBuffer, password, ivBytes);
    console.log('d', decryptedBuffer)
    return new TextDecoder().decode(decryptedBuffer);
  }  

  encryptBuffer(buffer, password, iv){
    // in a promise because later we'll put this in a web worker
    return new Promise((resolve, reject) => {
      if(!password) throw new Error('You must supply a password.');
      let key = Utils.hexStringToByte(password.substring(2));
      console.log('e', key, iv)      
      let cipher = NodeCrypto.createCipheriv('aes-256-ctr', key, iv);
      let crypted = cipher.update(new Uint8Array(buffer));
      let cryptedFinal = cipher.final();
      let c = new Uint8Array(crypted.length + cryptedFinal.length);
      c.set(crypted);
      c.set(cryptedFinal, crypted.length);
      resolve(c);
    });
  }

  decryptBuffer(buffer, password, iv){
    let key = Utils.hexStringToByte(password.substring(2));
    console.log('d', key, iv)      
    var decipher = NodeCrypto.createDecipheriv('aes-256-ctr', key, iv);
    var dec = decipher.update(buffer);
    let decFinal = decipher.final();
    let d = new Uint8Array(dec.length + decFinal.length);
    d.set(dec);
    d.set(decFinal, dec.length);
    return d;
  }

  decryptedFile(encryptedBuffer, password, decryptedFileName, mimeType) {
    let decryptedBuffer = this.decryptBuffer(encryptedBuffer, password, iv);
    let blob = new Blob([decryptedBuffer], { name: decryptedFileName, type: mimeType });
    blob.name = decryptedFileName;
    return decryptedBuffer;
  }  
}

module.exports = new Crypto;
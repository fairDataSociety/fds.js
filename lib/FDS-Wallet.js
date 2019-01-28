// thin wrapper around ethereumjs-wallet

let EthereumJSWallet = require('ethereumjs-wallet');
//to do - make these web workers and deal with the complexity/security aspect

class Wallet{

  generate(password){
    let complexity = 1; //9 is used in geth but it takes ages!
    return new Promise((resolve, reject)=>{
      setTimeout(()=>{
        this.wallet = EthereumJSWallet.generate();
        this.walletV3 = this.wallet.toV3(password, {
          kdf: 'scrypt',
          dklen: 32,
          n: Math.pow(complexity,2), 
          r: 8,
          p: 1,
          cipher: 'aes-128-ctr'
        });
        resolve(this);
      })
    })
  }

  fromJSON(walletJSON, password) {
    return new Promise((resolve, reject)=>{
      console.time("decryptWallet");
      try {
        var wallet = EthereumJSWallet.fromV3(walletJSON, password, true);
        console.timeEnd("decryptWallet");
        resolve(wallet);
      }
      catch(err) {
        console.timeEnd("decryptWallet");
        if(err.message === "Key derivation failed - possibly wrong passphrase"){
          reject(false);       
        }else{
          throw new Error(err);
        }
      }
    });
  }

}

module.exports = Wallet;
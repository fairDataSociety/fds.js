```
__/\\\\\\\\\\\\\\\__/\\\\\\\\\\\\________/\\\\\\\\\\\___        
 _\/\\\///////////__\/\\\////////\\\____/\\\/////////\\\_       
  _\/\\\_____________\/\\\______\//\\\__\//\\\______\///__      
   _\/\\\\\\\\\\\_____\/\\\_______\/\\\___\////\\\_________     
    _\/\\\///////______\/\\\_______\/\\\______\////\\\______    
     _\/\\\_____________\/\\\_______\/\\\_________\////\\\___   
      _\/\\\_____________\/\\\_______/\\\___/\\\______\//\\\__  
       _\/\\\_____________\/\\\\\\\\\\\\/___\///\\\\\\\\\\\/___ 
        _\///______________\////////////_______\///////////_____
         _________FAIR___________DATA______________SOCIETY_______
```

# FDS.js Framework
## Serverless App Toolkit for the Web3 Generation ✌️

FDS.js is a very simple framework to create apps using the Ethereum and Swarm networks.

It provides simple encrypted file storage, key value storage and file sending with baked in authentication for javascript web applications.

### Quick Start

Initialise FDS.

```
var fds = new FDS();  
```

Create an account.

```
fds.CreateAccount('fds-ftw', 'a-very-secure-password').then((account) => {
  console.log(`registered user ${account.subdomain} to address ${account.address}`);
})
```

Unlock your new account, and store a file.

```
var file = new File([`hello world `], `test.txt`, {type: 'text/plain'});

fds.UnlockAccount('fds-ftw', 'a-very-secure-password').then((account) => {
  account.store(file, console.log, console.log, console.log).then((stored)=>{
    console.log(`>>>> successfully stored ${stored}`);
  });
})
```

Retrieve that file.

```
fds.UnlockAccount('fds-ftw', 'test').then((account)=>{
  account.stored().then((stored)=>{
    stored[0].getFile().then(console.log)
  })
})
// File(19) { name: "test2855.txt", size: 19, type: "text/plain", webkitRelativePath: ""}
```

### Overview

FDS is an attempt to provide a very accessible high level framework to enable everyone to create apps using the Ethereum Web3 stack. At present it enables developers to:

 - Create Password Protected Account
 - Unlock (Sign In) Account
 - Store values using an encrypted key/value store
 - Store a file encrypted using AES-256-CTR
 - Send encrypted files to another account

Coming soon:

  - Store Unencrypted Values
  - Wallet top up
  - Threads/Groups
  - Send ETH/Tokens
  - Upload hosted website
  - Public Post Feed
  - Markdown to Blog Post Publishing Platform

All sensitive data is fully encrypted before it leaves the browser and all transactions are signed within the browser.

Wallets are stored in a password protected format in your browser's localstorage facility.

You may deploy your own networks of Swarm and Ethereum, or use the FDSociety network.

Enjoy!

### Endpoints

You may specify various endpoints:

Ethereum Mainnet / Swarm Mainnet (TBC)
Provided by the Ethereum Foundation

Ropsten Testnet / Swarm Testnet
Provided by the Ethereum Foundation

FDS Testnet
Provided by Fair Data Society, get in touch for tokens!

### Reference

#### Options

```
var fds = new FDS({
      swarmGateway: 'https://swarm.fairdatasociety.org',
      ethGateway: 'https://geth-noordung.fairdatasociety.org',
      faucetAddress: 'https://dfaucet-testnet-prod.herokuapp.com/gimmie',
      chainID: '235813',
      httpTimeout: 1000,
      gasPrice: 50,
      ensConfig: {
        domain: 'datafund.eth',
        registryAddress: '0xc11f4427a0261e5ca508c982e747851e29c48e83',
        fifsRegistrarContractAddress: '0x01591702cb0c1d03b15355b2fab5e6483b6db9a7',
        resolverContractAddress: '0xf70816e998819443d5506f129ef1fa9f9c6ff5a7'
      });
```

#### Account

##### Create Account

```
fds.CreateAccount('fds-ftw', 'a-very-secure-password').then((account) => {
  console.log(`registered user ${account.subdomain} to address ${account.address}`);
})
```

##### Unlock Account

```
fds.UnlockAccount('fds-ftw', 'a-very-secure-password').then((account) => {
  console.log(`registered user ${account.subdomain} to address ${account.address}`);
})
```

##### Lock Account

```
fds.LockAccount('fds-ftw', 'a-very-secure-password').then((account) => {
  console.log(`registered user ${account.subdomain} to address ${account.address}`);
})
```

##### Backup Account

Starts download of wallet backup file.

```
fds.BackupAccount('fds-ftw');
```

##### Restore Account

Restores account from file object.

```
fds.RestoreAccount(backupFile);
 // File { name: "fairdrop-wallet-test2153-backup.json", size: 486, type: "text/json", webkitRelativePath: ""}
```

##### Restore Account from Private Key

```FDS.Account.restoreFromPrivateKey('subdomain', 'password', 'private-key-without-0x').then(console.log);```

##### Tokens
```
FDS.Tx.getBalance('0x1c324f47f50e4cb37951122a76e25cdc317bb8e5').then(console.log);

account.getBalance().then(console.log);

//send 1 token
account.sendTokens('0xf1f....', '1').then((stored)=>{
  console.log(`>>>> successfully stored ${stored}`);
});
```

#### Storage

##### Store File

```
let file = new File(['hello storage world'], `test.txt`, {type: 'text/plain'});
account.store(file, console.log, console.log, console.log).then((stored)=>{
  console.log(`>>>> successfully stored ${stored}`);
});
```

##### Get Stored Files

```
account.stored().then((stored)=>{
  console.log(stored);
});
```

##### Retrieve Stored File

```
account.stored().then((stored)=>{
  console.log(stored);
  stored[0].getFile().then(console.log);
  // File(['hello storage world'], `test.txt`, {type: 'text/plain'})
  stored[0].saveAs();
})
```

##### Store Value

```
account.storeValue('key-1', 'hello value world');
```

##### Retreive Value

```
account.retrieveValue('key-1').then(console.log);
// 'hello value world'
```

##### Store Encrypted Value

```
account.storeEncryptedValue('key-e1', 'hello encrypted value world');
```

##### Retreive Encrypted Value

```
account.retrieveDecryptedValue('key-e1').then(console.log);
// 'hello encrypted value world'
```

#### Messaging

##### Send a File.

```
let file = new File(['hello world'], `test.txt`, {type: 'text/plain'});
account.send('another-account', file).then((message)=>{
  console.log(`>>>> successfully sent ${message}`);
});
```

##### Check for Received Files

```
account.messages().then((messages)=>{
  console.log(messages)
});
```

##### Retrieve Received File

```
account.messages().then((messages)=>{
  messages[0].getFile().then(console.log);
  // File(['hello world'], `test.txt`, {type: 'text/plain'})
  messages[0].saveAs();
  // starts download
});
```

### API


## Important!

Pending security review! Not ready for production, just yet, some come ;)

# Examples

```
window.FDS = new FDS({
swarmGateway: 'https://swarm-dev-test.datafund.io',
ethGateway: 'https://geth-dev.datafund.io',
faucetAddress: 'https://dfaucet-testnet-dev.herokuapp.com/gimmie',
chainID: '235813',
httpTimeout: 1000,
gasPrice: 50,
ensConfig: {
domain: 'datafund.eth',
registryAddress: '0x246d204ae4897e603b8cb498370dcbb2888213d1',
fifsRegistrarContractAddress: '0xbbcfe6ccee58d3ebc82dcd4d772b2484d23d0a0b',
resolverContractAddress: '0x79164c357f81627042d958533bba8a766c81f3d6'
}
});    

let simulateCreateTwoAndSendTwo = ()=>{

  let r1 = Math.floor(Math.random() * 1010101);
  let r2 = Math.floor(Math.random() * 1010101);
  let account1, account2 = null;
  window.FDS.CreateAccount(`test${r1}`, 'test', console.log).then((account) => {
    account1 = account;
    console.log(`registered account 1 ${account1.subdomain}`);  
  }).then(() => {
    return window.FDS.CreateAccount(`test${r2}`, 'test', console.log).then((account) => {
      account2 = account;
      console.log(`registered account 2 ${account2.subdomain}`);  
    }).catch(console.error)
  }).then(()=>{
    return window.FDS.UnlockAccount(account1.subdomain, 'test').then((acc1)=>{
      let r = Math.floor(Math.random() * 10101);
      let file = new File([`hello world ${r}`], `test${r}.txt`, {type: 'text/plain'});
      return acc1.send(account2.subdomain, file, console.log, console.log, console.log).then((message)=>{
        console.log(`>>>> successfully sent ${message} to ${account2.subdomain}`);
      });
    })
  }).then(()=>{
    console.log(`window.FDS.UnlockAccount('${account2.subdomain}', 'test').then((acc2)=>{
      acc2.messages().then((messages)=>{
        console.log('m', messages.length)
        messages[0].getFile().then(console.log)
        messages[0].saveAs();
      })
    })`)
    console.log(`window.FDS.UnlockAccount('${account1.subdomain}', 'test').then((acc2)=>{
      acc2.messages('sent').then((messages)=>{
        console.log('m', messages.length)
        messages[0].getFile().then(console.log)
        messages[0].saveAs();
      })
    })`)
    //todo check from sent mailbox too
  }).then(()=>{
    return window.FDS.UnlockAccount(account1.subdomain, 'test').then((acc1)=>{
      let r = Math.floor(Math.random() * 10101);
      let file = new File([`hello world 2${r}`], `test${r}-snd.txt`, {type: 'text/plain'});
      acc1.send(account2.subdomain, file, console.log, console.log, console.log).then((message)=>{
        console.log(`>>>> successfully sent ${message} to ${account2.subdomain}`);
      });
    })
  });

}

let createAndStore = ()=>{

  let r1 = Math.floor(Math.random() * 10101);
  let r2 = Math.floor(Math.random() * 10101);
  let account1, account2 = null;
  window.FDS.CreateAccount(`test${r1}`, 'test', console.log).then((account) => {
    account1 = account;
    console.log(`registered account 1 ${account1.subdomain}`);  
  }).then(()=>{
    return window.FDS.UnlockAccount(account1.subdomain, 'test').then((acc1)=>{
      let r = Math.floor(Math.random() * 10101);
      let file = new File(['hello storage world'], `test${r}.txt`, {type: 'text/plain'});
      acc1.store(file, console.log, console.log, console.log).then((stored)=>{
        console.log(`>>>> successfully stored ${stored} for ${acc1.subdomain}`);
      });
    })
  }).then(()=>{
    console.log(`window.FDS.UnlockAccount('${account1.subdomain}', 'test').then((acc2)=>{
      acc2.stored().then((stored)=>{
        console.log('m', stored.length)
        stored[0].getFile().then(console.log)
        stored[0].saveAs();
      })
    })`)
  });

}

let createAndBackup = ()=>{

  let r1 = Math.floor(Math.random() * 10101);
  let r2 = Math.floor(Math.random() * 10101);
  let account1, account2 = null;
  window.FDS.CreateAccount(`test${r1}`, 'test', console.log).then((account) => {
    account1 = account;
    console.log(`registered account 1 ${account1.subdomain}`);  
  }).then(()=>{
    return window.FDS.BackupAccount(account1.subdomain, 'test');
  });

}

let backupJSON = null;

let createDeleteAndRestore = ()=>{

  let r1 = Math.floor(Math.random() * 10101);
  let r2 = Math.floor(Math.random() * 10101);
  let account1, account2 = null;
  window.FDS.CreateAccount(`test${r1}`, 'test', console.log).then((account) => {
    account1 = account;
    console.log(`registered account 1 ${account1.subdomain}`);  
  }).then(()=>{
    let accounts = window.FDS.GetAccounts();
    let f = accounts.filter((a)=>{return a.subdomain === account1.subdomain});
    if(f.length === 1){
      console.log(`success: account ${account1.subdomain} exists`);
      backupJSON = JSON.stringify(accounts[0].wallet);
    }else{
      throw new Error(`account ${account1.subdomain} does not exist`)
    }
    return window.FDS.DeleteAccount(account1.subdomain);
  }).then(()=>{
    let accounts = window.FDS.GetAccounts();
    let f = accounts.filter((a)=>{return a.subdomain === account1.subdomain});
    if(f.length === 0){
      console.log(`success: account ${account1.subdomain} does not exist`)
    }else{
      throw new Error(`account ${account1.subdomain} exists`)
    }
  }).then(()=>{
    let backupFile = new File([backupJSON], `fairdrop-wallet-${account1.subdomain}-backup (1).json`, {type: 'text/plain'});
    window.FDS.RestoreAccount(backupFile).then(()=>{
      let accounts = window.FDS.GetAccounts();
      let f = accounts.filter((a)=>{return a.subdomain === account1.subdomain});
      if(f.length === 1){
        console.log(`success: account ${account1.subdomain} exists`)
      }else{
        throw new Error(`account ${account1.subdomain} does not exist`)
      }    
    });
    //todo check you can send to/from and store
  }).catch(console.error);

}



let createAndStoreValue = ()=>{
  let r1 = Math.floor(Math.random() * 10101);
  let r2 = Math.floor(Math.random() * 10101);
  let account1, account2 = null;
  window.FDS.CreateAccount(`test${r1}`, 'test', console.log).then((account) => {
    account1 = account;
    console.log(`registered account 1 ${account1.subdomain}`);  
  }).then(()=>{
    return window.FDS.UnlockAccount(account1.subdomain, 'test').then((acc1)=>{
      acc1.storeValue('k1', 'hello value world').then((stored)=>{
        console.log(`>>>> successfully stored ${stored} for ${acc1.subdomain}`);
      });
    })
  }).then(()=>{
    console.log(`window.FDS.UnlockAccount('${account1.subdomain}', 'test').then((acc2)=>{
      acc2.retrieveValue('k1').then(console.log)
    })`)
  });
}

let createAndStoreEncryptedValue = ()=>{
  let r1 = Math.floor(Math.random() * 10101);
  let r2 = Math.floor(Math.random() * 10101);
  let account1, account2 = null;
  window.FDS.CreateAccount(`test${r1}`, 'test', console.log).then((account) => {
    account1 = account;
    console.log(`registered account 1 ${account1.subdomain}`);  
  }).then(()=>{
    return window.FDS.UnlockAccount(account1.subdomain, 'test').then((acc1)=>{
      acc1.storeEncryptedValue('k1', 'hello encrypted value world').then((stored)=>{
        console.log(`>>>> successfully stored ${stored} for ${acc1.subdomain}`);
      });
    })
  }).then(()=>{
    console.log(`window.FDS.UnlockAccount('${account1.subdomain}', 'test').then((acc2)=>{
      acc2.retrieveDecryptedValue('k1').then(console.log)
    })`)
  });
}

simulateCreateTwoAndSendTwo();
// createAndStore();
// createAndStoreValue();
// createAndStoreEncryptedValue();
// createAndBackup();
// createDeleteAndRestore();

```

### Troubleshooting Windows installation

Installation steps for Windows to setup FDS library to be used for development locally

Windows 10
node: 10.15.1
npm: 6.4.1

1. Clone the FDS repo:
```
git clone https://github.com/fairDataSociety/fds.js.git
```
2. Change directory to the FDS repo
3. Run: 
```
npm link
```

If you see the following errors:

```
npm WARN tarball tarball data for file-saver@1.3.8 seems to be corrupted. Trying one more time.
npm WARN tar ENOENT: no such file or directory, open 'C:\fds.js\node_modules\.staging\type-is-55fc7b2b\package.json'
...
npm ERR! code EINTEGRITY
npm ERR! Verification failed while extracting file-saver@1.3.8:
```

Install latest file-saver
```
npm install file-saver --save
```

If you get python errors like:

```
gyp ERR! stack Error: Command failed: C:\Users\TestUser\Anaconda3\python.exe -c import sys; print "%s.%s.%s" % sys.version_info[:3];
gyp ERR! stack   File "<string>", line 1
gyp ERR! stack     import sys; print "%s.%s.%s" % sys.version_info[:3];
gyp ERR! stack SyntaxError: invalid syntax
gyp ERR! stack     at ChildProcess.exithandler (child_process.js:294:12)
gyp ERR! stack     at ChildProcess.emit (events.js:182:13)
gyp ERR! stack     at maybeClose (internal/child_process.js:962:16)
gyp ERR! stack     at Process.ChildProcess._handle.onexit (internal/child_process.js:251:5)
....
```

This means you have the python 3 installed, if you already have python27 installed, set the environment variable by running:

```
npm config set python "path to python 2.7 exe"
```

If you encounter this error:

Error: Can't find Python executable "python", you can set the PYTHON env variable

This means python is not installed. Python 2.7 is required on the system. Download the installer from https://www.python.org/downloads/release/python-2716/

After installation is complete, open new command prompt window, change directory to the FDS repo and run:
npm link

The libray should compile and build and if you come across vulnerabilities message:
```
Added 354 packages from 216 contributors and audited 172164 packages in 64.674s
found 2 high severity vulnerabilities
run `npm audit fix` to fix them, or `npm audit` for details
```

run twice:
```
npm audit fix
```

Now FDS repo is available to be imported in your project:

```
import FDS from 'fds';
```

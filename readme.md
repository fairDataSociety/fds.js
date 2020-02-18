<div style="text-align:center"><img src="https://raw.githubusercontent.com/fairDataSociety/fds.js/beta/images/fair-data-society.png" alt="Fair Data Society" /></div>

# FDS Dapp Framework

### Overview

FDS is an attempt to provide a very accessible high level framework to enable everyone to create apps using the Ethereum Web3 stack. At present it enables developers to:

 - Create Password Protected Account
 - Unlock (Sign In) Account
 - Store values using an encrypted key/value store
 - Store a file encrypted using AES-256-CTR
 - Send encrypted files to another account

Easy to use Dapp framework.

FDS make it easy for front end developers to create Dapps running on the Ethereum and Swarm networks.

The FDS Dapp Framework provides a high level javascript SDK for DApp developers to create and manage accounts, sign transactions using the associated Ethereum wallets, and interact with the Ethereum compatible blockchains and the Swarm network.

## New in 0.1.0

  - Now works in a Node environment.
  - [Plug in your own contracts!!](#use-your-own-contracts)
    - Simply deploy your own contracts then call functions, tx's are signed in the browser by FDS.
    - Work with existing contracts.
  - Much improved docs in await/sync syntax for your understanding pleasure. 💖 
  -  🎁 The mighty multibox brings data interoperability to all of your FDIP Compliant Dapps!
  - ...and much more!

## Features

  - Easily create Ethereum wallets
  - Store and share e2e encrypted values and files in the Swarm network.
  - Send Tokens and balance
  - Simply include your contract's abi and call functions - the rest is taken care of.
  - Totally decentralised, Zero Data, nothing leaves the your computer unencrypted, and only you have the key.
 

## Install

Use Node version 10. You may use [Node Version Manager](https://github.com/nvm-sh/nvm)

```
npm i -D fds.js
```

If using the node at the command prompt, read the [notes.](#notes-on-the-node-environment)

## Quick Start

### Create 2 Accounts

In FDS, most things are done in an account context, because transactions and data are authenticated and encrypted using Ethereum and Swarm compatible ECDSA algorithms before they leave your computer.

```javascript
let fds = require('FDS.js');
let FDS = new fds();
let alice = await FDS.CreateAccount('alice', 'password');
let bob = await FDS.CreateAccount('bob', 'password');
```

### Send a File from Alice to Bob

Now you have two accounts, you can send an encrypted file from alice's private key...

```javascript
let file = new File([`hello world `], `test.txt`, {type: 'text/plain'});
await alice.send('bob', file, '/shared/my-application/messages'); 
```

### Bob Receives It

... and bob will receive and decrypt it with his private key - without ever having to exchange a key, or trust any third parties. ✨

```javascript
let messages = await bob.messages('received', '/shared/my-application/messages'); 
messages[0].getFile();
```

----
## Examples

### Use Your Own Contracts

```javascript
let erc20 = b.getContract(erc20Abi,'0x35e46c...')
```

```javascript
let totalSupply = await erc20.totalSupply();
```

```javascript
let tx = await transfer.transfer('0xabcd...', 100);
```
*create an issue on this repo if you'd like us to include an example of something you're working on!*

------------------------------------------

## API Reference

### FDS Object

You must first create an FDS object to work with. 

To instantiate this using the default options:

```javascript
let fds = new FDS();
```

#### Config

It is also possible to specify values other than the defaults.

```javascript
var fds = new FDS({
      tokenName: 'gas',
      swarmGateway: 'https://swarm.fairdatasociety.org',
      ethGateway: 'https://geth-noordung.fairdatasociety.org',
      faucetAddress: 'https://faucet-noordung.fairdatasociety.org/gimmie',
      chainID: '235813',
      httpTimeout: 1000,
      gasPrice: 0.1,
      walletVersion: 1,
      ensConfig: {
        domain: 'datafund.eth',
        registryAddress: '0xA1029cb176082eca658A67fD6807B9bDfB44A695',
        subdomainRegistrarAddress: '0x0E6a3B5f6800145bAe95C48934B7b5a90Df50722',
        resolverContractAddress: '0xC91AB84FFad79279D47a715eF91F5fbE86302E4D'
      }
    });
```

-----
### FDS Object
-----

#### Description

The FDS object is used to create and manage user accounts.

#### Initialise FDS Object

Creates a new FDS object.

```javascript
let fds = new FDS();
```

#### CreateAccount

Creates a new account with a wallet, ENS subdomain and Multibox contract, and saves it into local storage.

*async* **FDS.CreateAccount(** *username, password, feedbackMessageCallback = console.log* **)**

**Inputs**

- username (string) [ `.` delimited string satisfying Namehash requirements ].
- password (string)
- feedbackMessageCallback (function) [callback for displaying progress messages]

**Returns**

*promise* User (User Object)


```javascript
let alice = await FDS.CreateAccount('alice', 'password', (message) => { ... });

```

#### UnlockAccount

Unlocks an account that already exists in local storage.

**FDS.UnlockAccount(** *username, password* **)**

**Inputs**

- username (string) [ `.` delimited string satisfying Namehash requirements ].
- password (string)

**Returns**

User (User Object)

or 

Failed (bool false)

```javascript
let alice = await FDS.UnlockAccount('alice', 'password');

```

#### GetAccounts

Gets a list of the accounts held in local storage.

*async* **FDS.GetAccounts(** *walletVersion = [most recent wallet version]* **)**

**Inputs**

- walletVersion (string) [ version of wallet to use, older wallets relate to legacy versions of fds.js ].

**Returns**

Users (Array)[User Object]

```javascript
FDS.GetAccounts();
```


#### BackupAccount

Starts download of wallet backup file. 

Must be in the browser environment.

*async* **FDS.BackupAccount(** *subdomain* **)**

**Inputs**

- username (string) [ `.` delimited string satisfying Namehash requirements, account must exist in local storage ].

**Returns**

Success (bool)

```javascript
FDS.BackupAccount('fds-ftw');
```

#### BackupAccountAsJSON

Returns a Ethereum style V3 wallet javascript object for a given username.

*async* **FDS.BackupAccountAsJSON(** *username* **)**

**Inputs**

- subdomain (string) [ the username that is associated with the wallet]

**Returns**

WalletJSON (string)

*note: take a note of the username here, you will need it when restoring this wallet.*

```javascript
let WalletJSON = await FDS.BackupAccountAsJSON('username');
```

#### RestoreAccount

Restores account from file object and saves it into the local storage.

*async* **FDS.RestoreAccount(** *backupFile* **)**

**Inputs**

- backupFile (file) [ A File object containing JSON V3 wallet and with filename in the format `fds-wallet-dan1234-backup.json` ]

**Returns**

*promise* Success (bool)

```javascript
//retrieve backup from
await FDS.RestoreAccount(backupFile);
```

#### RestoreAccountFromPrivateKey

Restores account from a private key and saves it into the browser's localstorage.

*async* **FDS.RestoreAccountFromPrivateKey(** *username, password, privateKey* **)**

**Inputs**

- username (string) [ the username that is associated with the private key]
- password (string) [ the password with which to encrypt the private key in localstorage]
- privateKey (string) [ private key as hex string without 0x prefix ]

**Returns**

*promise* User (User Object)

```javascript
//retrieve backup from
await FDS.RestoreAccountFromPrivateKey('username', 'password', 'private-key-without-0x');
```

#### RestoreAccountFromJSON

Restores account from a json V3 wallet and saves it into the browser's localstorage.

*async* **FDS.RestoreAccountFromJSON(** *username, jsonString* **)**

**Inputs**

- subdomain (string) [ the username that is associated with the wallet]
- jsonString (string) [ V3 encrypted wallet ]

**Returns**

*promise* User (User Object)

```javascript
await FDS.RestoreAccountFromJSON('username', '{..}' );
```

#### DeleteAccount(username);

Deletes an account from localstorage.

*async* **FDS.DeleteAccount(** *username* **)**

**Inputs**

- username (string) [ the username to be deleted]

**Returns**

null

```javascript
FDS.DeleteAccount('username');
```

----
### User Object
----

Everything in FDS happens within a user context - this handles permissions, authorisation, encrytion and authentication under the hood so that everything is crypto-secure 🌍.

You may create or retrieve a user object using the CreateAccount, GetAccounts or UnlockAccount methods of the FDS object, then use it to interact with the FDS multiverse, Swarm and Ethereum networks.

----
#### Attributes

- subdomain (string) the username of the account
- address (string) the address of the account
- publicKey (string) the public key of the account
- privateKey (string) the private key of the account
- nonce (int) 

----
#### Functions

#### send

Sends a file object from one user to another user's [multibox](#multibox-contract) path.

*async* **user.send(** *recipientSubdomain, file, multiboxPath, encryptionCallback = console.log, uploadCallback = console.log, progressMessageCallback = console.log* **)**

**Inputs**

- recipientSubdomain (string) [ the user name of the recipient  ]
- file (File Object) [ the file to be sent, should be either a browser [File object](https://developer.mozilla.org/en-US/docs/Web/API/File) or a [File Stub Object](file-objects-in-node).  ]
- multiboxPath (string) [ the [Multibox](#multibox-contract) path to send your file to ]
- encryptionCallback (function) [ callback function, encryptionStatus true if encryption complete ]
- uploadCallback (function) [ callback function, returns percentage uploaded as first argument [(see examples)](#upload-progress-bar) ]
- progressMessageCallback (function) [ callback function, returns string progress messages

**Returns**

Success (Bool)

```javascript
let success = await bob.send('alice', file, '/shared/mail', (encryptionStatus)=>{}, (percentageUploaded)=>{}, (progressMessageCallback)=>{});
```

#### messages

Checks to see if any files have been received by a user by [multibox](#multibox-contract) path. 

*async* **user.messages(** *query, multiboxPath, encryptionCallback = console.log, uploadCallback = console.log, progressMessageCallback = console.log* **)**

**Inputs**

- type (string) [ 'received' or 'sent' ]
- multiboxPath (string) [ the [Multibox](#multibox-contract) path to check for messages ]
- encryptionCallback (function) [ callback function, fires when encryption complete ]
- uploadCallback (function) [ callback function, returns percentage uploaded as first argument [(see examples)](#upload-progress-bar) ]
- progressMessageCallback (function) [ callback function, returns string progress messages ]

**Returns**

Messages (Array)[Message Object]

```javascript
let messages = await bob.messages('received', '/shared/files');
```


#### store

Stores a private file. The file is encrypted using AES-256-CTR and the user's private key before it is uploaded into Swarm. An encrypted record of the location and metadata of the file is encrypted and stored into Swarm Feeds for later retrieval.

*async* **user.store(** *file, encryptionCallback, uploadCallback, progressMessageCallback* **)**

**Inputs**

- file (File Object) [ the file to be sent, should be either a browser [File object](https://developer.mozilla.org/en-US/docs/Web/API/File) or a [File Stub Object](file-objects-in-node).  ]
- encryptionCallback (function) [ callback function, encryptionStatus true when complete,  ] *default: console.log*
- uploadCallback (function) [ callback function, returns percentage uploaded as first argument [(see examples)](#upload-progress-bar) ] *default: console.log*
- progressMessageCallback (function) [ callback function, returns string progress messages *default: console.log*

**Returns**

Success (Bool)

```javascript
let success = await bob.store(file, (encryptionStatus)=>{}, (percentageUploaded)=>{}, (progressMessage)=>{});
```

#### stored

Gets a list of stored files. 

*async* **user.stored(** ** **)**

**Inputs**

**Returns**

StoredFiles (Array) [Hash Object]

```javascript
let stored = await bob.stored();
```

#### storeValue

Stores an encrypted string `value` that can later be retrieved using the `key`. 

Useful for storing application state and much more. This value can only be accesed by the `user`.

*async* **user.storeValue(** *key, value* **)**

**Inputs**
- key (string) [ a string identifier for the `value`]
- value (string) [ a string ]

**Returns**

StoredFiles (Array) [Hash Object]

```javascript
let success = await a.storeValue('key231', 'hello encrypted value world');
```

#### getValue

Retrieves an encrypted string `value` that can has been stored by the `user` identified by a string `key`. 

*async* **user.getValue(** *key* **)**

**Inputs**
- key (string) [ a string identifier for the required `value` ] 

**Returns**

Value (string)

```javascript
let value = await a.retrieveValue('key231');
// 'hello encrypted value world'
```

#### deployContract

Deploys a contract from the user's account context, returns a [Contract Object](#contract-object) with which you may call your Solidity contract's functions to interact with the blockchain.

[See example](#use-your-own-contracts)

*async* **user.deployContract(** *abi, bytecode, args = []* **)**

**Inputs**
- abi (object) [ the [application binary interface]() of the contract to be deployed ]
- bytecode (string) [ 0x prefixed of the contract to be deployed  ]
- args (array) [ an array of arguments to be passed to the contract constructor  ]
- contractAddress (string) [address of the contract]

**Returns**

Contract (Contract Object)

```javascript
let contract = await alice.deployContract([ { "inputs": [], ... } ] , '608060405234801561001057600080fd5b50...', ['my', 'arguments']);
```

#### getContract

Gets a [Contract Object]() with the user's account context, which you may call the functions of to interact with the blockchain.

*async* **user.getContract(** *abi, address* **)**

**Inputs**
- abi (object) [ the [application binary interface]() of the contract to be deployed ]
- address (string) [ address of the deployed contract ]

**Returns**

Value (string)

```javascript
let success = await alice.getContract([ { "inputs": [], ... } ], '0xab234...' );
// true
```

#### Get a User's Balance

Gets a user's balance.

*async* **user.getBalance(** ** **)**

**Inputs**


**Returns**

Value (string)

```javascript
let balance = await alice.getBalance([ { "inputs": [], ... } ], '0xsa3bsdfs' );
191832026900000000
// true
```

#### Get Current BlockNumber

Gets a user's balance.

*async* **user.getBlockNumber(** ** **)**

**Inputs**


**Returns**

Value (integer)

```javascript
let bn = await alice.getBlockNumber();
123456789
// true
```

#### Pay a User

Pays a user native balance.

*async* **user.pay(** *recipientSubdomain, amount, transactionCallback = console.log, transactionSignedCallback = console.log* **)**


**Inputs**
- abi (object) [ the [application binary interface]() of the contract to be deployed ]
- address (string) [ address of the deployed contract ]
- transactionCallback (function)
- transactionSignedCallback (function)

**Returns**

TransactionHash (string)

```javascript
let balance = await alice.pay([ 'bob', '0.1' );
//0x3cf52d1..
```

#### Pay an Address

Pays a address native balance.

*async* **user.pay(** *recipientAddress, amount, transactionCallback = console.log, transactionSignedCallback = console.log* **)**


**Inputs**
- abi (object) [ the [application binary interface]() of the contract to be deployed ]
- address (string) [ address of the deployed contract ]
- transactionCallback (function)
- transactionSignedCallback (function)

**Returns**

TransactionHash (string)

```javascript
let balance = await alice.pay([ '0x234...', '0.1' );
//0x3cff2d1..
```

#### Sign Data

Signs a arbitary data.

*async* **user.sign(** *message* **)**


**Inputs**
- message (string) [ the message to be signed ]

**Returns**

Success (bool)

```javascript
let balance = await alice.sign('message');
//0x3cff2d1..
```

#### Recover Address from Signature

Checks a message and signature and returns the address.

*async* **user.recover(** *message, sig* **)**


**Inputs**
- message (string) [ the message which has been signed ]
- sig (string) [ the signature ]

**Returns**

Address (address)

```javascript
let balance = await alice.recover('message', '0xabc...');
//0x3cff2d1..
```


-----
### Message Object
-----

#### Description

Message objects are returned from user.messages()

-----
#### Attributes

- to (string) [user the message was sent to]
- from (string) [user the message was sent from]
- hash (Hash Object) [the hash for the file that was sent]

-----
#### Functions

#### getFile

Retrieves and decrypts a file from Swarm. 

*async* **message.getFile(** *decryptProgressCallback = console.log, downloadProgressCallback = console.log* **)**

**Inputs**

- decryptProgressCallback (string) [ the user name of the recipient  ] 
- downloadProgressCallback (File Object) [ the file to be sent, should be either a browser [File object](https://developer.mozilla.org/en-US/docs/Web/API/File) or a [File Stub Object](file-objects-in-node).  ]

**Returns**

File (File)

```javascript
let file = await message.getFile();
```

#### saveAs

Uses [filesaver](https://github.com/eligrey/FileSaver.js/) to prompt a file download from the browser environment. 

*async* **message.saveAs(** *decryptProgressCallback = console.log, downloadProgressCallback = console.log* **)**

**Inputs**

- decryptProgressCallback (function) [ decryption progress callback ] 
- downloadProgressCallback (function) [ download progress callback ]

**Returns**

File (File)

```javascript
let file = await message.saveAs();
```

-----
### Hash Object
-----

#### Description

Hash objects are used to represent files encrypted and stored into swarm.

-----
#### Attributes

  address: 'ece513967ad1d7610f280ff1a6c619ae7458780bbd0e0ba687e60ba6e3ae47e2',
  file: { name: 'test.txt', type: 'text/plain' },
  time: 1569241451971,

- address (string) [location in Swarm]
- file (object) [file meta info]
- time (string) [unix epoch file created date]

Hash objects contain references to encrypted files stored in Swarm.

-----
#### Functions

#### getFile

Retrieves and decrypts a file from Swarm. 

*async* **hash.getFile(** *decryptProgressCallback = console.log, downloadProgressCallback = console.log* **)**

**Inputs**

- decryptProgressCallback (function) [ decryption progress callback ] 
- downloadProgressCallback (function) [ download progress callback ]

**Returns**

*promise* File (File)

```javascript
let file = await hash.getFile();
```

#### saveAs

Uses [filesaver](https://github.com/eligrey/FileSaver.js/) to prompt a file download from the browser environment. 

*async* **hash.saveAs(** *decryptProgressCallback = console.log, downloadProgressCallback = console.log* **)**

**Inputs**

- decryptProgressCallback (function) [ decryption progress callback ] 
- downloadProgressCallback (function) [ download progress callback ]

**Returns**

null

```javascript
let file = await hash.saveAs();
```

#### gatewayLink

Uses [filesaver](https://github.com/eligrey/FileSaver.js/) to prompt a file download from the browser environment. 

*async* **hash.gatewayLink(** ** **)**

**Inputs**

- decryptProgressCallback (function) [ decryption progress callback ] 
- downloadProgressCallback (function) [ download progress callback ]

**Returns**

GatewayLink (string)

```javascript
let file = await hash.gatewayLink();
```


-----
### Contract Object
-----

The contract object exposes any Solidity methods, which can be called just like normal functions. 

It is returned from GetContract or DeployContract.


- contractAddress (string) [ address of the deployed contract ]
- web3Instance (object) [ web3 instance of the deployed contract ]

*async* **contract.myMethod(** *arg1, arg2, ...* **)**

myMethod can be any function, getter or setter of your contract

**Inputs**
- arg1 (any) [ the argument to the solidty function ] #todo

---
## Notes
---

### Notes on the Node Environment

#### File Objects in Node

Because the node environment does not include the file object, you must include a stub file object so that FDS has knowledge of what meta information is associated with the file.

```javascript
class File{
  constructor(content, name,options){
    this.content = content;
    this.name = name;
    this.type = options.type;
  }
}
```

#### Node REPL

When using the Node at the command line, you may find it useful to enable top tier await functionality.

```bash
node --experimental-repl-await
```

### Multibox Contract

![alt text](https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Pigeon-hole_messagebox_3.jpg/640px-Pigeon-hole_messagebox_3.jpg "Fair Data Society")

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



# FAIR.js

FAIR.js is a high level SDK intended to allow complete beginners to easily create decentralised Web3 apps.

FAIR uses Ethereum compatible blockchains and the Swarm distributed storage system to create a fully decentralised DApp infrastructure. 

It exposes high level functionality to enable a plug-n-play approach for users new to Web3, but dig deeper and you will discover whatever flexibility you need.

Fair.js implements Fair Data Society principles.

FAIR works in a Node environment or in the Browser.

## Status

FAIR.js is still in Beta, pending security review, but is stable. 

API may change.

Bugs should be reported and we will endeavour to fix them for you!


## Installation

```
$ npm i -D fair
```

```
<script>...</script>
```

## Getting Started

### Initialise FAIR

```javascript
let FAIR = new fair(); //uses default config.
```

### Create an Account

```javascript
let account = await FAIR.create('alice');
```

### Send a Message

```javascript
await alice.send('bob', {subject: 'hello', body: 'world'}); 
```

Files are encrypted with your Ethereum key pair using state of the art aes-256-ctr encryption and then stored in Swarm.

Your recipient is notified by storing a record of your communication on the blockchain. 

```javascript
let messages = bob.unlock('password').messages(); 
message[0].from //alice
message[0].subject //hello
message[0].body //world
```

### Store Data Publicly and Privately

```javascript
alice.store('a string value');
alice.store({some: 'json'});
alice.store(new File(data, {name: 'file.png'}));
// {hash: }
```

### Store Data Publicly and Privately

```javascript
alice.store('key', 'a string value');
alice.store('key', {some: 'json'}, {encryted: false});
alice.store('key', new File(data, {name: 'file.png'}));
// { swarmhash: '0xabcdef...',  }
```

Private data is fully encrypted and stored in Swarm, public data is available from Swarm (and gateways).

This is useful for building your Dapp, whatever it does!

```javascript
let feed = await FAIR.get('alice', 'feed');
```

or even integrate with Web2

```javascript
let feed = await $.get('https://swarm.fairdatasociety.org'+swarmhash+'/');
```

### Interact With Contracts

Use Truffle build artifacts or other bytecode and abi to deploy contracts from within the browser.

```javascript
let contractJSON = require('contract.json');
let contract = await FAIR.deploy(contractJSON.abi, contractJSON.bytecode, [arg1, arg2, ...]);
// contract.address 0xabcd.... resolves on confirmation.
let tx1 = await contract.setMyValue('0x1');
// tx1.transactionHash 0xabcd.... resolves on confirmation.
let tx2 = await contract.getMyValue();
// '0x1'
```

### Interact With Multibox

Interact with a multiverse of multiboxes.

```javascript
let tx = await FAIR.multibox('ozora')
    .set(
        '/shared/ozoraMessageBoard/posts/1', 
        {
            subject: 'Welcome to Paradise!', 
            body: 'Welcome Ozorians....'
        });
        
let posts = await FAIR.multibox('ozora').get('/shared/ozoraMessageBoard/posts');
// {1: {subject: 'welcome to paradise', body: 'welcome....'}}
```

# How To Build a DApp with FAIR.js

DApps are by their very nature built in a completely different way to old Web2 apps.

This is great for beginners because there's a bunch of stuff you won't need to learn! 

Instead, think laterally and enjoy creating the future with us by using our super easy cutting edge toolkit!


Dapps 101
---------

Dapps comprise of:

- User Interface. 
	For Web, this should use a Single Page App framework such as Vue.js, Ember or React.
- Cryptographic Wallet.
	A private 'key' which is used to encrypt your data, sign transactions and to prove your (anonymous) identity. We store this in localstorage in the browser, and it never leaves your device.
- Smart Contracts
	Smart contracts enable you to interact with programs on the Ethereum (compatible) blockchain. This could be trading Cryptokitties, transferring ERC20 tokens, or something completely new that you've dreamt up. This is where business logic lives.
- Decentralised Storage
	We can't store data on centralised servers and call it decentralised - that's where Swarm comes in - like IPFS on steroids, Swarm is used to manage and distribute your data in a byzantine tolerant distributed storage system.

Some important rules to remember when writing Dapps. 

Data should be stored in:

Swarm
    - for personal data which is not required to be edited by anyone else

Blockchain
    - for data which is edited in a collaboration with others according to a set of rules

#todo -> add Simple Dapp example

# API Documentation

### Initialise FAIR

With default config:

```javascript
let FAIR = new fair(); //uses a preset default config.
let FAIR = new fair(config); //change config values (see below)
```

The default config uses Fair Data Society's Noordung Testnet and Swarm Gateway, and uses subdomain's registed using the `.fds` top level domain.

### Configuration Options

Defaults are shown, with notes.

```javascript
{
  tokenName: 'gas', /*used to display feedback messages only*/
  swarmGateway: 'https://swarm.fairdatasociety.org', /*swarm node with http gateway exposed*/
  ethGateway: 'https://geth-noordung.fairdatasociety.org', /*geth node with http gateway exposed*/
  faucetAddress: 'https://faucet-noordung.fairdatasociety.org/gimmie', /*an fds faucet instance, to give out free gas to your users*/
  chainID: '235813', /*eth chain id*/
  httpTimeout: 1000, /*in milliseconds*/
  gasPrice: 0.1, /*in gwei*/
  /*gasLimit: 0.1, in gwei*/
  ensConfig: {
    domain: 'fds', /*registered top level domain*/
    registryAddress: '0xc11f4427a0261e5ca508c982e747851e29c48e83', /*main ENS registry address*/
    registrarAddress: '0x01591702cb0c1d03b15355b2fab5e6483b6db9a7', /*registrar address*/
    resolverContractAddress: '0xf70816e998819443d5506f129ef1fa9f9c6ff5a7' /*ENS resolver address*/
  }
}
```

## Account

#### Create Account (default)

Leave options blank to create with default settings.

```javascript
let account = await FAIR.create('alice', password);
```

Accounts are created with a Ethereum key pair, ENS subdomain's 'alice.fds' and an attached Multibox - all deployed to the FDS Noordung testnet by default. 

The wallet is stored encrypted in the browser's localstorage. 

You may specify options if you need something more lightweight, or a different chain.

#### Create Account (config)

Specify options.

```javascript
let account = await FAIR.create('alice', password, {
	ens: 'subdomainName',
	multibox: true,
	storage: true, //save to localstorage
	contacts: true,
	seedphrase: false,
	fund: true
});
```

#### Unlock Account

```javascript
let account = await FAIR.unlock('alice', password);
```

#### Unlock Account From V3

```javascript
let account = await FAIR.fromV3('alice', password);
```

#### Unlock Account From Private Key

```javascript
let account = await FAIR.fromPrivateKey('alice', password);
```

#### Unlock Account From Seed Phrase

```javascript
let account = await FAIR.fromPrivateKey('alice', password);
```

### Account Object

```javascript
account.subdomain
```

false if not yet linked

```javascript
await account.addENS(subdomain);
```

registers a subdomain in ENS registry, sets up a resolver

```javascript
await account.linkENS(subdomain);
```

just locally

```javascript
await account.addMultibox(subdomain);
```

adds a multibox, requires ENS

```javascript
await alice.send('bob', {subject: 'hello', body: 'world'});
await alice.send('bob', "hey bob ;D xx");
let file = new File([data], {name: 'test.txt'});
await alice.send('bob', file);
await alice.send('bob', file, { encrypted: false });
```

sends a json blob, string or file, encrypted or unencrypted - recipient must have ENS and multibox.

```javascript
let recieved = await alice.messages(); 
```

retrieves recieved messages, must have ENS and multibox

```javascript
let sent = await alice.sent();
```


```javascript
await alice.store({subject: 'hello', body: 'world'});
await alice.store("hey bob ;D xx");
let file = new File([data], {name: 'test.txt'});
await alice.store(file);
await alice.store(file, {encrypted: false});
```

stores a json blob, string or file, encrypted or unencrypted - recipient must have ENS and multibox.

retrieves sent messages, must have ENS and multibox

```javascript
await alice.pay('bob', "0.001"); 
```

pays subdomain bob, recipient must have ENS

```javascript
await alice.payAddress('0x123...', "0.001"); 
```

pays an address

```javascript
let artifact = require('contract-artifact.json');
let contract = await alice.deployContract(contract.abi, contract.bytecode, args = [], nonce, gas = 15000000); 
```

deploy a contract, given some abi/bytecode from eg. Truffle build artifacts

```javascript
let artifact = require('contract-artifact.json');
let contract = await alice.getContract(artifact.abi, artifact.bytecode, address); 
```

retrieve a contract instance

```javascript
let contacts = await alice.getContacts(); 
```

retrieve contacts.

```javascript
let backup = await alice.getBackup(); 
```

work on own multibox

```javascript
let contacts = await alice.multibox.get('/shared/mail/shared'); 
```

retrieve backup of wallet v3 file.

```javascript
let backup = await alice.getBackupFile(); 
```

retrieve backup of wallet as json v3 file.

```javascript
let backup = await alice.saveBackupAs(); 
```

saves backup as file if in the browser environment

### Contract Object

Once created you may call the functions on your deployed contracts.

```javascript
let tx = await contract.myMethod(args);
let response = await contract.myConstantMethod(args);
```

nb. web3 does not return statements from writable functions


### Message Object

getFile
saveAs

### Hash Object

getFile
saveAs
gatewayLink

### Contact Object

### Multibox

```javascript
let mb = FAIR.multibox('subdomain');
mb.set('/shared/ozoraMessageBoard/posts/1', {subject: 'Welcome to Paradise!', body: 'Welcome Ozorians....'});
let posts = await FAIR.multibox('ozora').get('/shared/ozoraMessageBoard/posts');
```

Wallet Backup One Time Pad recovery code.

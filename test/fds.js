// const ENS = artifacts.require("@ensdomains/ens/ENSRegistry");
// const FIFSRegistrar = artifacts.require("@ensdomains/ens/FIFSRegistrar");
// const ReverseRegistrar = artifacts.require("@ensdomains/ens/ReverseRegistrar");
// const PublicResolver = artifacts.require("@ensdomains/resolver/PublicResolver");

var TestRegistrar = artifacts.require("TestRegistrar");
var TestResolver = artifacts.require("PublicResolver");
var ENS = artifacts.require("ENSRegistry");
var SubdomainRegistrar = artifacts.require("SubdomainRegistrar");

var namehash = require('eth-ens-namehash');
var sha3 = require('js-sha3').keccak_256;

var fds = require('../index.js');

var fdsConfig = async () => {
  let ens = await ENS.deployed()
  let reg = await TestRegistrar.deployed()
  let res = await TestResolver.deployed()
  let sub = await SubdomainRegistrar.deployed()

  let backup;
  let contractAddress;

  return {
      tokenName: 'gas',
      swarmGateway: 'http://localhost:8500',
      ethGateway: 'http://localhost:8545',
      faucetAddress: 'http://localhost:3001/gimmie',
      chainID: '235813',
      httpTimeout: 1000,
      gasPrice: 0.1,
      ensConfig: {
        domain: 'datafund.eth',
        registryAddress: ens.address,
        subdomainRegistrarAddress: sub.address,
        resolverContractAddress: res.address
      }
    }

  };

class File{
  constructor(content, name,options){
    this.content = content;
    this.name = name;
    this.type = options.type;
  }
}

async function waitForAssert(func, val, ticks = 0, maxTicks = 10){
  ticks+=1;
  let resp = await func();
  if(resp === val){
    return true;
  }else{
    if(ticks < maxTicks){
      return new Promise((resolve, reject) => {
        // console.log('trying again', val, resp);
        setTimeout(()=>{
            resolve(waitForAssert(func, val, ticks))
        }, 1000);
      });
    }else{
      throw new Error('too many ticks');
    }
  }
}

let rands = [];
function rand(i){
  if(rands[i] === undefined){
    rands[i] = Math.floor(Math.random() * 101010101010101010101)
  }
  return rands[i];
}

contract('FDS', function(accounts) {
  var ens = null;
  var dhr = null;
  var registrar = null;
  var resolver = null;
  let subdomain;
  let FDS;
  let acc1, acc2, acc3;

  before(async function() {  
    // config for `truffle test --network test`
    // note you also need fds-faucet (with gas), swarm and ganache-cli running locally   
    // let config = await fdsConfig();
    // FDS = new fds(config);

    //config for `truffle test --network noordung` 
    FDS = new fds();

    subdomain = `test${rand(0)}`;   
    subdomain2 = `test${rand(1)}`;        
    subdomain3 = `xtest${rand(2)}`;        
  });


  it('should create an account', async function() {
    let account = await FDS.CreateAccount(subdomain, 'test', ()=>{}, ()=>{}, ()=>{});

    assert.equal(account.subdomain, subdomain);
  });


  it('should unlock an account', async function() {
    acc1 = await FDS.UnlockAccount(subdomain, 'test');

    assert.equal(acc1.subdomain, subdomain);
  });

  it('should create a second account', async function() {
    let account = await FDS.CreateAccount(subdomain2, 'test', ()=>{}, ()=>{}, ()=>{});

    assert.equal(account.subdomain, subdomain2);
  });  


  it('should unlock the second account', async function() {
    acc2 = await FDS.UnlockAccount(subdomain2, 'test');

    assert.equal(acc2.subdomain, subdomain2);
  });

  it('should create a third account', async function() {
    let account = await FDS.CreateAccount(subdomain3, 'test', ()=>{}, ()=>{}, ()=>{});

    assert.equal(account.subdomain, subdomain3);
  });  


  it('should unlock the third account', async function() {
    acc3 = await FDS.UnlockAccount(subdomain3, 'test');

    assert.equal(acc3.subdomain, subdomain3);
  });




  it('should store a file', async function() {
    let file = new File(['hello storage world'], `test${rand(0)}.txt`, {type: 'text/plain'});

    let stored = await acc1.store(file, ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let stored = await acc1.stored();
      return stored.length;
    }, 1);

    assert.equal(outcome, true);
  }); 


  it('should send a file', async function() {
    let file = new File(['hello sending world'], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc1.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      return messages.length;
    }, 1);

    assert.equal(outcome, true);

    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent');
      return messages.length;
    }, 1);

    assert.equal(outcome2, true);
  });  


  it('should send a file from a third party', async function() {
    let file = new File(['hello sending world'], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc3.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      return messages.length;
    }, 2);

    assert.equal(outcome, true);
  }); 

  it('should send a second file from a third party', async function() {
    let file = new File(['hello sending world2'], `test2${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc3.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      return messages.length;
    }, 3);

    assert.equal(outcome, true);
  });      


  it('should store an unencrypted value', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    let stored = await acc1.storeValue('k1', 'hello value world ' + rand(0));
    
    let outcome = await waitForAssert(async () => {
      let stored = await acc1.retrieveValue('k1');
      return stored;
    }, 'hello value world ' + rand(0));

    assert.equal(outcome, true);
  });


  it('should store a value', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    let stored = await acc1.storeEncryptedValue('k1', 'hello value world ' + rand(0));
    
    let outcome = await waitForAssert(async () => {
      let stored = await acc1.retrieveDecryptedValue('k1');
      return stored;
    }, 'hello value world ' + rand(0));

    assert.equal(outcome, true);
  });  

  it('should deploy a contract', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    let contract = await account.deployContract(ENS.abi, ENS.bytecode);

    let tx = await contract.send('setSubnodeOwner', ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x' + sha3('abc'), account.address]);

    contractAddress = contract.contractAddress;

    let sno = await contract.call('owner', [namehash.hash('abc')]);

    assert.equal(sno.toLowerCase(), account.address);
  });   

  it('should retreive a contract', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    let contract = await account.getContract(ENS.abi, contractAddress);

    let tx = await contract.send('setSubnodeOwner', ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x' + sha3('def'), account.address]);

    let tx2 = await contract.setSubnodeOwner('0x0000000000000000000000000000000000000000000000000000000000000000',  '0x' + sha3('ghi'), account.address);

    let sno = await contract.call('owner', [namehash.hash('def')]);

    assert.equal(sno.toLowerCase(), account.address);

    let sno2 = await contract.owner(namehash.hash('ghi'));

    assert.equal(sno2.toLowerCase(), account.address);    

  });    

  it('should send tokens to a subdomain', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    let account2 = await FDS.UnlockAccount(subdomain2, 'test');
    let balanceBefore = await account2.getBalance();

    let tx = await account.pay(subdomain2, "0.00001", () => {}, () => {});

    let balanceAfter = await account2.getBalance();
    
    assert.equal(parseInt(balanceAfter), parseInt(balanceBefore) + 10000000000000);
  }); 

  it('should store create a backup', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    backup = account.getBackup();
    
    assert.equal(backup.name, `fds-wallet-${subdomain}-backup.json` );
    assert.equal('0x'+JSON.parse(backup.data).address, account.address);
  });

  it('should delete an account', async function() {
    let account = await FDS.DeleteAccount(subdomain);

    let accounts = FDS.GetAccounts();
    let f = accounts.filter((a)=>{return a.subdomain === subdomain});
    
    assert.equal(f.length, 0);
  });  

  it('should restore an account', async function() {
    await FDS.RestoreAccountFromJSON(subdomain, backup.data);

    let account = await FDS.UnlockAccount(subdomain, 'test');
    
    assert.equal(account.subdomain, subdomain);
  });  
});

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

var fds = require('../dist/ES5/index.js');

var fdsConfig = async () => {
  let ens = await ENS.deployed()
  let reg = await TestRegistrar.deployed()
  let res = await TestResolver.deployed()
  let sub = await SubdomainRegistrar.deployed()

  let backup;
  let contractAddress;

  return {
      tokenName: 'gas',
      beeGateway: 'http://localhost:1633',
      ethGateway: 'http://localhost:8545',
      faucetAddress: 'http://localhost:3001/gimmie',
      chainID: '235813',
      httpTimeout: 500,
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

async function waitForAssert(func, val, ticks = 0, maxTicks = 2){
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
    if(process.env.TESTENV === 'noordung'){
      FDS = new fds();
    }else
    if(process.env.TESTENV === 'test'){
      let config = await fdsConfig();
      FDS = new fds(config);      
    }else
    if(process.env.TESTENV === 'fivesecs'){
      let config = {
        tokenName: 'gas',
        swarmGateway: 'https://swarm.fairdatasociety.org',
        ethGateway: 'http://188.166.156.168:8545',
        faucetAddress: 'http://sigsigsig.duckdns.org:12412/gimmie',
        chainID: '80348034',
        httpTimeout: 1000,
        gasPrice: 2,
        walletVersion: 1,
        ensConfig: {
          domain: 'datafund.eth',
          registryAddress: '0x51Cdac0fc850A85BdC30b4bb431ADab4b4BfcF4e',
          subdomainRegistrarAddress: '0xf72D7d66c0780080DE8d1219F57C2f8055D169Cd',
          resolverContractAddress: '0x2D9Cdd0aA10C743Aac81B69291D7cF21a1Fd3dbD'
        }
      };
      FDS = new fds(config);
     }



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

    let stored = await acc1.store(file, ()=>{}, ()=>{}, ()=>{}, {}, true);

    assert.equal(stored.storedFile.address.length, 64);
    assert.equal(stored.storedManifestAddress.length, 64);
    assert.equal(stored.oldStoredManifestAddress.length, 64);

    let outcome = await waitForAssert(async () => {
      let stored = await acc1.stored();
      return stored.length;
    }, 1);

    assert.equal(outcome, true);

    let outcome2 = await waitForAssert(async () => {
      let stored = await acc1.stored();
      let f = await stored[0].getFile()
      return stored.length;
    }, 1);

    assert.equal(outcome2, true);
  }); 


  it('should store a file with metadata', async function() {
    let file = new File(['hello storage world'], `test${rand(0)}.txt`, {type: 'text/plain'});
    let metadata = {meta: "data", me7a: 0474}

    let stored = await acc1.store(file, ()=>{}, ()=>{}, ()=>{}, metadata, false);

    assert.equal(stored.address.length, 64);

    let outcome = await waitForAssert(async () => {
      let stored = await acc1.stored();
      return stored.length;
    }, 2);

    assert.equal(outcome, true);

    let outcome2 = await waitForAssert(async () => {
      let stored = await acc1.stored();
      return stored[1].meta.meta === "data";
    }, true);

    assert.equal(outcome2, true);

    let outcome3 = await waitForAssert(async () => {
      let storedManifest = await acc1.storedManifest();
      return storedManifest.storedFiles.length === 2;
    }, true);

    assert.equal(outcome3, true);   

    let hashToUpdate;
    let outcome4 = await waitForAssert(async () => {
      let storedManifest = await acc1.storedManifest();
      hashToUpdate = storedManifest.storedFiles[0];

      storedManifest.test = "test";
      await acc1.updateStoredManifest(storedManifest);
      let updatedManifest = await acc1.storedManifest();
      return updatedManifest.test === "test";
    }, true);

    assert.equal(outcome4, true);    

    let outcome5 = await waitForAssert(async () => {
      await acc1.updateStoredMeta(hashToUpdate.address, {something: 'test'});
      let updatedManifest = await acc1.storedManifest();
      return updatedManifest.storedFiles[0].meta.something === "test";
    }, true);

    assert.equal(outcome5, true);    

  }); 



  it('should send a file', async function() {
    let msg = 'hello sending world';    
    let file = new File(['hello sending world'], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent;
    let outcome = await waitForAssert(async () => {
      sent = await acc1.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});
      return sent.hash.address.length === 64;
    }, true);

    assert.equal(outcome, true);

    let outcome2 = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      let file = await messages[0].getFile();
      gotRecMsg = file.content.toString();      
      return messages.length;
    }, 1);

    // assert.equal(outcome2, true);

    // let outcome3 = await waitForAssert(async () => {
    //   let messages = await acc1.messages('sent');
    //   let file = await messages[0].getFile();
    //   gotSentMsg = file.content.toString();
    //   return messages.length;
    // }, 1);

    // assert.equal(outcome3, true);
  });  

  it('should send a 2nd file', async function() {
    let msg = 'hello sending world 2';
    let file = new File([msg], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc1.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});

    let gotRecMsg;
    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      let file = await messages[1].getFile();
      gotRecMsg = file.content.toString();
      return messages.length;
    }, 2);


    assert.equal(msg, gotRecMsg);

    assert.equal(outcome, true);

    let gotSentMsg;
    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent');
      let file = await messages[1].getFile();
      gotSentMsg = file.content.toString();
      return messages.length;
    }, 2);

    assert.equal(msg, gotSentMsg);

    assert.equal(outcome2, true);
  });  

  it('should send a 3rd file', async function() {
    let msg = 'hello sending world 3';
    let file = new File([msg], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc1.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});

    let gotRecMsg;
    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      let file = await messages[2].getFile();
      gotRecMsg = file.content.toString();
      return messages.length;
    }, 3);


    assert.equal(msg, gotRecMsg);

    assert.equal(outcome, true);

    let gotSentMsg;
    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent');
      let file = await messages[2].getFile();
      gotSentMsg = file.content.toString();
      return messages.length;
    }, 3);

    assert.equal(msg, gotSentMsg);

    assert.equal(outcome2, true);
  });  

  it('should send a 4th file', async function() {
    let msg = 'hello sending world 4';
    let file = new File([msg], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc1.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});

    let gotRecMsg;
    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      let file = await messages[3].getFile();
      gotRecMsg = file.content.toString();
      return messages.length;
    }, 4);


    assert.equal(msg, gotRecMsg);

    assert.equal(outcome, true);

    let gotSentMsg;
    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent');
      let file = await messages[3].getFile();
      gotSentMsg = file.content.toString();
      return messages.length;
    }, 4);

    assert.equal(msg, gotSentMsg);

    assert.equal(outcome2, true);
  });  

  it('should send a file from a third party', async function() {
    let msg = 'hello sending world 5';
    let file = new File([msg], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc3.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      let file = await messages[4].getFile();      
      gotRecMsg = file.content.toString();   
      return messages.length;
    }, 5);

    assert.equal(msg, gotRecMsg);    

    assert.equal(outcome, true);
  }); 

  it('should send a second file from a third party', async function() {
    let msg = 'hello sending world 6';
    let file = new File([msg], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc3.send(acc2.subdomain, file, '/shared/mail', ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail');
      let file = await messages[5].getFile();      
      gotRecMsg = file.content.toString();   
      return messages.length;
    }, 6);


    assert.equal(outcome, true);
  });      

  it('should not retrieve messages from different multibox path', async function() {
    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/notmail');
      return messages.length;
    }, 0);
    assert.equal(outcome, true);
  }); 

  it('should send a second file from a third party to a different multibox path', async function() {
    let msg = 'hello sending world 6';
    let file = new File([msg], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc3.send(acc2.subdomain, file, '/shared/notmail', ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/notmail');
      let file = await messages[0].getFile();      
      gotRecMsg = file.content.toString();
      return messages.length;
    }, 1);


    assert.equal(outcome, true);
  });  

  it('should send a second file from a third party to a random multibox path', async function() {


    let outcome1 = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/notmail/'+rand(0));
      // let file = await messages[0].getFile();      
      // gotRecMsg = file.content.toString();
      return messages.length;
    }, 0);

    assert.equal(outcome1, true);


    let msg = 'hello sending world 6';
    let file = new File([msg], `test${rand(0)}.txt`, {type: 'text/plain'});

    let sent = await acc3.send(acc2.subdomain, file, '/shared/notmail/'+rand(0), ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/notmail/'+rand(0));
      let file = await messages[0].getFile();      
      gotRecMsg = file.content.toString();
      return messages.length;
    }, 1);


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

  it('should send tokens to an address', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    let account2 = await FDS.UnlockAccount(subdomain2, 'test');
    let balanceBefore = await account2.getBalance();

    let tx = await account.payAddress(account2.address, "0.00001", 1500000, () => {}, () => {});

    let balanceAfter = await account2.getBalance();
    assert.equal(parseInt(balanceAfter), parseInt(balanceBefore) + 10000000000000);
  }); 

  it('should send tokens to an address', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    let account2 = await FDS.UnlockAccount(subdomain2, 'test');
    let balanceBefore = await account2.getBalance();

    let tx = await account.pay(subdomain2, "0.00001", 1500000, () => {}, () => {});

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

  it('should lookup contact', async function() {
    let contact = await acc2.lookupContact(subdomain);

    assert.equal(contact.subdomain, acc1.subdomain);
    assert.equal(contact.publicKey, acc1.publicKey);
  }); 

  it('should sign data', async function() {
    let signed = await acc2.sign('it`s a message');
    let recovered = await acc2.recover('it`s a message', signed.signature);

    assert.equal(recovered.toLowerCase(), acc2.address.toLowerCase());
  }); 

});

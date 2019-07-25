// const ENS = artifacts.require("@ensdomains/ens/ENSRegistry");
// const FIFSRegistrar = artifacts.require("@ensdomains/ens/FIFSRegistrar");
// const ReverseRegistrar = artifacts.require("@ensdomains/ens/ReverseRegistrar");
// const PublicResolver = artifacts.require("@ensdomains/resolver/PublicResolver");

var TestRegistrar = artifacts.require("TestRegistrar");
var TestResolver = artifacts.require("PublicResolver");
var ENS = artifacts.require("ENSRegistry");
var SubdomainRegistrar = artifacts.require("SubdomainRegistrar");

// var namehash = require('eth-ens-namehash');
// var sha3 = require('js-sha3').keccak_256;

var fds = require('../index.js');

var fdsConfig = async () => {
  let ens = await ENS.deployed()
  let reg = await TestRegistrar.deployed()
  let res = await TestResolver.deployed()
  let sub = await SubdomainRegistrar.deployed()

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

    // return {
    //   tokenName: 'gas',
    //   swarmGateway: 'https://swarm.fairdatasociety.org',
    //   ethGateway: 'https://geth-noordung.fairdatasociety.org',
    //   faucetAddress: 'https://dfaucet-testnet-prod.herokuapp.com/gimmie',
    //   chainID: '235813',
    //   httpTimeout: 1000,
    //   gasPrice: 0.2,
    //   ensConfig: {
    //     domain: 'datafund.eth',
    //     registryAddress: ens.address,
    //     subdomainRegistrarAddress: sub.address,
    //     resolverContractAddress: res.address
    //   }
    // }

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
    // console.log('complete', resp);
    return true;
  }else{
    if(ticks < maxTicks){
      return new Promise((resolve, reject) => {
        console.log('trying again', val, resp);
        setTimeout(()=>{
          // .then((response)=>{
            resolve(waitForAssert(func, val, ticks))
          // });
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
  let acc1, acc2;

  before(async function() {
    // registrar = await SubdomainRegistrar.deployed();
    // ens = await ENS.deployed();
    // dhr = await DummyHashRegistrar.deployed();
    // resolver = await TestResolver.deployed();
    let config = await fdsConfig()
    FDS = new fds(config);
    // FDS = new fds();

    subdomain = `test${rand(0)}`;   
    subdomain2 = `test${rand(1)}`;        
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

    let sent = await acc1.send(acc2, file, ()=>{}, ()=>{}, ()=>{});

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages();
      return messages.length;
    }, 1);

    assert.equal(outcome, true);

    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent');
      return messages.length;
    }, 1);

    assert.equal(outcome2, true);
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
});
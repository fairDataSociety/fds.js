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

  console.log(reg.address)

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
    console.log('complete', resp);    
    return true;
  }else{
    if(ticks < maxTicks){
      return new Promise((resolve, reject) => {
        console.log('trying again', resp);
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
  if(typeof rand[i] !== undefined){
    rands[i] = Math.floor(Math.random() * 1010101010101010101)
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
  
    FDS = new fds(await fdsConfig());
    // FDS = new fds();

    subdomain = `test${rand(0)}`;   
    subdomain2 = `test${rand(1)}`;        
  });

  it('should create an account', async function() {
    acc1 = await FDS.CreateAccount(subdomain, 'test');

    assert.equal(acc1.subdomain, subdomain);
  });

  it('should unlock an account', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    assert.equal(account.subdomain, subdomain);
  });

  it('should create a second account', async function() {
    acc2 = await FDS.CreateAccount(subdomain2, 'test');

    assert.equal(acc2.subdomain, subdomain2);
  });  

  it('should unlock the second account', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');

    assert.equal(account.subdomain, subdomain);
  });  

  it('should store a file', async function() {
    let account = await FDS.UnlockAccount(subdomain, 'test');
    let file = new File(['hello storage world'], `test${rand(0)}.txt`, {type: 'text/plain'});

    let stored = await acc1.store(file, console.log, console.log, console.log);

    let outcome = await waitForAssert(async () => {
      let stored = await account.stored();
      console.log('test', account, stored);
      return stored.length;
    }, 1);

    assert.equal(outcome, true);

    // window.FDS.UnlockAccount('${account1.subdomain}', 'test').then((acc2)=>{
    //   acc2.stored().then((stored)=>{
    //     console.log('m', stored.length)
    //     stored[0].getFile().then(console.log)
    //     stored[0].saveAs();
    //   })
    // })

    // assert.equal(account.subdomain, subdomain);
  });  

  // it('should set up a domain', async function() {
  //   var tx = await dhr.setSubnodeOwner('0x' + sha3('test'), accounts[0]);
  //   await dhr.transfer('0x' + sha3('test'), registrar.address);
  //   assert.equal(tx.receipt.logs.length, 1);

  //   tx = await registrar.configureDomain("test", 1e17, 100000);
  //   assert.equal(tx.logs.length, 1);
  //   assert.equal(tx.logs[0].event, 'DomainConfigured');
  //   assert.equal(tx.logs[0].args.label, '0x' + sha3('test'));

  //   var domainInfo = await registrar.query('0x' + sha3('test'), '');
  //   assert.equal(domainInfo[0], 'test');
  //   assert.equal(domainInfo[1].toNumber(), 1e17);
  //   assert.equal(domainInfo[2].toNumber(), 0);
  //   assert.equal(domainInfo[3].toNumber(), 100000);
  // });

  // it("should fail to register a subdomain if it hasn't been transferred", async function() {
  //   try {
  //     await registrar.register('0x' + sha3('foo'), 'test', accounts[0], accounts[0], resolver.address, {value: 1e17});
  //     assert.fail('Expected error not encountered');
  //   } catch(error) { }
  // });

  // it("should register subdomains", async function() {
  //   var ownerBalanceBefore = (await web3.eth.getBalance(accounts[0])).toNumber();
  //   var referrerBalanceBefore = (await web3.eth.getBalance(accounts[2])).toNumber();

  //   var tx = await registrar.register('0x' + sha3('test'), 'foo', accounts[1], accounts[2], resolver.address, {from: accounts[1], value: 1e17});
  //   assert.equal(tx.logs.length, 1);
  //   assert.equal(tx.logs[0].event, 'NewRegistration');
  //   assert.equal(tx.logs[0].args.label, '0x' + sha3('test'));
  //   assert.equal(tx.logs[0].args.subdomain, 'foo');
  //   assert.equal(tx.logs[0].args.owner, accounts[1]);
  //   assert.equal(tx.logs[0].args.price.toNumber(), 1e17);
  //   assert.equal(tx.logs[0].args.referrer, accounts[2]);

  //   // Check owner and referrer get their fees
  //   assert.equal((await web3.eth.getBalance(accounts[0])).toNumber() - ownerBalanceBefore, 9e16);
  //   assert.equal((await web3.eth.getBalance(accounts[2])).toNumber() - referrerBalanceBefore, 1e16);

  //   // Check the new owner gets their domain
  //   assert.equal(await ens.owner(namehash.hash('foo.test.eth')), accounts[1]);
  //   assert.equal(await ens.resolver(namehash.hash('foo.test.eth')), resolver.address);
  //   assert.equal(await resolver.addr(namehash.hash('foo.test.eth')), accounts[1]);
  // });

  // it("should not permit duplicate registrations", async function() {
  //   try {
  //     await registrar.register('0x' + sha3('test'), 'foo', accounts[0], accounts[0], resolver.address, {value: 1e17});
  //     assert.fail('Expected error not encountered');
  //   } catch(error) { }
  // });

  // it("should not allow non-owners to configure domains", async function() {
  //   try{
  //     await registrar.configureDomain("toast", 1e18, 0);
  //     assert.fail('Expected error not encountered');
  //   } catch(error) { }
  // });

  // it("should not allow a non-owner to unlist a valid domain", async function() {
  //   try {
  //     await registrar.unlistDomain('test', {from: accounts[1]});
  //     assert.fail('Expected error not encountered');
  //   } catch(error) { }
  // });

  // it("should allow an owner to unlist a domain", async function() {
  //   var tx = await registrar.unlistDomain('test');
  //   assert.equal(tx.logs.length, 1);
  //   assert.equal(tx.logs[0].args.label, '0x' + sha3('test'));
  // });

  // it("should not allow subdomain registrations for an unlisted domain", async function() {
  //   try {
  //     await registrar.register('0x' + sha3('test'), 'bar', accounts[0], accounts[0], resolver.address, {value: 1e17});
  //     assert.fail('Expected error not encountered');
  //   } catch(error) { }
  // });

  // it("should allow an owner to relist a domain", async function() {
  //   tx = await registrar.configureDomain("test", 1e17, 100000);
  //   assert.equal(tx.logs.length, 1);
  //   assert.equal(tx.logs[0].event, 'DomainConfigured');
  //   assert.equal(tx.logs[0].args.label, '0x' + sha3('test'));

  //   var domainInfo = await registrar.query('0x' + sha3('test'), '');
  //   assert.equal(domainInfo[0], 'test');
  //   assert.equal(domainInfo[1].toNumber(), 1e17);
  //   assert.equal(domainInfo[2].toNumber(), 0);
  //   assert.equal(domainInfo[3].toNumber(), 100000);
  // });

  // it("should allow an owner to set a transfer address", async function () {
  //   tx = await registrar.setTransferAddress("test", accounts[2], {from: accounts[0]});
  //   assert.equal(tx.logs.length, 1);
  //   assert.equal(tx.logs[0].event, 'TransferAddressSet');
  //   assert.equal(tx.logs[0].args.addr, accounts[2]);
  // });

  // it("should allow an owner to upgrade domain", async function () {
  //   await ens.setSubnodeOwner(0, '0x' + sha3('eth'), accounts[1]);
  //   let tx = await registrar.upgrade('test', {from: accounts[0]});
  //   assert.equal(tx.logs.length, 1);
  //   assert.equal(tx.logs[0].event, 'DomainTransferred');
  //   assert.equal(tx.logs[0].args.name, 'test');
  //   await ens.setSubnodeOwner(0, '0x' + sha3('eth'), dhr.address);
  // });

  // it("should allow migration if emergency stopped", async function () {
  //   await dhr.setSubnodeOwner('0x' + sha3('migration'), accounts[1]);
  //   await dhr.transfer('0x' + sha3('migration'), registrar.address, {from: accounts[1]});
  //   await registrar.configureDomain("migration", 1e18, 0, {from: accounts[1]});

  //   let newRegistrar = await SubdomainRegistrar.new(ens.address);

  //   await registrar.stop();
  //   await registrar.setMigrationAddress(newRegistrar.address);

  //   try {
  //     // Don't allow anyone else to migrate the name.
  //     await registrar.migrate("migration");
  //     assert.fail('Expected error not encountered');
  //   } catch(error) { }

  //   await registrar.migrate("migration", {from: accounts[1]});
  //   assert.equal(await ens.owner(namehash.hash('migration.eth')), newRegistrar.address);
  // });
});

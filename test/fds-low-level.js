// const ENS = artifacts.require("@ensdomains/ens/ENSRegistry");
// const FIFSRegistrar = artifacts.require("@ensdomains/ens/FIFSRegistrar");
// const ReverseRegistrar = artifacts.require("@ensdomains/ens/ReverseRegistrar");
// const PublicResolver = artifacts.require("@ensdomains/resolver/PublicResolver");

var TestRegistrar = artifacts.require('TestRegistrar')
var TestResolver = artifacts.require('PublicResolver')
var ENS = artifacts.require('ENSRegistry')
var SubdomainRegistrar = artifacts.require('SubdomainRegistrar')

var namehash = require('eth-ens-namehash')
var sha3 = require('js-sha3').keccak_256

var fds = require('../dist/ES5/index.js')
console.log('eee')
var fdsConfig = async () => {
  let ens = await ENS.deployed()
  let reg = await TestRegistrar.deployed()
  let res = await TestResolver.deployed()
  let sub = await SubdomainRegistrar.deployed()

  let backup
  let contractAddress

  return {
    tokenName: 'gas',
    swarmGateway: 'http://localhost:8500',
    beeGateway: 'http://localhost:1633',
    ethGateway: 'http://localhost:8545',
    faucetAddress: 'http://localhost:3001/gimmie',
    chainID: '235813',
    httpTimeout: 1000,
    gasPrice: 0.1,
    ensConfig: {
      domain: 'fairdrop.eth',
      registryAddress: ens.address,
      subdomainRegistrarAddress: sub.address,
      resolverContractAddress: res.address,
    },
  }
}

class File {
  constructor(content, name, options) {
    this.content = content
    this.name = name
    this.type = options.type
  }
}

async function waitForAssert(func, val, ticks = 0, maxTicks = 2) {
  ticks += 1
  let resp = await func()
  if (resp === val) {
    return true
  } else {
    if (ticks < maxTicks) {
      return new Promise((resolve, reject) => {
        // console.log('trying again', val, resp);
        setTimeout(() => {
          resolve(waitForAssert(func, val, ticks))
        }, 1000)
      })
    } else {
      throw new Error('too many ticks')
    }
  }
}

let rands = []
function rand(i) {
  if (rands[i] === undefined) {
    rands[i] = Math.floor(Math.random() * 101010101010101010101)
  }
  return rands[i]
}

contract('FDS', function (accounts) {
  var ens = null
  var dhr = null
  var registrar = null
  var resolver = null
  let subdomain
  let FDS
  let acc1, acc2, acc3

  before(async function () {
    if (process.env.TESTENV === 'noordung') {
      FDS = new fds()
    } else if (process.env.TESTENV === 'test') {
      let config = await fdsConfig()
      FDS = new fds(config)
    }

    subdomain = `test${rand(0)}`
    subdomain2 = `test${rand(1)}`
    subdomain3 = `xtest${rand(2)}`
  })

  it('should create an account', async function () {
    let account = await FDS.CreateAccount(
      subdomain,
      'test',
      () => {},
      () => {},
      () => {},
    )

    assert.equal(account.subdomain, subdomain)
  })

  it('should unlock an account', async function () {
    acc1 = await FDS.UnlockAccount(subdomain, 'test')

    assert.equal(acc1.subdomain, subdomain)
  })

  it('should store an unencrypted value', async function () {
    let account = await FDS.UnlockAccount(subdomain, 'test')

    let stored = await acc1.storeValue('k1', 'hello value world ' + rand(0))

    let outcome = await waitForAssert(async () => {
      let stored = await acc1.retrieveValue('k1')
      return stored
    }, 'hello value world ' + rand(0))

    assert.equal(outcome, true)
  })

  it('should store a value', async function () {
    let account = await FDS.UnlockAccount(subdomain, 'test')

    let stored = await acc1.storeEncryptedValue('k1', 'hello value world ' + rand(0))

    let outcome = await waitForAssert(async () => {
      let stored = await acc1.retrieveDecryptedValue('k1')
      return stored
    }, 'hello value world ' + rand(0))

    assert.equal(outcome, true)
  })

  // it('should upload a file', async function() {

  //   let file = new File(['hello storage world'], `test${rand(0)}.txt`, {type: 'text/plain'});

  //   let f = FDS;

  //   // let r = FDS.Account.Store.storeFilesUnencrypted([file], ()=>{}, ()=>{}, true);

  //   // let stored = await acc1.store(file, ()=>{}, ()=>{}, ()=>{}, {}, true);

  //   debugger
  //   // await FDS.RestoreAccountFromPrivateKey('subdomain', 'password', '0xb9a8c4693db942c49a999c3a0eebfc8f9c9d2057628cfa1d62749df43c026143');
  //   // let account = await FDS.UnlockAccount('subdomain', 'password');
  //   // console.log(account);
  //   assert.equal(1, 1);
  // });
})

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
    ethGateway: 'http://localhost:8545',
    faucetAddress: 'http://localhost:3001/gimmie',
    chainID: '235813',
    httpTimeout: 1000,
    gasPrice: 0.1,
    ensConfig: {
      domain: 'datafund.eth',
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

contract('FDS-Multibox', function (accounts) {
  let FDS
  let acc1, acc2, acc3

  before(async function () {
    if (process.env.TESTENV === 'noordung') {
      FDS = new fds()
    } else if (process.env.TESTENV === 'test') {
      let config = await fdsConfig()
      FDS = new fds(config)
    }

    subdomain = `test${rand(3)}`
    subdomain2 = `test${rand(4)}`
    subdomain3 = `xtest${rand(5)}`
  })

  it('should create a multibox when creating a new account', async function () {
    acc1 = await FDS.CreateAccount(
      subdomain,
      'test',
      () => {},
      () => {},
      () => {},
    )

    let multibox = await acc1.getMultibox(subdomain)

    assert.equal(multibox.contractAddress.length, 42)
  })

  it('should add a node to multibox when receiving a message', async function () {
    acc2 = await FDS.CreateAccount(
      subdomain2,
      'test',
      () => {},
      () => {},
      () => {},
    )

    let msg = 'hello sending world'
    let file = new File(['hello sending world'], `test${rand(0)}.txt`, { type: 'text/plain' })

    let sent = await acc1.send(
      acc2.subdomain,
      file,
      '/shared/mail',
      () => {},
      () => {},
      () => {},
    )

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail')
      let file = await messages[0].getFile()
      gotRecMsg = file.content.toString()
      return messages.length
    }, 1)

    assert.equal(outcome, true)

    let multibox = await acc2.getMultibox(subdomain2)

    let rt = await multibox.get('/')

    assert.equal(rt.children.length, 1)

    assert.equal(rt.children[0].children.length, 1)

    let shared = await multibox.get('/shared')

    assert.equal(shared.children.length, 1)

    let mail = await multibox.get('/shared/mail')

    assert.equal(Object.keys(mail.values).length, 1)

    let dummy = await multibox.get('/shared/mail/dummy')

    assert.equal(Object.keys(dummy.values).length, 0)
  })

  it('should have correct parent id', async function () {
    let multibox = await acc2.getMultibox(subdomain2)

    let rt = await multibox.get('/', true)

    assert.equal(rt.parentId, false)

    assert.equal(rt.children[0].parentId, rt.id)

    assert.equal(rt.children[0].children[0].parentId, rt.children[0].id)
  })

  it('should retrieve node names', async function () {
    let multibox = await acc2.getMultibox(subdomain2)

    let rt = await multibox.get('/', true)

    assert.equal(rt.name, '/')

    assert.equal(rt.children[0].name, '/shared')

    assert.equal(rt.children[0].children[0].name, '/shared/mail')
  })
})

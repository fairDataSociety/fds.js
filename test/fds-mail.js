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

  it('should create a second account', async function () {
    let account = await FDS.CreateAccount(
      subdomain2,
      'test',
      () => {},
      () => {},
      () => {},
    )

    assert.equal(account.subdomain, subdomain2)
  })

  it('should unlock the second account', async function () {
    acc2 = await FDS.UnlockAccount(subdomain2, 'test')

    assert.equal(acc2.subdomain, subdomain2)
  })

  it('should create a third account', async function () {
    let account = await FDS.CreateAccount(
      subdomain3,
      'test',
      () => {},
      () => {},
      () => {},
    )

    assert.equal(account.subdomain, subdomain3)
  })

  it('should unlock the third account', async function () {
    acc3 = await FDS.UnlockAccount(subdomain3, 'test')

    assert.equal(acc3.subdomain, subdomain3)
  })

  it('should store a file', async function () {
    let file = new File(['hello storage world'], `test${rand(0)}.txt`, { type: 'text/plain' })

    let stored = await acc1.store(
      file,
      () => {},
      () => {},
      () => {},
    )

    let outcome = await waitForAssert(async () => {
      let stored = await acc1.stored()
      return stored.length
    }, 1)

    assert.equal(outcome, true)
  })

  it('should send a file', async function () {
    let msg = 'hello sending world'
    let file = new File(['hello sending world'], `test${rand(0)}.txt`, { type: 'text/plain' })

    let sent = await acc1.send(
      acc2.subdomain,
      file,
      `/shared/mail/${acc2.subdomain}`,
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

    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent')
      let file = await messages[0].getFile()
      gotSentMsg = file.content.toString()
      return messages.length
    }, 1)

    assert.equal(outcome2, true)
  })

  it('should send a 2nd file', async function () {
    let msg = 'hello sending world 2'
    let file = new File([msg], `test${rand(0)}.txt`, { type: 'text/plain' })

    let sent = await acc1.send(
      acc2.subdomain,
      file,
      `/shared/mail/${acc2.subdomain}`,
      () => {},
      () => {},
      () => {},
    )

    let gotRecMsg
    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail')
      let file = await messages[1].getFile()
      gotRecMsg = file.content.toString()
      return messages.length
    }, 2)

    assert.equal(msg, gotRecMsg)

    assert.equal(outcome, true)

    let gotSentMsg
    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent')
      let file = await messages[1].getFile()
      gotSentMsg = file.content.toString()
      return messages.length
    }, 2)

    assert.equal(msg, gotSentMsg)

    assert.equal(outcome2, true)
  })

  it('should send a 3rd file', async function () {
    let msg = 'hello sending world 3'
    let file = new File([msg], `test${rand(0)}.txt`, { type: 'text/plain' })

    let sent = await acc1.send(
      acc2.subdomain,
      file,
      `/shared/mail/${acc2.subdomain}`,
      () => {},
      () => {},
      () => {},
    )

    let gotRecMsg
    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail')
      let file = await messages[2].getFile()
      gotRecMsg = file.content.toString()
      return messages.length
    }, 3)

    assert.equal(msg, gotRecMsg)

    assert.equal(outcome, true)

    let gotSentMsg
    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent')
      let file = await messages[2].getFile()
      gotSentMsg = file.content.toString()
      return messages.length
    }, 3)

    assert.equal(msg, gotSentMsg)

    assert.equal(outcome2, true)
  })

  it('should send a 4th file', async function () {
    let msg = 'hello sending world 4'
    let file = new File([msg], `test${rand(0)}.txt`, { type: 'text/plain' })

    let sent = await acc1.send(
      acc2.subdomain,
      file,
      `/shared/mail/${acc2.subdomain}`,
      () => {},
      () => {},
      () => {},
    )

    let gotRecMsg
    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail')
      let file = await messages[3].getFile()
      gotRecMsg = file.content.toString()
      return messages.length
    }, 4)

    assert.equal(msg, gotRecMsg)

    assert.equal(outcome, true)

    let gotSentMsg
    let outcome2 = await waitForAssert(async () => {
      let messages = await acc1.messages('sent')
      let file = await messages[3].getFile()
      gotSentMsg = file.content.toString()
      return messages.length
    }, 4)

    assert.equal(msg, gotSentMsg)

    assert.equal(outcome2, true)
  })

  it('should send a file from a third party', async function () {
    let msg = 'hello sending world 5'
    let file = new File([msg], `test${rand(0)}.txt`, { type: 'text/plain' })

    let sent = await acc3.send(
      acc2.subdomain,
      file,
      `/shared/mail/${acc2.subdomain}`,
      () => {},
      () => {},
      () => {},
    )

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail')
      let file = await messages[4].getFile()
      gotRecMsg = file.content.toString()
      return messages.length
    }, 5)

    assert.equal(msg, gotRecMsg)

    assert.equal(outcome, true)
  })

  it('should send a second file from a third party', async function () {
    let msg = 'hello sending world 6'
    let file = new File([msg], `test${rand(0)}.txt`, { type: 'text/plain' })

    let sent = await acc3.send(
      acc2.subdomain,
      file,
      `/shared/mail/${acc2.subdomain}`,
      () => {},
      () => {},
      () => {},
    )

    let outcome = await waitForAssert(async () => {
      let messages = await acc2.messages('received', '/shared/mail')
      let file = await messages[5].getFile()
      gotRecMsg = file.content.toString()
      return messages.length
    }, 6)

    assert.equal(outcome, true)
  })
})

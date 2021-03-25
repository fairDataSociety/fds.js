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
    if(process.env.TESTENV === 'boma'){
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

    // assert.equal(account.subdomain, subdomain);
  });
    
});

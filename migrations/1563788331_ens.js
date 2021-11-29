var TestRegistrar = artifacts.require('@ensdomains/ens/TestRegistrar');
var PublicResolver = artifacts.require('PublicResolver');
var ENS = artifacts.require('@ensdomains/ens/ENSRegistry');
var SubdomainRegistrar = artifacts.require('SubdomainRegistrar');

var namehash = require('eth-ens-namehash');
var sha3 = require('js-sha3').keccak_256;
var Promise = require('bluebird');

// var domainnames = require('../app/js/domains.json');

module.exports = function (deployer, network, accounts) {
  return deployer.then(async () => {
    if (
      network == 'test' ||
      network == 'development' ||
      network == 'noordung' ||
      network == 'fivesecs' ||
      network == 'goerli' ||
      network == 'xdai'
    ) {
      await deployer.deploy(ENS);

      const ens = await ENS.deployed();

      await deployer.deploy(TestRegistrar, ens.address, namehash.hash('eth'));
      await deployer.deploy(PublicResolver, ens.address);

      await ens.setSubnodeOwner('0x0', '0x' + sha3('eth'), accounts[0]);
      await ens.setSubnodeOwner(
        namehash.hash('eth'),
        '0x' + sha3('datafund'),
        accounts[0]
      );

      const resolver = await PublicResolver.deployed();
      await ens.setResolver(namehash.hash('datafund.eth'), resolver.address);

      const dhr = await TestRegistrar.deployed();
      await ens.setSubnodeOwner('0x0', '0x' + sha3('eth'), accounts[0]);

      await deployer.deploy(
        SubdomainRegistrar,
        ens.address,
        namehash.hash('datafund.eth')
      );

      const registrar = await SubdomainRegistrar.deployed();
      await ens.setSubnodeOwner(
        namehash.hash('eth'),
        '0x' + sha3('datafund'),
        registrar.address
      );
    } else {
      // const ens = ENS.deployed();
      // await deployer.deploy(SubdomainRegistrar, ens.address);
    }
  });
};

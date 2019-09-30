var Wallet = require('../lib/FDS-Wallet.js');
var crypto = require('../lib/FDS-Crypto.js');
var Web3Utils = require('web3-utils');

var wallet = new Wallet();

contract('FDS', function(accounts) {

  it('should derive publicKey from privateKey', async function() {
    //   let privateKey = '0abf74dcc2b634a7e56905139ae6fa5aa57afd81cc56c4b08940275184ef744d';
    //   let publicKey = '0xcd38e497531cdc5bc9256790a0aa3369e9b2f86538ce09e0f83ea5f62c71e2d8f246ae77b3d74d0d7dcb814fb82627917bb5ac9a64151c67f601f4ebd4f9bc5e';
    let address1 = '0xecedad96c545979b7e57be4cabeb679ef85c25e2';
    let publicKey1 = '0x37f91e6ec022b55c08eca29f89e47f6f03ad1af35d3a7b2cacd1514c0c9e31c0358a181b3d50552440a9b1c7ea2942b94b178179a16798bcd7fc77b1cccff309';
    let privateKey1 = '0x7cbb15a540c3954792bf3729f9b26c0242e745890332bcf2ffeaece345f9d141';
    
    let address2 = '0x74ff5f6a11c3d9782191dc3f3042708e396cbf3c';
    let publicKey2 = '0xa621164c25da8bb0d87652c0c24d946dc4793f45609fd6006e23e6255646bb32d60af2800b1492aa8d8927c6904f2acab727637c072dbce786a5cd36f18cff86';
    let privateKey2 = '0x95e8f771761c8cd8a711ca57434ad3769e9fc6fe451561820781efc8ed999a85';

    let cAddress1 = '0x'+Web3Utils.keccak256(publicKey1).substr(-40);

    assert.equal(cAddress1, address1);

    let cAddress2 = '0x'+Web3Utils.keccak256(publicKey1).substr(-40);

    assert.equal(cAddress2, address1);  

    let calculatedPublicKey1 = crypto.privateToPublicKey(privateKey1);

    assert.equal(calculatedPublicKey1, publicKey1);
  });

  it('should calculate shared secret', async function() {

    let ss1 = 'cf94abf3d2ac14aeff10c407c5f7c8cc935f27e8da85a8d85f0a4802e4107ffa';
    let privateKey1 = '0x7cbb15a540c3954792bf3729f9b26c0242e745890332bcf2ffeaece345f9d141';
    let publicKey1 = '04a621164c25da8bb0d87652c0c24d946dc4793f45609fd6006e23e6255646bb32d60af2800b1492aa8d8927c6904f2acab727637c072dbce786a5cd36f18cff86';

    let css1 = crypto.calculateSharedSecret(privateKey1, publicKey1);

    assert.equal(css1, ss1);



    let w1 = await new Wallet().generate('test-pw-1');
    let w2 = await new Wallet().generate('test-pw-2');

    let address = Web3Utils.keccak256(w1.wallet.publicKey).substr(-20);

    assert.equal(w1.wallet.address.substr(-20), address);

    let css3 = crypto.calculateSharedSecret(w1.wallet.privateKey, w2.wallet.publicKey);
    let css4 = crypto.calculateSharedSecret(w2.wallet.privateKey, w1.wallet.publicKey);

    assert.equal(css3, css4);
  });  

});

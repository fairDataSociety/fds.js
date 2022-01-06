// Copyright 2019 The FairDataSociety Authors
// This file is part of the FairDataSociety library.
//
// The FairDataSociety library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The FairDataSociety library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the FairDataSociety library. If not, see <http://www.gnu.org/licenses/>.

// mailbox smart contracts

import { sha3 } from 'web3-utils'
import { hash } from 'eth-ens-namehash'

const ENSRegistryContract = require('./contracts/ENSRegistry.js')
const SubdomainRegistrarContract = require('./contracts/SubdomainRegistrar.js')
const PublicResolverContract = require('./contracts/PublicResolver.js')

const KEY_STRING =
  '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

class FDSENS2 {
  constructor(account, config) {
    this.account = account
    this.config = config
    this.ENSRegistry = new ENSRegistryContract(this.account, config.registryAddress)
    this.SubdomainRegistrar = new SubdomainRegistrarContract(this.account, config.subdomainRegistrarAddress)
    this.PublicResolver = new PublicResolverContract(this.account, config.resolverContractAddress)
  }

  registerSubdomain(subdomain, confirm = false) {
    return this.SubdomainRegistrar.register(sha3(subdomain), '0x' + this.account.wallet.address, confirm)
  }

  setResolver(subdomain, confirm = false) {
    const node = hash(subdomain + '.' + this.config.domain)
    const addr = this.config.resolverContractAddress
    return this.ENSRegistry.setResolver(node, addr, confirm)
  }

  setAll(subdomain, content, multihash, name, confirm = false) {
    const node = hash(subdomain + '.' + this.config.domain)
    const publicKey = this.account.publicKey
    const publicKeyX = publicKey.substring(0, 66)
    const publicKeyY = '0x' + publicKey.substring(66, 130)
    return this.PublicResolver.setAll(
      node,
      '0x' + this.account.wallet.address,
      content,
      multihash,
      publicKeyX,
      publicKeyY,
      name,
      confirm,
    )
  }

  getAll(subdomain, confirm = false) {
    const node = hash(subdomain + '.' + this.config.domain)
    return this.PublicResolver.getAll(node, confirm)
  }

  setAddr(subdomain, confirm = false) {
    const node = hash(subdomain + '.' + this.config.domain)
    // not needed
    // let addr = this.config.resolverContractAddress;
    return this.PublicResolver.setAddr(node, this.account.wallet.address, confirm)
  }

  setPubkey(subdomain, confirm = false) {
    const node = hash(subdomain + '.' + this.config.domain)
    const publicKey = this.account.publicKey
    const publicKeyX = publicKey.substring(0, 66)
    const publicKeyY = '0x' + publicKey.substring(66, 130)
    return this.PublicResolver.setPubkey(node, publicKeyX, publicKeyY, confirm)
  }

  setMultihash(subdomain, multihash, confirm = false) {
    const node = hash(subdomain + '.' + this.config.domain)
    return this.PublicResolver.setMultihash(node, multihash, confirm)
  }

  /**
   * Get public key of subdoman
   * @param {string} subdomain name
   * @returns {string | boolean} returns false if invalid
   */
  async getPubKey(subdomain) {
    const node = hash(subdomain + '.' + this.config.domain)
    return this.getPubKeyRaw(node)
  }

  /**
   * Get owner's address of subdoman
   * @param {string} subdomain name
   * @returns {string | boolean} returns false if invalid
   */
  async getOwner(subdomain) {
    const node = hash(subdomain + '.' + this.config.domain)
    return this.ENSRegistry.owner(node)
  }

  /**
   * Get public key of subdoman
   * @param {string} subdomain name
   * @returns {string | boolean} returns false if invalid
   */
  async getPubKeyRaw(node) {
    const keyCoords = await this.PublicResolver.getPubkey(node)
    const keyStr = '04' + keyCoords[0].substring(2, 66) + keyCoords[1].substring(2, 66)
    if (keyStr !== KEY_STRING) {
      return keyStr
    } else {
      return false
    }
    return keyStr
  }

  /**
   * Get multihash of subdomain
   * @param {string} subdomain name
   * @returns {TransactionObject} transaction object
   */
  getMultihash(subdomain) {
    const node = hash(subdomain + '.' + this.config.domain)
    return this.PublicResolver.getMultihash(node)
  }
}

export default FDSENS2

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

import { toWei } from 'web3-utils'
import Contract from './FDS-Contract'

class Tx {
  constructor(config, account) {
    this.account = account
    this.config = config
    this.web3 = this.config.web3
  }

  getContract(account, abi, address) {
    let c = new Contract(this.config, account, abi)
    return c.at(address)
  }

  deployContract(account, abi, bytecode, args = []) {
    let c = new Contract(this.config, account, abi, bytecode)
    return c.deploy(args)
  }

  syncNonce(account) {
    return this.web3.eth.getTransactionCount(account.wallet.address)
  }

  /**
   *
   * @param {any} account to send from
   * @param {any} toAddress 0xfff
   * @param {any} amount in wei
   * @param {any} transactionCallback callback
   * @param {any} transactionSignedCallback callback
   * @returns {any} transaction
   */
  pay(
    account,
    toAddress,
    amount,
    gas = 6000000,
    transactionCallback = console.log,
    transactionSignedCallback = console.log,
  ) {
    return new Promise(async (resolve, reject) => {
      const currentGas = await this.web3.eth.getGasPrice()
      const requiredGasPrice = await this.web3.eth.estimateGas({ to: toAddress })
      const gas = currentGas * requiredGasPrice
      const value = parseInt(amount) - gas

      let tx = {
        from: account.address,
        to: toAddress,
        gas: requiredGasPrice,
        gasPrice: currentGas,
        value: `${value}`,
      }

      transactionCallback(tx)

      return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
        return this.web3.eth.sendSignedTransaction(signed.rawTransaction).once('confirmation', function (i, hash) {
          resolve(hash)
        })
      })
    })
  }

  /**
   * Ensure address has enough balance
   * @getBalance
   * @param {string} address to check
   * @returns {void} balance of address
   */
  getBalance(address) {
    try {
      return this.web3.eth.getBalance(address)
    } catch (error) {
      console.error("can't access gateway ", config.ethGateway)
    }
  }

  getBlockNumber() {
    return this.web3.eth.getBlockNumber()
  }

  sign(account, message) {
    return this.web3.eth.accounts.sign(message, account.privateKey)
  }

  recover(message, sig) {
    return this.web3.eth.accounts.recover(message, sig)
  }
}

export default Tx

//rename to account store

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

// stores user accounts

import Utils from './FDS-Utils.js'
import User from './models/User.js'

// https://stackoverflow.com/questions/28572380/conditional-build-based-on-environment-using-webpack
// if (typeof localStorage === "undefined" || localStorage === null) {
//   var LocalStorage = require('node-localstorage').LocalStorage;
//   var localStorage = new LocalStorage('./scratch');
// }

let fs = null
if (typeof localStorage === 'undefined') {
  fs = require('fs')
}

class UserStore {
  /**
   * Create user store
   * @param {any} config configuration settings
   * @param {any} Account to use
   */
  constructor(config, Account) {
    this.config = config
    this.Account = Account
    this.users = this.getAll()
  }

  /**
   * Get subdomain
   * @param {string} subdomain name
   * @returns {User} user
   */
  get(subdomain) {
    let results = this.getAll().filter((user) => user.subdomain === subdomain)
    if (results.length === 1) {
      return new User(results[0], this.Account)
    } else if (results.length === 0) {
      return false
    } else {
      throw new Error('there should only be one result per subdomain')
    }
  }

  /**
   * Get subdomain
   * @param {string} subdomain name
   * @returns {User} user
   */
  getByAddress(address) {
    let results = this.getAll().filter((user) => user.wallet.address === address)
    if (results.length === 1) {
      return new User(results[0], this.Account)
    } else if (results.length === 0) {
      return false
    } else {
      throw new Error('there should only be one result per address')
    }
  }

  /**
   *  Get all users
   *  @returns {User} returns users from local storage
   */
  getAll(walletVersion) {
    if (this.config.walletVersion === undefined) {
      walletVersion = 0 //backwards compatibility
    }
    let wv = walletVersion === undefined ? this.config.walletVersion : walletVersion
    let key = this.config.chainID ? `fds-users_${this.config.chainID}` : 'users'

    let value
    if (typeof localStorage === 'undefined') {
      let scratchDir = this.config.scratchDir !== undefined ? this.config.scratchDir : './scratch/'
      let scratchDirKey = `${scratchDir}/${key}`
      this.initScratchDir(scratchDir, scratchDirKey)
      value = fs.readFileSync(scratchDirKey)
    } else {
      value = localStorage.getItem(key)
    }

    if (value === null) {
      return []
    } else {
      let users = []
      let usersIndex = JSON.parse(value)
      for (var i = usersIndex.length - 1; i >= 0; i--) {
        if (
          (wv === 0 && usersIndex[i].version === undefined) || //backwards compatibility
          wv === usersIndex[i].version
        ) {
          users.push(new User(usersIndex[i], this.Account))
        }
      }
      return users
    }
  }

  /**
   * Add user to subdomain
   * @param {any} subdomain name
   * @param {any} wallet to use
   * @returns {User} user
   */
  addUser(wallet, subdomain = null) {
    let oldUser = this.getByAddress(wallet.address)
    if (oldUser === false) {
      let user = new User(
        {
          version: this.config.walletVersion,
          subdomain: subdomain,
          wallet: wallet,
        },
        this.Account,
      )
      this.users.push(user)
      this.saveAll()
      return user
    } else {
      if (subdomain === oldUser.subdomain) {
        return oldUser
      } else {
        throw new Error('user already present in local storage, but with username ' + oldUser.subdomain)
      }
    }
  }

  /**
   * Delete subdomain
   * @param {any} subdomain name
   */
  delete(subdomain) {
    this.users = this.getAll().filter((user) => user.subdomain !== subdomain)
    this.saveAll()
  }

  /**
   * Save all
   * @returns {any} result
   */
  saveAll() {
    let key = this.config.chainID ? `fds-users_${this.config.chainID}` : 'users'
    let users = []
    for (var i = this.users.length - 1; i >= 0; i--) {
      users.push(this.users[i].toJSON())
    }
    if (typeof localStorage === 'undefined') {
      let scratchDir = this.config.scratchDir !== undefined ? this.config.scratchDir : './scratch/'
      let scratchDirKey = `${scratchDir}/${key}`
      this.initScratchDir(scratchDir, scratchDirKey)
      return fs.writeFileSync(scratchDirKey, JSON.stringify(users))
    } else {
      return localStorage.setItem(key, JSON.stringify(users))
    }
  }

  /**
   * Restore subdomain from JSON wallet
   * @param {string} subdomain name
   * @param {string} walletJSONString json wallet as string
   * @returns {User} user
   */
  restore(subdomain, walletJSONString) {
    let wallet = JSON.parse(walletJSONString)
    return this.addUser(wallet, subdomain)
  }

  initScratchDir(scratchDir, scratchDirKey) {
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDirKey)
    }
    if (!fs.existsSync(scratchDirKey)) {
      fs.writeFileSync(scratchDirKey, JSON.stringify([]))
    }
  }
}

export default UserStore

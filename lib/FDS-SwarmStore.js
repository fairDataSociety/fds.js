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

// stores files, values, contacts and encrypted values

import { bytesToHex, hexToBytes } from 'web3-utils'

import Hash from './models/Hash.js'
import SwarmFeeds from './FDS-SwarmFeeds.js'
import Crypto from './FDS-Crypto.js'

import Contact from './models/Contact.js'

class SwarmStore {
  /**
   *
   * @param {any} config configuration settings
   * @param {any} Account to use
   */
  constructor(config, Account) {
    this.config = config
    this.Account = Account
    this.Store = Account.Store
    this.SF = new SwarmFeeds(config)
  }

  /**
   *
   * @param {any} storerAccount account
   * @param {any} hash location
   * @param {any} decryptProgressCallback callback
   * @param {any} downloadProgressCallback callback
   * @returns {any} decrypted file
   */
  retrieveFile(storerAccount, hash, decryptProgressCallback = console.log, downloadProgressCallback = console.log) {
    return this.Store.getDecryptedFile(
      hash,
      storerAccount.privateKey,
      decryptProgressCallback,
      downloadProgressCallback,
    )
  }

  /**
   * init stored files
   * @param {any} storerAccount account
   */
  initStored(storerAccount) {
    return this.storeEncryptedValue('stored-1.0', '{"storedFiles":[]}', storerAccount, storerAccount.privateKey)
  }

  /**
   * get stored values
   * @param {any} query to retreive values, will be used later
   * @param {any} storerAccount account
   * @returns {any} array of hashes
   */
  getStored(query, storerAccount) {
    return this.retrieveDecryptedValue('stored-1.0', storerAccount.address, storerAccount.privateKey, true)
      .then((response) => {
        let files = JSON.parse(response.value)
        let storedFiles = files.storedFiles
        let storedHashes = storedFiles.map((f) => {
          let h = new Hash(f, storerAccount)
          return h
        })
        return {
          files: storedHashes,
          manifestAddress: response.address,
        }
      })
      .catch((error) => {
        if (error.status === 404) {
          return []
        } else {
          throw new Error(error)
        }
      })
  }

  getStoredManifest(storerAccount) {
    return this.retrieveDecryptedValue('stored-1.0', storerAccount.address, storerAccount.privateKey).then(
      (response) => {
        return JSON.parse(response)
      },
    )
  }

  updateStoredMeta(hash, updateMeta, storerAccount) {
    return this.getStoredManifest(storerAccount).then((manifest) => {
      for (var i = 0; i < manifest.storedFiles.length; i++) {
        if (manifest.storedFiles[i].address === hash) {
          let meta
          if (manifest.storedFiles[i].meta === undefined) {
            meta = {}
          } else {
            meta = manifest.storedFiles[i].meta
          }
          for (let k in updateMeta) {
            meta[k] = updateMeta[k]
          }
          manifest.storedFiles[i].meta = meta
        }
      }
      return this.updateStoredManifest(manifest, storerAccount)
    })
  }

  updateStoredManifest(manifest, storerAccount) {
    return this.storeEncryptedValue(
      'stored-1.0',
      JSON.stringify(manifest),
      storerAccount,
      storerAccount.privateKey,
      true,
    )
  }

  /**
   * Store file
   * @param {any} storerAccount account
   * @param {any} file file
   * @param {any} encryptProgressCallback callback
   * @param {any} uploadProgressCallback callback
   * @param {any} progressMessageCallback callback
   * @returns {any} hash encrypted value
   */
  storeFile(
    storerAccount,
    file,
    encryptProgressCallback,
    uploadProgressCallback,
    progressMessageCallback,
    metadata,
    showManifestAddresses,
    pin,
  ) {
    return this.Store.storeEncryptedFile(
      file,
      storerAccount.privateKey,
      encryptProgressCallback,
      uploadProgressCallback,
      progressMessageCallback,
      true,
      metadata,
    ).then((hash) => {
      return this.getStored('all', storerAccount).then((response) => {
        let storedFiles = response.files
        let oldStoredManifestAddress = response.manifestAddress
        let isStored = false
        for (var i = 0; i < storedFiles.length; i++) {
          if (storedFiles[i].address === hash.address) {
            isStored = true
          }
        }
        if (isStored === false) {
          storedFiles.push(hash.toJSON())
          return this.storeEncryptedValue(
            'stored-1.0',
            JSON.stringify({ storedFiles: storedFiles }),
            storerAccount,
            storerAccount.privateKey,
            pin,
          ).then((storedManifestAddress) => {
            if (showManifestAddresses === true) {
              return {
                storedFile: hash,
                storedManifestAddress: storedManifestAddress,
                oldStoredManifestAddress: oldStoredManifestAddress,
              }
            } else {
              return hash
            }
          })
        } else {
          return false
        }
      })
    })
  }

  // contacts
  /**
   * Init contacts
   * @param {any} storerAccount account
   * @returns {any} result
   */
  initContacts(storerAccount) {
    return this.storeEncryptedValue('contacts-1.0', '[]', storerAccount, storerAccount.privateKey)
  }

  /**
   * Get contacts
   * @param {any} storerAccount account
   * @returns {any} contacts
   */
  getContacts(storerAccount) {
    // debugger
    return this.retrieveDecryptedValue('contacts-1.0', storerAccount.address, storerAccount.privateKey)
      .then((contactsJSON) => {
        let contacts = JSON.parse(contactsJSON)
        return contacts.map((c) => new Contact(c))
      })
      .catch((error) => {
        if (error.status === 404) {
          return []
        } else {
          throw new Error(`couldn't retrieve contacts: ${error}`)
        }
      })
  }

  /**
   * Store contact
   * @param {any} storerAccount account
   * @param {any} contact to store
   * @returns {any} result
   */
  storeContact(storerAccount, contact) {
    return this.getContacts(storerAccount).then((contacts) => {
      let flatContacts = contacts.map((c) => c.toJSON())
      flatContacts.push(contact.toJSON())
      let contactsJSON = JSON.stringify(flatContacts)
      return this.storeEncryptedValue('contacts-1.0', contactsJSON, storerAccount, storerAccount.privateKey)
    })
  }

  // values

  /**
   * Store value
   * @param {string} key name
   * @param {string} value to store
   * @param {any} storerAccount account
   * @returns {any} result
   */
  storeValue(key, value, storerAccount, pin = false) {
    return this.SF.set(storerAccount.address, key, storerAccount.privateKey, value, pin)
  }

  /**
   * Retrieve (get) value
   * @param {any} key name
   * @param {any} storerAccount account
   * @returns {string} value
   */
  retrieveValue(key, storerAccount) {
    return this.SF.get(storerAccount.address, key, storerAccount.privateKey)
  }

  // encrypted values

  /**
   * store encrypted value
   * @param {string} key name
   * @param {string} value to store
   * @param {string} storerAccount account
   * @param {string} password to use
   * @returns {any} result
   */
  storeEncryptedValue(key, value, storerAccount, password, pin = false) {
    let iv = Crypto.generateRandomIV()
    const encryptedString = Crypto.encryptString(value, password, iv)
    let ivAndEncryptedString = '0x' + iv.toString('hex') + encryptedString
    return this.SF.set(storerAccount.address, key, storerAccount.privateKey, ivAndEncryptedString, pin)
  }

  /**
   * retrieve decrypted value
   * @param {string} key name
   * @param {string} address to use
   * @param {string} password to use
   * @returns {string} decrypted value
   */
  retrieveDecryptedValue(key, address, password, withAddress = false) {
    if (withAddress === false) {
      return this.SF.get(address, key, password, 'arraybuffer').then((encryptedBuffer) => {
        let ivAndEncryptedString = new TextDecoder().decode(encryptedBuffer).replace('0x', '')
        let encryptedString = ivAndEncryptedString.substring(32)
        let iv = Buffer.from(ivAndEncryptedString.substring(0, 32), 'hex')
        return Crypto.decryptString(encryptedString, password, iv)
      })
    } else if (withAddress === true) {
      return this.SF.get(address, key, password, 'arraybuffer', true).then((response) => {
        let encryptedBuffer = response.value
        let ivAndEncryptedString = new TextDecoder().decode(encryptedBuffer).replace('0x', '')
        let encryptedString = ivAndEncryptedString.substring(32)

        let iv = Buffer.from(ivAndEncryptedString.substring(0, 32), 'hex')

        let val = Crypto.decryptString(encryptedString, password, iv)

        return {
          value: val,
          address: response.address,
        }
      })
    }
  }

  /**
   * retrieve decrypted value
   * @param {string} key name
   * @param {string} address to use
   * @param {string} password to use
   * @returns {string} decrypted value
   */
  retrieveUnencryptedValue(key, address, privateKey) {
    if (typeof privateKey === 'undefined') {
      throw new Error('a private key must be provided')
    }
    return this.SF.get(address, key, privateKey, 'arraybuffer').then((t) => {
      let ivAndEncryptedString = bytesToHex(encryptedBuffer)
      let iv = ivAndEncryptedString.substring(0, 34)
      let encryptedString = ivAndEncryptedString.substring(34)
      return Crypto.decryptString(encryptedString, password, iv)
    })
  }
}

export default SwarmStore

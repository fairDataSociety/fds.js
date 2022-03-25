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

import { hash } from 'eth-ens-namehash'

import { toWei } from 'web3-utils'

import ENS2 from './FDS-ENS2.js'
import Mailbox from './FDS-Mailbox.js'

import Swarm from './FDS-Swarm.js'
import SwarmFeeds from './FDS-SwarmFeeds.js'
import Crypto from './FDS-Crypto.js'

import Message from './models/Message.js'
import Hash from './models/Hash.js'
import Contact from './models/Contact.js'

class Mail {
  constructor(config, account) {
    this.account = account
    this.config = config

    this.Mailbox = new Mailbox(config)

    this.Store = new Swarm(config, account)
    this.SF = new SwarmFeeds(config)
    this.SwarmStore = this.account.SwarmStore
  }

  //
  //
  /**
   * @sendFileTo
   * TODO: later will replace callbacks with emitted events...
   * @param {any} senderAccount account
   * @param {any} recipientSubdomain name
   * @param {any} file to send
   * @param {any} encryptProgressCallback callback
   * @param {any} uploadProgressCallback callback
   * @param {any} progressMessageCallback callback
   * @returns {any} success
   */
  lookupContact(senderAccount, recipientSubdomain) {
    let ENS = new ENS2(senderAccount, this.config.ensConfig)

    let multiboxAddress, recipientPublicKey

    // let senderSubdomainNameHash = hash(senderAccount.subdomain + '.' + this.config.ensConfig.domain);
    let recipientSubdomainNameHash = hash(recipientSubdomain + '.' + this.config.ensConfig.domain)
    let feedLocationHash = this.Mailbox.encodeFeedLocationHash(senderAccount.address, recipientSubdomainNameHash)

    //get public key
    // progressMessageCallback(`retrieving public key`);
    return ENS.getPubKey(recipientSubdomain)
      .then((publicKey) => {
        //calculate shared secret
        recipientPublicKey = '0x' + publicKey.substr(2, 130)
        // let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, publicKey);
        // return sharedSecret;
        //retrieve multihash
      })
      .then((secret) => {
        // sharedSecret = secret;
        // progressMessageCallback(`retrieving mailbox address`);
        return ENS.getMultihash(recipientSubdomain)
        //if multihash
      })
      .then((hash) => {
        multiboxAddress = hash
        // progressMessageCallback(`retrieving connection`);
        if (multiboxAddress === '0x') {
          throw Error('could not find multihash entry')
        }
      })
      .then((request) => {
        return new Contact({
          subdomain: recipientSubdomain,
          publicKey: recipientPublicKey,
          multiboxAddress: multiboxAddress,
          feedLocationHash: feedLocationHash,
        })
      })
  }

  async resolveENS({ sender, toResolveAccount }) {
    if (!toResolveAccount) {
      throw new Error('[ENS Resolver] Missing account')
    }

    // If the account is already an address there is no need to check the contract
    if (toResolveAccount.startsWith('0x')) {
      return toResolveAccount
    }
    const ENS = new ENS2(sender, this.config.ensConfig)
    return ENS.getPubKey(toResolveAccount)
  }

  /**
   * @sendToAccount
   * @param {any} sender account
   * @param {any} recipient name
   * @param {any} file to send
   * @param {any} multiboxPath
   * @param {any} encryptProgressCallback callback
   * @param {any} uploadProgressCallback callback
   * @param {any} progressMessageCallback callback
   * @returns {any} message
   */
  async sendToAccount({
    sender,
    recipient,
    file,
    multiboxPath,
    encryptProgressCallback,
    uploadProgressCallback,
    progressMessageCallback,
  }) {
    const senderSubdomainNameHash = hash(`${sender.subdomain}.${this.config.ensConfig.domain}`)
    const recipientSubdomainNameHash = hash(`${recipient}.${this.config.ensConfig.domain}`)
    const feedLocationHash = this.Mailbox.encodeFeedLocationHash(sender.address, recipientSubdomainNameHash)

    progressMessageCallback?.(`Retrieving ${recipient}'s public key`)
    const recipientPublicKey = await this.resolveENS({ sender, toResolveAccount: recipient })
    const sharedSecret = Crypto.calculateSharedSecret(sender.privateKey, recipientPublicKey)

    progressMessageCallback?.(`Retrieving mailbox address`)
    const ENS = new ENS2(sender, this.config.ensConfig)
    const multiboxAddress = await ENS.getMultihash(recipient)

    progressMessageCallback?.(`Retrieving connection`)

    if (multiboxAddress === '0x') {
      throw new Error('Could not find multihash entry')
    }
    const request = await this.Mailbox.getInboxFeed(sender, sender.subdomain, multiboxAddress, multiboxPath)

    if (
      JSON.stringify(request.values) === JSON.stringify({}) ||
      request.values[senderSubdomainNameHash] === undefined
    ) {
      progressMessageCallback?.(`Creating connection ${sender.subdomain}->${recipient}`)
      await this.Mailbox.newInboxFeed(
        sender,
        sender.subdomain,
        senderSubdomainNameHash,
        multiboxAddress,
        feedLocationHash,
        multiboxPath,
      )
      await sender.storeContact(
        new Contact({
          subdomain: recipient,
          publicKey: recipientPublicKey,
          multiboxAddress: multiboxAddress,
          feedLocationHash: feedLocationHash,
        }),
      )
      const flh = this.Mailbox.decodeFeedLocationHash(feedLocationHash)
      await this.initMessages(recipientPublicKey, sender, flh.topic)
    }

    progressMessageCallback?.(`Storing encrypted file`)
    const storedFilehash = await this.Store.storeEncryptedFile(
      file,
      `0x${sharedSecret}`,
      encryptProgressCallback,
      uploadProgressCallback,
      progressMessageCallback,
    )

    progressMessageCallback?.(`Sending encrypted message`)
    let feedLocation = this.Mailbox.decodeFeedLocationHash(feedLocationHash)
    message = new Message(
      {
        to: recipient,
        from: sender.subdomain,
        hash: storedFilehash,
      },
      this.config,
      sender,
    )
    return await this.saveMessage(
      recipientPublicKey,
      sender,
      feedLocation.topic,
      message,
      multiboxPath,
      progressMessageCallback,
    )
  }

  /**
   * Receive
   * @param {any} recipientAccount account
   * @param {any} message message
   * @param {any} decryptProgressCallback callback
   * @param {any} downloadProgressCallback callback
   * @returns {any} stored file
   */
  receive(recipientAccount, message, decryptProgressCallback = console.log, downloadProgressCallback = console.log) {
    //get public key from repo
    let ENS = new ENS2(recipientAccount, this.config.ensConfig)
    return ENS.getPubKey(message.from)
      .then((senderPublicKey) => {
        //calculate shared secret
        let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, senderPublicKey)
        return '0x' + sharedSecret
      })
      .then((sharedSecret) => {
        //encrypt and upload to store
        let storedFile = this.Store.getDecryptedFile(
          message.hash,
          sharedSecret,
          decryptProgressCallback,
          downloadProgressCallback,
        )
        return storedFile
      })
  }

  /**
   * Retrieves sent file
   * @param {any} recipientAccount account
   * @param {any} message message
   * @param {any} decryptProgressCallback callback
   * @param {any} downloadProgressCallback callback
   * @returns {any} stored file
   */
  retrieveSent(
    recipientAccount,
    message,
    decryptProgressCallback = console.log,
    downloadProgressCallback = console.log,
  ) {
    //get public key from repo
    let ENS = new ENS2(recipientAccount, this.config.ensConfig)
    return ENS.getPubKey(message.to)
      .then((recipientPublicKey) => {
        //calculate shared secret
        let sharedSecret = Crypto.calculateSharedSecret(recipientAccount.privateKey, recipientPublicKey)
        return '0x' + sharedSecret
      })
      .then((sharedSecret) => {
        //encrypt and upload to store
        let storedFile = this.Store.getDecryptedFile(
          message.hash,
          sharedSecret,
          decryptProgressCallback,
          downloadProgressCallback,
        )
        return storedFile
      })
  }

  // ...

  /**
   * Initialize messages
   * @param {any} recipientPublicKey public key
   * @param {any} senderAccount account
   * @param {any} topic name
   * @returns {any} hash
   */
  initMessages(recipientPublicKey, senderAccount, topic) {
    let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey)
    return this.SwarmStore.storeEncryptedValue(
      topic,
      JSON.stringify({ messages: [] }),
      senderAccount,
      '0x' + sharedSecret,
    )
  }

  /**
   * Save message
   * @param {any} recipientPublicKey public key
   * @param {any} senderAccount account
   * @param {any} topic name
   * @param {any} message to save
   * @param {any} progressMessageCallback callback
   * @returns {any} hash
   */
  saveMessage(recipientPublicKey, senderAccount, topic, message, multiboxPath, progressMessageCallback = console.log) {
    progressMessageCallback(`retrieving connection message feed`)
    return this.getAccountMessages(recipientPublicKey, senderAccount, topic, multiboxPath).then((messages) => {
      progressMessageCallback(`saving message feed`)
      messages.push(message.toJSON())
      progressMessageCallback(`appending message`)
      let sharedSecret = Crypto.calculateSharedSecret(senderAccount.privateKey, recipientPublicKey)
      return this.SwarmStore.storeEncryptedValue(
        topic,
        JSON.stringify({ messages: messages }),
        senderAccount,
        '0x' + sharedSecret,
      )
    })
  }

  /**
   * Get account messages
   * @param {any} recipientPublicKey public key
   * @param {any} senderAccount account
   * @param {any} topic name
   * @returns {any} array of messages
   */
  getAccountMessages(recipientPublicKey, senderAccount, topic, multiboxPath) {
    return this.getMessageFeed(recipientPublicKey, senderAccount.address, senderAccount, topic, multiboxPath)
  }

  /**
   * Get messages
   * @param {any} type of messages, received or sent, received default
   * @param {any} account account
   * @returns {any} array of messages
   */
  getMessages(type = 'received', account, path) {
    switch (type) {
      case 'received':
        return this.getReceivedMessages(account, path)
      case 'sent':
        return this.getSentMessages(account, path)
    }
  }

  /**
   * Get received messages
   * @param {any} recipientAccount account
   * @returns {any} array of messages
   */
  getReceivedMessages(recipientAccount, multiboxPath) {
    let ENS = new ENS2(recipientAccount, this.config.ensConfig)
    return this.getSenders(recipientAccount, multiboxPath).then((senders) => {
      var feedPromises = []
      for (var i = senders.length - 1; i >= 0; i--) {
        feedPromises.push(
          new Promise((resolve, reject) => {
            var feedLocation = this.Mailbox.decodeFeedLocationHash(senders[i].feedLocationHash)
            return ENS.getPubKeyRaw(senders[i].senderNamehash).then((publicKey) => {
              return this.getMessageFeed(
                publicKey,
                feedLocation.address,
                recipientAccount,
                feedLocation.topic,
                multiboxPath,
              ).then(resolve)
            })
          }),
        )
      }
      return Promise.all(feedPromises).then((messageFeeds) => {
        return [].concat.apply([], messageFeeds).sort((a, b) => {
          return a.hash.time > b.hash.time ? 1 : -1
        })
      })
    })
  }

  /**
   * Get send messages
   * @param {any} recipientAccount account
   * @returns {any} array of messages
   */
  getSentMessages(recipientAccount, multiboxPath) {
    return recipientAccount.getContacts().then((contacts) => {
      var feedPromises = []
      for (var i = contacts.length - 1; i >= 0; i--) {
        feedPromises.push(
          new Promise((resolve, reject) => {
            let feedLocation = this.Mailbox.decodeFeedLocationHash(contacts[i].feedLocationHash)
            return this.getMessageFeed(
              contacts[i].publicKey,
              feedLocation.address,
              recipientAccount,
              feedLocation.topic,
              multiboxPath,
            ).then(resolve)
          }),
        )
      }
      return Promise.all(feedPromises).then((messageFeeds) => {
        //just concatenating the messages for now, later we'll be more clever with retrieval...
        return [].concat.apply([], messageFeeds).sort((a, b) => {
          return a.hash.time > b.hash.time ? 1 : -1
        })
      })
    })
  }

  /**
   * Get message feed
   * @param {any} publicKey public key
   * @param {any} address address
   * @param {any} account account
   * @param {any} topic name
   * @returns {any} messages with hash objects
   */
  getMessageFeed(publicKey, address, account, topic) {
    let sharedSecret = Crypto.calculateSharedSecret(account.privateKey, publicKey)
    return this.SwarmStore.retrieveDecryptedValue(topic, address, '0x' + sharedSecret)
      .then((decryptedManifest) => {
        let messageParsed = JSON.parse(decryptedManifest).messages
        let messageObjects = messageParsed.map((m) => new Message(m, this.config, account))
        let messageObjectsWithHashObjects = messageObjects.map((m) => {
          m.hash = new Hash(m.hash, this.config)
          return m
        })
        return messageObjectsWithHashObjects
      })
      .catch((error) => {
        if (error?.status !== 404) {
          throw new Error(error)
        }
        return []
      })
  }

  getTreeSenders(tree, senders = {}) {
    if (tree.children && tree.children.length > 0) {
      for (var i = tree.children.length - 1; i >= 0; i--) {
        senders = Object.assign(senders, this.getTreeSenders(tree.children[i]))
      }
      return senders
    } else {
      senders = Object.assign(senders, tree.values)
      return senders
    }
  }

  /**
   * Get senders
   * @param {any} recipientAccount account
   * @returns {any} sender and location hashes
   */
  async getSenders(recipientAccount, multiboxPath) {
    let ENS = new ENS2(recipientAccount, this.config.ensConfig)
    let multiboxAddress = await ENS.getMultihash(recipientAccount.subdomain)
    if (multiboxAddress === null) {
      throw new Error(`couldn't find mailbox for ${recipientAccount.subdomain}`)
    }
    let senderTree = await this.Mailbox.getInboxFeeds(recipientAccount, multiboxAddress, multiboxPath)

    let senders = this.getTreeSenders(senderTree)

    let feeds = []

    for (const senderNamehash of Object.keys(senders)) {
      feeds.push({
        senderNamehash: senderNamehash,
        feedLocationHash: senders[senderNamehash],
      })
    }

    return feeds
  }
}

export default Mail

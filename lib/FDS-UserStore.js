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

let Utils = require('./FDS-Utils.js');
let User = require('../models/User.js');

class UserStore {
    /**
     * Create user store
     * @param {any} config configuration settings
     * @param {any} Account to use
     */
    constructor(config, Account) {
        this.config = config;
        this.Account = Account;
        this.users = this.getAll();
    }

    /**
     * Get subdomain
     * @param {string} subdomain name
     * @returns {User} user 
     */
    get(subdomain) {
        let results = this.getAll().filter(user => user.subdomain === subdomain);
        if (results.length === 1) {
            return new User(results[0], this.Account);
        } else if (results.length === 0) {
            return false;
        } else {
            throw new Error('there should only be one result per subdomain');
        }
    }

    /**
     *  Get all users
     *  @returns {User} returns users from local storage
    */
    getAll() {
        let key = this.config.chainID ? `fds-users_${this.config.chainID}` : 'users';
        if (localStorage.getItem(key) === null) {
            return [];
        } else {
            let users = [];
            let usersIndex = JSON.parse(localStorage.getItem(key));
            for (var i = usersIndex.length - 1; i >= 0; i--) {
                users.push(new User(usersIndex[i], this.Account));
            }
            return users;
        }
    }

    /**
     * Add user to subdomain 
     * @param {any} subdomain name 
     * @param {any} wallet to use
     * @returns {User} user
     */
    addUser(subdomain, wallet) {
        if (this.get(subdomain) === false) {
            let user = new User({
                // order: this.getAll().length + 1,
                subdomain: subdomain,
                wallet: wallet
            }, this.Account);
            this.users.push(user);
            this.saveAll();
            return user;
        } else {
            throw new Error('user already present in local storage');
        }
    }

    /**
     * Delete subdomain
     * @param {any} subdomain name
     */
    delete(subdomain) {
        this.users = this.getAll().filter(user => user.subdomain !== subdomain);
        this.saveAll();
    }

    /**
     * Save all 
     * @returns {any} result 
     */
    saveAll() {
        let key = this.config.chainID ? `fds-users_${this.config.chainID}` : 'users';
        let users = [];
        for (var i = this.users.length - 1; i >= 0; i--) {
            users.push(this.users[i].toJSON());
        }
        return localStorage.setItem(key, JSON.stringify(users));
    }

    /**
     * Restore subdomain from JSON wallet 
     * @param {string} subdomain name
     * @param {string} walletJSONString json wallet as string
     * @returns {User} user
     */
    restore(subdomain, walletJSONString) {
        let wallet = JSON.parse(walletJSONString);
        return this.addUser(subdomain, wallet);
    }
}

module.exports = UserStore;
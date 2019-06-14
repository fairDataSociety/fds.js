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

// multibox smart contracts

let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let MultiboxContract = require('../abi/Multibox.json');
let KVTContract = require('../abi/KeyValueTree.json');

let httpTimeout = 2000;

class Multibox {

    constructor(config) {
        this.config = config;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, httpTimeout));
        this.gasPrice = this.web3.utils.toWei(config.gasPrice.toString(), 'gwei');
    }

    /**
     * encode feed locatio hash
     * @param {any} senderAddress address
     * @param {any} recipientNamehash recepient hash 
     * @returns {any} encoded sender and recipient hash
     */
    encodeFeedLocationHash(senderAddress, recipientNamehash) {
        return senderAddress + recipientNamehash.substr(42, 66);
    }
    /**
     * subdomain name hash to feed location hash
     * @param {any} recipientNamehash hash of recipient name
     * @returns {any} substring of recepient name hash that is feed location hash
     */
    subdomainNameHashToFeedLocationHash(recipientNamehash) {
        return recipientNamehash.substr(42, 66);
    }
    /**
     * Decode feed location
     * @param {any} feedLocationHash hash of feed location
     * @returns {any} object with address and topic
     */
    decodeFeedLocationHash(feedLocationHash) {
        return {
            address: feedLocationHash.substring(0, 42),
            topic: feedLocationHash.substr(42, 66)
        };
    }

    /**
     * deploy multibox
     * @param {any} wallet wallet 
     * @param {number} nonce number
     * @returns {TransactionReceipt} transactio receipt
     */
    deployMultibox(wallet, nonce) {
        let contract = new this.web3.eth.Contract(MultiboxContract.abi);
        let dataTx = contract.deploy({ data: MultiboxContract.bytecode }).encodeABI();
        let privateKey = wallet.wallet.getPrivateKeyString();
        //console.log(this.gasPrice);  // 50000000000

        let tx = {
            from: wallet.wallet.getAddressString(),
            data: dataTx,
            gas: 5000000,
            gasPrice: this.gasPrice,
            nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    return hash;
                });
        });
    }

    // multibox has to be initialized
    initialize(wallet, multiboxAddress, nonce) {
        let multiboxContract = new this.web3.eth.Contract(MultiboxContract.abi, multiboxAddress);
        let privateKey = wallet.wallet.getPrivateKeyString();

        let dataTx = multiboxContract.methods.init().encodeABI();
        let tx = {
            from: wallet.wallet.getAddressString(),
            to: multiboxAddress,
            data: dataTx,
            gas: 4000000,
            gasPrice: this.gasPrice, //500000000, 
            nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    console.log("multibox initialized:" + hash);
                    return hash;
                });
        });
    }

    /**
     * create new request
     * @param {any} senderAccount account 
     * @param {any} recipientSubdomain name
     * @param {any} multiboxAddress address
     * @param {any} feedLocationHash hash
     * @returns {TransactionReceipt} transactio receipt
     */
    async newRequest(senderAccount, recipientSubdomain, applicationDomain, multiboxAddress, feedLocationHash) {

        try {
            let recepientKvt = await this.getKvt(multiboxAddress, 0); // get 0 KVT of recepient
            let recipientNamehash = namehash.hash(senderAccount.subdomain + '.' + this.config.ensConfig.domain);

            let nodeName = applicationDomain + senderAccount.subdomain; // to which node will i write to
            let nodeId = "0x" + await this.getSwarmDigest(senderAccount, nodeName);

            let writeKeyPair = await this.setValueForKey(senderAccount, recepientKvt, nodeId, recipientNamehash, feedLocationHash);

            console.log(writeKeyPair);
            return writeKeyPair;

        } catch (e) {
            console.error(e); 
        }
        /*
        let recipientMultiboxContract = await this.getMultiboxContract(multiboxAddress); // new this.web3.eth.Contract(MultiboxContract.abi, multiboxAddress);
        let recipientNamehash = namehash.hash(senderAccount.subdomain + '.' + this.config.ensConfig.domain); 

        let kvtRoots = recipientMultiboxContract.methods.getRoots(namehash).call();
        console.log(roots);

        // ok, so what we need now is get 
        // 1. get kvt[0], 
        // 2. get applicationDomanNode
        // 3. get applicationDoman/sender nodeId 
        // 4. write keyValue to applicationDoman/sender

        let dataTx = recipientMultiboxContract.methods.newRequest(
            recipientNamehash,
            feedLocationHash
        ).encodeABI();

        let privateKey = senderAccount.privateKey;
        let tx = {
            from: senderAccount.address,
            to: multiboxAddress,
            data: dataTx,
            gas: 510000,
            gasPrice: this.gasPrice
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    return hash;
                });
        });*/
    }


    /**
     * Get raw requests 
     * @param {any} namehash hash 
     * @param {any} applicationDomain  application domain node
     * @param {any} multiboxAddress address
     * @returns {TransactionObject} transaction 
     */
    async getRequestRaw(namehash, applicationDomain, multiboxAddress) {
        console.error("getRequestRaw depricated");
        //let recipientMultiboxContract = await this.getMultiboxContract(multiboxAddress);
        //return recipientMultiboxContract.methods.getRequest(namehash).call();

    }

    /**
     * get requests from subdomain and address 
     * @param {any} subdomain name
     * @param {any} applicationDomain  application domain node
     * @param {any} multiboxAddress address
     * @returns {any} raw requestss
     */
    async getRequest(account, applicationDomain, multiboxAddress) {
        //console.log("getting request"); 

        try {
            let pathToDomain = applicationDomain.substring(0, applicationDomain.length - 1);
            let hashedName = namehash.hash(account.subdomain + '.' + this.config.ensConfig.domain); // hashed name of sender
            let parentNodeId = "0x" + await this.getSwarmDigest(account, pathToDomain); // node id of application domain
            let nodeName = applicationDomain + account.subdomain; // to which node will i write to
            let nodeId = "0x" + await this.getSwarmDigest(account, nodeName);
            //console.log(applicationDomain, parentNodeId, nodeName, nodeId, hashedName, JSON.stringify(namehash));

            let recepientKvt = await this.getKvt(multiboxAddress, 0); // get 0 KVT of recepient

            let isParentNode = await this.isNode(recepientKvt,  parentNodeId); // check if your node exists 
            //console.log(parentNodeId + " isParentNode:" + isParentNode);

            let isNode = await this.isNode(recepientKvt, nodeId); // check if your node exists 
            if (isNode === false) { // node does not exists, create one at 
                let nodeCreated = await this.createNode(account, recepientKvt, parentNodeId, nodeId);
                console.log("created node:" + nodeCreated);
            } else {
                //console.log(nodeId + " node:" + isNode);
            }

            let data = await this.getValueForKey(recepientKvt, nodeId, hashedName);
            //console.log("request", data);
            return data;

        } catch (e) {
            console.error(e);
        }
        return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }

    /**
     * Get requests to multibox
     * @param {any} account account
     * @param {any} applicationDomain node to get requests / key-pairs from
     * @param {any} multiboxAddress address of multibox contract
     * @returns {any} requests, returns all requests under application domain (meaning it must traverse tree down)
     */
    async getRequests(account, applicationDomain, multiboxAddress) {

        //console.log(account, applicationDomain, multiboxAddress);
        let recepientKvt = await this.getKvt(multiboxAddress, 0); // get 0 KVT of recepient
        let pathToDomain = applicationDomain.substring(0, applicationDomain.length - 1);

        let parentNodeId = "0x" + await this.getSwarmDigest(account, pathToDomain); // node id of application domain

        let isParentNode = await this.isNode(recepientKvt, parentNodeId); // check if your node exists 
        //console.log(parentNodeId + " isParentNode:" + isParentNode);
        // traverse tree from parentNode down and return requests
        let requests = []; 

        await this.traverseKVTNodesKeyPairs(recepientKvt, parentNodeId, requests); 
        return requests; 
        /*return recipientMultiboxContract.methods.getRequests().call();*/
    }
    async traverseKVTNodesKeyPairs(kvtContract, node, requests) {
        let keyPairs = await this.getKeysValues(kvtContract, node);   // get values written 
        for (let j = 0; j < keyPairs.keys.length; j++) {
            requests.push({ senderNamehash: keyPairs.keys[j], feedLocationHash: keyPairs.values[j] });
        }

        let children = await this.getNodeChildren(kvtContract, node);
        for (let i = 0; i < children.length; i++) {
            let childs = await this.traverseKVTNodesKeyPairs(kvtContract, children[i], requests);
        }
    }
    /////////////////////////////////////////////////////////////////////////////////////////////
    // MULTIBOX DATA 
    ///////////////////////////////////////////////////////////////////////////////////////////// 
    async addMultiboxData(multiboxAddress) {
        let data =
        {
            name: 'multibox',
            toggled: false,
            id: multiboxAddress,
            //multibox: multiboxAddress,
            children: []
        };

        return data;
    }
    async addKVTData(kvtAddress) {
        let data =
        {
            name: 'kvt',
            toggled: false,
            id: kvtAddress,
            //kvt: kvtAddress,
            children: []
        };

        return data;
    }
    async addKVTNode(kvtAddress, nodeId) {
        //var nodeName = this.getSwarmNodeName(nodeId);
        let data =
        {
            name: "",
            toggled: false,
            id: nodeId,
            kvt: kvtAddress,
            //nodeId: nodeId,
            //children: []
        };

        return data;
    }
    /////////////////////////////////////////////////////////////////////////////////////////////
    // MULTIBOX SPECIFIC 
    ///////////////////////////////////////////////////////////////////////////////////////////// 
    async traverseMultibox(fromAccount, subdomain)
    {
        console.log("traverseMultibox", subdomain);

        //let publickKey = await this.ENS.getPubKey(subdomain);
        let multiboxAddress  = await fromAccount.Mail.ENS.getMultihash(subdomain);
        let multiboxContract = await this.getMultiboxContract(multiboxAddress);
        let roots            = await this.getRoots(multiboxContract);

        var multiboxData = await this.addMultiboxData(multiboxAddress); 
        multiboxData.multiboxOwner = await this.getMultiboxOwner(multiboxContract);

        for (let i = 0; i < roots.length; i++)
        {
            var kvtData = await this.addKVTData(roots[i]); 
            multiboxData.children.push(kvtData);

            let kvtContract = await this.getKvtContract(roots[i]); 
            let kvtNodes = await this.traverseKVT(fromAccount, kvtContract, kvtData); 
        }

        console.log("multiboxData", multiboxData);
        return multiboxData;
    }
    async traverseKVT(account, kvtContract, kvtData) {
        let rootNode = await this.getRootNode(kvtContract); 
        let owner = await this.getKvtOwner(kvtContract); 

        kvtData.kvtOwner = owner; 
        //console.log(" contract rootNode:", kvtContract, rootNode);
        let nodes = await this.traverseKVTNodes(account, kvtContract, rootNode, kvtData);
    }
    async traverseKVTNodes(account, kvtContract, node, parentNodeData) {
        let nodeData = await this.addKVTNode(kvtContract._address, node);

        if (parentNodeData.children === undefined)
            parentNodeData.children = []; 

        parentNodeData.children.push(nodeData);

        let keyPairs = await this.getKeysValues(kvtContract, node);   // get values written 
        {
            nodeData.keyPairs = [];
            for (let j = 0; j < keyPairs.keys.length; j++)
            {
                nodeData.keyPairs.push({ key: keyPairs.keys[j], value: keyPairs.values[j] });
            }
        }

        try {
            nodeData.nodeName = await this.getSwarmNodeName(account, node);
            nodeData.name = this.lastNameInPath(nodeData.nodeName);
        } catch (e) {console.log(e)}  

        let children = await this.getNodeChildren(kvtContract, node);
        for (let i = 0; i < children.length; i++) {
            let childs = await this.traverseKVTNodes(account, kvtContract, children[i], nodeData);
        }
    }
    /////////////////////////////////////////////////////////////////////////////////////////////
    // MULTIBOX CONTRACT
    ///////////////////////////////////////////////////////////////////////////////////////////// 

    async getMultiboxContract(multiboxAddress) {
        let multiboxContract = new this.web3.eth.Contract(MultiboxContract.abi, multiboxAddress);
        return multiboxContract;
    }
    async getMultiboxOwner(multiboxContract) {
        let owner = await multiboxContract.methods.owner().call();
        return owner;
    }
    async getRoots(multiboxContract) {
        let roots = await multiboxContract.methods.getRoots().call();
        //console.log("roots",roots);
        return roots;
    }
    /////////////////////////////////////////////////////////////////////////////////////////////
    // KVT CONTRACT
    ///////////////////////////////////////////////////////////////////////////////////////////// 
    async getKvt(multiboxContractAddress, rootIndex = 0) {
        let multiboxContract = await this.getMultiboxContract(multiboxContractAddress);
        let roots = await this.getRoots(multiboxContract);
        let kvtContract = await this.getKvtContract(roots[rootIndex]);
        return kvtContract;
    }

    async getKvtContract(kvtRootAddress) {
        let kvtContract = await new this.web3.eth.Contract(KVTContract.abi, kvtRootAddress);
        //console.log("kvtContract", kvtContract );
        return kvtContract;
    }
    async getKvtOwner(kvtContract) {
        let owner = await kvtContract.methods.owner().call();
        return owner;
    }
    async getRootNode(kvtContract) {
        let rootNodeId = await kvtContract.methods.getRootId().call();
        //console.log("rootNodeId", rootNodeId);
        return rootNodeId;
    }
    async getSharedNode(kvtContract) {
        let sharedNodeId = await kvtContract.methods.getShared().call();
        //console.log("sharedNodeId", sharedNodeId);
        return sharedNodeId;
    }
    async isNode(kvtContract, nodeId) {
        let isNode = await kvtContract.methods.isNode(nodeId).call();
        //console.log(nodeId + " is node ", isNode);
        return isNode;
    }
    async getNodeChildren(kvtContract, nodeId) {
        let children = await kvtContract.methods.getChildren(nodeId).call();
        //console.log(nodeId + " children ", children);
        return children;
    }

    async getKeysValues(kvtContract, nodeId) {
        let allValues = await kvtContract.methods.getKeysValues(nodeId).call();
        //console.log("node " + nodeId + " getKeysValues: ", allValues);
        return allValues;
    }

    async getValueForKey(kvtContract, nodeId, namehash) {
        let recordedValue = await kvtContract.methods.getValue(nodeId,namehash).call();

        console.log("node " + nodeId + " getValueForKey " + namehash + " : " + recordedValue);
        return recordedValue;
    }

    async setValueForKey(account, kvtContract, nodeId, namehash, data) {
        let dataTx = kvtContract.methods.setKeyValue(nodeId, namehash, data).encodeABI();
        let tx = {
            from: account.address,
            to: kvtContract._address,
            data: dataTx,
            gas: 500000,
            gasPrice: this.gasPrice
            //nonce: nonce
        };

        let signed = await this.web3.eth.accounts.signTransaction(tx, account.privateKey); 
        let signedTx = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);

        console.log("setValue: ", signedTx);
        /*
        return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    console.log("createNode completed:" + hash);
                    return hash;
                });
        });
        */

        console.log("node " + nodeId + " setValueForKey " + namehash + " : " + data);
        return signedTx;
    }

    async createNode(account, kvtContract, parentNodeId, newNodeId)
    {
        let dataTx = kvtContract.methods.addChildNode(parentNodeId, newNodeId).encodeABI();
        let tx = {
            from: account.address, 
            to: kvtContract._address,
            data: dataTx,
            gas: 500000,
            gasPrice: this.gasPrice 
            //nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, account.privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    console.log("createNode completed:" + hash);
                    return hash;
                });
        });
    }

    /////////////////////////////////////////////////////////////////////////////////////////////
    // PATH & NODE VALIDATION FOR KVT
    ///////////////////////////////////////////////////////////////////////////////////////////// 

    async validatePath(acc, fullpath, multiboxContractAddress, root=0)
    {
        console.log("validating " + fullpath);
        let kvtContract = await this.getKvt(multiboxContractAddress, root); 

        let nodes = this.splitPath(fullpath); 
        let nodeName = "/";
        let nodeId = "";

        for (let i = 0; i < nodes.length; i++)
        {
            if (nodes[i].length === 0) continue; 
            if( i === 1) nodeName = nodeName + nodes[i];
            if (i > 1) nodeName = nodeName + "/" + nodes[i];

            nodeId = await this.getSwarmDigest(acc, nodeName);
            let isNode = await this.isNode(kvtContract, "0x"+nodeId); 
            
            if (isNode===false) {
                console.error(nodeName + " does not exist in " + kvtContract._address + " id:" + nodeId);
                return nodeName; // what does not exist
            } else
                console.log(nodeName + ":" + nodeId + " " + isNode);
        }
        return true;
    }

    async createPath(acc, fullpath, multiboxContractAddress, root=0)
    {
        //console.log("creating " + fullpath);
        let kvtContract = await this.getKvt(multiboxContractAddress, root); 
        let nodes = this.splitPath(fullpath);
        let nodeName = "/";
        let nodeId = await this.getSwarmDigest(acc, nodeName);
        let parentNodeId = nodeId;
        let added = 0;

        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].length === 0) continue;
            if (i === 1) nodeName = nodeName + nodes[i];
            if (i > 1) nodeName = nodeName + "/" + nodes[i];

            nodeId = await this.getSwarmDigest(acc, nodeName);
            let isNode = await this.isNode(kvtContract, "0x" + nodeId);
            console.log(nodeName + " " + nodeId);

            if (isNode === false) {
                let newNodeCreated = await this.createNode(acc, kvtContract, "0x" + parentNodeId, "0x" +nodeId); 
                parentNodeId = nodeId;
                added++;
                console.log(nodeName + " creating in " + parentNodeId + " at " + nodeId + " " + newNodeCreated);
            } else {
                parentNodeId = nodeId;
                //console.log("parent:" + nodeName + ":" + nodeId);
            }
        }
        return added;  // last node visited, or nodeId into which one should write
    }

    /////////////////////////////////////////////////////////////////////////////////////////////
    // HELPERS
    ///////////////////////////////////////////////////////////////////////////////////////////// 

    async getSwarmDigest(account, data) {
        let h = await account.Mail.SF.sendRequest('/bzz-raw:/', 'POST', 'text', account.Tx.web3.utils.toHex(data));
        let r = await account.Mail.SF.sendRequest('/bzz-raw:/' + h, 'GET');
        //console.log(data + ":" + h + ":" + r);
        return h;
    }
    async getSwarmNodeName(account, nodeId) {
        let name = await account.Mail.SF.sendRequest('/bzz-raw:/' + nodeId.substring(2,nodeId.length), 'GET');
        return name;
    }

    /**
     * Split string by '/', returns node names
     * @param {any} fullpath path to node 
     * @returns {string[]} node names
     */
    splitPath(fullpath) {
        var nodeNames = fullpath.split("/");
        return nodeNames;
    }

    lastNameInPath(fullpath) {
        var n = fullpath.lastIndexOf('/');
        if(n!==-1 && fullpath!=="/")
            return fullpath.substring(n + 1);

        return fullpath;
    }

    hasColon(fullpath) {
        var hasColon = fullpath.indexOf(":"); 
        if (hasColon !== -1) 
            fullpath.substring(0, hasColon); 

        return fullpath;
    }

}

module.exports = Multibox;
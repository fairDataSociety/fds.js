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

let Web3 = require('web3');
let namehash = require('eth-ens-namehash');
let Swarm = require('./FDS-Swarm.js');

let MultiboxContract = require('./contracts/Multibox.js');
let KeyValueTreeContract = require('./contracts/KeyValueTree.js');

class Multibox {

    constructor(account, config) {
      this.account = account;
      this.con = null;
      this.roots = null;
      this.contractAddress = null;
      this.kvt0 = null; 
      this.kvts = null; // no need
      this.owner = null;
      //console.log("multibox", config, account);
      this.Store = new Swarm(config, account);
    }

    async at(address) {
      //debugger;
      console.log("mb instantiated");
      this.mb = await new MultiboxContract(this.account, address);
      this.contractAddress = address;
      this.roots = await this.mb.getRoots();
      this.kvt0 = await new KeyValueTreeContract(this.account, this.roots[0]);
      this.kvts = this.roots.map(root => new KeyValueTreeContract(this.account, root));
      this.owner = await this.mb.owner();
      return this;
    }

    async deploy(){
      this.mb = await new MultiboxContract(this.account);
      this.contractAddress = this.mb.contractAddress;
      this.roots = await this.mb.getRoots();
      this.kvt0 = await new KeyValueTreeContract(this.account, this.roots[0]);
      this.kvts = this.roots.map(root => new KeyValueTreeContract(this.account, root));      
      return this;
    }
 
    // note - would be good to check these in reverse to avoid unneccesary calls
    async get(path){
      return this.retrievePathValues(path);
    }

    async set(path, key, value){
      await this.createPath(path);
      let nodeId = await this.Store.getSwarmDigest(path);
      return this.kvt0.setKeyValue(nodeId, key, value);
    }

    /* wrong 
    async createPath(path, value, kvti = 0){
      let parentNodeId;
      let splitPath = path.split('/').slice(1);

      if(splitPath[0] === 'root'){
        //do nothing
        parentNodeId = await this.kvt0.getRootId();
      }else
      if(splitPath[0] === 'shared'){
        parentNodeId = await this.kvt0.getSharedId();
      }else{
        throw new Error('path must begin /shared or /root');
      }

      for (var i = 0; i < splitPath.length - 1; i++) {
        let currentPath = '/'+splitPath.slice(0,i+2).join('/');
        let newNodeId = await this.Store.getSwarmDigest(currentPath);
        let addChildNode = await this.kvt0.addChildNode(parentNodeId, newNodeId);
        parentNodeId = newNodeId;
      }

      return true;
    }*/
    async createPath(path, kvti = 0) {
        //console.log("creating path " + path);
        //let kvt = await new KeyValueTreeContract(this.account, this.roots[kvti]);
        let roots = await this.mb.getRoots();
        let kvt = new KeyValueTreeContract(this.account, roots[kvti]);
        let nodes = this.splitPath(path);
        let nodeName = "/";
        let nodeId = await this.Store.getSwarmDigest(nodeName);
        let parentNodeId = nodeId;
        let added = 0;

        //console.log("kvt ", kvti, roots, kvt);

        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].length === 0) continue;
            if (i === 1) nodeName = nodeName + nodes[i]; // last and first case differ 
            if (i > 1) nodeName = nodeName + "/" + nodes[i];  // append

            //console.log("check for node " + nodeName);
            nodeId = await this.Store.getSwarmDigest(nodeName);
            let isNode = await kvt.isNode(nodeId);
            console.log(nodeName + " " + nodeId);

            if (isNode === false) {
                let newNodeCreated = await kvt.addChildNode(parentNodeId, nodeId); //
                // await this.createNode(acc, kvtContract, "0x" + parentNodeId, "0x" + nodeId);
                console.log("created new node " + nodeName + " " + newNodeCreated);
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

    async retrieveValues(nodeId){
      let keyValues = {};
      let keyValuesRaw = await this.kvt0.getKeyValues(nodeId);
      for (var i = 0; i < keyValuesRaw['keys'].length; i++) {
        keyValues[keyValuesRaw['keys'][i]] = keyValuesRaw['values'][i];
      }      
      return keyValues;
    }


    // this is wrong, parentIds are not correct 
    async retrieveTree(nodeId, values = false){
      let children = await this.kvt0.getChildren(nodeId);
      if(children.length === 0 && values === false){
        return {
          id: nodeId,
          parentId: false 
        };
      }else
      if(children.length === 0 && values === true){
        return {
          id: nodeId,
          parentId: false,
          values: await this.retrieveValues(nodeId)
        };
      }else{
        return {
          id: nodeId,
          parentId: false,
          values: await this.retrieveValues(nodeId),
          children: await this.retrievesDescendants(nodeId, values)
        };
      }

        // let output = [{
        //   id: nodeId,
        //   parentId: false,
        //   values: children
        // }];
        // for (var i = 0; i < children.length; i++) {
        //   let descendants = await this.retrieveTree(children[i], values);
        //   if(descendants.length > 0){
        //     output.push({
        //       id: children[i],
        //       parentId: nodeId,
        //       children: descendants
        //     });
        //   }else{
        //     if(values === true){
        //       output.push({
        //         id: children[i],
        //         parentId: nodeId,
        //         values: await this.retrieveValues(children[i])
        //       });
        //     }else{
        //       output.push({
        //         id: children[i],
        //         parentId: nodeId
        //       });
        //     }   
        //   }
        // }
        // return output;
      // }
    }

    async retrievesDescendants(nodeId, values = false){
      let children = await this.kvt0.getChildren(nodeId);
      let output = []
      for (var i = 0; i < children.length; i++) {
        let descendants = await this.retrievesDescendants(children[i], values);
        if(descendants.length > 0){
          output.push({
            id: children[i],
            parentId: nodeId,
            children: descendants
          });
        }else{
          let keyValues = {};
          if(values === true){
            keyValues = await this.retrieveValues(children[i]);
          }
          output.push({
            id: children[i],
            parentId: nodeId,
            values: keyValues
          });
        }
      }
      return output;
    }

    // retrieves tree structure only of path eg. /shared/mail
    async retrievePathNodes(path){
      let nodeId = await this.Store.getSwarmDigest(path);
      return await this.retrieveTree(nodeId);
    } 

    // retrieves tree structure and keyvalues of path eg. /shared/mail
    async retrievePathValues(path){
      let nodeId = await this.Store.getSwarmDigest(path);
      return await this.retrieveTree(nodeId, true);
    }        

    /////////////////////////////////////////////////////////////////////////////////////////////
    // MULTIBOX SPECIFIC 
    ///////////////////////////////////////////////////////////////////////////////////////////// 
    async traverseMultibox() {
        // this will traverse existing data, TODO: NEED TO REFRESH
        let roots = await this.mb.getRoots();
        console.log("traverseMultibox", this.owner, this.roots);

        var multiboxData = await this.addDataMultibox(this.contractAddress);
        multiboxData.multiboxOwner = this.owner;

        console.log("start multiboxData ", multiboxData);

        for (let i = 0; i < roots.length; i++) {
            var kvtData = await this.addDataKVT(roots[i]);
            multiboxData.children.push(kvtData);
            //console.log("kvt ", kvtData);

            let kvtContract = new KeyValueTreeContract(this.account, roots[i]);
            //console.log("kvt contract", roots[i], kvtContract);
            let kvtNodes = await this.traverseKVT(kvtContract, kvtData);
        }

        console.log("multiboxData", multiboxData);
        return multiboxData;
    }
    async traverseKVT(kvtContract, kvtData) {
        kvtData.kvtOwner = await kvtContract.owner(); 
        //console.log("kvt rootNode:", rootNode);
        let nodes = await this.traverseKVTNodes(kvtContract, await kvtContract.getRootId(), kvtData);
    }
    async traverseKVTNodes(kvtContract, node, parentNodeData) {
        console.log("travers node", node)
        let nodeData = await this.addDataKVTNode(kvtContract.contractAddress, node);

        if (parentNodeData.children === undefined)
            parentNodeData.children = [];

        parentNodeData.children.push(nodeData);

        let keyPairs = await this.getKeysValues(kvtContract, node);   // get values written 
        for (let j = 0; j < keyPairs.keys.length; j++) {
            nodeData.keyPairs.push({ key: keyPairs.keys[j], value: keyPairs.values[j] });
        }

        let children = await this.getNodeChildren(kvtContract, node);
        console.log("traverseKVTNodes children", children);

        for (let i = 0; i < children.length; i++) {
            let childs = await this.traverseKVTNodes(kvtContract, children[i], nodeData);
        }

        try {
            nodeData.nodeName = node;
            //nodeData.nodeName = await this.getSwarmNodeName(account, node);
            nodeData.nodeName = await this.getNodeDescription(node);
            nodeData.name = this.lastNameInPath(nodeData.nodeName);
        } catch (e) { console.log("can't get " + e + " " + node) }

        //console.log("traverseKVTNodes", kvtContract, node);
    }
    async getNodeChildren(kvtContract, nodeId) {
        let children = await kvtContract.getChildren(nodeId);
        console.log(nodeId + " children ", children);
        return children;
    }
    async getKeysValues(kvtContract, nodeId) {
        let allValues = await kvtContract.getKeyValues(nodeId);
        console.log("node " + nodeId + " getKeysValues: ", allValues);
        return allValues;
    }
    fetchWithTimeout(fetchPromise) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("Fetch is taking to long. Rejecting the response."));
            }, 5000);
            fetchPromise.then(resolve, reject);
        });
    }
    async getNodeDescription(nodeId, nodeData) {
        let url = "https://swarm.fairdatasociety.org" + '/bzz-raw:/' + nodeId.substring(2, nodeId.length);

        let response = await this.fetchWithTimeout(fetch(url));
        if (response.ok) {
            let text = await response.text();
            return text;
        }

        return nodeId;
    }
    /////////////////////////////////////////////////////////////////////////////////////////////
    // MULTIBOX DATA, fill a data structure suitable for displaying
    ///////////////////////////////////////////////////////////////////////////////////////////// 
    async addDataMultibox(multiboxAddress) {
        let data = {
            name: 'fairdrive',
            toggled: false,
            id: multiboxAddress,
            children: []
        };
        return data;
    }
    async addDataKVT(kvtAddress) {
        let data = {
            name: 'kvt',
            toggled: false,
            id: kvtAddress,
            children: []
        };
        return data;
    }
    async addDataKVTNode(kvtAddress, nodeId) {
        let data = {
            name: "",
            toggled: false,
            id: nodeId,
            kvt: kvtAddress,
            keyPairs: []
        };
        return data;
    }
    /////////////////////////////////////////////////////////////////////////////////////////////
    // MULTIBOX DATA 
    ///////////////////////////////////////////////////////////////////////////////////////////// 


    //////////////////////////////
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
        if (n !== -1 && fullpath !== "/")
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
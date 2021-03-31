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

import Swarm from './FDS-Swarm.js';

import MultiboxContract from './contracts/Multibox.js';
import KeyValueTreeContract from './contracts/KeyValueTree.js';

class Multibox {

    constructor(account, config) {
      this.account = account;
      this.con = null;
      this.roots = null;
      this.contractAddress = null;
      this.rootKvt = null; 
      this.kvts = null;

      this.Store = new Swarm(config, account);
    }

    async at(address){
      this.mb = await new MultiboxContract(this.account, address);
      this.contractAddress = address;
      this.roots = await this.mb.getRoots();
      this.rootKvt = new KeyValueTreeContract(this.account, this.roots[0]);
      this.kvts = this.roots.map(root => new KeyValueTreeContract(this.account, root));
      return this;
    }

    async deploy(){
      this.mb = await new MultiboxContract(this.account);
      this.contractAddress = this.mb.contractAddress;
      this.roots = await this.mb.getRoots();
      this.rootKvt = new KeyValueTreeContract(this.account, this.roots[0]);
      this.kvts = this.roots.map(root => new KeyValueTreeContract(this.account, root));      
      return this;
    }

    // note - we should use something other than swarm digest id's here eg. encrypted strings in multibox contract
    // it's unnecessarily expensive and also prone requires swarm hashes to be available from network in order to work

    // note - would be good to check these in reverse to avoid unneccesary calls
    async get(path, retrievePathNames = true){
      return this.retrievePathValues(path, retrievePathNames);
    }

    async set(path, key, value){
      await this.createPath(path);
      let nodeId = await this.Store.getSwarmDigest(path);
      return this.rootKvt.setKeyValue(nodeId, key, value);
    }

    async createPath(path, value, kvti = 0){
      let parentNodeId;
      let splitPath = path.split('/').slice(1);
      if(splitPath[0] === 'root'){
        //do nothing
        parentNodeId = await this.rootKvt.getRootId();
      }else
      if(splitPath[0] === 'shared'){
        parentNodeId = await this.rootKvt.getSharedId();
      }else{
        throw new Error('path must begin /shared or /root');
      }

      for (var i = 0; i < splitPath.length - 1; i++) {
        let currentPath = '/'+splitPath.slice(0,i+2).join('/');
        let newNodeId = await this.Store.getSwarmDigest(currentPath);
        let addChildNode = await this.rootKvt.addChildNode(parentNodeId, newNodeId);
        parentNodeId = newNodeId;
      }

      return true;
    }

    async retrieveValues(nodeId){
      let keyValues = {};
      let keyValuesRaw = await this.rootKvt.getKeyValues(nodeId);
      for (var i = 0; i < keyValuesRaw['keys'].length; i++) {
        keyValues[keyValuesRaw['keys'][i]] = keyValuesRaw['values'][i];
      }      
      return keyValues;
    }

    async retrieveTree(nodeId, values = false, retrievePathNames = false){
      let output = {
          id: nodeId,
          parentId: false
      };
      let children = await this.rootKvt.getChildren(nodeId);
      if(retrievePathNames === true){
        let pathName = await this.Store.getSwarmDigestValue(nodeId);
        output.name = pathName;
      }
      if(children.length === 0 && values === false){
        output = {
          id: nodeId,
          parentId: false 
        };
      }else
      if(children.length === 0 && values === true){
        output.values = await this.retrieveValues(nodeId);
      }else{
        output.values = await this.retrieveValues(nodeId);
        output.children =  await this.retrievesDescendants(nodeId, values, retrievePathNames);
      }

      return output;

    }

    async retrievesDescendants(nodeId, values = false, retrievePathNames = false){
      let children = await this.rootKvt.getChildren(nodeId);
      let output = []
      for (var i = 0; i < children.length; i++) {
        let descendants = await this.retrievesDescendants(children[i], values, retrievePathNames);

        let childOutput = {
          id: children[i],
          parentId: nodeId
        };
        if(retrievePathNames === true){
          let pathName = await this.Store.getSwarmDigestValue(children[i]);
          childOutput.name = pathName;
        }
        if(descendants.length > 0){
          childOutput.children = descendants;
          output.push(childOutput);
        }else{
          let keyValues = {};
          if(values === true){
            keyValues = await this.retrieveValues(children[i]);
          }
          childOutput.values = keyValues;
          output.push(childOutput);
        }
      }
      return output;
    }

    // retrieves tree structure only of path eg. /shared/mail
    async retrievePathNodes(path){
      let nodeId = await this.Store.getSwarmDigest(path);
      return await this.retrieveTree(nodeId, false, false);
    } 


    // retrieves tree structure and keyvalues of path eg. /shared/mail
    async retrievePathValues(path, retrievePathNames){
      let nodeId = await this.Store.getSwarmDigest(path);
      return await this.retrieveTree(nodeId, true, retrievePathNames);
    }        

}

export default Multibox;
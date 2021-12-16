//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This code has not been reviewed.
 * Do not use or deploy this code before reviewing it personally first.
 */

/*
  so how we tackle access rights? 
  upon creation root could be pupulated with common folders, but this was removed to reduce gas 
*/
/*
      privatenodeId      = addFolder(rootNodeId, 0x69ebce02fbffacce50622356b97cc93a78f17feb5bf8e8ccacbdb7032e3162dc); // none can r/w
      publicnodeId       = addFolder(rootNodeId, 0x7e00625d1d39ffe13a119d9085848880ad5ccd078e38677f3a705653326d44ed); 
      unrestrainednodeId = addFolder(rootNodeId, 0xd0e98c61c165756dc6a3294835afbb596b332b2a27061c997163e623939c6cc0); 
      
      setNodeAccess(publicnodeId, address(0x0), 1); // everyone can read, but not write
      setNodeAccess(sharedNodeId, address(0x0), 3); // unknown can add, but not read 
      setNodeAccess(unrestrainednodeId, address(0x0), 2); // all can read all can write
*/

// DONE: prepare events, to enable them replace all //! with "" 
// TODO: method to move key/value from nodeId to new nodeId 
// TODO: add nodeId from other kvt, if its possible to do cross-contract node sharing ...  else write additional contract to hold shared data 
//

contract KeyValueTree {
    address payable public owner;
    /*modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }*/
    function changeOwner(address payable _newOwner) public { 
        require(msg.sender == owner); 
        owner = _newOwner; 
    }
    
    bytes32 public receiver; // location of of the receiver, if 0x0, its for owner, otherwise privatekey of receiver is required as data in locatations will be encrypted for receiver
    bytes32 public description; // location of kvt description
    
    function getReceiver() public view returns (bytes32) { return receiver; }
    function getDescription() public view returns (bytes32) { return description; }
    
    function setReceiver(bytes32 newReceiver) public { 
        require(msg.sender == owner); 
        receiver=newReceiver; 
    }
    function setDescription(bytes32 newDescription) public 
    { 
        require(msg.sender == owner); 
        description=newDescription; 
    }    

    // should these be public, or private? and accessed through methods that also check accessRights ? 
    bytes32 public rootNodeId; // root of tree
    bytes32 public sharedNodeId; // incoming node id
    function getRootId() public view returns (bytes32) { return rootNodeId; }
    function getSharedId() public view returns (bytes32) { return sharedNodeId; }    

    bytes32[] nodes; // all folder roots
    mapping(bytes32 => uint256) nodesIndex; // map of folder to index (starts with 1, not 0!!)
    mapping(bytes32 => Node) internal Nodes; // nodeId to node
    mapping(bytes32 => mapping(bytes32 => bytes32[])) internal keyNodeIdValues; // feeds by sender by folder
    // AccessRights
    // contains 0x0 = 1, everyone can read/write
    // contains 0x0 = 1, everyone can read/write
    // contains 0x0 = 0, none onlyOwner
    // contains address = -1, address is forbiden to 
    // contains address =  0, address is forbiden to 
    // contains address =  1, address can read
    // contains address =  2, address can read/write
    // contains address =  3, address can write but can not read
    // contains address =  4, address can overwrite existing address feed 
    struct Node {
        bool      isNode;
        uint      index;
        bytes32   parent;
        // consider putting protocol info in a node 
        mapping(address => int) canAccess;
        mapping(bytes32 => bytes32) valuesMap;
        bytes32[] keys;
        bytes32[] values;
        
        bytes32[] children;  // child nodes
    }
   //!event NodeAdded(bytes32);
   //!event NodeRemovedChild(uint256);
   //!event NodeAddChild(bytes32);
   //!event NodeAccessChange(bytes32,address,int);
   //!event NodeDelete(bytes32 nodeId, bytes32 folder);
   //!event AddFolder(bytes32 nodeId, bytes32 folder);
   //!event KeyValueSet(bytes32 nodeId, bytes32 key, bytes32 value);
   //!event KeyValueSetFolder(bytes32 nodeId, bytes32 folder);
   //!event OverwriteKeyValue(bytes32 nodeId, uint256 index, bytes32 key, bytes32 value);
   //!event RemoveKeyValue(bytes32 nodeId, uint256 index, bytes32 key, bytes32 value);
    function isNode(bytes32 nodeId) public view returns(bool)  {
        return Nodes[nodeId].isNode;
    }
    function getChildCount(bytes32 nodeId) public view returns(uint childCount) {
        return Nodes[nodeId].children.length;
    }
    function getChildAt(bytes32 nodeId, uint index) public view returns(bytes32 childId) {
        return Nodes[nodeId].children[index];
    }
    function getChildren(bytes32 nodeId) public view returns(bytes32[] memory childrenodeId) {
        return Nodes[nodeId].children;
    }
    function removeChildAt(bytes32 nodeId, uint256 index) public returns (bool) {
         // removes children node from nodeId, not best way as it does reordering 
         if(!canWrite(nodeId, msg.sender)) return false;  // can write to node that is supposed to be deleted?

         Node storage node = Nodes[nodeId];
         
         if(!canWrite(node.children[index], msg.sender)) return false; // can write to node that is supposed to be deleted?
         
         uint last = node.children.length-1; // last child in the list
         uint idx = Nodes[node.children[last]].index;
         
         node.children[index] = node.children[last];
         delete node.children[last];
         node.children.pop();
         
         Nodes[node.children[last]].index = idx; // swap index
         
         //!emit NodeRemovedChild(index);
         return true;
    }    
    function addNode(bytes32 nodeId, bytes32 subNodeId) internal returns(bytes32 ) {
        if(!isNode(nodeId) && nodeId > 0) revert(); // zero is a new root node
        if(isNode(subNodeId)) revert();

        //newId = keccak256(abi.encodePacked(nodeId, msg.sender, block.number, folder));
        //newId = subNodeId; 

        Node storage node = Nodes[subNodeId];
        node.parent = nodeId;
        node.isNode = true;
        
        if(nodeId>0) {
            node.index = addChild(nodeId,subNodeId);
        }
        
        //Nodes[newId] = node;
        //!emit NodeAdded(newId);
        return subNodeId;
    }
    function addChild(bytes32 nodeId, bytes32 childId) private returns(uint index) {
        //!emit NodeAddChild(childId);
        Nodes[nodeId].children.push(childId);
        return Nodes[nodeId].children.length - 1;
    }
    
    // constructor
    constructor(address payable _owner) public {
      owner = _owner;         
      rootNodeId         = addNode(0, 0xc7f5bbf5fe95923f0691c94f666ac3dfed12456cd33bd018e7620c3d93edd5a6); // the root of all, onlyOwner r/w  c7f5bbf5fe95923f0691c94f666ac3dfed12456cd33bd018e7620c3d93edd5a6
      sharedNodeId       = addChildNode(rootNodeId, 0x23e642b7242469a5e3184a6566020c815689149967703a98c0affc14b9ca9b28);
      // setNodeAccess(sharedNodeId, address(0x0), 3); // unknown can add, but not read 
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////////       
    function setNodeAccess(bytes32 nodeId, address addr, int rights) /*onlyOwner*/ public returns (int) {
       //if(msg.sender!=owner) return -1;
       if(addr==owner) return 2; // owner always has r/w access, this is needed so one can not bloat mapping with owner address
       if(!canWrite( nodeId, msg.sender)) return -1;
       //!emit NodeAccessChange(nodeId,addr,rights);
       Nodes[nodeId].canAccess[addr] = rights;
       return rights;
    }
    function canRead(bytes32 nodeId, address addr) public view returns (bool) {
         if(!isNode(nodeId)) return false;
         if(addr==msg.sender) return true;
         
         Node storage n = Nodes[nodeId];
         if(n.canAccess[addr] == -1)  return false;  //address is blacklisted 
         if(n.canAccess[address(0x0)] == 3) return false; //none can read
         if(n.canAccess[address(0x0)] > 0)  return true;  //everyone can access
         return n.canAccess[addr]>0;
     }
    function canWrite(bytes32 nodeId, address addr) public view returns (bool) {
         if(!isNode(nodeId)) return false;
         if(addr==msg.sender) return true;
         
         Node storage n = Nodes[nodeId];
         if(n.canAccess[addr] == -1)  return false;  //address is blacklisted 
         if(n.canAccess[address(0x0)] > 1) return true; //everyone can write
         return n.canAccess[addr]>1;
     }
    function canOverwrite(bytes32 nodeId, address addr) public view returns (bool) {
         if(!isNode(nodeId)) return false;
         if(addr==msg.sender) return true;
         Node storage n = Nodes[nodeId];
         
         if(n.canAccess[addr] == -1)  return false;  //address is blacklisted 
         if(n.canAccess[address(0x0)] > 3) return true; //everyone can overwrite
         return n.canAccess[addr] > 3; // yes you can overwrite
     }
    ///////////////////////////////////////////////////////////////////////////////////////////       
    function deleteNode(bytes32 nodeId) public returns (bool) {
        if(!canWrite(nodeId, msg.sender)) return false;

        Node storage node = Nodes[nodeId];
        if(removeChildAt(node.parent, node.index)) 
        {
            uint256 index = nodesIndex[nodeId]; 
            if(index!=0)
            {
                Nodes[nodeId].isNode = false;
                nodesIndex[nodeId] = 0;
        
                nodes[index] = nodes[nodes.length-1];
                delete nodes[nodes.length-1];
                nodes.pop();
                
                //!emit NodeDelete(nodeId, folder);
                return true;
            }
        }
        return false;
    }     
     
    // problem is that subFolder is added to folderNodes mapping
    // this means subFolder can be only one and must be unique 
    // which in turn means that we can't have same subFolder in different parent protocols
    // add subProtocol to parentProtocol (protocolnodeId)
    // so if if parent is bin, then add subFolder as "/bin/subFolderName" 
    // returns nodeId of new subFolder or 0x0 if error 
    function addChildNode(bytes32 parentNodeId, bytes32 subNodeId) public returns (bytes32) {
        bytes32 parentId = parentNodeId;
        if(!isNode(parentId)) // parentNode is not a node, then write to root
           parentId = rootNodeId;
        
        if(!canRead(parentId, msg.sender)) // no read permission for parent
           parentId = sharedNodeId;

        if(isNode(subNodeId)) // if subProtocol exists as protocol, then fail
        {
            if(!canRead(subNodeId, msg.sender)) // no read permission 
               return 0x0;
               
            return subNodeId;
        }
        
        if(!canWrite(parentId, msg.sender)) // no write permission
           return 0x0;
        
        bytes32 newNodeId = addNode(parentId, subNodeId); // add child to parent
        nodes.push(subNodeId);
        nodesIndex[subNodeId] = nodes.length-1;
        //!emit AddFolder(newnodeId, subFolder);
        
        if(msg.sender!=owner)
          setNodeAccess(newNodeId, msg.sender, 2); // give r/w access to creator of node
           
        return newNodeId; 
    }
    ///////////////////////////////////////////////////////////////////////////////////////////      
    // setKeyValue, will suceed only when no such key with value exist
    function setKeyValue(bytes32 nodeId, bytes32 key, bytes32 value) public returns (bool) {
         if(!isNode(nodeId)) {// folder does not exist in mapping to all folder
            bytes32 makeChildIn = sharedNodeId; // everything goes to incoming
            if(msg.sender == owner) // owner can create in root 
               makeChildIn = rootNodeId;
              
            nodeId = addChildNode(makeChildIn, nodeId);
         }
         //!emit KeyValueSetFolder(targetNode, folder);
         return writeKeyValue(nodeId, key, value);
    }
    function writeKeyValue(bytes32 nodeId, bytes32 key, bytes32 value) public returns (bool) {
         if(!canWrite(nodeId, msg.sender)) // no read permission for parent
           return false;
         
         Node storage node = Nodes[nodeId];
         
         if(node.valuesMap[key] == 0x0) // no such value yet, could be replaced by keyNodeIdValues[key][folder].length==0
         {
            node.keys.push(key);
            node.values.push(value); 
            
            node.valuesMap[key] = value;
            keyNodeIdValues[key][nodeId].push(value);
            //!emit KeyValueSet(nodeId, key, value);
            return true; 
         } 
         
         keyNodeIdValues[key][nodeId].push(value);
         return false;
    }
    ///////////////////////////////////////////////////////////////////////////////////////////       

    // getKeyValues 
    function getKeysValues(bytes32 nodeId) public view returns (bytes32[] memory keys,bytes32[] memory values) {
         bytes32[] memory ret;
         if(!canRead(nodeId, msg.sender)) return (ret,ret);
             
         keys =  Nodes[nodeId].keys;  
         values = Nodes[nodeId].values;
    }
    // getKeyValueAt
    function getKeyValueAt(bytes32 nodeId, uint index) public view returns (bytes32 key, bytes32 value) {
         if(!canRead(nodeId, msg.sender)) return (0x0,0x0);
             
         return (Nodes[nodeId].keys[index],Nodes[nodeId].values[index]);
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////////
    // getKeys 
    function getKeys(bytes32 nodeId) view public returns (bytes32[] memory) {
         bytes32[] memory ret;
         if(!canRead(nodeId, msg.sender)) return ret;

         return Nodes[nodeId].keys;
     }
    // get num keys
    function getKeysCount(bytes32 nodeId) view public returns (uint) {
         if(!canRead(nodeId, msg.sender)) return 0;
             
         return Nodes[nodeId].keys.length;
     }
    // get key at
    function getKeyAt(bytes32 nodeId, uint index) view public returns (bytes32) {
         if(!canRead(nodeId, msg.sender)) return 0x0;
             
         return Nodes[nodeId].keys[index];
     }
     
    /////////////////////////////////////////////////////////////////////////////////////////// 
    // getValues 
    function getValue(bytes32 nodeId, bytes32 key) public view returns (bytes32) {
         if(!canRead(nodeId, msg.sender)) return 0x0;
             
         return Nodes[nodeId].valuesMap[key];
    }
    // get num values
    function getValuesCount(bytes32 nodeId) view public returns (uint) {
         if(!canRead(nodeId, msg.sender)) return 0;
             
         return Nodes[nodeId].values.length;
     }
    // get value at  
    function getValueAt(bytes32 nodeId, uint index) view public returns (bytes32) {
         if(!canRead(nodeId, msg.sender)) return 0x0;
             
         return Nodes[nodeId].values[index];
     }
    
    ///////////////////////////////////////////////////////////////////////////////////////////
    // overwrite in folder with new sender and new feed
    function overwriteKey(bytes32 nodeId, uint index, bytes32 key, bytes32 newValue) public returns (bool) {
        if(!canOverwrite(nodeId, msg.sender)) return false;
        
        Node storage node = Nodes[nodeId];
        if(index<node.values.length) // no such feed yet
        {
            bytes32 prevKey = node.keys[index]; // where is previous
            node.valuesMap[prevKey] = 0x0; // set it to null 
            
            node.keys[index] = key;
            node.values[index] = newValue; 
            node.valuesMap[key] = newValue; //
            
            keyNodeIdValues[key][nodeId].push(newValue);
            
            //!emit OverwriteKeyValue(nodeId,index,key,newValue);
            return true;
        }        
        return false;
     }
    // remove key
    function removeKeyAt(bytes32 nodeId, uint256 index) public returns (bool) {
         if(!canWrite(nodeId, msg.sender)) return false; 
         
         Node storage node = Nodes[nodeId];
         
         bytes32 atKey = node.keys[index];
         //bytes32 preValue = node.values[index];
         require(atKey!=0x0); // node has no sender at index 
         
         node.valuesMap[atKey] = 0x0; // clear sender         
         
         node.keys[index] = node.keys[node.keys.length-1];
         delete node.keys[node.keys.length-1];
         node.keys.pop();
         
         node.values[index] = node.values[node.values.length-1];
         delete node.values[node.values.length-1];
         node.values.pop();
         
         //!emit RemoveKeyValue(nodeId, index, atKey, preValue);
         return true;
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////////      
    function getNodesIndex(bytes32 nodeId) view public returns (uint256) { // will get protocol node address
         return nodesIndex[nodeId];
     }

    // ONLY OWNERS CAN ACCESS COMPLETE INFORMATION
    ///////////////////////////////////////////////////////////////////////////////////////////      
    // get all values ever, chronologically, never gets deleted, only added
    function getNodeValuesForAKey(bytes32 nodeId, bytes32 key) view public returns (bytes32[] memory) {
       require(msg.sender == owner);
       return keyNodeIdValues[key][nodeId];
    }
     
    ///////////////////////////////////////////////////////////////////////////////////////////      
    function getNodes() view public returns (bytes32[] memory) { // get all folder
     require(msg.sender == owner);
     return nodes;
    }     
    function getNodeCount() view public returns (uint256) { // get num of folder
     require(msg.sender == owner);
     return nodes.length;
    }
    function getNodeAt(uint256 idx) view public returns (bytes32) { // get folder by idx
      require(msg.sender == owner);
      return nodes[idx];
    }
    ///////////////////////////////////////////////////////////////////////////////////////////
    // fallback function to accept ETH into contract.
    receive () external payable { 
        payable(msg.sender).transfer(msg.value);  // return funds back to sender 
    } 
}

contract Multibox {
    address payable public owner;
    /*modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }*/
    function changeOwner(address payable _newOwner) public { 
        require(msg.sender == owner);
        owner = _newOwner; 
    }
    // addresses of roots     
    KeyValueTree[] roots; 
    
    //!event Initialized();
    //!event RootCreated(KeyValueTree);
    //!event RootAdded(KeyValueTree);
    //!event RootFailedNoOwner(address sender, address  owner);
    //!event RootRemoved(uint256);
    //!event RootRevoked(uint256);
    //!event FundsRemoved(uint256);
    ////////////////////////////////////////////////////////////////////////////////////////////////
    //!event AccessRequested(address, Multibox, KeyValueTree, bytes32);
    //!event AccessRequestFail(address, Multibox, KeyValueTree, bytes32 nodeId, bool canOwnerWrite);
    //!event AccessRequestFailNotOwner(address kvtOwner, address multiboxOwner); 
    //!event AccessGiven(address, address to);
    //!event AccessTerminated(address, address to);
    
    constructor() public {
        //version = 1;
        owner = payable(msg.sender);
    }
    
    function init() public returns (KeyValueTree) {
        KeyValueTree a; 
        if(roots.length==0)//Initialized
        {
           a = createRoot(owner);
           //!emit Initialized(); 
        }
        return a;
    }
    
    // any one can create new root, but ownership will belong to owner of multibox, 
    // while r/w of shared node can be set to whoHasReadWriteRights
    function createRoot(address whoHasReadWriteRights) public returns (KeyValueTree) {
        KeyValueTree kvt = new KeyValueTree(owner);
        if(roots.length==0)
          kvt.setNodeAccess(kvt.getSharedId(), whoHasReadWriteRights, 3); // first root shared node can anyone write to, but can't read from
        else 
          kvt.setNodeAccess(kvt.getSharedId(), whoHasReadWriteRights, 2); // whoHasReadWriteRights r/w 
          
        //!emit RootCreated(kvt);  
        return addRoot(kvt);
    }
    function getRoots() public view returns (KeyValueTree[] memory) {
        return roots;
    }
    function getRootsCount() public view returns (uint256) {
        return roots.length;
    }
    function getRootAt(uint256 index) public view returns (KeyValueTree) {
        return roots[index];
    }
    // others can add KeyValueTrees (but need to set access rights by themselfs)
    function addRoot(KeyValueTree kvt) public returns (KeyValueTree) {
        require(kvt.owner() == msg.sender); 
        /*
        if(kvt.owner() != msg.sender) // not owner of tree? can't move then 
        {
            //!emit RootFailedNoOwner(msg.sender, kvt.owner());
            //return KeyValueTree(0x0);
        }*/ 

        roots.push(kvt);
        //!emit RootAdded(kvt);  
        return kvt;
    }
    // owner can remove any root except 0 
    function removeRoot(uint256 index) public returns (uint256) {
        require(msg.sender == owner);
        if(index==0) return 0; // fail cant NEVER remove root
        
        roots[index] = roots[roots.length-1];
        delete roots[roots.length-1];
        roots.pop();
        //!emit RootRemoved(index);
        return roots.length;
    }
    // others can remove their trees 
    function revokeRoot(uint256 index) public returns (uint256) {
        KeyValueTree kvt = roots[index];
         
        if(index==0) return 0; // fail cant NEVER remove root
        if(kvt.owner() == msg.sender) // not owner of tree? can't move then 
           return 0;
        
        roots[index] = roots[roots.length-1];
        delete roots[roots.length-1];
        roots.pop();
        //!emit RootRevoked(index);
        return roots.length;
    }
    
    // fallback function to accept ETH into contract.
    receive () external payable { 
        payable(msg.sender).transfer(msg.value);  // return funds back to sender 
    } 
}

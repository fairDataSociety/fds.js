class FDSMultibox {
      constructor(){
          this.mb = new FDSContract(abi, address);
      }
  
      deploy(){
          mb.deploy();
      }
  
      set(k,v){
          this.mb.exec('set', k, v);
      }
  
      get(k){
          this.mb.exec('get', k);
      }
}
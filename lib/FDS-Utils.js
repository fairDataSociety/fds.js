class Utils {

  fileToBuffer(file){
    return new Promise((resolve, reject) => {
      var fileReader = new FileReader();
      fileReader.onload = function(event) {
          resolve(event.target.result);
      };
      fileReader.readAsArrayBuffer(file);
    });
  }

  fileToString(file){
    return new Promise((resolve, reject) => {
      var fileReader = new FileReader();
      fileReader.onload = function(event) {
          resolve(event.target.result);
      };
      fileReader.readAsText(file);
    });
  }

  hexStringToByte(str){
    if (!str) {
      return new Uint8Array();
    }
    
    var a = [];
    for (var i = 0, len = str.length; i < len; i+=2) {
      a.push(parseInt(str.substr(i,2),16));
    }
    
    return new Uint8Array(a);
  }

}

module.exports = new Utils;
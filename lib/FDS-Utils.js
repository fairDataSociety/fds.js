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

}

module.exports = new Utils;
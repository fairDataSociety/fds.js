class Faucet {

  constructor(url){
    this.url = url;
  }

  gimmie(address) {

    return new Promise((resolve, reject) => {
      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState === 4) {
          if (this.status === 200) {
            resolve(JSON.parse(xhttp.responseText).transaction);
          } else {
            try {
              reject(JSON.parse(xhttp.responseText).error);
            }
            catch(err) {
              reject(false);
            }
          }
        }
      };

      xhttp.open('POST', this.url, true);
      xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');      

      xhttp.send('address='+address);
    });
  }

}

module.exports = Faucet;
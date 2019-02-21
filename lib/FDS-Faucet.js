// interaction with the faucet server

class Faucet {

    constructor(url) {
        this.url = url;
    }

    /**
     * Fund address through faucet
     * @param {string} address to fund
     * @returns {Promise} result
     */
    gimmie(address) {
        return new Promise((resolve, reject) => {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        resolve(JSON.parse(xhttp.responseText).transaction);
                    } else {
                        try {
                            reject(JSON.parse(xhttp.responseText).error);
                        }
                        catch (err) {
                            reject(err);
                        }
                    }
                }
            };

            xhttp.open('POST', this.url, true);
            xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

            xhttp.send('address=' + address);
        });
    }

}

module.exports = Faucet;
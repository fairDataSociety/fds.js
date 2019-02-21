// general utilities

class Utils {

    /**
     * Read file into buffer
     * @param {any} file to use
     * @returns {Buffer} contents of file
     */
    fileToBuffer(file) {
        return new Promise((resolve, reject) => {
            var fileReader = new FileReader();
            fileReader.onload = function (event) {
                resolve(event.target.result);
            };
            fileReader.readAsArrayBuffer(file);
        });
    }

    /**
     * Read file into string
     * @param {any} file to use
     * @returns {string} contents of file
     */
    fileToString(file) {
        return new Promise((resolve, reject) => {
            var fileReader = new FileReader();
            fileReader.onload = function (event) {
                resolve(event.target.result);
            };
            fileReader.readAsText(file);
        });
    }

    /**
     * convert hex string to byte array
     * @param {any} str hex string to convert
     * @returns {Uint8Array} result
     */
    hexStringToByte(str) {
        if (!str) {
            return new Uint8Array();
        }

        var a = [];
        for (var i = 0, len = str.length; i < len; i += 2) {
            a.push(parseInt(str.substr(i, 2), 16));
        }

        return new Uint8Array(a);
    }

}

module.exports = new Utils;
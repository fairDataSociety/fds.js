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

// general utilities

class Utils {

    /**
     * Read file into buffer
     * @param {any} file to use
     * @returns {Buffer} contents of file
     */
    fileToBuffer(file) {
        // return Buffer.from(file.content[0])
        // console.log(file)   
        return new Promise((resolve, reject) => {
            resolve(Buffer.from(file.content[0]))
        });
    }

    /**
     * Read file into string
     * @param {any} file to use
     * @returns {string} contents of file
     */
    fileToString(file) {
        // console.log(file)
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
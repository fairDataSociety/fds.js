const path = require('path');

module.exports = {
  entry: './lib/index.js',
  node: {
    fs: 'empty'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  }
};
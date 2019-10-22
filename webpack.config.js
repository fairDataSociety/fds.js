var webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './dist/ES5/index.js',
  node: {
    fs: 'empty'
  },
  resolve: {
    alias: {
      // replace native `scrypt` module with pure js `js-scrypt`
      "scrypt": "js-scrypt",
    }
  },
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: 'bundle.js',
    library: 'FDS'
  },
  plugins: [
    new webpack.IgnorePlugin(/fs/)
  ] 
};
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  devtool: 'source-map',
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
    new BundleAnalyzerPlugin({generateStatsFile: true})
  ]
};
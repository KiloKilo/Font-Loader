const webpack = require('webpack');

const config = {
    entry: [__dirname + '/src/loader.js'],
    devtool: 'source-map',
    output: {
        path: __dirname + '/build',
        filename: 'index.js',
        library: 'FontLoader',
        libraryTarget: 'umd'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {}
                }
            }
        ],
    },

};

module.exports = config;
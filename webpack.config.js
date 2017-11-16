const webpack = require('webpack');
const path = require('path');

const config = {
    entry: ['./src/loader.js'],
    output: {
        path: path.join(__dirname, 'build'),
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
    devServer: {
        contentBase: path.join(__dirname, '/examples'),
        publicPath: '/examples/',
        stats: "errors-only",
        port: 3000,
    }
};

module.exports = config;
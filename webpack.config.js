const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const banner = `
  hash:[hash], chunkhash:[chunkhash], name:[name], filebase:[filebase], query:[query], file:[file]
  Source code: https://github.com/LemmyNet/lemmy-ui
  Created by dessalines
  @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL v3.0
  `;

module.exports = function (env, _) {
  const base = {
    // mode is set by package.json flags
    entry: './src/server/index.tsx', // Point to main file
    output: {
      path: path.resolve(process.cwd(), 'dist'),
      filename: 'js/server.js',
      publicPath: '/',
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    performance: {
      hints: false,
    },
    module: {
      rules: [
        {
          test: /\.(scss|css)$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        },
        {
          test: /\.(js|jsx|tsx|ts)$/, // All ts and tsx files will be process by
          loaders: 'babel-loader', // first babel-loader, then ts-loader
          exclude: /node_modules/, // ignore node_modules
        },
      ],
    },
    devServer: {
      host: '0.0.0.0',
      contentBase: 'src/',
      historyApiFallback: true,
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'styles/styles.css',
      }),
      new CopyPlugin({
        patterns: [{ from: './src/assets', to: './assets' }],
      }),
      new webpack.BannerPlugin({
        banner,
      }),
    ],
  };

  // server-specific configuration
  if (env.platform === 'server') {
    base.target = 'node';
    base.externals = [nodeExternals(), 'inferno-helmet'];
  }
  // client-specific configurations
  if (env.platform === 'client') {
    base.entry = './src/client/index.tsx';
    base.output.filename = 'js/client.js';
  }
  return base;
};

const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');
const { merge } = require('lodash');

const banner = `
  hash:[contentHash], chunkhash:[chunkhash], name:[name], filebase:[base], query:[query], file:[file]
  Source code: https://github.com/LemmyNet/lemmy-ui
  Created by dessalines
  @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL v3.0
  `;

const base = {
  output: {
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
        exclude: /node_modules/, // ignore node_modules
        loader: 'babel-loader',
      },
      // Due to some weird babel issue: https://github.com/webpack/webpack/issues/11467
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
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

const createServerConfig = (env, mode) => {
  const config = merge({}, base, {
    mode,
    entry: './src/server/index.tsx',
    output: {
      filename: 'js/server.js',
    },
    target: 'node',
    externals: [nodeExternals(), 'inferno-helmet'],
  });

  if (mode === 'development') {
    config.cache = {
      type: 'filesystem',
      name: 'server',
    };
  }

  return config;
};
const createClientConfig = (env, mode) => {
  const config = merge({}, base, {
    mode,
    entry: './src/client/index.tsx',
    output: {
      filename: 'js/client.js',
    },
  });

  if (mode === 'development') {
    config.cache = {
      type: 'filesystem',
      name: 'client',
    };
  }

  return config;
};

module.exports = (env, properties) => [
  createServerConfig(env, properties.mode || 'development'),
  createClientConfig(env, properties.mode || 'development'),
];

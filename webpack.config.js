const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = function (env, _) {
  const base = {
    // mode: "production",
    mode: 'development',
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
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'postcss-loader', // Run post css actions
              options: {
                plugins: function () {
                  // post css plugins, can be exported to postcss.config.js
                  return [require('precss'), require('autoprefixer')];
                },
              },
            },
            'sass-loader',
          ],
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
    ],
  };

  // server-specific configuration
  if (env.platform === 'server') {
    base.target = 'node';
    base.externals = [nodeExternals()];
  }
  // client-specific configurations
  if (env.platform === 'client') {
    base.entry = './src/client/index.tsx';
    base.output.filename = 'js/client.js';
  }
  return base;
};

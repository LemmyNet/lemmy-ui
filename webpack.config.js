const webpack = require("webpack");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const nodeExternals = require("webpack-node-externals");
const CopyPlugin = require("copy-webpack-plugin");
const RunNodeWebpackPlugin = require("run-node-webpack-plugin");
const merge = require("lodash.merge");
const { ServiceWorkerPlugin } = require("service-worker-webpack");

const banner = `
  hash:[contentHash], chunkhash:[chunkhash], name:[name], filebase:[base], query:[query], file:[file]
  Source code: https://github.com/LemmyNet/lemmy-ui
  Created by dessalines
  @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL v3.0
  `;

function getBase(env, mode) {
  return {
    output: {
      filename: "js/server.js",
      publicPath: "/",
      hashFunction: "xxhash64",
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      alias: {
        "@": path.resolve(__dirname, "src/"),
        "@utils": path.resolve(__dirname, "src/shared/utils/"),
      },
    },
    performance: {
      hints: false,
    },
    module: {
      rules: [
        {
          test: /\.(scss|css)$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
        },
        {
          test: /\.(js|jsx|tsx|ts)$/, // All ts and tsx files will be process by
          exclude: /node_modules/, // ignore node_modules
          loader: "babel-loader",
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
      new webpack.DefinePlugin({
        "process.env.COMMIT_HASH": `"${env.COMMIT_HASH}"`,
        "process.env.NODE_ENV": `"${mode}"`,
      }),
      new MiniCssExtractPlugin({
        filename: "styles/styles.css",
      }),
      new CopyPlugin({
        patterns: [{ from: "./src/assets", to: "./assets" }],
      }),
      new webpack.BannerPlugin({
        banner,
      }),
    ],
  };
}

const createServerConfig = (env, mode) => {
  const base = getBase(env, mode);
  const config = merge({}, base, {
    mode,
    entry: "./src/server/index.tsx",
    output: {
      filename: "js/server.js",
    },
    target: "node",
    externals: [nodeExternals(), "inferno-helmet"],
  });

  if (mode === "development") {
    // config.cache = {
    //   type: "filesystem",
    //   name: "server",
    // };

    config.plugins.push(
      new RunNodeWebpackPlugin({
        runOnlyInWatchMode: true,
      })
    );
  }

  return config;
};

const createClientConfig = (env, mode) => {
  const base = getBase(env, mode);
  const config = merge({}, base, {
    mode,
    entry: "./src/client/index.tsx",
    output: {
      filename: "js/client.js",
      publicPath: `/static/${env.COMMIT_HASH}/`,
    },
    plugins: [
      ...base.plugins,
      new ServiceWorkerPlugin({
        enableInDevelopment: mode !== "development", // this may seem counterintuitive, but it is correct
        workbox: {
          cacheId: "lemmy",
          include: [/(assets|styles|js)\/.+\..+$/g],
          inlineWorkboxRuntime: true,
          runtimeCaching: [
            {
              urlPattern: ({
                sameOrigin,
                url: { pathname, host },
                request: { method },
              }) =>
                (sameOrigin || host.includes("localhost")) &&
                (!(
                  pathname.includes("pictrs") || pathname.includes("static")
                ) ||
                  method === "POST"),
              handler: "NetworkFirst",
              options: {
                cacheName: "instance-cache",
              },
            },
            {
              urlPattern: ({ url: { pathname, host }, sameOrigin }) =>
                (sameOrigin || host.includes("localhost")) &&
                pathname.includes("static"),
              handler: mode === "development" ? "NetworkFirst" : "CacheFirst",
              options: {
                cacheName: "static-cache",
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            {
              urlPattern: ({ url: { pathname }, request: { method } }) =>
                pathname.includes("pictrs") && method === "GET",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "image-cache",
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
          ],
        },
      }),
    ],
  });

  if (mode === "none") {
    const BundleAnalyzerPlugin =
      require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
    config.plugins.push(new BundleAnalyzerPlugin());
  }

  return config;
};

module.exports = (env, properties) => [
  createServerConfig(env, properties.mode || "development"),
  createClientConfig(env, properties.mode || "development"),
];

const webpack = require("webpack");
const { resolve } = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const nodeExternals = require("webpack-node-externals");
const CopyPlugin = require("copy-webpack-plugin");
const { ServiceWorkerPlugin } = require("service-worker-webpack");
const {
  bundledSyntaxHighlighters,
  lazySyntaxHighlighters,
} = require("./src/shared/build-config");

const banner = `
  hash:[contentHash], chunkhash:[chunkhash], name:[name], filebase:[base], query:[query], file:[file]
  Source code: https://github.com/LemmyNet/lemmy-ui
  Created by dessalines
  @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL v3.0
  `;

const contextPlugin = (() => {
  const check = x => x.match(/^[0-9a-zA-Z-]+$/);
  const eagerNames = bundledSyntaxHighlighters.filter(check).join("|");
  const eagerHljs = new RegExp(`^[.][/\\\\](${eagerNames})[.]js\$`);
  let lazyHljs;
  if (lazySyntaxHighlighters === "*") {
    lazyHljs = new RegExp(`^[.][/\\\\](?!(${eagerNames})[.]js\$)[^.]+[.]js\$`);
  } else {
    const lazyNames = lazySyntaxHighlighters.filter(check).join("|");
    lazyHljs = new RegExp(`^[.][/\\\\](${lazyNames})[.]js\$`);
  }

  // Plugin will be used for all parameterized dynamic imports.
  return new webpack.ContextReplacementPlugin(/.*/, options => {
    if (/^highlight.js\/lib\/languages$/.test(options.request)) {
      if (options.mode == "eager") {
        options.regExp = eagerHljs;
      } else {
        options.regExp = lazyHljs;
      }
    } else if (/^date-fns\/locale$/.test(options.request)) {
    } else {
      return;
    }
    options.recursive = false;
    options.request = resolve(__dirname, "node_modules/" + options.request);
  });
})();

function enableSourceMaps(mode) {
  const envVal = process.env.LEMMY_UI_SOURCE_MAPS;
  if (envVal) {
    return envVal === "true";
  }
  return mode === "development";
}

module.exports = (env, argv) => {
  const mode = argv.mode;

  /** @type {webpack.Configuration} */
  const base = {
    output: {
      hashFunction: "xxhash64",
    },
    devtool: enableSourceMaps(mode) && "source-map",
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      alias: {
        "@": resolve(__dirname, "src/"),
        "@utils": resolve(__dirname, "src/shared/utils/"),
        "@services/*": resolve(__dirname, "src/shared/services/*"),
        "@components/*": resolve(__dirname, "src/shared/components/*"),
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
      contextPlugin,
    ],
  };

  /** @type {webpack.Configuration} */
  const serverConfig = {
    ...base,
    entry: "./src/server/index.tsx",
    output: {
      ...base.output,
      filename: "js/server.js",
      publicPath: "/",
      chunkLoading: false, // everything bundled
    },
    target: "node",
    externals: [nodeExternals(), "inferno-helmet"],
    plugins: [...base.plugins],
  };

  /** @type {webpack.Configuration} */
  const clientConfig = {
    ...base,
    entry: "./src/client/index.tsx",
    target: "browserslist", // looks up package.json
    output: {
      ...base.output,
      filename: "js/client.js",
      publicPath: `/static/${env.COMMIT_HASH}/`,
      chunkFilename: "js/[name].client.js", // predictable names for manual preload
    },
    plugins: [
      ...base.plugins,
      new ServiceWorkerPlugin({
        enableInDevelopment: mode !== "development", // this may seem counterintuitive, but it is correct
        workbox: {
          cacheId: "lemmy",
          include: [/(assets|styles|js)\/.+\..+$/g],
          inlineWorkboxRuntime: true,
        },
      }),
    ],
  };

  /** @type {webpack.Configuration} */
  const embeddedConfig = {
    ...base,
    entry: "./src/embedded/index.ts",
    target: "browserslist", // looks up package.json
    output: {
      ...base.output,
      filename: "js/embedded.js",
    },
    plugins: [...base.plugins],
  };

  if (mode === "development") {
    // serverConfig.cache = {
    //   type: "filesystem",
    //   name: "server",
    // };

    const RunNodeWebpackPlugin = require("run-node-webpack-plugin");
    serverConfig.plugins.push(
      new RunNodeWebpackPlugin({ runOnlyInWatchMode: true }),
    );
  } else if (mode === "none") {
    const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
    serverConfig.plugins.push(new BundleAnalyzerPlugin());
  }

  return [serverConfig, clientConfig, embeddedConfig];
};

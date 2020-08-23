import { CSSPlugin, FuseBox, FuseBoxOptions, Sparky } from "fuse-box";
import path = require("path");
import TsTransformClasscat from "ts-transform-classcat";
import TsTransformInferno from "ts-transform-inferno";
/**
 * Some of FuseBoxOptions overrides by ts config (module, target, etc)
 * https://fuse-box.org/page/working-with-targets
 */
let fuse: FuseBox;
const fuseOptions: FuseBoxOptions = {
   homeDir: "./src",
   output: "dist/$name.js",
   sourceMaps: { inline: false, vendor: false },
   /**
    * Custom TypeScript Transformers (compile Inferno tsx to ts)
    */
   transformers: {
      before: [TsTransformClasscat(), TsTransformInferno()]
   }
};
const fuseClientOptions: FuseBoxOptions = {
   ...fuseOptions,
   plugins: [
      /**
       * https://fuse-box.org/page/css-resource-plugin
       * Compile Sass {SassPlugin()}
       * Make .css files modules-like (allow import them like modules) {CSSModules}
       * Make .css files modules like and allow import it from node_modules too {CSSResourcePlugin}
       * Use them all and bundle with {CSSPlugin}
       * */
      CSSPlugin()
   ]
};
const fuseServerOptions: FuseBoxOptions = {
   ...fuseOptions
};
Sparky.task("clean", () => {
   /**Clean distribute (dist) folder */
   Sparky.src("dist")
      .clean("dist")
      .exec();
});
Sparky.task("config", () => {
   fuse = FuseBox.init(fuseOptions);
   fuse.dev();
});
Sparky.task("test", ["&clean", "&config"], () => {
   fuse.bundle("client/bundle").test("[**/**.test.tsx]", null);
});
Sparky.task("client", () => {
   fuse.opts = fuseClientOptions;
   fuse
      .bundle("client/bundle")
      .target("browser@esnext")
      .watch("client/**")
      .hmr()
      .instructions("> client/index.tsx");
});
Sparky.task("server", () => {
   /**Workaround. Should be fixed */
   fuse.opts = fuseServerOptions;
   fuse
      .bundle("server/bundle")
      .watch("**")
      .target("server@esnext")
      .instructions("> [server/index.tsx]")
      .completed(proc => {
         proc.require({
            // tslint:disable-next-line:no-shadowed-variable
            close: ({ FuseBox }) => FuseBox.import(FuseBox.mainFile).shutdown()
         });
      });
});
Sparky.task("dev", ["&clean", "&config", "&client", "&server"], () => {
   fuse.run();
});

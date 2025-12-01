/** Returns the default when the environment variable is either undefined or
 * the empty string, considers every value other than "true" as `false`. */
function envBoolean(
  envVar: string,
  default_: boolean = process.env.NODE_ENV === "development",
) {
  const envVal = process.env[envVar];
  if (envVal) {
    return envVal === "true";
  }
  return default_;
}

/** Defaults to true in development, false in production. */
export const enableEruda = envBoolean("LEMMY_UI_ERUDA");

/** Disabled by default, as `.css.map` files are untracked and only exist
 * after running `pnpm themes:build`. They also become possibly outdated after
 * switching between commits.
 */
export const serveCssMaps = envBoolean("LEMMY_UI_SERVE_CSS_MAPS", false);

/** Defaults to true in development, false in production. */
export const enableResponseBodyCompression = envBoolean("LEMMY_UI_COMPRESSION");

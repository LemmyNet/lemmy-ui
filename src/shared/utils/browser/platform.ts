import { isBrowser } from "@utils/browser";

const platformString = () =>
  navigator.platform?.match(/mac|win|linux/i)?.[0].toLowerCase();
const getPlatformPredicate = (platform: string) => () =>
  isBrowser() && platformString() === platform;
const isWin = getPlatformPredicate("win");
const isMac = getPlatformPredicate("mac");
const isLinux = getPlatformPredicate("linux");

const platform = { isWin, isMac, isLinux };

export default platform;

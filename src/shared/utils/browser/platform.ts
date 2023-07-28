import { isBrowser } from "@utils/browser";

const platformString = () =>
  navigator.platform?.match(/mac|win|linux/i)?.[0].toLowerCase();
const isWin = () => isBrowser() && platformString() == "win";
const isMac = () => isBrowser() && platformString() == "mac";
const isLinux = () => isBrowser() && platformString() == "linux";

const platform = { isWin, isMac, isLinux };

export default platform;

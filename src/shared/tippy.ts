import { isBrowser } from "@utils/browser";
import tippy from "tippy.js";

export let tippyInstance: any;

if (isBrowser()) {
  tippyInstance = tippy("[data-tippy-content]");
}

export function setupTippy() {
  if (isBrowser()) {
    tippyInstance.forEach((e: any) => e.destroy());
    tippyInstance = tippy("[data-tippy-content]", {
      delay: [500, 0],
      // Display on "long press"
      touch: ["hold", 500],
    });
  }
}

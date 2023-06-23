import { isBrowser } from "@utils/browser";
import { IsoData, RouteData } from "../../interfaces";

export default function setIsoData<T extends RouteData>(
  context: any
): IsoData<T> {
  // If its the browser, you need to deserialize the data from the window
  if (isBrowser()) {
    return window.isoData;
  } else return context.router.staticContext;
}

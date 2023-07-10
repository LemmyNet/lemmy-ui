import { isBrowser } from "@utils/browser";
import { IsoData, RouteData } from "../../interfaces";

export default function setIsoData<T extends RouteData>(
  context: any
): IsoData<T> {
  // If its the browser, you need to deserialize the data from the window
  if (isBrowser()) {
    const ele = document.getElementById("isoData");
    if (!ele) throw Error("could not find iso data");
    return JSON.parse(ele.textContent ?? "");
  } else return context.router.staticContext;
}

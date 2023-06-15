import { ILemmyConfig, IsoData } from "shared/interfaces";
import UAParser from "ua-parser-js";

declare global {
  interface Window {
    isoData: IsoData;
    lemmyConfig: ILemmyConfig;
    userAgent: UAParser.IResult;
  }

  interface RouterContext {
    isoData: IsoData;
    userAgent: UAParser.IResult;
  }
}

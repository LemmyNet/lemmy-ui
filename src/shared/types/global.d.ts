import { ILemmyConfig, IsoDataOptionalSite } from "shared/interfaces";
import UAParser from "ua-parser-js";

declare global {
  interface Window {
    isoData: IsoDataOptionalSite;
    lemmyConfig: ILemmyConfig;
    userAgent: UAParser.IResult;
  }

  interface RouterContext {
    isoData: IsoDataOptionalSite;
    userAgent: UAParser.IResult;
  }
}

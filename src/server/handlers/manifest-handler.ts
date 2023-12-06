import { getHttpBaseInternal } from "@utils/env";
import type { Request, Response } from "express";
import { LemmyHttp } from "lemmy-js-client";
import { wrapClient } from "../../shared/services/HttpService";
import generateManifestJson from "../utils/generate-manifest-json";

let manifest: Awaited<ReturnType<typeof generateManifestJson>> | undefined =
  undefined;

export default async (_req: Request, res: Response) => {
  if (!manifest) {
    const client = wrapClient(new LemmyHttp(getHttpBaseInternal()));
    const site = await client.getSite();

    if (site.state === "success") {
      manifest = await generateManifestJson(site.data.site_view.site);
    } else {
      res.sendStatus(500);
      return;
    }
  }

  res.setHeader("content-type", "application/manifest+json");

  res.send(manifest);
};

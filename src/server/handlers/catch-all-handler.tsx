import type { Request, Response } from "express";
import { StaticRouter, matchPath } from "inferno-router";
import { renderToString } from "inferno-server";
import IsomorphicCookie from "isomorphic-cookie";
import { GetSite, GetSiteResponse, LemmyHttp } from "lemmy-js-client";
import { App } from "../../shared/components/app/app";
import { getHttpBaseInternal } from "../../shared/env";
import {
  InitialFetchRequest,
  IsoDataOptionalSite,
} from "../../shared/interfaces";
import { routes } from "../../shared/routes";
import { RequestState, wrapClient } from "../../shared/services/HttpService";
import { ErrorPageData, initializeSite, isAuthPath } from "../../shared/utils";
import { createSsrHtml } from "../utils/create-ssr-html";
import { getErrorPageData } from "../utils/get-error-page-data";
import { setForwardedHeaders } from "../utils/set-forwarded-headers";

export default async (req: Request, res: Response) => {
  try {
    const activeRoute = routes.find(route => matchPath(req.path, route));
    let auth: string | undefined = IsomorphicCookie.load("jwt", req);

    const getSiteForm: GetSite = { auth };

    const headers = setForwardedHeaders(req.headers);
    const client = wrapClient(new LemmyHttp(getHttpBaseInternal(), headers));

    const { path, url, query } = req;

    // Get site data first
    // This bypasses errors, so that the client can hit the error on its own,
    // in order to remove the jwt on the browser. Necessary for wrong jwts
    let site: GetSiteResponse | undefined = undefined;
    const routeData: RequestState<any>[] = [];
    let errorPageData: ErrorPageData | undefined = undefined;
    let try_site = await client.getSite(getSiteForm);
    if (try_site.state === "failed" && try_site.msg == "not_logged_in") {
      console.error(
        "Incorrect JWT token, skipping auth so frontend can remove jwt cookie"
      );
      getSiteForm.auth = undefined;
      auth = undefined;
      try_site = await client.getSite(getSiteForm);
    }

    if (!auth && isAuthPath(path)) {
      return res.redirect("/login");
    }

    if (try_site.state === "success") {
      site = try_site.data;
      initializeSite(site);

      if (path !== "/setup" && !site.site_view.local_site.site_setup) {
        return res.redirect("/setup");
      }

      if (site) {
        const initialFetchReq: InitialFetchRequest = {
          client,
          auth,
          path,
          query,
          site,
        };

        if (activeRoute?.fetchInitialData) {
          routeData.push(
            ...(await Promise.all([
              ...activeRoute.fetchInitialData(initialFetchReq),
            ]))
          );
        }
      }
    } else if (try_site.state === "failed") {
      errorPageData = getErrorPageData(new Error(try_site.msg), site);
    }

    // Redirect to the 404 if there's an API error
    if (routeData[0] && routeData[0].state === "failed") {
      const error = routeData[0].msg;
      console.error(error);
      if (error === "instance_is_private") {
        return res.redirect(`/signup`);
      } else {
        errorPageData = getErrorPageData(new Error(error), site);
      }
    }

    const isoData: IsoDataOptionalSite = {
      path,
      site_res: site,
      routeData,
      errorPageData,
    };

    const wrapper = (
      <StaticRouter location={url} context={isoData}>
        <App />
      </StaticRouter>
    );

    const root = renderToString(wrapper);

    res.send(await createSsrHtml(root, isoData));
  } catch (err) {
    // If an error is caught here, the error page couldn't even be rendered
    console.error(err);
    res.statusCode = 500;
    return res.send(
      process.env.NODE_ENV === "development" ? err.message : "Server error"
    );
  }
};

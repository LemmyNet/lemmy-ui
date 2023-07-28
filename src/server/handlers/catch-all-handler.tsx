import { initializeSite, isAuthPath } from "@utils/app";
import { getHttpBaseInternal } from "@utils/env";
import { ErrorPageData } from "@utils/types";
import * as cookie from "cookie";
import fetch from "cross-fetch";
import type { Request, Response } from "express";
import { StaticRouter, matchPath } from "inferno-router";
import { renderToString } from "inferno-server";
import { GetSite, GetSiteResponse, LemmyHttp } from "lemmy-js-client";
import { App } from "../../shared/components/app/app";
import {
  InitialFetchRequest,
  IsoDataOptionalSite,
  RouteData,
} from "../../shared/interfaces";
import { routes } from "../../shared/routes";
import {
  FailedRequestState,
  wrapClient,
} from "../../shared/services/HttpService";
import { createSsrHtml } from "../utils/create-ssr-html";
import { getErrorPageData } from "../utils/get-error-page-data";
import { setForwardedHeaders } from "../utils/set-forwarded-headers";

export default async (req: Request, res: Response) => {
  try {
    const activeRoute = routes.find(route => matchPath(req.path, route));

    let auth = req.headers.cookie
      ? cookie.parse(req.headers.cookie).jwt
      : undefined;

    const getSiteForm: GetSite = { auth };

    const headers = setForwardedHeaders(req.headers);

    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { fetchFunction: fetch, headers })
    );

    const { path, url, query } = req;

    // Get site data first
    // This bypasses errors, so that the client can hit the error on its own,
    // in order to remove the jwt on the browser. Necessary for wrong jwts
    let site: GetSiteResponse | undefined = undefined;
    let routeData: RouteData = {};
    let errorPageData: ErrorPageData | undefined = undefined;
    let try_site = await client.getSite(getSiteForm);

    if (try_site.state === "failed" && try_site.msg === "not_logged_in") {
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

      if (site && activeRoute?.fetchInitialData) {
        const initialFetchReq: InitialFetchRequest = {
          client,
          auth,
          path,
          query,
          site,
        };

        routeData = await activeRoute.fetchInitialData(initialFetchReq);
      }

      if (!activeRoute) {
        res.status(404);
      }
    } else if (try_site.state === "failed") {
      res.status(500);
      errorPageData = getErrorPageData(new Error(try_site.msg), site);
    }

    const error = Object.values(routeData).find(
      res => res.state === "failed" && res.msg !== "couldnt_find_object" // TODO: find a better way of handling errors
    ) as FailedRequestState | undefined;

    // Redirect to the 404 if there's an API error
    if (error) {
      console.error(error.msg);

      if (error.msg === "instance_is_private") {
        return res.redirect(`/signup`);
      } else {
        res.status(500);
        errorPageData = getErrorPageData(new Error(error.msg), site);
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
        <App user={site?.my_user} />
      </StaticRouter>
    );

    const root = renderToString(wrapper);

    res.send(await createSsrHtml(root, isoData, res.locals.cspNonce));
  } catch (err) {
    // If an error is caught here, the error page couldn't even be rendered
    console.error(err);
    res.statusCode = 500;

    return res.send(
      process.env.NODE_ENV === "development" ? err.message : "Server error"
    );
  }
};

import { isAuthPath } from "@utils/app";
import { getHttpBaseInternal } from "@utils/env";
import { ErrorPageData, IsoDataOptionalSite } from "@utils/types";
import type { Request, Response } from "express";
import { StaticRouter, matchPath } from "inferno-router";
import { Match } from "inferno-router/dist/Route";
import { renderToString } from "inferno-server";
import { GetSiteResponse, LemmyHttp, MyUserInfo } from "lemmy-js-client";
import App from "../../shared/components/app/app";
import { InitialFetchRequest, RouteData } from "@utils/types";
import { routes } from "@utils/routes";
import {
  FailedRequestState,
  wrapClient,
} from "../../shared/services/HttpService";
import { createSsrHtml } from "../utils/create-ssr-html";
import { getErrorPageData } from "../utils/get-error-page-data";
import { setForwardedHeaders } from "../utils/set-forwarded-headers";
import { getJwtCookie } from "../utils/has-jwt-cookie";
import { parsePath } from "history";
import { getQueryString } from "@utils/helpers";
import { adultConsentCookieKey, testHost } from "@utils/config";
import { loadLanguageInstances } from "@services/I18NextService";

export default async (req: Request, res: Response) => {
  try {
    const languages = headerLanguages(req.headers["accept-language"]);

    let match: Match<any> | null | undefined;
    const activeRoute = routes.find(
      route => (match = matchPath(req.path, route)),
    );

    const headers = setForwardedHeaders(req.headers);
    const auth = getJwtCookie(req.headers);

    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    const { path, url } = req;

    // Get site data first
    // This bypasses errors, so that the client can hit the error on its own,
    // in order to remove the jwt on the browser. Necessary for wrong jwts
    let siteRes: GetSiteResponse | undefined = undefined;
    let myUserInfo: MyUserInfo | undefined = undefined;
    let routeData: RouteData = {};
    let errorPageData: ErrorPageData | undefined = undefined;
    const trySite = await client.getSite();
    let tryUser = await client.getMyUser();

    if (tryUser.state === "failed" && tryUser.err.name === "not_logged_in") {
      console.error(
        "Incorrect JWT token, skipping auth so frontend can remove jwt cookie",
      );
      client.setHeaders({});
      tryUser = await client.getMyUser();
    }

    if (!auth && isAuthPath(path)) {
      res.redirect(`/login${getQueryString({ prev: url })}`);
      return;
    }

    if (tryUser.state === "success") {
      myUserInfo = tryUser.data;
    }

    if (trySite.state === "success") {
      siteRes = trySite.data;

      if (path !== "/setup" && !siteRes.site_view.local_site.site_setup) {
        res.redirect("/setup");
        return;
      }

      if (path === "/setup" && siteRes.admins.length > 0) {
        res.redirect("/");
        return;
      }

      if (siteRes && activeRoute?.fetchInitialData && match) {
        const { search } = parsePath(url);
        const initialFetchReq: InitialFetchRequest<Record<string, any>> = {
          path,
          query:
            activeRoute.getQueryParams?.(search, siteRes, myUserInfo) ?? {},
          match,
          site: siteRes,
          myUserInfo,
          headers,
        };

        routeData = await activeRoute.fetchInitialData(initialFetchReq);
      }

      if (!activeRoute) {
        res.status(404);
      }
    } else if (trySite.state === "failed") {
      res.status(500);
      errorPageData = getErrorPageData(new Error(trySite.err.name), siteRes);
    }

    const error = Object.values(routeData).find(
      res => res.state === "failed" && res.err.name !== "couldnt_find_object", // TODO: find a better way of handling errors
    ) as FailedRequestState | undefined;

    // Redirect to the 404 if there's an API error
    if (error) {
      console.error(error.err);

      if (error.err.name === "instance_is_private") {
        res.redirect(`/signup`);
        return;
      } else {
        res.status(500);
        errorPageData = getErrorPageData(new Error(error.err.name), siteRes);
      }
    }

    const isoData: IsoDataOptionalSite = {
      path,
      siteRes: siteRes,
      myUserInfo,
      routeData,
      errorPageData,
      lemmyExternalHost: process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST ?? testHost,
      showAdultConsentModal:
        !!siteRes?.site_view.site.content_warning &&
        !(myUserInfo || req.cookies[adultConsentCookieKey]),
    };

    const interfaceLanguage =
      myUserInfo?.local_user_view.local_user.interface_language;

    const [dateFnsLocale, i18n] = await loadLanguageInstances(
      languages,
      interfaceLanguage,
    );

    const wrapper = (
      <StaticRouter location={url} context={isoData}>
        <App dateFnsLocale={dateFnsLocale} i18n={i18n} />
      </StaticRouter>
    );

    const root = renderToString(wrapper);

    res.send(
      await createSsrHtml(
        root,
        isoData,
        res.locals.cspNonce,
        languages,
        interfaceLanguage,
      ),
    );
  } catch (err) {
    // If an error is caught here, the error page couldn't even be rendered
    console.error(err);
    res.statusCode = 500;

    res.send(
      process.env.NODE_ENV === "development" ? err.name : "Server error",
    );
  }
};

function headerLanguages(acceptLanguages?: string): string[] {
  return (
    acceptLanguages
      ?.split(",")
      .map(x => {
        const [head, tail] = x.split(/;\s*q?\s*=?/); // at ";", remove "q="
        const q = Number(tail ?? 1); // no q means q=1
        return { lang: head.trim(), q: Number.isNaN(q) ? 0 : q };
      })
      .filter(x => x.lang)
      .sort((a, b) => b.q - a.q)
      .map(x => (x.lang === "*" ? "en" : x.lang)) ?? []
  );
}

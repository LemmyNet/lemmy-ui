import { initializeSite, isAuthPath } from "@utils/app";
import { getHttpBaseInternal } from "@utils/env";
import { GetSiteResponse, LemmyHttp } from "lemmy-js-client";
import {
  InitialFetchRequest,
  IsoData,
  RouteData,
} from "../../shared/interfaces";
import {
  FailedRequestState,
  wrapClient,
} from "../../shared/services/HttpService";
import { setForwardedHeaders } from "../utils/set-forwarded-headers";
import { getJwtCookie } from "../utils/has-jwt-cookie";
import { headers as _headers } from "next/headers";
import { IncomingHttpHeaders } from "http";
import { redirect } from "next/navigation";

export function getLemmyServerClient() {
  // todo: ugly code not needed
  const rawHeaders = Object.fromEntries(
    (_headers() as any).entries(),
  ) as IncomingHttpHeaders;
  const headers = setForwardedHeaders(rawHeaders);
  const auth = getJwtCookie(rawHeaders);
  return wrapClient(new LemmyHttp(getHttpBaseInternal(), { headers }));
}
/**
 * instead of responding to a http request (which is handled by nextjs internally), we just get the "iso data" here and redirect if appropriate
 */
export async function getIsoData(
  path: string,
): Promise<IsoData<Record<string, never>>> {
  const client = getLemmyServerClient();

  // const { path, url, query } = req;

  // Get site data first
  // This bypasses errors, so that the client can hit the error on its own,
  // in order to remove the jwt on the browser. Necessary for wrong jwts
  let site: GetSiteResponse | undefined = undefined;
  let try_site = await client.getSite();

  if (try_site.state === "failed" && try_site.err.message === "not_logged_in") {
    console.error(
      "Incorrect JWT token, skipping auth so frontend can remove jwt cookie",
    );
    client.setHeaders({});
    try_site = await client.getSite();
  }

  /* if (!auth && isAuthPath(path)) {
    redirect(`/login?prev=todo`); // ${encodeURIComponent(url)}`);
  }*/

  if (try_site.state === "success") {
    site = try_site.data;
    initializeSite(site);

    if (path !== "/setup" && !site.site_view.local_site.site_setup) {
      return redirect("/setup");
    }
  } else if (try_site.state === "failed") {
    throw new Error(try_site.err.message);
  }

  const isoData: IsoData<Record<string, never>> = {
    path,
    site_res: site!,
    routeData: {},
  };
  return isoData;
} /*
export default async (req: Request, res: Response) => {
  try {
    const wrapper = (
      <StaticRouter location={url} context={isoData as StaticRouterContext}>
        <App />
      </StaticRouter>
    );

    const root = renderToString(wrapper);

    res.send(await createSsrHtml(root, isoData, res.locals.cspNonce));
  } catch (err) {
    // If an error is caught here, the error page couldn't even be rendered
    console.error(err);
    res.statusCode = 500;

    return res.send(
      process.env.NODE_ENV === "development" ? err.message : "Server error",
    );
  }
};
*/

import { isBrowser } from "@utils/browser";
import { GetSiteResponse } from "lemmy-js-client";

export default function getQueryParams<T extends Record<string, any>>(
  processors: {
    [K in keyof T]: (param: string) => T[K];
  },
  site?: GetSiteResponse
): T {
  if (isBrowser()) {
    const searchParams = new URLSearchParams(window.location.search);

    return Array.from(Object.entries(processors)).reduce(
      (acc, [key, process]) => ({
        ...acc,
        [key]: process(searchParams.get(key), site),
      }),
      {} as T
    );
  }

  return {} as T;
}

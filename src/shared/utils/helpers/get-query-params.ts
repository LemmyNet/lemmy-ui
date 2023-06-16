import { isBrowser } from "../browser/is-browser";

export function getQueryParams<T extends Record<string, any>>(processors: {
  [K in keyof T]: (param: string) => T[K];
}): T {
  if (isBrowser()) {
    const searchParams = new URLSearchParams(window.location.search);

    return Array.from(Object.entries(processors)).reduce(
      (acc, [key, process]) => ({
        ...acc,
        [key]: process(searchParams.get(key)),
      }),
      {} as T
    );
  }

  return {} as T;
}

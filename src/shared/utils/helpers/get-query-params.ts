export default function getQueryParams<T extends Record<string, any>>(
  searchParams: URLSearchParams,
  processors: {
    [K in keyof T]: (param: string) => T[K];
  },
): T {
  return Array.from(Object.entries(processors)).reduce(
    (acc, [key, process]) => ({
      ...acc,
      [key]: process(searchParams.get(key)),
    }),
    {} as T,
  );
}

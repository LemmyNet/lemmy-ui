type Empty = NonNullable<unknown>;

type QueryMapping<PropsT, FallbacksT extends Empty> = {
  [K in keyof PropsT]-?: (
    input: string | undefined,
    fallback: K extends keyof FallbacksT ? FallbacksT[K] : undefined,
  ) => PropsT[K];
};

export default function getQueryParams<
  PropsT,
  FallbacksT extends Empty = Empty,
>(
  processors: QueryMapping<PropsT, FallbacksT>,
  source?: string,
  fallbacks: FallbacksT = {} as FallbacksT,
): PropsT {
  const searchParams = new URLSearchParams(source);

  const ret: Partial<PropsT> = {};
  for (const key in processors) {
    ret[key as string] = processors[key](
      searchParams.get(key) ?? undefined,
      fallbacks[key as string],
    );
  }
  return ret as PropsT;
}

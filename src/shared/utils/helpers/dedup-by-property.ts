function dedupByProperty<T, R extends number | string | boolean>(
  collection: T[],
  keyFn: (obj: T) => R,
) {
  return collection.reduce(
    (acc, cur) => {
      const key = keyFn(cur);
      if (!acc.foundSet.has(key)) {
        acc.output.push(cur);
        acc.foundSet.add(key);
      }

      return acc;
    },
    {
      output: [] as T[],
      foundSet: new Set<R>(),
    },
  ).output;
}

export default dedupByProperty;

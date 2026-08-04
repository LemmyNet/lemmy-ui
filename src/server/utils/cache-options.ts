// Cache-busted by commit hash in the URL, so cache immutably for a year
export const immutableCacheOptions = {
  maxAge: 365 * 24 * 60 * 60 * 1000,
  immutable: true,
};

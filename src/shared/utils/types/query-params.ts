export type QueryParams<T extends Record<string, any>> = {
  [key in keyof T]?: string;
};

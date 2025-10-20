import { RouteComponentProps } from "inferno-router/dist/Route";
import { RequestState } from "@services/HttpService";
import { PaginationCursor, PostView } from "lemmy-js-client";
import { DirectionalCursor, CursorComponents } from "./types";

// Intended to allow reloading all the data of the current page by clicking the
// navigation link of the current page.
export function bareRoutePush<P extends RouteComponentProps<any>>(
  prevProps: P,
  nextProps: P,
) {
  return (
    prevProps.location.pathname === nextProps.location.pathname &&
    !nextProps.location.search &&
    nextProps.history.action === "PUSH"
  );
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function debounce<T extends any[], R>(
  func: (...e: T) => R,
  wait = 1000,
  immediate = false,
) {
  let timeout: NodeJS.Timeout | null;

  return function () {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments;
    const callNow = immediate && !timeout;

    clearTimeout(timeout ?? undefined);

    timeout = setTimeout(function () {
      timeout = null;

      if (!immediate) {
        func.apply(this, args);
      }
    }, wait);

    if (callNow) func.apply(this, args);
  } as (...e: T) => R;
}

type ImmutableListKey =
  | "comment"
  | "community"
  | "post"
  | "registration_application";

export function editListImmutable<
  T extends { [key in F]: { id: number } },
  F extends ImmutableListKey,
>(fieldName: F, data: T, list: T[]): T[] {
  return list.map(c => (c[fieldName].id === data[fieldName].id ? data : c));
}

export function getIdFromString(id?: string): number | undefined {
  return id && id !== "0" && !Number.isNaN(Number(id)) ? Number(id) : undefined;
}

export function getBoolFromString(boolStr?: string): boolean | undefined {
  return boolStr ? boolStr.toLowerCase() === "true" : undefined;
}

type Empty = NonNullable<unknown>;

type QueryMapping<PropsT, FallbacksT extends Empty> = {
  [K in keyof PropsT]-?: (
    input: string | undefined,
    fallback: K extends keyof FallbacksT ? FallbacksT[K] : undefined,
  ) => PropsT[K];
};

export function getQueryParams<PropsT, FallbacksT extends Empty = Empty>(
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

export function getQueryString<T extends Record<string, string | undefined>>(
  obj: T,
) {
  const searchParams = new URLSearchParams();
  Object.entries(obj)
    .filter(([, val]) => val !== undefined && val !== null)
    .forEach(([key, val]) => searchParams.set(key, val ?? ""));
  const params = searchParams.toString();
  if (params) {
    return "?" + params;
  }
  return "";
}

export function getRandomCharFromAlphabet(alphabet: string): string {
  return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
}

export function getRandomFromList<T>(list: T[]): T | undefined {
  return list.length === 0
    ? undefined
    : list.at(Math.floor(Math.random() * list.length));
}

export function groupBy<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => string,
) {
  return array.reduce(
    (acc, value, index, array) => {
      (acc[predicate(value, index, array)] ||= []).push(value);
      return acc;
    },
    {} as { [key: string]: T[] },
  );
}

export function hostname(url: string): string {
  const cUrl = new URL(url);
  return cUrl.port ? `${cUrl.hostname}:${cUrl.port}` : `${cUrl.hostname}`;
}

export function hsl(num: number) {
  return `hsla(${num}, 35%, 50%, 0.5)`;
}

const SHORTNUM_SI_FORMAT = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 3,
  notation: "compact",
  compactDisplay: "short",
});

export function numToSI(value: number): string {
  return SHORTNUM_SI_FORMAT.format(value);
}

export function sleep(millis: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, millis));
}

/**
 * Polls / repeatedly runs a promise, every X milliseconds
 */
export async function poll(promiseFn: any, millis: number) {
  if (window.document.visibilityState !== "hidden") {
    await promiseFn();
  }
  await sleep(millis);
  return poll(promiseFn, millis);
}

const DEFAULT_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function randomStr(
  idDesiredLength = 20,
  alphabet = DEFAULT_ALPHABET,
): string {
  /**
   * Create n-long array and map it to random chars from given alphabet.
   * Then join individual chars as string
   */
  return Array.from({ length: idDesiredLength })
    .map(() => {
      return getRandomCharFromAlphabet(alphabet);
    })
    .join("");
}

export function resourcesSettled(resources: RequestState<any>[]) {
  return resources.every(r => r.state === "success" || r.state === "failed");
}

export function validEmail(email: string) {
  const re =
    /^(([^\s"(),.:;<>@[\\\]]+(\.[^\s"(),.:;<>@[\\\]]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([\dA-Za-z-]+\.)+[A-Za-z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

const tldRegex = /([a-z0-9]+\.)*[a-z0-9]+\.[a-z]+/;

export function validInstanceTLD(str: string) {
  return tldRegex.test(str);
}

/*
 * Test if the Title is in a valid format:
 *   (?=.*\S.*) checks if the title consists of only whitespace characters
 *   (?=^[^\r\n]+$) checks if the title contains newlines
 */
const validTitleRegex = new RegExp(/(?=(.*\S.*))(?=^[^\r\n]+$)/, "g");
export function validTitle(title?: string): boolean {
  // Initial title is null, minimum length is taken care of by textarea's minLength={3}
  if (!title || title.length < 3) return true;

  return validTitleRegex.test(title);
}

export function validURL(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function dedupByProperty<
  T extends Record<string, any>,
  R extends number | string | boolean,
>(collection: T[], keyFn: (obj: T) => R) {
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

export function getApubName({ name, ap_id }: { name: string; ap_id: string }) {
  return `${name}@${hostname(ap_id)}`;
}

export function directionalCursor(
  cursor: PaginationCursor,
  back: boolean,
): DirectionalCursor {
  if (back) {
    return `-${cursor}`;
  }
  return cursor;
}

export function cursorComponents(cursor?: DirectionalCursor): CursorComponents {
  if (!cursor) {
    return {
      page_cursor: undefined,
      page_back: undefined,
    };
  } else if (cursor.startsWith("-")) {
    return {
      page_cursor: cursor.substring(1),
      page_back: true,
    };
  }
  return {
    page_cursor: cursor,
    page_back: false,
  };
}

export function unreadCommentsCount(pv: PostView): number | undefined {
  const unread_comments =
    pv.post.comments - (pv.post_actions?.read_comments_amount ?? 0);
  return unread_comments === pv.post.comments || unread_comments === 0
    ? undefined
    : unread_comments;
}

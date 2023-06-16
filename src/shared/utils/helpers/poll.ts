import { sleep } from "./sleep";

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

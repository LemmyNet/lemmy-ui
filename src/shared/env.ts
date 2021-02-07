import { isBrowser } from './utils';

const testHost = 'localhost:8536';

let internalHost =
  (!isBrowser() && process.env.LEMMY_INTERNAL_HOST) || testHost; // used for local dev
let externalHost;
let host;
let wsHost;
let secure = false;

if (isBrowser()) {
  // browser
  const lemmyConfig =
    typeof window.lemmyConfig !== 'undefined' ? window.lemmyConfig : {};

  externalHost = `${window.location.hostname}${
    ['1234', '1235'].includes(window.location.port)
      ? ':8536'
      : window.location.port == ''
      ? ''
      : `:${window.location.port}`
  }`;

  host = externalHost;
  wsHost = lemmyConfig.wsHost || host;
  secure = window.location.protocol == 'https:' ? 's' : '';
} else {
  // server-siide
  externalHost = process.env.LEMMY_EXTERNAL_HOST || testHost;
  host = internalHost;
  wsHost = process.env.LEMMY_WS_HOST || host;
  secure = process.env.LEMMY_HTTPS == 'true' ? 's' : '';
}

const httpBase = `http://${host}`; // Don't use secure here
export const wsUri = `ws${secure}://${wsHost}/api/v2/ws`;
export const httpUri = `${httpBase}/api/v2`;
export const pictrsUri = `http${secure}://${host}/pictrs/image`;

console.log(`httpbase: ${httpBase}`);
console.log(`wsUri: ${wsUri}`);

// This is for html tags, don't include port
const httpExternalUri = `http${secure}://${externalHost.split(':')[0]}`;
export function httpExternalPath(path: string) {
  return `${httpExternalUri}${path}`;
}

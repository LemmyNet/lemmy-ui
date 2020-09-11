import { isBrowser } from './utils';

const testHost = 'localhost:8536';

const internalHost = process.env.LEMMY_INTERNAL_HOST || testHost; // used for local dev
export const externalHost = isBrowser()
  ? `${window.location.hostname}:${
      window.location.port == '1234' || window.location.port == '1235'
        ? 8536
        : window.location.port
    }`
  : process.env.LEMMY_EXTERNAL_HOST || testHost;

//   ? window.location.port == '1234' || window.location.port == '1235'
const secure = isBrowser() && window.location.protocol == 'https:' ? 's' : '';

const host = isBrowser() ? externalHost : internalHost;

const httpBase = `http${secure}://${host}`;
export const wsUri = `ws${secure}://${host}/api/v1/ws`;
export const httpUri = `${httpBase}/api/v1`;
const httpExternalUri = `http${secure}://${externalHost}`;
export const pictrsUri = `${httpBase}/pictrs/image`;

console.log(`Internal host: ${internalHost}`);
console.log(`External host: ${externalHost}`);

export function httpExternalPath(path: string) {
  return `${httpExternalUri}${path}`;
}

// export const httpUri = `http${secure}://${endpoint}/api/v1`;
// export const pictrsUri = `http${secure}://${endpoint}/pictrs/image`;

// const host = isBrowser() ? window.location.hostname : localHostname;
// const secure = isBrowser() && window.location.protocol == 'https:' ? 's' : '';
// const port = isBrowser()
//   ? window.location.port == '1234' || window.location.port == '1235'
//     ? 8536
//     : window.location.port
//   : 8536;
// const endpoint = `${host}:${port}`;
//
// export const wsUri = `ws${secure}://${endpoint}/api/v1/ws`;
// export const httpUri = `http${secure}://${endpoint}/api/v1`;
// export const pictrsUri = `http${secure}://${endpoint}/pictrs/image`;

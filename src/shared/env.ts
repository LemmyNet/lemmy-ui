import { isBrowser } from './utils';

const nodeHostname = process.env.LEMMY_HOST || 'localhost'; // used for local dev
const host = isBrowser() ? window.location.hostname : nodeHostname;
const secure = isBrowser() && window.location.protocol == 'https:' ? 's' : '';
const port = isBrowser()
  ? window.location.port == '1234' || window.location.port == '1235'
    ? 8536
    : window.location.port
  : 8536;
const endpoint = `${host}:${port}`;

export const wsUri = `ws${secure}://${endpoint}/api/v1/ws`;
export const httpUri = `http${secure}://${endpoint}/api/v1`;

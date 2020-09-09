import { isBrowser } from './utils';

const host = isBrowser() ? window.location.hostname : 'localhost';
const secure = isBrowser() && window.location.protocol == 'https:' ? 's' : '';
const port = isBrowser()
  ? window.location.port == '1234'
    ? 8536
    : window.location.port
  : 8536;
const endpoint = `${host}:${port}`;

export const wsUri = `ws${secure}://${endpoint}/api/v1/ws`;
export const httpUri = `http${secure}://${endpoint}/api/v1`;

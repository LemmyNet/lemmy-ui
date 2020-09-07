// TODO
// const host = `${window.location.hostname}`;
// const port = `${
//   window.location.port == '4444' ? '8536' : window.location.port
// }`;
// const endpoint = `${host}:${port}`;

// export const wsUri = `${
//   window.location.protocol == 'https:' ? 'wss://' : 'ws://'
// }${endpoint}/api/v1/ws`;

const host = '192.168.50.60';
const port = 8536;
const endpoint = `${host}:${port}`;
export const wsUri = `ws://${endpoint}/api/v1/ws`;
export const httpUri = `http://${endpoint}/api/v1`;

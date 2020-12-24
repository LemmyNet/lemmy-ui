import { wsUri } from '../env';
import {
  LemmyWebsocket,
  UserViewSafe,
  WebSocketJsonResponse,
} from 'lemmy-js-client';
import { isBrowser } from '../utils';
import { Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import {
  Options as WSOptions,
  default as ReconnectingWebSocket,
} from 'reconnecting-websocket';

export class WebSocketService {
  private static _instance: WebSocketService;
  public ws: ReconnectingWebSocket;
  public wsOptions: WSOptions = {
    connectionTimeout: 5000,
    maxRetries: 10,
  };
  public subject: Observable<any>;

  public admins: UserViewSafe[];
  public banned: UserViewSafe[];
  public client = new LemmyWebsocket();

  private constructor() {
    this.ws = new ReconnectingWebSocket(wsUri, [], this.wsOptions);
    let firstConnect = true;

    this.subject = new Observable((obs: any) => {
      this.ws.onmessage = e => {
        obs.next(JSON.parse(e.data));
      };
      this.ws.onopen = () => {
        console.log(`Connected to ${wsUri}`);

        if (!firstConnect) {
          let res: WebSocketJsonResponse<any> = {
            reconnect: true,
          };
          obs.next(res);
        }

        firstConnect = false;
      };
    }).pipe(share());
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}

if (isBrowser()) {
  window.onbeforeunload = () => {
    WebSocketService.Instance.ws.close();
  };
}

import { wsUri } from "../env";
import { PersonViewSafe, WebSocketJsonResponse } from "lemmy-js-client";
import { isBrowser } from "../utils";
import { Observable } from "rxjs";
import { share } from "rxjs/operators";
import {
  Options as WSOptions,
  default as ReconnectingWebSocket,
} from "reconnecting-websocket";

export class WebSocketService {
  private static _instance: WebSocketService;
  private ws: ReconnectingWebSocket;
  public wsOptions: WSOptions = {
    connectionTimeout: 5000,
    maxRetries: 10,
  };
  public subject: Observable<any>;

  public admins: PersonViewSafe[];
  public banned: PersonViewSafe[];

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

    if (isBrowser()) {
      window.onunload = () => {
        this.ws.close();

        // Clears out scroll positions.
        sessionStorage.clear();
      };
    }
  }

  public send(data: string) {
    this.ws.send(data);
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}

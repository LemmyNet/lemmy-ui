import { PersonViewSafe, WebSocketJsonResponse } from "lemmy-js-client";
import { Observable } from "rxjs";
import { share } from "rxjs/operators";
import {
  ExponentialBackoff,
  LRUBuffer,
  Websocket as WS,
  WebsocketBuilder,
} from "websocket-ts";
import { wsUri } from "../env";
import { isBrowser } from "../utils";

export class WebSocketService {
  private static _instance: WebSocketService;
  private ws: WS;
  public subject: Observable<any>;

  public admins: PersonViewSafe[];
  public banned: PersonViewSafe[];

  private constructor() {
    let firstConnect = true;

    this.subject = new Observable((obs: any) => {
      this.ws = new WebsocketBuilder(wsUri)
        .onMessage((_i, e) => {
          try {
            obs.next(JSON.parse(e.data.toString()));
          } catch (err) {
            console.error(err);
          }
        })
        .onOpen(() => {
          console.log(`Connected to ${wsUri}`);

          if (!firstConnect) {
            let res: WebSocketJsonResponse<any> = {
              reconnect: true,
            };
            obs.next(res);
          }
          firstConnect = false;
        })
        .onRetry(() => {
          console.log("Retrying websocket connection...");
        })
        .onClose(() => {
          console.error("Websocket closed.");
        })
        .withBackoff(new ExponentialBackoff(100, 7))
        .withBuffer(new LRUBuffer(1000))
        .build();
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
